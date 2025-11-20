<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\UserGroupPrinter;
use App\Models\UserGroup; // Assuming you have this model for the 'usergroups' table

class UserGroupPrinterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Get a valid User Group ID (e.g., 'Admin' or the first one found)
        // Make sure you have run the UserGroup seeder first!
        $userGrcclearoup = UserGroup::first();

        if (!$userGroup) {
            $this->command->warn('No UserGroups found. Please seed UserGroups first.');
            return;
        }

        // 2. Create the Printer Configuration
        UserGroupPrinter::create([
            // Dynamically get your current computer name so it works immediately
            'machinename'      => gethostname(), 
            
            'usergroup_id'     => $userGroup->id,
            
            // The code used in the Controller to identify the document
            'documenttypecode' => 'invoice',     
            
            // IMPORTANT: This must match your Windows Printer Name EXACTLY
            // Common examples: 'Microsoft Print to PDF', 'EPSON TM-T20', 'POS-80'
            'printername'      => 'Microsoft Print to PDF', 
            
            // 1 = Trigger print logic
            'autoprint'        => true,             
            
            // 0 = Direct Print (Silent), 1 = Show Preview on Screen
            'printtoscreen'    => false,            
            
            // Custom logic flag (e.g., 1 = On Save, 2 = On Update)
            'printedwhen'      => 1              
        ]);
    }
}