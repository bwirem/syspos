<?php

namespace App\Enums;

enum PaymentSources: int
{
    case CashSale = 0;
    case InvoicePayment = 1;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::CashSale => 'Cash Sale',
            self::InvoicePayment => 'Invoice Payment',
            default => 'Unknown',
        };
    }
}

