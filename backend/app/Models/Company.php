<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = [
        'name',
        'subdomain',
        'database_name',
        'database_host',
        'database_port',
        'database_username',
        'database_password',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
