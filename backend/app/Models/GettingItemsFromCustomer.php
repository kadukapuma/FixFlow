<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GettingItemsFromCustomer extends Model
{
    protected $connection = 'company';

    protected $table = 'getting_items_from_customer';

    protected $fillable = [
        'item_name',
    ];

    public function services()
    {
        return $this->belongsToMany(Service::class, 'get_items', 'getting_items_from_cus_id', 'service_id');
    }
}
