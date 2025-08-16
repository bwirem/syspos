<?php

namespace App\Enums;

enum TransactionType: int
{
    case Deposit = 1;
    case Withdrawal = 2;
    case LoanPayment = 3;
    case Interest = 4;
    case Fee = 5;
    case Expense = 6;
    case Disbursement = 7; // Added Disbursement


    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Deposit->value => 'Deposit',
            self::Withdrawal->value => 'Withdrawal',
            self::LoanPayment->value => 'Loan Payment',
            self::Interest->value => 'Interest',
            self::Fee->value => 'Fee',
            self::Expense->value => 'Expense',
            self::Disbursement->value => 'Disbursement', // Added Disbursement label
            default => 'Unknown',
        };
    }
}