<?php

namespace App\Http\Controllers;

use App\Models\CommissionPayout;
use App\Models\Employee;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommissionController extends Controller
{
    public function __construct(private LedgerService $ledger)
    {
    }

    /**
     * Every technician who has earned or been paid a commission, with their
     * running earned/paid/outstanding totals.
     */
    public function index()
    {
        $employees = Employee::withSum(
            ['services as total_earned' => fn ($q) => $q->whereNotNull('commission_amount')],
            'commission_amount'
        )->withSum('commissionPayouts as total_paid', 'amount')
            ->get()
            ->filter(fn ($employee) => $employee->total_earned > 0 || $employee->total_paid > 0)
            ->map(function ($employee) {
                $earned = (float) $employee->total_earned;
                $paid = (float) $employee->total_paid;

                return [
                    'employee_id' => $employee->id,
                    'name' => $employee->name,
                    'total_earned' => $earned,
                    'total_paid' => $paid,
                    'outstanding' => round($earned - $paid, 2),
                ];
            })
            ->values();

        return response()->json($employees);
    }

    /**
     * One technician's commission-earning services and payout history.
     */
    public function show(int $employeeId)
    {
        $employee = Employee::findOrFail($employeeId);

        $services = $employee->services()
            ->whereNotNull('commission_amount')
            ->with(['item', 'customer'])
            ->latest('completed_date')
            ->get(['id', 'ref_no', 'item_id', 'customer_id', 'price', 'commission_type', 'commission_value', 'commission_amount', 'completed_date']);

        $payouts = $employee->commissionPayouts()->latest('paid_at')->latest('id')->get();

        $earned = (float) $services->sum('commission_amount');
        $paid = (float) $payouts->sum('amount');

        return response()->json([
            'employee' => $employee,
            'services' => $services,
            'payouts' => $payouts,
            'total_earned' => $earned,
            'total_paid' => $paid,
            'outstanding' => round($earned - $paid, 2),
        ]);
    }

    /**
     * Record a payout against a technician's outstanding commission balance.
     */
    public function payout(Request $request, int $employeeId)
    {
        $employee = Employee::findOrFail($employeeId);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', 'string', Rule::in(['cash', 'bank', 'upi', 'card', 'other'])],
            'paid_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $earned = (float) $employee->services()->whereNotNull('commission_amount')->sum('commission_amount');
        $paid = (float) $employee->commissionPayouts()->sum('amount');
        $outstanding = round($earned - $paid, 2);

        if ($validated['amount'] > $outstanding) {
            return response()->json([
                'message' => "Payout amount can't exceed the outstanding commission balance (".number_format($outstanding, 2).').',
                'errors' => ['amount' => ["Payout amount can't exceed the outstanding commission balance."]],
            ], 422);
        }

        $validated['paid_at'] ??= now()->toDateString();

        $payout = CommissionPayout::create([
            'employee_id' => $employee->id,
            'amount' => $validated['amount'],
            'method' => $validated['method'],
            'paid_at' => $validated['paid_at'],
            'note' => $validated['note'] ?? null,
        ]);

        $this->ledger->postCommissionPayout($payout);

        return response()->json([
            'message' => 'Commission payout recorded.',
            'payout' => $payout,
            'outstanding' => round($outstanding - $validated['amount'], 2),
        ], 201);
    }
}
