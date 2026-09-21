<?php

namespace App\Models;

use App\Traits\HasRefNo;
use Illuminate\Database\Eloquent\Model;

class SupplierPayment extends Model
{
    use HasRefNo;

    protected $connection = 'company';

    protected $table = 'supplier_payments';

    protected $fillable = [
        'ref_no',
        'purchase_id',
        'journal_entry_id',
        'kind',
        'amount',
        'method',
        'paid_at',
        'note',
    ];

    protected $casts = [
        'paid_at' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    public function refNoPrefix(): string
    {
        return 'PAY';
    }

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
