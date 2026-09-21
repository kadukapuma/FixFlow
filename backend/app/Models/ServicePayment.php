<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServicePayment extends Model
{
    protected $connection = 'company';

    protected $table = 'service_payments';

    protected $fillable = [
        'service_id',
        'journal_entry_id',
        'amount',
        'kind',
        'method',
        'paid_at',
        'note',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date:Y-m-d',
    ];

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
