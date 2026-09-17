<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LedgerAccount extends Model
{
    protected $connection = 'company';

    protected $table = 'ledger_accounts';

    protected $fillable = [
        'code',
        'name',
        'type',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class, 'account_id');
    }
}
