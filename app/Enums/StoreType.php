<?php

namespace App\Enums;

enum StoreType: int
{
    case Store = 1;
    case Customer = 2;
    case Supplier = 3;    

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Store->value => 'Store',
            self::Customer->value => 'Customer',
            self::Supplier->value => 'Supplier',            
            default => 'Unknown',
        };
    }
}