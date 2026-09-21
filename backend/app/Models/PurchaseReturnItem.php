<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseReturnItem extends Model
{
    protected $connection = 'company';

    protected $table = 'purchase_return_items';

    protected $fillable = [
        'purchase_return_id',
        'purchase_item_id',
        'quantity',
        'line_total',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'line_total' => 'decimal:2',
    ];

    public function purchaseReturn()
    {
        return $this->belongsTo(PurchaseReturn::class);
    }

    public function purchaseItem()
    {
        return $this->belongsTo(PurchaseItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }
}
