<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Service;

class CustomerBalanceController extends Controller
{
    /**
     * Every customer with an outstanding balance across their services
     * (total priced amount minus total payments received).
     */
    public function index()
    {
        $customers = Customer::with(['services' => function ($query) {
            $query->select('id', 'customer_id', 'price')->with('payments:id,service_id,amount,kind');
        }])->get();

        $result = $customers
            ->map(function (Customer $customer) {
                $totalBilled = (float) $customer->services->sum(fn ($service) => (float) ($service->price ?? 0));
                $totalPaid = (float) $customer->services->sum(function ($service) {
                    $paid = (float) $service->payments->where('kind', '!=', 'refund')->sum('amount');
                    $refunded = (float) $service->payments->where('kind', 'refund')->sum('amount');

                    return $paid - $refunded;
                });

                return [
                    'customer_id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'total_billed' => round($totalBilled, 2),
                    'total_paid' => round($totalPaid, 2),
                    'balance' => round($totalBilled - $totalPaid, 2),
                ];
            })
            ->filter(fn ($row) => $row['balance'] > 0)
            ->sortByDesc('balance')
            ->values();

        return response()->json($result);
    }

    /**
     * One customer's per-service billing/payment breakdown.
     */
    public function show(int $customerId)
    {
        $customer = Customer::findOrFail($customerId);

        $services = $customer->services()
            ->with('payments')
            ->latest('service_date')
            ->get()
            ->map(function (Service $service) {
                $price = $service->price !== null ? (float) $service->price : null;
                $paid = (float) $service->payments->where('kind', '!=', 'refund')->sum('amount');
                $refunded = (float) $service->payments->where('kind', 'refund')->sum('amount');
                $netPaid = round($paid - $refunded, 2);

                return [
                    'id' => $service->id,
                    'ref_no' => $service->ref_no,
                    'status' => $service->status,
                    'service_date' => $service->service_date?->format('Y-m-d'),
                    'price' => $price,
                    'paid' => $netPaid,
                    'balance' => $price !== null ? round($price - $netPaid, 2) : null,
                ];
            });

        $totalBilled = round($services->sum(fn ($service) => $service['price'] ?? 0), 2);
        $totalPaid = round($services->sum('paid'), 2);

        return response()->json([
            'customer_id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'total_billed' => $totalBilled,
            'total_paid' => $totalPaid,
            'balance' => round($totalBilled - $totalPaid, 2),
            'services' => $services,
        ]);
    }
}
