<?php

namespace App\Traits;

use Illuminate\Support\Str;

trait HasRefNo
{
    public static function bootHasRefNo(): void
    {
        static::creating(function ($model) {
            if (empty($model->ref_no)) {
                $model->ref_no = 'TMP-'.Str::uuid()->toString();
            }
        });

        static::created(function ($model) {
            if (empty($model->ref_no) || str_starts_with((string) $model->ref_no, 'TMP-')) {
                $prefix = $model->refNoPrefix();
                $refNo = sprintf('%s-%04d', $prefix, $model->id);
                $model->newQuery()->where('id', $model->id)->update(['ref_no' => $refNo]);
                $model->ref_no = $refNo;
            }
        });
    }

    abstract public function refNoPrefix(): string;
}
