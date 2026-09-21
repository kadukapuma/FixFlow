<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseOrder;
use App\Models\Store;
use App\Models\Supplier;
use App\Services\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PurchaseController extends Controller
{
    public function __construct(private PurchaseService $purchaseService)
    {
    }

    public function index(Request $request)
    {
        $query = Purchase::with([
            'supplier:id,name',
            'store:id,name',
            'items:id,purchase_id,quantity,line_total',
            'items.returnItems:id,purchase_item_id,quantity',
            'payments:id,purchase_id,amount,kind',
            'returns:id,purchase_id,total',
        ])
            ->latest('purchase_date')
            ->latest('id');

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->query('supplier_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->boolean('payable')) {
            $query->where('status', '!=', 'cancelled');
        }

        if ($request->boolean('returnable')) {
            $query->where('status', '!=', 'cancelled');
        }

        $collection = $query->get()->map(function (Purchase $p) {
            $paidTotal = $p->paidTotal();
            $returnedTotal = $p->returnedTotal();
            $balance = $p->balance();
            $paymentStatus = $p->paymentStatus();

            return [
                'id' => $p->id,
                'ref_no' => $p->ref_no,
                'supplier_id' => $p->supplier_id,
                'supplier_name' => $p->supplier?->name,
                'store_id' => $p->store_id,
                'store_name' => $p->store?->name,
                'purchase_order_id' => $p->purchase_order_id,
                'purchase_date' => $p->purchase_date?->format('Y-m-d'),
                'supplier_invoice_no' => $p->supplier_invoice_no,
                'status' => $p->status,
                'total' => (float) $p->total,
                'paid_total' => $paidTotal,
                'returned_total' => $returnedTotal,
                'balance' => $balance,
                'payment_status' => $paymentStatus,
                'items_count' => $p->items->count(),
                'returnable_items_count' => $p->items->filter(fn ($item) => $item->returnableQuantity() > 0)->count(),
                'note' => $p->note,
            ];
        });

        if ($request->boolean('payable')) {
            $collection = $collection->filter(fn ($row) => abs($row['balance']) > 0.005)->values();
        }

        if ($request->boolean('returnable')) {
            $collection = $collection->filter(fn ($row) => $row['returnable_items_count'] > 0)->values();
        }

        if ($request->boolean('all')) {
            return response()->json($collection);
        }

        // Paginate manually from filtered collection
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 15);
        $total = $collection->count();
        $results = $collection->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'current_page' => $page,
            'data' => $results,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage),
        ]);
    }

    public function show(int $id)
    {
        $purchase = Purchase::with([
            'supplier',
            'store',
            'purchaseOrder:id,ref_no,order_date',
            'items.product:id,name',
            'items.returnItems',
            'payments' => fn ($q) => $q->latest('paid_at')->latest('id'),
            'returns' => fn ($q) => $q->latest('return_date')->latest('id'),
            'returns.items.purchaseItem.product:id,name',
        ])->findOrFail($id);

        return response()->json([
            'id' => $purchase->id,
            'ref_no' => $purchase->ref_no,
            'supplier_id' => $purchase->supplier_id,
            'supplier' => $purchase->supplier,
            'store_id' => $purchase->store_id,
            'store' => $purchase->store,
            'purchase_order_id' => $purchase->purchase_order_id,
            'purchase_order' => $purchase->purchaseOrder ? [
                'id' => $purchase->purchaseOrder->id,
                'ref_no' => $purchase->purchaseOrder->ref_no,
                'order_date' => $purchase->purchaseOrder->order_date?->format('Y-m-d'),
            ] : null,
            'purchase_date' => $purchase->purchase_date?->format('Y-m-d'),
            'supplier_invoice_no' => $purchase->supplier_invoice_no,
            'status' => $purchase->status,
            'total' => (float) $purchase->total,
            'paid_total' => $purchase->paidTotal(),
            'returned_total' => $purchase->returnedTotal(),
            'balance' => $purchase->balance(),
            'payment_status' => $purchase->paymentStatus(),
            'note' => $purchase->note,
            'cancelled_at' => $purchase->cancelled_at?->format('Y-m-d H:i:s'),
            'items' => $purchase->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name,
                'quantity' => $item->quantity,
                'returned_quantity' => $item->returnedQuantity(),
                'returnable_quantity' => $item->returnableQuantity(),
                'unit_cost' => (float) $item->unit_cost,
                'discount_type' => $item->discount_type,
                'discount_value' => (float) $item->discount_value,
                'line_total' => (float) $item->line_total,
            ]),
            'payments' => $purchase->payments->map(fn ($p) => [
                'id' => $p->id,
                'ref_no' => $p->ref_no,
                'kind' => $p->kind,
                'amount' => (float) $p->amount,
                'method' => $p->method,
                'paid_at' => $p->paid_at?->format('Y-m-d'),
                'note' => $p->note,
            ]),
            'returns' => $purchase->returns->map(fn ($ret) => [
                'id' => $ret->id,
                'ref_no' => $ret->ref_no,
                'return_date' => $ret->return_date?->format('Y-m-d'),
                'total' => (float) $ret->total,
                'reason' => $ret->reason,
                'items' => $ret->items->map(fn ($ritem) => [
                    'id' => $ritem->id,
                    'product_name' => $ritem->purchaseItem?->product?->name,
                    'quantity' => $ritem->quantity,
                    'line_total' => (float) $ritem->line_total,
                ]),
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', Rule::exists(Supplier::class, 'id')->where('is_active', true)],
            'store_id' => ['required', 'integer', Rule::exists(Store::class, 'id')],
            'purchase_order_id' => ['nullable', 'integer', Rule::exists(PurchaseOrder::class, 'id')],
            'purchase_date' => ['required', 'date'],
            'supplier_invoice_no' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists(Product::class, 'id'), 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0.01'],
            'items.*.discount_type' => ['nullable', 'string', Rule::in(['percent', 'amount'])],
            'items.*.discount_value' => ['nullable', 'numeric', 'min:0'],
        ]);

        $purchase = $this->purchaseService->createPurchase($validated);

        return response()->json([
            'message' => 'Purchase recorded successfully.',
            'purchase' => $purchase,
        ], 201);
    }

    public function cancel(int $id)
    {
        $purchase = Purchase::findOrFail($id);

        $cancelledPurchase = $this->purchaseService->cancelPurchase($purchase);

        return response()->json([
            'message' => 'Purchase cancelled successfully.',
            'purchase' => $cancelledPurchase,
        ]);
    }
}
