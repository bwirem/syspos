<?php

namespace App\Enums;

enum ExpenseStage: int  // Adjust names to your needs
{
    case Pending = 1;
    case Approved = 2;
    case Processed = 3;
    // ... other stages as needed

    public static function getLabel(int $value): string
    {
      return match ($value) {
        self::Pending->value => 'Pending',
        self::Approved->value => 'Approved',
        self::Processed->value => 'Processed',
        default => 'Unknown'
      };
    }

}