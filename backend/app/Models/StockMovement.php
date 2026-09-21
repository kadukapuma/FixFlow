<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $connection = 'company';

    protected $table = 'stock_movements';

    public const TYPES = [
        'opening',
        'adjustment',
        'damage',
        'transfer_out',
        'transfer_in',
        'service_consumption',
        'service_restock',
    ];

    protected $fillable = [
        'product_id',
        'store_id',
        'type',
        'quantity',
        'service_product_id',
        'related_movement_id',
        'note',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function serviceProduct()
    {
        return $this->belongsTo(ServiceProduct::class);
    }

    public function relatedMovement()
    {
        return $this->belongsTo(StockMovement::class, 'related_movement_id');
    }
}
