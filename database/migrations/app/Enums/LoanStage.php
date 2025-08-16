<?php

namespace App\Enums;

    enum LoanStage: int
    {
        case Draft = 1;
        case Documentation = 2;  
        case Submission = 3;  

        case LoanOfficerReview = 4;
        case ManagerReview = 5;
        case CommitteeReview = 6;
        case Approved = 7;

        case Disbursed = 8;
        case Rejected = 9;
        case Repaid = 10;
        case Defaulted = 11;   

        public static function getLabel(int $value): string
        {
            return match ($value) {
                self::Draft->value => 'Draft',            
                self::Documentation->value => 'Documentation', 
                self::Submission->value => 'Submission',           
                self::LoanOfficerReview->value => 'Loan Officer Review',
                self::ManagerReview->value => 'Manager Review',
                self::CommitteeReview->value => 'Committee Review',
                self::Approved->value => 'Approved',            
                self::Disbursed->value => 'Disbursed',
                self::Rejected->value => 'Rejected',
                self::Repaid->value => 'Repaid',
                self::Defaulted->value => 'Defaulted',  
                default => 'Unknown',
            };
        }
    }
