<?php

namespace App\Enums;

enum BillingTransTypes: int
{
    case Cash = 1;
    case Invoice = 2;
    case Refund = 3;
    case Payment = 4;
    case PaymentCancellation = 5;
    case SaleCancellation = 6;
    case CreditNote = 7;
    case CreditNoteCancellation = 8;
    case Deposit = 9;
    case Sales = 10;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Cash => 'Cash',
            self::Invoice => 'Invoice',
            self::Refund => 'Refund',
            self::Payment => 'Payment',
            self::PaymentCancellation => 'Payment Cancellation',
            self::SaleCancellation => 'Sale Cancellation',
            self::CreditNote => 'Credit Note',
            self::CreditNoteCancellation => 'Credit Note Cancellation',
            self::Deposit => 'Deposit',
            self::Sales => 'Sales',
            default => 'Unknown',
        };
    }
}
