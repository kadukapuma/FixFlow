<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionReceipt extends Model
{
    protected $fillable = [
        'company_id',
        'file_path',
        'status',
        'amount',
        'note',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    // The raw storage path shouldn't leak to the frontend — it fetches the
    // file through the authenticated stream routes instead, and only needs
    // to know whether to render it as a PDF or an image.
    protected $hidden = [
        'file_path',
    ];

    protected $appends = [
        'is_pdf',
        'has_file',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function getIsPdfAttribute(): bool
    {
        return $this->file_path && str_ends_with(strtolower($this->file_path), '.pdf');
    }

    // An admin can delete the underlying file to reclaim server storage
    // while keeping this row for history — file_path is nulled out at that
    // point, so the frontend needs a way to tell "no file" apart from
    // "file_path just isn't loaded on this query".
    public function getHasFileAttribute(): bool
    {
        return (bool) $this->file_path;
    }
}
