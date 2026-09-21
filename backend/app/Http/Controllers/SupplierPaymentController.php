<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\SupplierPayment;
use App\Services\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierPaymentController extends Controller
{
    public function __construct(private PurchaseService $purchaseService)
    {
    }

    public function index(Request $request)
    {
        $query = SupplierPayment::with(['purchase.supplier:id,name'])
            ->latest('paid_at')
            ->latest('id');

        if ($request->filled('purchase_id')) {
            $query->where('purchase_id', $request->query('purchase_id'));
        }

        if ($request->filled('supplier_id')) {
            $query->whereHas('purchase', fn ($q) => $q->where('supplier_id', $request->query('supplier_id')));
        }

        if ($request->filled('kind')) {
            $query->where('kind', $request->query('kind'));
        }

        $payments = $query->paginate((int) $request->query('per_page', 15))
            ->through(fn (SupplierPayment $p) => [
                'id' => $p->id,
                'ref_no' => $p->ref_no,
                'purchase_id' => $p->purchase_id,
                'purchase_ref_no' => $p->purchase?->ref_no,
                'supplier_id' => $p->purchase?->supplier_id,
                'supplier_name' => $p->purchase?->supplier?->name,
                'kind' => $p->kind,
                'amount' => (float) $p->amount,
                'method' => $p->method,
                'paid_at' => $p->paid_at?->format('Y-m-d'),
                'note' => $p->note,
            ]);

        return response()->json($payments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'purchase_id' => ['required', 'integer', Rule::exists(Purchase::class, 'id')],
            'kind' => ['nullable', 'string', Rule::in(['payment', 'refund'])],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', 'string', Rule::in(['cash', 'bank', 'upi', 'card', 'other'])],
            'paid_at' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $purchase = Purchase::findOrFail($validated['purchase_id']);

        $payment = $this->purchaseService->recordSupplierPayment($purchase, $validated);

        return response()->json([
            'message' => ($validated['kind'] ?? 'payment') === 'refund' ? 'Supplier refund recorded.' : 'Supplier payment recorded.',
            'payment' => $payment,
        ], 201);
    }
}
