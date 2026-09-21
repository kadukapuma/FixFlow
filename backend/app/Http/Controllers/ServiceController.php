<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\GettingItemsFromCustomer;
use App\Models\Item;
use App\Models\Service;
use App\Models\ServicePayment;
use App\Services\LedgerService;
use App\Services\ServicePdfGenerator;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    public function __construct(
        private LedgerService $ledger,
        private StockService $stock
    ) {
    }

    public function index(Request $request)
    {
        $query = Service::with(['customer', 'item', 'employee'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhere('ref_no', 'like', "%{$search}%")
                    ->orWhere('fault', 'like', "%{$search}%")
                    ->orWhere('service_date', 'like', "%{$search}%")
                    ->orWhere('started_date', 'like', "%{$search}%")
                    ->orWhere('completed_date', 'like', "%{$search}%")
                    ->orWhere('delivered_date', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($c) use ($search) {
                        $c->where('name', 'like', "%{$search}%")->orWhere('nic', 'like', "%{$search}%");
                    })
                    ->orWhereHas('item', function ($i) use ($search) {
                        $i->where('name', 'like', "%{$search}%")
                            ->orWhere('model', 'like', "%{$search}%")
                            ->orWhere('serial_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('employee', function ($e) use ($search) {
                        $e->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $response = $query->paginate((int) $request->query('per_page', 15))->toArray();

        // Services.jsx shows an "open" count across every active status —
        // delivered and returned_unrepairable are closed.
        $response['open_count'] = Service::whereNotIn('status', ['delivered', 'returned_unrepairable'])->count();

        return response()->json($response);
    }

    public function show(int $id)
    {
        $service = Service::with(['customer', 'item', 'employee'])->findOrFail($id);
        $service = Service::with(['customer', 'item', 'employee', 'receivedItems'])->findOrFail($id);

        return response()->json($service);
    }

    public function search(Request $request)
    {
        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json(['message' => 'A service ID or reference number is required.'], 422);
        }

        $serviceQuery = Service::with(['customer', 'item', 'employee']);
        $serviceQuery = Service::with(['customer', 'item', 'employee', 'receivedItems']);

        if (ctype_digit($query)) {
            $serviceQuery->where(function ($q) use ($query) {
                $q->where('id', $query)->orWhere('ref_no', $query);
            });
        } else {
            $serviceQuery->where('ref_no', $query);
        }

        $service = $serviceQuery->first();

        if (!$service) {
            return response()->json(['message' => 'Service not found.'], 404);
        }

        return response()->json($service);
    }

    public function store(Request $request)
    {
        if ($request->input('ref_no') === '') {
            $request->merge(['ref_no' => null]);
        }

        $validated = $request->validate([
            'ref_no' => ['nullable', 'string', 'max:255', Rule::unique(Service::class, 'ref_no')],
            'item_id' => ['required', 'integer', Rule::exists(Item::class, 'id')],
            'employee_id' => ['required', 'integer', Rule::exists(Employee::class, 'id')],
            'customer_id' => ['required', 'integer', Rule::exists(Customer::class, 'id')],
            'fault' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['pending', 'in_progress', 'completed', 'delivered', 'unrepairable', 'returned_unrepairable'])],
            'price' => ['nullable', 'numeric', 'min:0'],
            'advance_amount' => ['nullable', 'numeric', 'min:0'],
            'commission_type' => ['nullable', 'string', Rule::in(['flat', 'percentage'])],
            'commission_value' => ['nullable', 'numeric', 'min:0', 'required_with:commission_type'],
            'service_date' => ['nullable', 'date'],
            'item_ids' => ['nullable', 'array'],
            'item_ids.*' => ['integer', Rule::exists(GettingItemsFromCustomer::class, 'id')],
        ]);

        $customer = Customer::find($validated['customer_id']);

        if ($customer->is_suspended) {
            return response()->json([
                'message' => "This customer is suspended and can't be booked for a new service.",
            ], 422);
        }

        if ($response = $this->validateAdvanceAgainstPrice($validated['price'] ?? null, $validated['advance_amount'] ?? null)) {
            return $response;
        }

        if ($response = $this->validateCommission($validated['price'] ?? null, $validated['commission_type'] ?? null, $validated['commission_value'] ?? null)) {
            return $response;
        }

        $validated['service_date'] ??= now()->toDateString();

        $itemIds = $validated['item_ids'] ?? [];
        unset($validated['item_ids']);

        $advanceAmount = $validated['advance_amount'] ?? null;

        $service = Service::create($validated);

        if ($itemIds) {
            $service->receivedItems()->attach($itemIds);
        }

        if ($advanceAmount) {
            $payment = ServicePayment::create([
                'service_id' => $service->id,
                'amount' => $advanceAmount,
                'method' => 'cash',
                'paid_at' => $service->service_date,
                'note' => 'Initial advance',
            ]);

            $this->ledger->postServicePayment($payment);
        }

        $service->load(['customer', 'item', 'employee', 'receivedItems']);

        return response()->json([
            'message' => 'Service created successfully.',
            'service' => $service,
            'pdf_url' => "/services/{$service->id}/pdf",
        ], 201);
    }

    public function pdf(int $id)
    {
        $service = Service::with(['customer', 'item', 'employee', 'receivedItems'])->findOrFail($id);
        $pdf = ServicePdfGenerator::render($service, app('currentCompany'));

        $filename = 'service-'.($service->ref_no ?: $service->id).'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function invoice(int $id)
    {
        $service = Service::with(['customer', 'item', 'employee', 'work', 'serviceProducts.product', 'receivedItems', 'payments'])->findOrFail($id);

        // No manually-set final price yet — default it to the sum of the
        // logged work costs and product line items rather than blocking
        // invoice generation.
        if ($service->price === null) {
            $productsTotal = (float) $service->serviceProducts->sum(fn ($entry) => $entry->line_total);
            $service->price = (float) $service->work->sum('cost') + $productsTotal;
            $service->save();
        }

        $pdf = ServicePdfGenerator::renderInvoice($service, app('currentCompany'));

        $filename = 'invoice-'.($service->ref_no ?: $service->id).'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function start(Request $request, int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending services can be started.',
            ], 422);
        }

        $validated = $request->validate([
            'started_date' => ['nullable', 'date'],
        ]);

        $startedDate = $validated['started_date'] ?? now()->toDateString();

        if ($service->service_date && $startedDate < $service->service_date->toDateString()) {
            return response()->json([
                'message' => 'Start date cannot be before the service date.',
            ], 422);
        }

        $service->update(['status' => 'in_progress', 'started_date' => $startedDate]);

        return response()->json([
            'message' => 'Service started.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    public function complete(Request $request, int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'in_progress') {
            return response()->json([
                'message' => 'Only services in progress can be marked completed.',
            ], 422);
        }

        $validated = $request->validate([
            'completed_date' => ['nullable', 'date'],
        ]);

        $completedDate = $validated['completed_date'] ?? now()->toDateString();

        if ($service->started_date && $completedDate < $service->started_date->toDateString()) {
            return response()->json([
                'message' => 'Completed date cannot be before the start date.',
            ], 422);
        }

        $service->update(['status' => 'completed', 'completed_date' => $completedDate]);

        if ($service->commission_type && $service->commission_amount === null) {
            if ($service->commission_type === 'percentage' && $service->price === null) {
                return response()->json([
                    'message' => 'Set the service price before marking it complete so the commission can be calculated.',
                ], 422);
            }

            $commissionAmount = $service->commission_type === 'percentage'
                ? round((float) $service->price * (float) $service->commission_value / 100, 2)
                : (float) $service->commission_value;

            $service->update(['commission_amount' => $commissionAmount]);

            $this->ledger->postCommissionAccrual($service);
        }

        return response()->json([
            'message' => 'Service marked as completed.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    public function deliver(Request $request, int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'completed') {
            return response()->json([
                'message' => 'Only completed services can be marked delivered.',
            ], 422);
        }

        $validated = $request->validate([
            'delivered_date' => ['nullable', 'date'],
        ]);

        $deliveredDate = $validated['delivered_date'] ?? now()->toDateString();

        if ($service->completed_date && $deliveredDate < $service->completed_date->toDateString()) {
            return response()->json([
                'message' => 'Delivered date cannot be before the completed date.',
            ], 422);
        }

        $service->update(['status' => 'delivered', 'delivered_date' => $deliveredDate]);

        return response()->json([
            'message' => 'Service marked as delivered.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    public function markUnrepairable(Request $request, int $id)
    {
        $service = Service::with('serviceProducts.product')->findOrFail($id);

        if (!in_array($service->status, ['pending', 'in_progress'], true)) {
            return response()->json([
                'message' => 'Only pending or in-progress services can be marked unrepairable.',
            ], 422);
        }

        $validated = $request->validate([
            'unrepairable_reason' => ['nullable', 'string', 'max:1000'],
            'unrepairable_date' => ['nullable', 'date'],
            'inspection_fee' => ['nullable', 'numeric', 'min:0'],
            'parts_disposition' => ['nullable', 'array'],
            'parts_disposition.*' => ['string', Rule::in(['restock', 'write_off', 'charge'])],
        ]);

        $unrepairableDate = $validated['unrepairable_date'] ?? now()->toDateString();
        $partsDisposition = $validated['parts_disposition'] ?? [];
        $inspectionFee = (float) ($validated['inspection_fee'] ?? 0);

        DB::connection('company')->transaction(function () use ($service, $validated, $unrepairableDate, $partsDisposition, $inspectionFee) {
            $chargedPartsTotal = 0.0;

            foreach ($service->serviceProducts as $sp) {
                $disposition = $partsDisposition[$sp->id] ?? 'restock';

                if ($disposition === 'restock') {
                    if ($sp->store_id !== null) {
                        $this->stock->recordServiceRestock($sp, $sp->quantity);
                    }
                    if ($sp->unit_cost !== null) {
                        $this->ledger->postCogsReversal($sp, $sp->quantity);
                    }
                    $sp->update(['disposition' => 'restocked']);
                } elseif ($disposition === 'write_off') {
                    // Physical part was ruined or consumed and cannot be returned to shelf.
                    // Stock remains deducted. Reclassify cost from COGS to Write-Offs.
                    if ($sp->unit_cost !== null) {
                        $this->ledger->postServicePartWriteOff($sp, $sp->quantity);
                    }
                    $sp->update(['disposition' => 'written_off']);
                } elseif ($disposition === 'charge') {
                    // Part stays with customer / customer agreed to pay.
                    // COGS stays in 5100. Sale price is added to customer invoice.
                    $sp->update(['disposition' => 'charged']);
                    $chargedPartsTotal += (float) $sp->line_total;
                }
            }

            $finalPrice = round($inspectionFee + $chargedPartsTotal, 2);

            $service->update([
                'status' => 'unrepairable',
                'unrepairable_reason' => $validated['unrepairable_reason'] ?? null,
                'unrepairable_date' => $unrepairableDate,
                'price' => $finalPrice,
                'commission_amount' => null,
            ]);
        });

        return response()->json([
            'message' => 'Service marked as unrepairable.',
            'service' => $service->fresh(['customer', 'item', 'employee', 'serviceProducts.product', 'serviceProducts.store']),
        ]);
    }

    public function returnToCustomer(Request $request, int $id)
    {
        $service = Service::with(['payments', 'serviceProducts'])->findOrFail($id);

        if ($service->status !== 'unrepairable') {
            return response()->json([
                'message' => 'Only unrepairable services can be returned via this action.',
            ], 422);
        }

        $validated = $request->validate([
            'returned_date' => ['nullable', 'date'],
            'action' => ['nullable', 'string', Rule::in(['refund', 'collect', 'none'])],
            'refund_amount' => ['nullable', 'numeric', 'min:0.01'],
            'refund_method' => ['nullable', 'string', Rule::in(['cash', 'bank', 'upi', 'card', 'other'])],
            'refund_note' => ['nullable', 'string', 'max:255'],
            'collect_amount' => ['nullable', 'numeric', 'min:0.01'],
            'collect_method' => ['nullable', 'string', Rule::in(['cash', 'bank', 'upi', 'card', 'other'])],
            'collect_note' => ['nullable', 'string', 'max:255'],
        ]);

        $returnedDate = $validated['returned_date'] ?? now()->toDateString();
        $action = $validated['action'] ?? 'none';

        DB::connection('company')->transaction(function () use ($service, $validated, $returnedDate, $action) {
            if ($action === 'refund' && !empty($validated['refund_amount'])) {
                $payment = ServicePayment::create([
                    'service_id' => $service->id,
                    'amount' => $validated['refund_amount'],
                    'kind' => 'refund',
                    'method' => $validated['refund_method'] ?? 'cash',
                    'paid_at' => $returnedDate,
                    'note' => $validated['refund_note'] ?? 'Refund on unrepairable item return',
                ]);

                $this->ledger->postServiceRefund($payment);
            } elseif ($action === 'collect' && !empty($validated['collect_amount'])) {
                $payment = ServicePayment::create([
                    'service_id' => $service->id,
                    'amount' => $validated['collect_amount'],
                    'kind' => 'payment',
                    'method' => $validated['collect_method'] ?? 'cash',
                    'paid_at' => $returnedDate,
                    'note' => $validated['collect_note'] ?? 'Settled on unrepairable item return',
                ]);

                $this->ledger->postServicePayment($payment);
            }

            $service->update([
                'status' => 'returned_unrepairable',
                'returned_date' => $returnedDate,
            ]);
        });

        return response()->json([
            'message' => 'Item returned to customer.',
            'service' => $service->fresh(['customer', 'item', 'employee', 'payments']),
        ]);
    }

    public function updatePrice(Request $request, int $id)
    {
        $service = Service::findOrFail($id);

        $validated = $request->validate([
            'price' => ['required', 'numeric', 'min:0'],
            'advance_amount' => ['nullable', 'numeric', 'min:0'],
            'commission_type' => ['nullable', 'string', Rule::in(['flat', 'percentage'])],
            'commission_value' => ['nullable', 'numeric', 'min:0', 'required_with:commission_type'],
        ]);

        $advanceAmount = array_key_exists('advance_amount', $validated)
            ? $validated['advance_amount']
            : $service->advance_amount;

        if ($response = $this->validateAdvanceAgainstPrice($validated['price'], $advanceAmount)) {
            return $response;
        }

        // Commission was already earned and snapshotted at completion —
        // editing the price afterwards shouldn't silently change what's owed.
        if ($service->commission_amount === null) {
            $commissionType = array_key_exists('commission_type', $validated) ? $validated['commission_type'] : $service->commission_type;
            $commissionValue = array_key_exists('commission_value', $validated) ? $validated['commission_value'] : $service->commission_value;

            if ($response = $this->validateCommission($validated['price'], $commissionType, $commissionValue)) {
                return $response;
            }
        } else {
            unset($validated['commission_type'], $validated['commission_value']);
        }

        $service->update($validated);

        return response()->json([
            'message' => 'Service price updated.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    /**
     * An advance bigger than the price it's being collected against doesn't
     * make sense — catches that whether the price and advance are set
     * together at creation, or the advance was set earlier and the price is
     * only being finalized now.
     */
    private function validateAdvanceAgainstPrice(?float $price, ?float $advanceAmount)
    {
        if ($price !== null && $advanceAmount !== null && $advanceAmount > $price) {
            return response()->json([
                'message' => "Advance amount can't exceed the price.",
                'errors' => ['advance_amount' => ["Advance amount can't exceed the price."]],
            ], 422);
        }

        return null;
    }

    /**
     * A flat commission bigger than the price it's drawn from doesn't make
     * sense; a percentage commission can't exceed 100%.
     */
    private function validateCommission(?float $price, ?string $commissionType, ?float $commissionValue)
    {
        if ($commissionType === null || $commissionValue === null) {
            return null;
        }

        if ($commissionType === 'percentage' && $commissionValue > 100) {
            return response()->json([
                'message' => "Commission percentage can't exceed 100%.",
                'errors' => ['commission_value' => ["Commission percentage can't exceed 100%."]],
            ], 422);
        }

        if ($commissionType === 'flat' && $price !== null && $commissionValue > $price) {
            return response()->json([
                'message' => "Commission amount can't exceed the price.",
                'errors' => ['commission_value' => ["Commission amount can't exceed the price."]],
            ], 422);
        }

        return null;
    }
}
