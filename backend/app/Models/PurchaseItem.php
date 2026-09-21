<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseItem extends Model
{
    protected $connection = 'company';

    protected $table = 'purchase_items';

    protected $fillable = [
        'purchase_id',
        'product_id',
        'quantity',
        'unit_cost',
        'discount_type',
        'discount_value',
        'line_total',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function returnItems()
    {
        return $this->hasMany(PurchaseReturnItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function returnedQuantity(): int
    {
        $items = $this->relationLoaded('returnItems') ? $this->returnItems : $this->returnItems()->get();

        return (int) $items->sum('quantity');
    }

    public function returnedTotal(): float
    {
        $items = $this->relationLoaded('returnItems') ? $this->returnItems : $this->returnItems()->get();

        return round((float) $items->sum('line_total'), 2);
    }

    public function returnableQuantity(): int
    {
        return max(0, $this->quantity - $this->returnedQuantity());
    }
}
