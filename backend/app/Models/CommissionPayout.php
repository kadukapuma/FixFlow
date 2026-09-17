<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionPayout extends Model
{
    protected $connection = 'company';

    protected $table = 'commission_payouts';

    protected $fillable = [
        'employee_id',
        'journal_entry_id',
        'amount',
        'method',
        'paid_at',
        'note',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date:Y-m-d',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
