<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $connection = 'company';

    protected $table = 'services';

    protected $fillable = [
        'item_id',
        'employee_id',
        'customer_id',
        'fault',
        'note',
        'status',
        'price',
    ];

    protected $casts = [
        'price' => 'decimal:2',
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
