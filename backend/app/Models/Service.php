<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $connection = 'company';

    protected $table = 'services';

    protected $fillable = [
        'ref_no',
        'item_id',
        'employee_id',
        'customer_id',
        'fault',
        'note',
        'status',
        'price',
        'service_date',
        'started_date',
        'completed_date',
        'delivered_date',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'service_date' => 'date:Y-m-d',
        'started_date' => 'date:Y-m-d',
        'completed_date' => 'date:Y-m-d',
        'delivered_date' => 'date:Y-m-d',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function work()
    {
        return $this->hasMany(Work::class);
    }
}
