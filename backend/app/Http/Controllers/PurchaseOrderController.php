<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Store;
use App\Models\Supplier;
use App\Services\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PurchaseOrderController extends Controller
{
    public function __construct(private PurchaseService $purchaseService)
    {
    }

    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier:id,name', 'store:id,name', 'items.product:id,name'])
            ->latest('order_date')
            ->latest('id');

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->query('supplier_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->boolean('all')) {
            return response()->json($query->get());
        }

        $orders = $query->paginate((int) $request->query('per_page', 15))
            ->through(fn (PurchaseOrder $po) => [
                'id' => $po->id,
                'ref_no' => $po->ref_no,
                'supplier_id' => $po->supplier_id,
                'supplier_name' => $po->supplier?->name,
                'store_id' => $po->store_id,
                'store_name' => $po->store?->name,
                'order_date' => $po->order_date?->format('Y-m-d'),
                'expected_date' => $po->expected_date?->format('Y-m-d'),
                'status' => $po->status,
                'total' => (float) $po->total,
                'items_count' => $po->items->count(),
                'note' => $po->note,
            ]);

        return response()->json($orders);
    }

    public function show(int $id)
    {
        $po = PurchaseOrder::with(['supplier', 'store', 'items.product', 'purchase'])->findOrFail($id);

        return response()->json([
            'id' => $po->id,
            'ref_no' => $po->ref_no,
            'supplier_id' => $po->supplier_id,
            'supplier' => $po->supplier,
            'store_id' => $po->store_id,
            'store' => $po->store,
            'order_date' => $po->order_date?->format('Y-m-d'),
            'expected_date' => $po->expected_date?->format('Y-m-d'),
            'status' => $po->status,
            'total' => (float) $po->total,
            'note' => $po->note,
            'purchase_id' => $po->purchase?->id,
            'items' => $po->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name,
                'quantity' => $item->quantity,
                'unit_cost' => (float) $item->unit_cost,
                'discount_type' => $item->discount_type,
                'discount_value' => (float) $item->discount_value,
                'line_total' => (float) $item->line_total,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', Rule::exists(Supplier::class, 'id')->where('is_active', true)],
            'store_id' => ['nullable', 'integer', Rule::exists(Store::class, 'id')],
            'order_date' => ['required', 'date'],
            'expected_date' => ['nullable', 'date', 'after_or_equal:order_date'],
            'note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists(Product::class, 'id'), 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0.01'],
            'items.*.discount_type' => ['nullable', 'string', Rule::in(['percent', 'amount'])],
            'items.*.discount_value' => ['nullable', 'numeric', 'min:0'],
        ]);

        $order = $this->purchaseService->createPurchaseOrder($validated);

        return response()->json([
            'message' => 'Purchase order created successfully.',
            'purchase_order' => $order,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $po = PurchaseOrder::findOrFail($id);

        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', Rule::exists(Supplier::class, 'id')->where('is_active', true)],
            'store_id' => ['nullable', 'integer', Rule::exists(Store::class, 'id')],
            'order_date' => ['required', 'date'],
            'expected_date' => ['nullable', 'date', 'after_or_equal:order_date'],
            'note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists(Product::class, 'id'), 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0.01'],
            'items.*.discount_type' => ['nullable', 'string', Rule::in(['percent', 'amount'])],
            'items.*.discount_value' => ['nullable', 'numeric', 'min:0'],
        ]);

        $order = $this->purchaseService->updatePurchaseOrder($po, $validated);

        return response()->json([
            'message' => 'Purchase order updated successfully.',
            'purchase_order' => $order,
        ]);
    }

    public function cancel(int $id)
    {
        $po = PurchaseOrder::findOrFail($id);

        $order = $this->purchaseService->cancelPurchaseOrder($po);

        return response()->json([
            'message' => 'Purchase order cancelled successfully.',
            'purchase_order' => $order,
        ]);
    }
}
