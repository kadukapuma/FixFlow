<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JournalEntry extends Model
{
    protected $connection = 'company';

    protected $table = 'journal_entries';

    protected $fillable = [
        'entry_date',
        'description',
        'source_type',
        'source_id',
        'service_id',
        'employee_id',
        'supplier_id',
    ];

    protected $casts = [
        'entry_date' => 'date:Y-m-d',
    ];

    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
