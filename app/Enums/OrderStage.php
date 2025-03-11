<?php

namespace App\Enums;

enum OrderStage: int
{
    case Draft = 1;
    case Quotation = 2;
    case Approved = 3;
    case Profoma = 4;
    case Completed = 5;
    case Cancelled = 6;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Draft->value => 'Draft',
            self::Quotation->value => 'Quotation',
            self::Approved->value => 'Approved',
            self::Profoma->value => 'Profoma',
            self::Completed->value => 'Completed',
            self::Cancelled->value => 'Cancelled',
            default => 'Unknown',
        };
    }
    
    public static function fromValue(int $value): ?self
    {
       return self::tryFrom($value);
    }
}