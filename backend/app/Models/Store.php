<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    protected $connection = 'company';

    protected $table = 'stores';

    protected $fillable = [
        'name',
        'address',
        'phone',
        'contact_person',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
