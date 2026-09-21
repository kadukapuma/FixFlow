<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceProduct extends Model
{
    protected $connection = 'company';

    protected $table = 'service_products';

    protected $fillable = [
        'service_id',
        'product_id',
        'store_id',
        'quantity',
        'unit_price',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'quantity' => 'integer',
    ];

    protected $appends = [
        'line_total',
    ];

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function getLineTotalAttribute(): float
    {
        return round($this->quantity * (float) $this->unit_price, 2);
    }
}
