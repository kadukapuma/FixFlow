<?php

namespace App\Models;

use App\Traits\HasRefNo;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use HasRefNo;

    protected $connection = 'company';

    protected $table = 'purchase_orders';

    protected $fillable = [
        'ref_no',
        'supplier_id',
        'store_id',
        'order_date',
        'expected_date',
        'status',
        'total',
        'note',
    ];

    protected $casts = [
        'order_date' => 'date:Y-m-d',
        'expected_date' => 'date:Y-m-d',
        'total' => 'decimal:2',
    ];

    public function refNoPrefix(): string
    {
        return 'PO';
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function purchase()
    {
        return $this->hasOne(Purchase::class);
    }
}
