<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'provisioning_error',
        'logo_path',
        'address',
        'phone',
        'terms_and_conditions',
        'subscription_price',
        'active_until',
        'grace_ends_at',
        'subscription_deactivated_at',
    ];

    protected $hidden = [
        'owner_password',
        'database_password',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'active_until' => 'datetime',
        'grace_ends_at' => 'datetime',
        'subscription_deactivated_at' => 'datetime',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_PROVISIONING = 'provisioning';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_FAILED = 'failed';

    public const SUBSCRIPTION_ACTIVE = 'active';
    public const SUBSCRIPTION_GRACE = 'grace';
    public const SUBSCRIPTION_EXPIRED = 'expired';
    public const SUBSCRIPTION_NONE = 'none';

    /**
     * Where the company sits in its billing cycle right now, based on
     * active_until/grace_ends_at rather than is_active (which an admin can
     * also toggle manually, independent of billing).
     */
    public function subscriptionStatus(): string
    {
        if (!$this->active_until || !$this->grace_ends_at) {
            return self::SUBSCRIPTION_NONE;
        }

        $now = now();

        if ($now->lt($this->active_until)) {
            return self::SUBSCRIPTION_ACTIVE;
        }

        if ($now->lt($this->grace_ends_at)) {
            return self::SUBSCRIPTION_GRACE;
        }

        return self::SUBSCRIPTION_EXPIRED;
    }

    public function subscriptionReceipts(): HasMany
    {
        return $this->hasMany(SubscriptionReceipt::class);
    }
}
