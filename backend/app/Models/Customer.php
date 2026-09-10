<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $connection = 'company';

    protected $table = 'customers';

    protected $fillable = [
        'name',
        'nic',
        'phone',
        'address',
        'is_suspended',
    ];

    protected $casts = [
        'is_suspended' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(Item::class);
    }

    public function services()
    {
        return $this->hasMany(Service::class);
    }
}
