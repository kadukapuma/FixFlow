<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $connection = 'company';

    protected $table = 'customers';

    protected $fillable = [
        'name',
        'email',
        'phone',
    ];
}
