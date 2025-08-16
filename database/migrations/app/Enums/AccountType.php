<?php

namespace App\Enums;

enum AccountType: int
{
    case Asset = 1;
    case Liability = 2;
    case Equity = 3;
    case Revenue = 4;
    case Expense = 5;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Asset->value => 'Asset',
            self::Liability->value => 'Liability',
            self::Equity->value => 'Equity',
            self::Revenue->value => 'Revenue',
            self::Expense->value => 'Expense',
            default => 'Unknown',
        };
    }
}