<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\Service;
use App\Models\Work;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    /**
     * Widest date range we'll ever chart — guards against a mistakenly huge
     * range (e.g. a typo'd year) rather than limiting genuine multi-year
     * selections, since revenueByRange() buckets by year past a point and
     * so stays cheap regardless of span.
     */
    protected const MAX_RANGE_DAYS = 3660;

    /** Ranges up to a month are charted week by week. */
    protected const WEEKLY_MAX_DAYS = 31;

    /** Ranges up to ~2 years are charted month by month; beyond that, by year. */
    protected const MONTHLY_MAX_DAYS = 731;

    public function summary(Request $request)
    {
        [$from, $to, $isDefaultRange] = $this->resolveRange($request);

        $deliveredServiceIds = Service::where('status', 'delivered')
            ->whereBetween('delivered_date', [$from, $to])
            ->pluck('id');

        $revenue = (float) Service::whereIn('id', $deliveredServiceIds)->sum('price');
        $cost = (float) Work::whereIn('service_id', $deliveredServiceIds)->sum('cost');

        // Unlike $cost (work on delivered services only), this is every job
        // worked on during the period — there's no date column on `work`
        // itself, so it's scoped through the service's own booking date.
        $totalWorkCost = (float) Work::whereHas('service', function ($query) use ($from, $to) {
            $query->whereBetween('service_date', [$from, $to]);
        })->sum('cost');

        // The pipeline (how many jobs are currently pending/in progress/etc.)
        // reflects the shop's state right now, not activity during the
        // selected period, so it's intentionally left un-scoped by date.
        $statusCounts = Service::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $topEmployees = Employee::query()
            ->withCount(['services as services_delivered' => function ($query) use ($from, $to) {
                $query->where('status', 'delivered')->whereBetween('delivered_date', [$from, $to]);
            }])
            ->withSum(['services as revenue' => function ($query) use ($from, $to) {
                $query->where('status', 'delivered')->whereBetween('delivered_date', [$from, $to]);
            }], 'price')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get(['id', 'name']);

        return response()->json([
            'range' => ['from' => $from, 'to' => $to],
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
            'revenue_by_range' => $this->revenueByRange($from, $to, $isDefaultRange),
            'top_employees' => $topEmployees->map(fn ($employee) => [
                'id' => $employee->id,
                'name' => $employee->name,
                'services_delivered' => (int) $employee->services_delivered,
                'revenue' => (float) ($employee->revenue ?? 0),
            ]),
        ]);
    }

    /**
     * Defaults to the current week (Monday through today) so the dashboard
     * opens on a quick, day-by-day snapshot rather than a whole month
     * bucketed into a handful of bars. The tenant can widen it via
     * ?from=&to=, at which point revenueByRange() switches to the coarser
     * week/month/year view appropriate for that wider span.
     */
    private function resolveRange(Request $request): array
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date', 'before_or_equal:today'],
            'to' => ['nullable', 'date', 'after_or_equal:from', 'before_or_equal:today'],
        ]);

        $isDefaultRange = !$request->filled('from') && !$request->filled('to');

        $from = Carbon::parse($validated['from'] ?? now()->startOfWeek()->toDateString())->startOfDay();
        $to = Carbon::parse($validated['to'] ?? now()->toDateString())->startOfDay();

        if ($from->diffInDays($to) > self::MAX_RANGE_DAYS) {
            $from = $to->copy()->subDays(self::MAX_RANGE_DAYS);
        }

        return [$from->toDateString(), $to->toDateString(), $isDefaultRange];
    }

    /**
     * The default current-week view stays day-by-day — the whole point is a
     * quick, granular look at "this week". Once the tenant explicitly picks
     * a wider custom range, a daily bar per day turns into unreadable
     * noise, so it switches to week-by-week for up to a month, month-by-month
     * out to ~2 years, and year-by-year beyond that.
     */
    private function revenueByRange(string $from, string $to, bool $isDefaultRange): array
    {
        $start = Carbon::parse($from);
        $end = Carbon::parse($to);
        $totalDays = $start->diffInDays($end) + 1;

        $granularity = match (true) {
            $isDefaultRange => 'day',
            $totalDays <= self::WEEKLY_MAX_DAYS => 'week',
            $totalDays <= self::MONTHLY_MAX_DAYS => 'month',
            default => 'year',
        };

        $rows = Service::where('status', 'delivered')
            ->whereBetween('delivered_date', [$from, $to])
            ->selectRaw('delivered_date as day, SUM(price) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $buckets = [];
        $order = [];

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            [$key, $bucketStart, $bucketEnd] = $this->bucketBounds($date, $granularity);

            if (!isset($buckets[$key])) {
                $buckets[$key] = ['start' => $bucketStart, 'end' => $bucketEnd, 'total' => 0.0];
                $order[] = $key;
            }

            $buckets[$key]['total'] += (float) ($rows[$date->toDateString()] ?? 0);
        }

        return array_map(fn ($key) => [
            'date' => $buckets[$key]['start']->toDateString(),
            'label' => $this->bucketLabel($buckets[$key], $granularity, $start, $end),
            'total' => $buckets[$key]['total'],
        ], $order);
    }

    /**
     * @return array{0: string, 1: Carbon, 2: Carbon} bucket key, start, end
     */
    private function bucketBounds(Carbon $date, string $granularity): array
    {
        return match ($granularity) {
            'day' => [
                $date->toDateString(),
                $date->copy(),
                $date->copy(),
            ],
            'week' => [
                $date->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
                $date->copy()->startOfWeek(Carbon::MONDAY),
                $date->copy()->endOfWeek(Carbon::SUNDAY),
            ],
            'month' => [
                $date->format('Y-m'),
                $date->copy()->startOfMonth(),
                $date->copy()->endOfMonth(),
            ],
            default => [
                $date->format('Y'),
                $date->copy()->startOfYear(),
                $date->copy()->endOfYear(),
            ],
        };
    }

    private function bucketLabel(array $bucket, string $granularity, Carbon $rangeStart, Carbon $rangeEnd): string
    {
        // Clip a partial first/last week to the actually-selected range,
        // rather than labeling it with days outside what was requested.
        $labelStart = $bucket['start']->lt($rangeStart) ? $rangeStart : $bucket['start'];
        $labelEnd = $bucket['end']->gt($rangeEnd) ? $rangeEnd : $bucket['end'];

        return match ($granularity) {
            'day' => $bucket['start']->format('d M'),
            'week' => $labelStart->format('d M') . '–' . $labelEnd->format('d M'),
            'month' => $bucket['start']->format('M Y'),
            default => $bucket['start']->format('Y'),
        };
    }
}
