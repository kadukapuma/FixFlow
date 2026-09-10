<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\Service;
use App\Models\Work;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function summary()
    {
        $deliveredServiceIds = Service::where('status', 'delivered')->pluck('id');

        $revenue = (float) Service::whereIn('id', $deliveredServiceIds)->sum('price');
        $cost = (float) Work::whereIn('service_id', $deliveredServiceIds)->sum('cost');
        $totalWorkCost = (float) Work::sum('cost');

        $statusCounts = Service::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $topEmployees = Employee::query()
            ->withCount(['services as services_delivered' => function ($query) {
                $query->where('status', 'delivered');
            }])
            ->withSum(['services as revenue' => function ($query) {
                $query->where('status', 'delivered');
            }], 'price')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get(['id', 'name']);

        return response()->json([
            'revenue' => $revenue,
            'cost' => $cost,
            'profit' => $revenue - $cost,
            'total_work_cost' => $totalWorkCost,
            'totals' => [
                'customers' => Customer::count(),
                'employees' => Employee::count(),
                'services' => Service::count(),
            ],
            'status_counts' => [
                'pending' => (int) ($statusCounts['pending'] ?? 0),
                'in_progress' => (int) ($statusCounts['in_progress'] ?? 0),
                'completed' => (int) ($statusCounts['completed'] ?? 0),
                'delivered' => (int) ($statusCounts['delivered'] ?? 0),
            ],
            'revenue_last_7_days' => $this->revenueLast7Days(),
            'top_employees' => $topEmployees->map(fn ($employee) => [
                'id' => $employee->id,
                'name' => $employee->name,
                'services_delivered' => (int) $employee->services_delivered,
                'revenue' => (float) ($employee->revenue ?? 0),
            ]),
        ]);
    }

    private function revenueLast7Days(): array
    {
        $days = collect(range(6, 0))->map(fn ($daysAgo) => Carbon::today()->subDays($daysAgo));

        $rows = Service::where('status', 'delivered')
            ->where('updated_at', '>=', Carbon::today()->subDays(6))
            ->selectRaw('DATE(updated_at) as day, SUM(price) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return $days->map(fn (Carbon $day) => [
            'date' => $day->toDateString(),
            'label' => $day->format('d M'),
            'total' => (float) ($rows[$day->toDateString()] ?? 0),
        ])->values()->all();
    }
}
