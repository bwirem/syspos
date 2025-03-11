<?php

namespace App\Enums;

enum InvoiceTransTypes: int
{
    case NewInvoice = 1;
    case Cancellation = 2;
    case Payment = 3;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::NewInvoice => 'New Invoice',
            self::Cancellation => 'Cancellation',
            self::Payment => 'Payment',
            default => 'Unknown',
        };
    }
}
