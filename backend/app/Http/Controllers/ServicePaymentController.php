<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\ServicePayment;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServicePaymentController extends Controller
{
    public function __construct(private LedgerService $ledger)
    {
    }

    public function index(int $serviceId)
    {
        $service = Service::findOrFail($serviceId);

        return response()->json($service->payments()->latest('paid_at')->latest('id')->get());
    }

    public function store(Request $request, int $serviceId)
    {
        $service = Service::findOrFail($serviceId);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', 'string', Rule::in(['cash', 'bank', 'upi', 'card', 'other'])],
            'paid_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        if ($service->price !== null) {
            $alreadyPaid = (float) $service->payments()->sum('amount');
            $balanceDue = (float) $service->price - $alreadyPaid;

            if ($validated['amount'] > $balanceDue) {
                return response()->json([
                    'message' => "Payment amount can't exceed the remaining balance due (".number_format($balanceDue, 2).').',
                    'errors' => ['amount' => ["Payment amount can't exceed the remaining balance due."]],
                ], 422);
            }
        }

        $validated['paid_at'] ??= now()->toDateString();

        $payment = ServicePayment::create([
            'service_id' => $service->id,
            'amount' => $validated['amount'],
            'method' => $validated['method'],
            'paid_at' => $validated['paid_at'],
            'note' => $validated['note'] ?? null,
        ]);

        $this->ledger->postServicePayment($payment);

        return response()->json([
            'message' => 'Payment recorded.',
            'payment' => $payment,
            'paid_total' => (float) $service->payments()->sum('amount'),
        ], 201);
    }
}
