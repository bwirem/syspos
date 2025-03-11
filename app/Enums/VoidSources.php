<?php

namespace App\Enums;

enum VoidSources: int
{
    case CashSale = 0;
    case InvoiceSale = 1;
    case InvoicePayment = 2;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::CashSale => 'Cash Sale',
            self::InvoiceSale => 'Invoice Sale',
            self::InvoicePayment => 'Invoice Payment',
            default => 'Unknown',
        };
    }
}

