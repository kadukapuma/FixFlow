<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $connection = 'company';

    protected $table = 'employees';

    protected $fillable = [
        'name',
        'address',
        'nic',
        'email',
        'phone',
        'dob',
        'is_active',
    ];

    protected $casts = [
        'dob' => 'date:Y-m-d',
        'is_active' => 'boolean',
    ];

    public function services()
    {
        return $this->hasMany(Service::class);
    }
}
