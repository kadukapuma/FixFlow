<?php

namespace App\Models;

use App\Traits\HasRefNo;
use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    use HasRefNo;

    protected $connection = 'company';

    protected $table = 'purchases';

    protected $fillable = [
        'ref_no',
        'supplier_id',
        'store_id',
        'purchase_order_id',
        'journal_entry_id',
        'cancel_journal_entry_id',
        'purchase_date',
        'supplier_invoice_no',
        'status',
        'total',
        'note',
        'cancelled_at',
    ];

    protected $casts = [
        'purchase_date' => 'date:Y-m-d',
        'cancelled_at' => 'datetime',
        'total' => 'decimal:2',
    ];

    public function refNoPrefix(): string
    {
        return 'PUR';
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function payments()
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function returns()
    {
        return $this->hasMany(PurchaseReturn::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function cancelJournalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'cancel_journal_entry_id');
    }

    public function paidTotal(): float
    {
        $payments = $this->relationLoaded('payments') ? $this->payments : $this->payments()->get();
        $paid = $payments->where('kind', 'payment')->sum('amount');
        $refunded = $payments->where('kind', 'refund')->sum('amount');

        return round((float) ($paid - $refunded), 2);
    }

    public function returnedTotal(): float
    {
        $returns = $this->relationLoaded('returns') ? $this->returns : $this->returns()->get();

        return round((float) $returns->sum('total'), 2);
    }

    public function balance(): float
    {
        return round((float) $this->total - $this->returnedTotal() - $this->paidTotal(), 2);
    }

    public function paymentStatus(): string
    {
        if ($this->status === 'cancelled') {
            return 'cancelled';
        }

        $balance = $this->balance();
        $paid = $this->paidTotal();

        $balCents = (int) round($balance * 100);
        $paidCents = (int) round($paid * 100);

        if ($balCents === 0) {
            return 'paid';
        }

        if ($balCents < 0) {
            return 'credit';
        }

        if ($paidCents > 0) {
            return 'partial';
        }

        return 'unpaid';
    }
}
