<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = [
        'name',
        'subdomain',
        'status',
        'owner_name',
        'owner_email',
        'owner_password',
        'database_name',
        'database_host',
        'database_port',
        'database_username',
        'database_password',
        'is_active',
        'rejection_reason',
    ];

    protected $hidden = [
        'owner_password',
        'database_password',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
}
