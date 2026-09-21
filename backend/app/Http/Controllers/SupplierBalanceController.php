<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\Supplier;

class SupplierBalanceController extends Controller
{
    /**
     * Every supplier with an outstanding balance or credit across their active purchases
     * (total net purchases minus returns minus payments plus refunds).
     * The sum of supplier balances equals Account 2000 (Accounts Payable).
     */
    public function index()
    {
        $suppliers = Supplier::with([
            'purchases' => function ($query) {
                $query->where('status', '!=', 'cancelled')
                    ->with(['payments:id,purchase_id,amount,kind', 'returns:id,purchase_id,total']);
            },
        ])->get();

        $result = $suppliers
            ->map(function (Supplier $supplier) {
                $totalPurchased = 0.0;
                $totalPaid = 0.0;
                $totalReturned = 0.0;

                foreach ($supplier->purchases as $purchase) {
                    $totalPurchased += (float) $purchase->total;
                    $totalReturned += (float) $purchase->returns->sum('total');

                    $paid = (float) $purchase->payments->where('kind', 'payment')->sum('amount');
                    $refunded = (float) $purchase->payments->where('kind', 'refund')->sum('amount');
                    $totalPaid += ($paid - $refunded);
                }

                $netBilled = round($totalPurchased - $totalReturned, 2);
                $totalPaid = round($totalPaid, 2);
                $balance = round($netBilled - $totalPaid, 2);

                return [
                    'supplier_id' => $supplier->id,
                    'name' => $supplier->name,
                    'phone' => $supplier->phone,
                    'contact_person' => $supplier->contact_person,
                    'total_purchased' => $netBilled,
                    'total_paid' => $totalPaid,
                    'balance' => $balance,
                ];
            })
            ->filter(fn ($row) => abs($row['balance']) > 0.005)
            ->sortByDesc('balance')
            ->values();

        return response()->json($result);
    }

    /**
     * One supplier's per-purchase billing/payment breakdown.
     */
    public function show(int $supplierId)
    {
        $supplier = Supplier::findOrFail($supplierId);

        $purchases = $supplier->purchases()
            ->where('status', '!=', 'cancelled')
            ->with(['payments', 'returns'])
            ->latest('purchase_date')
            ->latest('id')
            ->get()
            ->map(function (Purchase $purchase) {
                $total = (float) $purchase->total;
                $returned = round((float) $purchase->returns->sum('total'), 2);

                $paidAmounts = (float) $purchase->payments->where('kind', 'payment')->sum('amount');
                $refundAmounts = (float) $purchase->payments->where('kind', 'refund')->sum('amount');
                $paid = round($paidAmounts - $refundAmounts, 2);

                $balance = round($total - $returned - $paid, 2);

                return [
                    'id' => $purchase->id,
                    'ref_no' => $purchase->ref_no,
                    'status' => $purchase->status,
                    'purchase_date' => $purchase->purchase_date?->format('Y-m-d'),
                    'total' => $total,
                    'returned' => $returned,
                    'net_total' => round($total - $returned, 2),
                    'paid' => $paid,
                    'balance' => $balance,
                    'payment_status' => $purchase->paymentStatus(),
                ];
            });

        $totalPurchased = round($purchases->sum('net_total'), 2);
        $totalPaid = round($purchases->sum('paid'), 2);

        return response()->json([
            'supplier_id' => $supplier->id,
            'name' => $supplier->name,
            'phone' => $supplier->phone,
            'contact_person' => $supplier->contact_person,
            'total_purchased' => $totalPurchased,
            'total_paid' => $totalPaid,
            'balance' => round($totalPurchased - $totalPaid, 2),
            'purchases' => $purchases,
        ]);
    }
}
