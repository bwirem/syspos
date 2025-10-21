<?php

namespace App\Http\Controllers\Traits;

use App\Models\BILVoidedSale;
use App\Models\BILRefund;
use Carbon\Carbon;

trait GeneratesUniqueNumbers
{
    private function generateUniqueNumber($prefix, $column)
    {
        do {
            $number = $prefix . time() . rand(100, 999);
        } while (BILVoidedSale::where($column, $number)->exists());

        return $number;
    }

    private function generateUniqueRefundNumber($prefix, $column)
    {
        do {
            $number = $prefix . Carbon::now()->format('YmdHis') . rand(10, 99);
        } while (BILRefund::where($column, $number)->exists());

        return $number;
    }
}