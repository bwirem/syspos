<?php

namespace App\Enums;

enum DocumentType: string
{
    case NIDA = 'nida';
    case VOTERID = 'voterid';
    case LICENSEID = 'licenseid';
    

    // This method returns an array of all the enum values
    public static function values(): array
    {
        return [
            self::NIDA->value,
            self::VOTERID->value,
            self::LICENSEID->value,
        ];
    }
     
    public function label(): string
    {
        return match ($this) {
            self::NIDA => 'National Idenfification Card',
            self::VOTERID => 'Voter Registration Card',
            self::LICENSEID => 'Driving License',   
        };
    }
}
