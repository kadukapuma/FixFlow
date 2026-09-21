<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Filters shared by every list endpoint that backs a searchable picker on
     * the frontend: ?active=1 (active rows only), ?ids=1,2 (look up specific
     * rows, e.g. to label a pre-selected value) and ?search= (matched against
     * $searchColumns and, one level deep, $searchRelations as relation => column).
     */
    protected function applyPickerFilters(
        Request $request,
        Builder $query,
        array $searchColumns = ['name'],
        array $searchRelations = [],
    ): void {
        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }

        if ($ids = array_filter(array_map('intval', explode(',', (string) $request->query('ids', ''))))) {
            $query->whereIn('id', $ids);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search, $searchColumns, $searchRelations) {
                foreach ($searchColumns as $column) {
                    $q->orWhere($column, 'like', "%{$search}%");
                }

                foreach ($searchRelations as $relation => $column) {
                    $q->orWhereHas($relation, fn ($r) => $r->where($column, 'like', "%{$search}%"));
                }
            });
        }
    }
}
