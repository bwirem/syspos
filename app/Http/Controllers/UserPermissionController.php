<?php

namespace App\Http\Controllers;

use App\Models\UserGroup;
use App\Models\UserGroupModuleItem;
use App\Models\UserGroupFunction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response; // Import the Response facade
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserPermissionController extends Controller
{
    /**
     * Display a listing of UserPermission.
     */
    public function index(Request $request)
    {
        $query = UserGroup::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $usergroups = $query->orderBy('created_at', 'desc')->paginate(10);

        // Get modules and module items
        $modules = $this->getModules();
        $moduleItems = $this->getModuleItems();

        // Prepare function access data
        $functionAccessData = [];
        foreach ($moduleItems as $moduleKey => $items) {
            foreach ($items as $item) {
                $functionAccessData[$item['key']] = $this->getFunctionAccess($item['key']);
            }
        }

        return inertia('UserManagement/UserPermission/Index', [
            'usergroups' => $usergroups,
            'modules' => $modules,
            'moduleitems' => $moduleItems,
            'functionAccessData' => $functionAccessData, // Include function access data
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store or update the module item and function access data for a given user group.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $userGroupId
     * @return \Illuminate\Http\JsonResponse
     */
    public function storePermissions(Request $request, int $userGroupId)
    {
           
        // Validate the incoming request
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*.moduleItemKey' => 'required|string',
            'permissions.*.functionAccess' => 'required|array',
        ]);
    
        try {
            // Begin database transaction
            DB::transaction(function () use ($request, $userGroupId) {
                foreach ($request->permissions as $permission) {
                    // Find or create the UserGroupModuleItem record
                    $moduleItem = UserGroupModuleItem::firstOrNew(
                        ['usergroup_id' => $userGroupId, 'moduleitemkey' => $permission['moduleItemKey']]
                    );

                    // Save the new module item if it's not already saved
                    if (!$moduleItem->exists) {
                        $moduleItem->save();
                    }
                    
                    // Remove existing function access linked to the module item
                    UserGroupFunction::where('usergroup_id', $userGroupId)
                        ->where('usergroupmoduleitem_id', $moduleItem->id)
                        ->delete();

                    // Create new function access based on the provided data
                    foreach ($permission['functionAccess'] as $accessKey => $accessValue) {
                        if ($accessValue === true) {
                            UserGroupFunction::create([
                                'usergroup_id' => $userGroupId,
                                'usergroupmoduleitem_id' => $moduleItem->id,
                                'functionaccesskey' => $accessKey,
                            ]);
                        }
                    }                    
                }
            });
    
            // Return success response
            return response()->json([
                'success' => 'Permissions updated successfully!'
            ]);
        } catch (\Exception $e) {
            // Log error and return failure response
            \Log::error('Error updating permissions: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update permissions. Please try again.'
            ], 500);
        }
    }

    /**
     * Get the permissions for a specific user group.
     *
     * @param UserGroup $userGroup
     * @return array
     */
    public function getPermissions(UserGroup $userGroup)
    {
        $permissions = UserGroupModuleItem::with('userGroupFunctions')
            ->where('usergroup_id', $userGroup->id)
            ->get();

        // Transform data to match the needed format.
        $permissionsData = [];
        foreach($permissions as $permission) {
            foreach ($permission->userGroupFunctions as $function) {
                $permissionsData[] = [
                    'moduleitemkey' => $permission->moduleitemkey,
                    'functionaccesskey' => $function->functionaccesskey,
                    //'value' => $function->value, // Get value from your model
                    //'value' => $function->value === null ? false : (bool)$function->value, // Handle null
                    'value' =>true
                ];
            }
        }    
        return $permissionsData;
    }

    /**
     * assignAllPermissionsToAdmin
     *
     * @return array
     */
    public function assignAllPermissionsToAdmin(UserGroup $userGroup)
    {
          
        $modules = $this->getModuleItems();
        
        foreach ($modules as $moduleKey => $items) {
            foreach ($items as $item) {
                               
                $moduleItem = UserGroupModuleItem::firstOrCreate([
                    'usergroup_id' => $userGroup->id,
                    'moduleitemkey' => $item['key']
                ]);    
                
                $functionAccessKeys = $this->getFunctionAccess($item['key']);
                foreach ($functionAccessKeys as $accessKey => $accessValue) {
                    UserGroupFunction::create([
                        'usergroup_id' => $userGroup->id,
                        'usergroupmoduleitem_id' => $moduleItem->id,
                        'functionaccesskey' => $accessKey,
                    ]);                    
                }
            }
        }
    }

    /**
     * Get getModulesAndItems.
     *
     * @return array
     */    

    public function getModulesAndItems()
    {
        $userGroupId = Auth::user()?->usergroup_id;

        // Fetch the modules and module items
        $modules = $this->getModules();
        $moduleItems = $this->getModuleItems();

        // Fetch the permissions for the specific user group
        $permissionsData = $this->getPermissions(UserGroup::find($userGroupId));

        // Initialize arrays to hold allowed modules and module items
        $allowedModules = [];
        $allowedModuleItems = [];

        // Loop through the module items and check if the user has permission
        foreach ($moduleItems as $moduleKey => $items) {
            $hasPermission = false;
            $filteredItems = [];

            // Check if the user has permission for any of the items in the module
            foreach ($items as $item) {
                if (in_array($item['key'], array_column($permissionsData, 'moduleitemkey'))) {
                    $hasPermission = true;
                    $filteredItems[] = $item; // Add allowed item to the module's list
                }
            }

            // If the user has permission for at least one item in the module, add the module to the allowed list
            if ($hasPermission) {
                $allowedModules[] = $moduleKey;
                $allowedModuleItems[$moduleKey] = $filteredItems; // Group items under their module
            }
        }

        // Filter the modules to only return the ones the user has access to, and re-index
        $filteredModules = array_values(array_filter($modules, fn($module) => in_array($module['modulekey'], $allowedModules)));

        // Return a JSON response with the allowed modules and module items
        return response()->json([
            'modules' => $filteredModules,  // Filtered modules properly structured
            'moduleItems' => $allowedModuleItems,  // Module items grouped under their modules
        ]);
    }


   /**
     * Get the modules data with icons.
     *
     * @return array
     */
   
    private function getModules(): array
    {
        return [
            ['modulekey' => 'dashboard', 'moduletext' => 'Dashboard', 'icon' => 'home'],
            ['modulekey' => 'billing', 'moduletext' => 'Sales and Billing', 'icon' => 'add_shopping_cart'],           
            ['modulekey' => 'procurements', 'moduletext' => 'Procurements', 'icon' => 'inventory'],
            ['modulekey' => 'inventory', 'moduletext' => 'Inventory', 'icon' => 'storage'],
            ['modulekey' => 'material', 'moduletext' => 'Material Conversion', 'icon' => 'sync_alt'],
            ['modulekey' => 'expenses', 'moduletext' => 'Expenses', 'icon' => 'attach_money'],
            ['modulekey' => 'humanresurces', 'moduletext' => 'Human Resource', 'icon' => 'person'],          
            ['modulekey' => 'fixedassets', 'moduletext' => 'Fixed Assets', 'icon' => 'fixed_assets'],          
            ['modulekey' => 'accounting', 'moduletext' => 'Financial Accounting', 'icon' => 'account_balance'],
            ['modulekey' => 'reporting', 'moduletext' => 'Reporting/Analytics', 'icon' => 'analytics'],
            ['modulekey' => 'systemConfig', 'moduletext' => 'System Configuration', 'icon' => 'settings'],
            ['modulekey' => 'usermanagement', 'moduletext' => 'User Management', 'icon' => 'manage_accounts'],           
        ];
    }



    /**
     * Get the module items data with icons.
     *
     * @return array
     */
   
     private function getModuleItems(): array
    {
        return [
            'dashboard' => [
                ['key' => 'dashboard', 'text' => 'Overview', 'icon' => 'dashboard'],
            ],
            'billing' => [
                ['key' => 'billing0', 'text' => 'Order', 'icon' => 'add_shopping_cart'],
                ['key' => 'billing1', 'text' => 'Post Bills', 'icon' => 'post_add'],
                ['key' => 'billing2', 'text' => 'Pay Bills', 'icon' => 'paid'],
                ['key' => 'billing3', 'text' => 'Sales History', 'icon' => 'sales_history'],
                ['key' => 'billing4', 'text' => 'Payments History', 'icon' => 'payments_history'],
                ['key' => 'billing5', 'text' => 'Void History', 'icon' => 'void_history'],
            ],            
            'procurements' => [
                ['key' => 'procurements0', 'text' => 'Tender and Quotation', 'icon' => 'request_quote'],
                ['key' => 'procurements1', 'text' => 'Purchase and Receiving', 'icon' => 'shopping_cart'],
            ],
            'inventory' => [
                ['key' => 'inventory0', 'text' => 'Internal Requisitions', 'icon' => 'store'],
                ['key' => 'inventory1', 'text' => 'Goods Issuance', 'icon' => 'local_shipping'],
                ['key' => 'inventory2', 'text' => 'Goods Receiving', 'icon' => 'goods_receiving'],
                ['key' => 'inventory3', 'text' => 'Inventory Reconciliation', 'icon' => 'inventory_reconciliation'],
                ['key' => 'inventory4', 'text' => 'Stock History', 'icon' => 'stock_history'],
            ],
            'material' => [
                ['key' => 'material0', 'text' => 'Request Materials', 'icon' => 'autorenew'],
            ],
            'expenses' => [
                ['key' => 'expenses0', 'text' => 'Expense Submission', 'icon' => 'paper_plane'],
                ['key' => 'expenses1', 'text' => 'Expense Approval', 'icon' => 'thumbs_up'],                            
                ['key' => 'expenses2', 'text' => 'Expense History', 'icon' => 'history'],               
            ],
            'humanresurces' => [
                ['key' => 'humanresurces0', 'text' => 'Employee Bio Data', 'icon' => 'person'],
                ['key' => 'humanresurces1', 'text' => 'Import Employee Data', 'icon' => 'upload'],
                ['key' => 'humanresurces2', 'text' => 'Termination', 'icon' => 'person_outline'],
                ['key' => 'humanresurces3', 'text' => 'Payroll', 'icon' => 'payroll'],
            ],
            'fixedassets' => [
                ['key' => 'fixedassets0', 'text' => 'Asset Register', 'icon' => 'list_alt'],
                ['key' => 'fixedassets1', 'text' => 'Depreciation', 'icon' => 'arrow_down'],
                ['key' => 'fixedassets2', 'text' => 'Asset Disposal', 'icon' => 'trash_alt'],                
                ['key' => 'fixedassets3', 'text' => 'Asset Transfer', 'icon' => 'exchange_alt'],
                ['key' => 'fixedassets4', 'text' => 'Asset Revaluation', 'icon' => 'sync_alt'],
                ['key' => 'fixedassets5', 'text' => 'Asset Maintenance', 'icon' => 'wrench'],
                ['key' => 'fixedassets6', 'text' => 'Asset Insurance', 'icon' => 'shield_alt'],
                ['key' => 'fixedassets7', 'text' => 'Asset History', 'icon' => 'history'],
            ],
            'accounting' => [
                ['key' => 'accounting0', 'text' => 'Receive Payments', 'icon' => 'arrow_down'],
                ['key' => 'accounting1', 'text' => 'Make Payments', 'icon' => 'arrow_up'],
                ['key' => 'accounting2', 'text' => 'Bank Transactions', 'icon' => 'landmark'],
                ['key' => 'accounting3', 'text' => 'Journal Entries', 'icon' => 'journal_whills'],
                ['key' => 'accounting4', 'text' => 'Tax Management', 'icon' => 'file_invoice_dollar'],
                ['key' => 'accounting5', 'text' => 'Financial Statements', 'icon' => 'attach_money'],
                ['key' => 'accounting6', 'text' => 'Budget Management', 'icon' => 'chart_pie'],
               
                // ['key' => 'accounting0', 'text' => 'General Journal', 'icon' => 'journal_whills'],
                // ['key' => 'accounting1', 'text' => 'General Ledger', 'icon' => 'menu_book'],
                // ['key' => 'accounting2', 'text' => 'Trial Balance', 'icon' => 'balance_scale'],
                // ['key' => 'accounting3', 'text' => 'Balance Sheet', 'icon' => 'balance_scale_left'],
                // ['key' => 'accounting4', 'text' => 'Income Statement', 'icon' => 'file_invoice_dollar'],
                // ['key' => 'accounting5', 'text' => 'Cash Flow Statement', 'icon' => 'exchange_alt'],
                // ['key' => 'accounting6', 'text' => 'Bank Reconciliation', 'icon' => 'landmark'],
                // ['key' => 'accounting7', 'text' => 'Tax Report', 'icon' => 'receipt'],
                // ['key' => 'accounting8', 'text' => 'Audit Trail', 'icon' => 'security'],
                // ['key' => 'accounting9', 'text' => 'Budgeting', 'icon' => 'account_balance'],
                // ['key' => 'accounting10', 'text' => 'Fixed Assets', 'icon' => 'attach_money'],
                // ['key' => 'accounting11', 'text' => 'Accounts Payable', 'icon' => 'payments'],
                // ['key' => 'accounting12', 'text' => 'Accounts Receivable', 'icon' => 'receipt'],
                // ['key' => 'accounting13', 'text' => 'Inventory Valuation', 'icon' => 'inventory'],
                // ['key' => 'accounting14', 'text' => 'Financial Ratios', 'icon' => 'assessment'],
                // ['key' => 'accounting15', 'text' => 'Multi-Currency', 'icon' => 'language'],
                // ['key' => 'accounting16', 'text' => 'Tax Compliance', 'icon' => 'receipt'],
                // ['key' => 'accounting17', 'text' => 'Financial Statements', 'icon' => 'attach_money'],  
                // ['key' => 'accounting18', 'text' => 'Year-End Closing', 'icon' => 'calendar_today'],
                // ['key' => 'accounting19', 'text' => 'Financial Reporting', 'icon' => 'analytics'],
                // ['key' => 'accounting20', 'text' => 'Cost Accounting', 'icon' => 'attach_money'],
                // ['key' => 'accounting21', 'text' => 'Payroll Accounting', 'icon' => 'payroll'],
                // ['key' => 'accounting22', 'text' => 'Financial Analysis', 'icon' => 'assessment'],
                // ['key' => 'accounting23', 'text' => 'Financial Planning', 'icon' => 'account_balance'],
            ],
            'reporting' => [
                ['key' => 'reporting0', 'text' => 'Sales and Billing', 'icon' => 'add_shopping_cart'],
                ['key' => 'reporting1', 'text' => 'Procurement', 'icon' => 'inventory'],
                ['key' => 'reporting2', 'text' => 'Inventory', 'icon' => 'storage'],
                ['key' => 'reporting3', 'text' => 'Material Conversion', 'icon' => 'sync_alt'],
                ['key' => 'reporting4', 'text' => 'Expenses', 'icon' => 'attach_money'],
                ['key' => 'reporting5', 'text' => 'Human Resource', 'icon' => 'person'],
                ['key' => 'reporting6', 'text' => 'Fixed Assets', 'icon' => 'account_balance'],
                ['key' => 'reporting7', 'text' => 'Accounting', 'icon' => 'account_balance'],               
            ],
            'systemConfig' => [
                ['key' => 'systemconfiguration0', 'text' => 'Billing Setup', 'icon' => 'billing_setup'],
                ['key' => 'systemconfiguration1', 'text' => 'Expenses Setup', 'icon' => 'expenses_setup'],
                ['key' => 'systemconfiguration2', 'text' => 'Inventory Setup', 'icon' => 'inventory_setup'],
                ['key' => 'systemconfiguration3', 'text' => 'Accounting Setup', 'icon' => 'menu_book'],
                ['key' => 'systemconfiguration4', 'text' => 'Location Setup', 'icon' => 'location_setup'],
                ['key' => 'systemconfiguration5', 'text' => 'Facility Setup', 'icon' => 'facility_setup'],
            ],
            'usermanagement' => [
                ['key' => 'usermanagement', 'text' => 'Manage Users', 'icon' => 'manage_accounts'],
            ],           
        ];
    }

    /**
     * Get the function access data.
     *
     * @param string $key The module item key (e.g., 'customer0', 'reportingAnalytics1').
     * @return array
     */
    // Backend (PHP - UserPermissionController.php) - getFunctionAccess method
    private function getFunctionAccess(string $key): array
    {
        // Default function access (basic permissions)
        $defaultFunctionAccess = [
            'create' => false,
            'read' => false,
            'update' => false,
            'delete' => false,
        ];

        // // Add loan-specific permissions only for 'loan1'
        // if ($key === 'loan1') {
        //     return [
        //         'read' => false, // Set read to false for loan1
        //         'officerreview' => false, // Default state
        //         'managerreview' => false,
        //         'committeereview' => false,
        //         'approve' => false,                
        //     ];
        // }

        return $defaultFunctionAccess; // Return default for other keys
    }

}
