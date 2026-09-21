<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $connection = 'company';

    protected $table = 'products';

    protected $fillable = [
        'name',
        'category_id',
        'brand_id',
        'purchase_price',
        'average_cost',
        'sale_price',
        'border_price',
        'is_active',
    ];

    protected $casts = [
        'purchase_price' => 'decimal:2',
        'average_cost' => 'decimal:4',
        'sale_price' => 'decimal:2',
        'border_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }
}
