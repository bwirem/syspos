<?php

namespace App\Enums;

enum ConditionOperators: int
{
    case Equals = 0;
    case DoesNotEqual = 1;
    case IsGreaterThan = 2;
    case IsGreaterThanOrEqual = 3;
    case IsLessThan = 4;
    case IsLessThanOrEqual = 5;
    case IsBetween = 6;
    case IsNotBetween = 7;
    case Contains = 8;
    case DoesNotContain = 9;
    case BeginsWith = 10;
    case EndsWith = 11;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Equals => 'Equals',
            self::DoesNotEqual => 'Does Not Equal',
            self::IsGreaterThan => 'Is Greater Than',
            self::IsGreaterThanOrEqual => 'Is Greater Than Or Equal',
            self::IsLessThan => 'Is Less Than',
            self::IsLessThanOrEqual => 'Is Less Than Or Equal',
            self::IsBetween => 'Is Between',
            self::IsNotBetween => 'Is Not Between',
            self::Contains => 'Contains',
            self::DoesNotContain => 'Does Not Contain',
            self::BeginsWith => 'Begins With',
            self::EndsWith => 'Ends With',
            default => 'Unknown',
        };
    }
}


