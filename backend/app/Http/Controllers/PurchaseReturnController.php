<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Store;
use App\Services\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PurchaseReturnController extends Controller
{
    public function __construct(private PurchaseService $purchaseService)
    {
    }

    public function index(Request $request)
    {
        $query = PurchaseReturn::with([
            'purchase.supplier:id,name',
            'store:id,name',
            'items:id,purchase_return_id,quantity,line_total',
        ])
            ->latest('return_date')
            ->latest('id');

        if ($request->filled('purchase_id')) {
            $query->where('purchase_id', $request->query('purchase_id'));
        }

        if ($request->filled('supplier_id')) {
            $query->whereHas('purchase', fn ($q) => $q->where('supplier_id', $request->query('supplier_id')));
        }

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->query('store_id'));
        }

        $returns = $query->paginate((int) $request->query('per_page', 15))
            ->through(fn (PurchaseReturn $ret) => [
                'id' => $ret->id,
                'ref_no' => $ret->ref_no,
                'purchase_id' => $ret->purchase_id,
                'purchase_ref_no' => $ret->purchase?->ref_no,
                'supplier_id' => $ret->purchase?->supplier_id,
                'supplier_name' => $ret->purchase?->supplier?->name,
                'store_id' => $ret->store_id,
                'store_name' => $ret->store?->name,
                'return_date' => $ret->return_date?->format('Y-m-d'),
                'total' => (float) $ret->total,
                'items_count' => $ret->items->count(),
                'reason' => $ret->reason,
            ]);

        return response()->json($returns);
    }

    public function show(int $id)
    {
        $return = PurchaseReturn::with([
            'purchase.supplier',
            'store',
            'items.purchaseItem.product',
        ])->findOrFail($id);

        return response()->json([
            'id' => $return->id,
            'ref_no' => $return->ref_no,
            'purchase_id' => $return->purchase_id,
            'purchase_ref_no' => $return->purchase?->ref_no,
            'supplier_name' => $return->purchase?->supplier?->name,
            'store_id' => $return->store_id,
            'store_name' => $return->store?->name,
            'return_date' => $return->return_date?->format('Y-m-d'),
            'total' => (float) $return->total,
            'reason' => $return->reason,
            'items' => $return->items->map(fn ($item) => [
                'id' => $item->id,
                'purchase_item_id' => $item->purchase_item_id,
                'product_id' => $item->purchaseItem?->product_id,
                'product_name' => $item->purchaseItem?->product?->name,
                'quantity' => $item->quantity,
                'line_total' => (float) $item->line_total,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'purchase_id' => ['required', 'integer', Rule::exists(Purchase::class, 'id')],
            'store_id' => ['nullable', 'integer', Rule::exists(Store::class, 'id')],
            'return_date' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_item_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $purchase = Purchase::findOrFail($validated['purchase_id']);

        $return = $this->purchaseService->createPurchaseReturn($purchase, $validated);

        return response()->json([
            'message' => 'Purchase return recorded successfully.',
            'purchase_return' => $return,
        ], 201);
    }
}
