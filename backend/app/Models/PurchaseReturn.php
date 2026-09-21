<?php

namespace App\Models;

use App\Traits\HasRefNo;
use Illuminate\Database\Eloquent\Model;

class PurchaseReturn extends Model
{
    use HasRefNo;

    protected $connection = 'company';

    protected $table = 'purchase_returns';

    protected $fillable = [
        'ref_no',
        'purchase_id',
        'store_id',
        'journal_entry_id',
        'return_date',
        'total',
        'reason',
    ];

    protected $casts = [
        'return_date' => 'date:Y-m-d',
        'total' => 'decimal:2',
    ];

    public function refNoPrefix(): string
    {
        return 'RET';
    }

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseReturnItem::class);
    }
}
