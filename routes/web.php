<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;

use App\Http\Controllers\BilOrderController;
use App\Http\Controllers\BilPostController;
use App\Http\Controllers\BilPayController;
use App\Http\Controllers\BilHistoryController;

use App\Http\Controllers\BLSItemGroupController;
use App\Http\Controllers\BLSItemController;
use App\Http\Controllers\BLSCurrencyController;
use App\Http\Controllers\BLSPaymentTypeController;
use App\Http\Controllers\BLSPriceCategoryController;

use App\Http\Controllers\BLSCustomerController;

use App\Http\Controllers\ExpPostController;
use App\Http\Controllers\ExpApprovalController;

use App\Http\Controllers\SEXPItemGroupController;
use App\Http\Controllers\SEXPItemController;


use App\Http\Controllers\PROTenderController;
use App\Http\Controllers\PROPurchaseController;

use App\Http\Controllers\IVRequistionController;
use App\Http\Controllers\IVIssueController;
use App\Http\Controllers\IVReceiveController;
use App\Http\Controllers\IVReconciliationController;

use App\Http\Controllers\SIV_StoreController;
use App\Http\Controllers\SIV_ProductCategoryController;
use App\Http\Controllers\SIV_ProductController;
use App\Http\Controllers\SIV_PackagingController;
use App\Http\Controllers\SIV_AdjustmentReasonController;
use App\Http\Controllers\SPR_SupplierController;

use App\Http\Controllers\ChartOfAccountController;
use App\Http\Controllers\ChartOfAccountMappingController;


use App\Http\Controllers\LOCCountryController;
use App\Http\Controllers\LOCRegionController;
use App\Http\Controllers\LOCDistrictController;
use App\Http\Controllers\LOCWardController;
use App\Http\Controllers\LOCStreetController;

use App\Http\Controllers\FacilityOptionController;

use App\Http\Controllers\UserGroupController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserPermissionController;


use App\Http\Controllers\Reports\SalesBillingController;
use App\Http\Controllers\Reports\SalesReportsController;
use App\Http\Controllers\Reports\ProcurementReportsController;
use App\Http\Controllers\Reports\InventoryReportsController;


use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),        
    ]);
});

// Route::get('/dashboard', function () {
//     return Inertia::render('Dashboard');
// })->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/dashboard', DashboardController::class)->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    // Profile routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Order routes
    Route::prefix('billing0')->name('billing0.')->group(function () {
        Route::get('/', [BilOrderController::class, 'index'])->name('index');
        Route::get('/create', [BilOrderController::class, 'create'])->name('create');
        Route::post('/', [BilOrderController::class, 'store'])->name('store');
        Route::get('/{order}/edit', [BilOrderController::class, 'edit'])->name('edit');
        Route::put('/{order}', [BilOrderController::class, 'update'])->name('update');
        Route::delete('/{order}', [BilOrderController::class, 'destroy'])->name('destroy');
    });

     // Post Bills routes
     Route::prefix('billing1')->name('billing1.')->group(function () {
        Route::get('/', [BilPostController::class, 'index'])->name('index');
        Route::get('/create', [BilPostController::class, 'create'])->name('create');
        Route::post('/', [BilPostController::class, 'store'])->name('store');
        Route::get('/{order}/edit', [BilPostController::class, 'edit'])->name('edit');
        Route::put('/{order}', [BilPostController::class, 'update'])->name('update');
        Route::delete('/{order}', [BilPostController::class, 'destroy'])->name('destroy');
    
        // New Route for handling Payments
        Route::post('/pay', [BilPostController::class, 'pay'])->name('pay');  // POST route with no parameter
        Route::put('/pay/{order}', [BilPostController::class, 'pay'])->name('pay_update');  // PUT route with {order} param and a different name.
    
    });

     // Pay Bills routes
     Route::prefix('billing2')->name('billing2.')->group(function () {
        Route::get('/', [BilPayController::class, 'index'])->name('index');        
        Route::get('/{debtor}/edit', [BilPayController::class, 'edit'])->name('edit');

        // New Route for handling Payments
        Route::post('/pay', [BilPayController::class, 'pay'])->name('pay');  // POST route with no parameter
        Route::put('/pay/{debtor}', [BilPayController::class, 'pay'])->name('pay_update');  // PUT route with {order} param and a different name.
    
    });


    // Pay Bills routes
    Route::prefix('billing3')->name('billing3.')->group(function () {
        Route::get('/', [BilHistoryController::class, 'saleHistory'])->name('salehistory'); 
        Route::get('/{sale}/preview', [BilHistoryController::class, 'previewSale'])->name('preview');
        Route::put('/{sale}', [BilHistoryController::class, 'postVoidSale'])->name('voidsale');        
    });

    // Pay Bills routes
    Route::prefix('billing4')->name('billing4.')->group(function () {
        Route::get('/', [BilHistoryController::class, 'repaymentHistory'])->name('repaymenthistory'); 
        Route::get('/{repayment}/preview', [BilHistoryController::class, 'previewRepayment'])->name('preview');
        
    });

    // Pay Bills routes
    Route::prefix('billing5')->name('billing5.')->group(function () {
        Route::get('/', [BilHistoryController::class, 'voidHistory'])->name('voidsalehistory'); 
        Route::get('/{voidsale}/preview', [BilHistoryController::class, 'previewVoid'])->name('preview');
        
    });

      
    // expenses routes
    Route::prefix('expenses0')->name('expenses0.')->group(function () {
        Route::get('/', [ExpPostController::class, 'index'])->name('index');
        Route::get('/create', [ExpPostController::class, 'create'])->name('create');
        Route::post('/', [ExpPostController::class, 'store'])->name('store');
        Route::get('/{post}/edit', [ExpPostController::class, 'edit'])->name('edit');
        Route::put('/{post}', [ExpPostController::class, 'update'])->name('update');
        Route::delete('/{post}', [ExpPostController::class, 'destroy'])->name('destroy');
    });
    
     // expenses routes
     Route::prefix('expenses1')->name('expenses1.')->group(function () {
        Route::get('/', [ExpApprovalController::class, 'index'])->name('index');
        Route::get('/create', [ExpApprovalController::class, 'create'])->name('create');
        Route::post('/', [ExpApprovalController::class, 'store'])->name('store');
        Route::get('/{approval}/edit', [ExpApprovalController::class, 'edit'])->name('edit');
        Route::put('/{approval}', [ExpApprovalController::class, 'update'])->name('update');
        Route::delete('/{approval}', [ExpApprovalController::class, 'destroy'])->name('destroy');
    });


       
    // Tender routes
    Route::prefix('procurements0')->name('procurements0.')->group(function () {
        Route::get('/', [PROTenderController::class, 'index'])->name('index');
        Route::get('/create', [PROTenderController::class, 'create'])->name('create');
        Route::post('/', [PROTenderController::class, 'store'])->name('store');
        Route::put('award/{tender}', [PROTenderController::class, 'award'])->name('award');  
        Route::get('/{tender}/edit', [PROTenderController::class, 'edit'])->name('edit');
        Route::put('/{tender}', [PROTenderController::class, 'update'])->name('update');
        Route::put('quotation/{tender}', [PROTenderController::class, 'quotation'])->name('quotation');   
        Route::put('/{tender}/return', [PROTenderController::class, 'return'])->name('return');            
        Route::delete('/{tender}', [PROTenderController::class, 'destroy'])->name('destroy');
    });

    // Purchase routes
    Route::prefix('procurements1')->name('procurements1.')->group(function () {
        Route::get('/', [PROPurchaseController::class, 'index'])->name('index');
        Route::get('/create', [PROPurchaseController::class, 'create'])->name('create');
        Route::post('/', [PROPurchaseController::class, 'store'])->name('store');
        Route::get('/{purchase}/edit', [PROPurchaseController::class, 'edit'])->name('edit');
        Route::put('/{purchase}', [PROPurchaseController::class, 'update'])->name('update');
        Route::put('approve/{purchase}', [PROPurchaseController::class, 'approve'])->name('approve');
        Route::put('dispatch/{purchase}', [PROPurchaseController::class, 'dispatch'])->name('dispatch');
        Route::put('receive/{purchase}', [PROPurchaseController::class, 'receive'])->name('receive');
        Route::delete('/{purchase}', [PROPurchaseController::class, 'destroy'])->name('destroy');
        Route::get('/{purchase}/show', [PROPurchaseController::class, 'show'])->name('show');
    });

  
     // Requistion routes
     Route::prefix('inventory0')->name('inventory0.')->group(function () {
        Route::get('/', [IVRequistionController::class, 'index'])->name('index');
        Route::get('/create', [IVRequistionController::class, 'create'])->name('create');
        Route::post('/', [IVRequistionController::class, 'store'])->name('store');
        Route::get('/{requistion}/edit', [IVRequistionController::class, 'edit'])->name('edit');
        Route::put('/{requistion}', [IVRequistionController::class, 'update'])->name('update');
        Route::delete('/{requistion}', [IVRequistionController::class, 'destroy'])->name('destroy');
    });

    //Issue routes
    Route::prefix('inventory1')->name('inventory1.')->group(function () {
        Route::get('/', [IVIssueController::class, 'index'])->name('index');
        Route::get('/create', [IVIssueController::class, 'create'])->name('create');
        Route::post('/', [IVIssueController::class, 'store'])->name('store');
        Route::get('/{requistion}/edit', [IVIssueController::class, 'edit'])->name('edit');
        Route::post('/{requistion}/approve', [IVIssueController::class, 'approve'])->name('approve');
        Route::post('/{requistion}/reject', [IVIssueController::class, 'reject'])->name('reject');
        Route::get('/{requistion}/return', [IVIssueController::class, 'return'])->name('return');        

        Route::put('/{requistion}', [IVIssueController::class, 'update'])->name('update');
        Route::delete('/{requistion}', [IVIssueController::class, 'destroy'])->name('destroy');
    });

    //Issue routes
    Route::prefix('inventory2')->name('inventory2.')->group(function () {
        Route::get('/', [IVReceiveController::class, 'index'])->name('index');
        Route::get('/create', [IVReceiveController::class, 'create'])->name('create');
        Route::post('/', [IVReceiveController::class, 'store'])->name('store');
        Route::get('/{receive}/edit', [IVReceiveController::class, 'edit'])->name('edit');
        Route::put('/{receive}', [IVReceiveController::class, 'update'])->name('update');
        Route::delete('/{receive}', [IVReceiveController::class, 'destroy'])->name('destroy');
    });


    //routes for Inventory Reconciliation (Version 3)
    Route::prefix('inventory3')->name('inventory3.')->group(function () {

        // Main index route
        Route::get('/', [IVReconciliationController::class, 'index'])->name('index');

        // --- Normal Adjustment Routes ---
        Route::prefix('normal-adjustment')->name('normal-adjustment.')->group(function () {
            Route::get('/', [IVReconciliationController::class, 'normalAdjustment'])->name('index'); // or .list, .view, .show, etc. depending on what normalAdjustment() does. I used 'index' to be consistent.
            Route::get('/create', [IVReconciliationController::class, 'createNormalAdjustment'])->name('create');
            Route::post('/', [IVReconciliationController::class, 'storeNormalAdjustment'])->name('store'); // Corrected typo: 'srore' to 'store'
            Route::get('/{normaladjustment}/edit', [IVReconciliationController::class, 'editNormalAdjustment'])->name('edit');
            Route::put('/{normaladjustment}', [IVReconciliationController::class, 'updateNormalAdjustment'])->name('update');  //Simplified route definition
        });



        // --- Physical Inventory Routes ---
        Route::prefix('physical-inventory')->name('physical-inventory.')->group(function () {
            Route::get('/', [IVReconciliationController::class, 'physicalInventory'])->name('index');  // Consistent naming
            Route::get('/create', [IVReconciliationController::class, 'createPhysicalInventory'])->name('create');
            Route::post('/', [IVReconciliationController::class, 'storePhysicalInventory'])->name('store'); // Commented out, as in the original
            Route::get('/{physicalinventory}/edit', [IVReconciliationController::class, 'editPhysicalInventory'])->name('edit');
            Route::put('/{physicalinventory}', [IVReconciliationController::class, 'updatePhysicalInventory'])->name('update');  //Simplified route definition
            Route::put('/{physicalinventory}/commit', [IVReconciliationController::class, 'commitPhysicalInventory'])->name('commit'); // Added destroy route
       
        });


        
    });

    
    
    // ********************************************************************************************** */

    // Routes for Sales and Bill (Version 3)
    Route::prefix('reporting0')->name('reporting0.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('Reports/Sales/Index');
        })->name('index'); // Added a proper route name for the index.
    }); 
   
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/sales/daily', [SalesReportsController::class, 'daily'])->name('sales.daily');
        Route::get('/sales/summary', [SalesReportsController::class, 'summary'])->name('sales.summary');        
        Route::get('/sales/cashiersession', [SalesReportsController::class, 'cashierSession'])->name('sales.cashiersession');
        Route::get('/sales/by-item', [SalesReportsController::class, 'salesByItem'])->name('sales.by_item');// ... other routes ...
        Route::get('/payments/methods', [SalesReportsController::class, 'paymentMethods'])->name('payments.methods');        
        Route::get('/customer/history', [SalesReportsController::class, 'customerHistory'])->name('customer.history');
        Route::get('/eod/summary', [SalesReportsController::class, 'eodSummary'])->name('eod.summary');
        Route::get('/custom/builder', [SalesReportsController::class, 'customBuilder'])->name('custom.builder');
    });


    // Routes for Sales and Bill (Version 3)
    Route::prefix('reporting1')->name('reporting1.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('Reports/Procurement/Index');
        })->name('index'); // Added a proper route name for the index.

    }); 

    Route::prefix('reports/procurement')->name('reports.procurement.')->group(function () {
        Route::get('/po-history', [ProcurementReportsController::class, 'purchaseOrderHistory'])->name('po_history');
        Route::get('/supplier-performance', [ProcurementReportsController::class, 'supplierPerformance'])->name('supplier_performance');
        Route::get('/item-history', [ProcurementReportsController::class, 'itemPurchaseHistory'])->name('item_history');
        Route::get('/spend-analysis', [ProcurementReportsController::class, 'spendAnalysis'])->name('spend_analysis');
        Route::get('/grn-summary', [ProcurementReportsController::class, 'grnSummary'])->name('grn_summary'); // Conceptual
        Route::get('/invoice-payment', [ProcurementReportsController::class, 'invoicePaymentReport'])->name('invoice_payment'); // Conceptual
        Route::get('/cycle-time', [ProcurementReportsController::class, 'cycleTimeReport'])->name('cycle_time'); // Conceptual
        Route::match(['get', 'post'], '/custom', [ProcurementReportsController::class, 'customProcurementReport'])->name('custom'); // Placeholder
    });


    // Routes for Sales and Bill (Version 3)
    Route::prefix('reporting2')->name('reporting2.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('Reports/Inventory/Index');
        })->name('index'); // Added a proper route name for the index.

    }); 

    Route::prefix('reports/inventory')->name('reports.inventory.')->group(function () {
        Route::get('/stock-on-hand', [InventoryReportsController::class, 'stockOnHand'])->name('stock_on_hand');
        Route::get('/valuation', [InventoryReportsController::class, 'valuation'])->name('valuation');
        Route::get('/movement-history', [InventoryReportsController::class, 'movementHistory'])->name('movement_history');
        Route::get('/ageing', [InventoryReportsController::class, 'ageing'])->name('ageing');
        Route::get('/reorder', [InventoryReportsController::class, 'reorderLevel'])->name('reorder');
        Route::get('/expiring-items', [InventoryReportsController::class, 'expiringItems'])->name('expiring_items');
        Route::get('/slow-moving', [InventoryReportsController::class, 'slowMoving'])->name('slow_moving');
        Route::match(['get', 'post'],'/custom', [InventoryReportsController::class, 'customInventoryReport'])->name('custom');
    });



    // Routes for Sales and Bill (Version 3)
    Route::prefix('reporting3')->name('reporting3.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('Reports/MaterialConversion/Index');
        })->name('index'); // Added a proper route name for the index.

    }); 


    // Routes for Sales and Bill (Version 3)
    Route::prefix('reporting4')->name('reporting4.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('Reports/Expenses/Index');
        })->name('index'); // Added a proper route name for the index.

    }); 

    // Routes for Sales and Bill (Version 3)
    Route::prefix('reporting5')->name('reporting5.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('Reports/HumanResource/Index');
        })->name('index'); // Added a proper route name for the index.

    }); 

    // Routes for Sales and Bill (Version 3)
    Route::prefix('reporting6')->name('reporting6.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('Reports/FixedAssets/Index');
        })->name('index'); // Added a proper route name for the index.

    }); 

     // Routes for Sales and Bill (Version 3)
     Route::prefix('reporting7')->name('reporting7.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('Reports/Accounting/Index');
        })->name('index'); // Added a proper route name for the index.

    }); 



    //********************************************************************************************* */

    // Routes for Billing Setup (Version 3)
    Route::prefix('systemconfiguration0')->name('systemconfiguration0.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('SystemConfiguration/BillingSetup/Index');
        })->name('index'); // Added a proper route name for the index.


         // --- currencies Routes ---
         Route::prefix('currencies')->name('currencies.')->group(function () {
            Route::get('/', [BLSCurrencyController::class, 'index'])->name('index'); // Lists item groups
            Route::get('/create', [BLSCurrencyController::class, 'create'])->name('create'); // Show form to create new item group
            Route::post('/', [BLSCurrencyController::class, 'store'])->name('store'); // Store new item group
            Route::get('/{itemgroup}/edit', [BLSCurrencyController::class, 'edit'])->name('edit'); // Show form to edit item group
            Route::put('/{itemgroup}', [BLSCurrencyController::class, 'update'])->name('update'); // Update item group
        });


        // --- paymenttypes Routes ---
        Route::prefix('paymenttypes')->name('paymenttypes.')->group(function () {
            Route::get('/', [BLSPaymentTypeController::class, 'index'])->name('index'); // Lists item groups
            Route::get('/create', [BLSPaymentTypeController::class, 'create'])->name('create'); // Show form to create new item group
            Route::post('/', [BLSPaymentTypeController::class, 'store'])->name('store'); // Store new item group
            Route::get('/{paymenttype}/edit', [BLSPaymentTypeController::class, 'edit'])->name('edit'); // Show form to edit item group
            Route::put('/{paymenttype}', [BLSPaymentTypeController::class, 'update'])->name('update'); // Update item group
            Route::delete('/{paymenttype}', [BLSPaymentTypeController::class, 'destroy'])->name('destroy');
            Route::get('/search', [BLSPaymentTypeController::class, 'search'])->name('search');
        });

        // --- pricecategories Routes ---
        Route::prefix('pricecategories')->name('pricecategories.')->group(function () {
            Route::get('/', [BLSPriceCategoryController::class, 'index'])->name('index'); // Lists item groups
            Route::get('/create', [BLSPriceCategoryController::class, 'create'])->name('create'); // Show form to create new item group
            Route::post('/', [BLSPriceCategoryController::class, 'store'])->name('store'); // Store new item group
            Route::get('/{pricecategory}/edit', [BLSPriceCategoryController::class, 'edit'])->name('edit'); // Show form to edit item group
            Route::put('/{pricecategory}', [BLSPriceCategoryController::class, 'update'])->name('update'); // Update item group
            Route::get('/viewactive', [BLSPriceCategoryController::class, 'viewActive'])->name('viewactive'); // Update item group;
        });

        // --- Itemgroups Routes ---
        Route::prefix('itemgroups')->name('itemgroups.')->group(function () {
            Route::get('/', [BLSItemGroupController::class, 'index'])->name('index'); 
            Route::get('/create', [BLSItemGroupController::class, 'create'])->name('create');
            Route::post('/', [BLSItemGroupController::class, 'store'])->name('store'); 
            Route::get('/{itemgroup}/edit', [BLSItemGroupController::class, 'edit'])->name('edit');
            Route::put('/{itemgroup}', [BLSItemGroupController::class, 'update'])->name('update');
            Route::delete('/{itemgroup}', [BLSItemGroupController::class, 'destroy'])->name('destroy');
            Route::get('/search', [BLSItemGroupController::class, 'search'])->name('search'); 
        });

        // --- Items Routes ---
        Route::prefix('items')->name('items.')->group(function () {
            Route::get('/', [BLSItemController::class, 'index'])->name('index'); 
            Route::get('/create', [BLSItemController::class, 'create'])->name('create');
            Route::post('/', [BLSItemController::class, 'store'])->name('store'); 
            Route::get('/{item}/edit', [BLSItemController::class, 'edit'])->name('edit'); 
            Route::put('/{item}', [BLSItemController::class, 'update'])->name('update'); 
            Route::get('/search', [BLSItemController::class, 'search'])->name('search'); 
        });

         // --- customers Routes ---
         Route::prefix('customers')->name('customers.')->group(function () {
            Route::get('/', [BLSCustomerController::class, 'index'])->name('index'); 
            Route::get('/create', [BLSCustomerController::class, 'create'])->name('create'); 
            Route::post('/', [BLSCustomerController::class, 'store'])->name('store'); 
            Route::post('/directstore', [BLSCustomerController::class, 'directstore'])->name('directstore');
            Route::get('/{customer}/edit', [BLSCustomerController::class, 'edit'])->name('edit'); 
            Route::put('/{customer}', [BLSCustomerController::class, 'update'])->name('update');
            Route::get('/search', [BLSCustomerController::class, 'search'])->name('search'); 
        });


    });

    
    // Routes for Expenses Setup (Version 3)
    Route::prefix('systemconfiguration1')->name('systemconfiguration1.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('SystemConfiguration/ExpensesSetup/Index');
        })->name('index'); // Added a proper route name for the index.


         // --- itemgroups Routes ---
        Route::prefix('itemgroups')->name('itemgroups.')->group(function () {
            Route::get('/', [SEXPItemGroupController::class, 'index'])->name('index'); 
            Route::get('/create', [SEXPItemGroupController::class, 'create'])->name('create'); 
            Route::post('/', [SEXPItemGroupController::class, 'store'])->name('store'); 
            Route::get('/{itemgroup}/edit', [SEXPItemGroupController::class, 'edit'])->name('edit'); 
            Route::put('/{itemgroup}', [SEXPItemGroupController::class, 'update'])->name('update'); 
            Route::delete('/{itemgroup}', [SEXPItemGroupController::class, 'destroy'])->name('destroy');
            Route::get('/search', [SEXPItemGroupController::class, 'search'])->name('search'); 
        });

          // --- items Routes ---
        Route::prefix('items')->name('items.')->group(function () {
            Route::get('/', [SEXPItemController::class, 'index'])->name('index');
            Route::get('/create', [SEXPItemController::class, 'create'])->name('create');
            Route::post('/', [SEXPItemController::class, 'store'])->name('store');
            Route::get('/{item}/edit', [SEXPItemController::class, 'edit'])->name('edit');
            Route::put('/{item}', [SEXPItemController::class, 'update'])->name('update'); 
            Route::delete('/{item}', [SEXPItemController::class, 'destroy'])->name('destroy');
            Route::get('/search', [SEXPItemController::class, 'search'])->name('search'); 
        });
        

    });


    // Routes for Inventory Setup (Version 3)
    Route::prefix('systemconfiguration2')->name('systemconfiguration2.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('SystemConfiguration/InventorySetup/Index');
        })->name('index'); // Added a proper route name for the index.


         // --- stores Routes ---
        Route::prefix('stores')->name('stores.')->group(function () {
            Route::get('/', [SIV_StoreController::class, 'index'])->name('index'); 
            Route::get('/create', [SIV_StoreController::class, 'create'])->name('create'); 
            Route::post('/', [SIV_StoreController::class, 'store'])->name('store'); 
            Route::get('/{store}/edit', [SIV_StoreController::class, 'edit'])->name('edit'); 
            Route::put('/{store}', [SIV_StoreController::class, 'update'])->name('update'); 
            Route::delete('/{store}', [SIV_StoreController::class, 'destroy'])->name('destroy');
            Route::get('/search', [SIV_StoreController::class, 'search'])->name('search');            
        });

        // --- Product categories Routes ---
        Route::prefix('categories')->name('categories.')->group(function () {
            Route::get('/', [SIV_ProductCategoryController::class, 'index'])->name('index');
            Route::get('/create', [SIV_ProductCategoryController::class, 'create'])->name('create');
            Route::post('/', [SIV_ProductCategoryController::class, 'store'])->name('store');
            Route::get('/{category}/edit', [SIV_ProductCategoryController::class, 'edit'])->name('edit');
            Route::put('/{category}', [SIV_ProductCategoryController::class, 'update'])->name('update'); 
            Route::delete('/{category}', [SIV_ProductCategoryController::class, 'destroy'])->name('destroy');
            Route::get('/search', [SIV_ProductCategoryController::class, 'search'])->name('search');
        });

        // --- Product Routes ---
        Route::prefix('products')->name('products.')->group(function () {
            Route::get('/', [SIV_ProductController::class, 'index'])->name('index');
            Route::get('/create', [SIV_ProductController::class, 'create'])->name('create');
            Route::post('/', [SIV_ProductController::class, 'store'])->name('store');
            Route::get('/{product}/edit', [SIV_ProductController::class, 'edit'])->name('edit');
            Route::put('/{product}', [SIV_ProductController::class, 'update'])->name('update'); 
            Route::delete('/{product}', [SIV_ProductController::class, 'destroy'])->name('destroy');
            Route::get('/search', [SIV_ProductController::class, 'search'])->name('search');
        });

        // --- Unit Routes ---
        Route::prefix('units')->name('units.')->group(function () {
            Route::get('/', [SIV_PackagingController::class, 'index'])->name('index');
            Route::get('/create', [SIV_PackagingController::class, 'create'])->name('create');
            Route::post('/', [SIV_PackagingController::class, 'store'])->name('store');
            Route::get('/{unit}/edit', [SIV_PackagingController::class, 'edit'])->name('edit');
            Route::put('/{unit}', [SIV_PackagingController::class, 'update'])->name('update'); 
            Route::delete('/{unit}', [SIV_PackagingController::class, 'destroy'])->name('destroy');
            Route::get('/search', [SIV_PackagingController::class, 'search'])->name('search');
        });

        // --- Supplier Routes ---
        Route::prefix('suppliers')->name('suppliers.')->group(function () {
            Route::get('/', [SPR_SupplierController::class, 'index'])->name('index');
            Route::get('/create', [SPR_SupplierController::class, 'create'])->name('create');
            Route::post('/', [SPR_SupplierController::class, 'store'])->name('store');
            Route::post('/directstore', [SPR_SupplierController::class, 'directstore'])->name('directstore');
            Route::get('/{supplier}/edit', [SPR_SupplierController::class, 'edit'])->name('edit');
            Route::put('/{supplier}', [SPR_SupplierController::class, 'update'])->name('update'); 
            Route::delete('/{supplier}', [SPR_SupplierController::class, 'destroy'])->name('destroy');
            Route::get('/search', [SPR_SupplierController::class, 'search'])->name('search'); 
        });

        // --- Adjustment Reason Routes ---
        Route::prefix('adjustmentreasons')->name('adjustmentreasons.')->group(function () {
            Route::get('/', [SIV_AdjustmentReasonController::class, 'index'])->name('index');
            Route::get('/create', [SIV_AdjustmentReasonController::class, 'create'])->name('create');
            Route::post('/', [SIV_AdjustmentReasonController::class, 'store'])->name('store');
            Route::get('/{adjustmentreason}/edit', [SIV_AdjustmentReasonController::class, 'edit'])->name('edit');
            Route::put('/{adjustmentreason}', [SIV_AdjustmentReasonController::class, 'update'])->name('update'); 
            Route::delete('/{adjustmentreason}', [SIV_AdjustmentReasonController::class, 'destroy'])->name('destroy');
            Route::get('/search', [SIV_AdjustmentReasonController::class, 'search'])->name('search');
        });
        

    });


    // Routes for Account Setup (Version 3)
    Route::prefix('systemconfiguration3')->name('systemconfiguration3.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('SystemConfiguration/AccountSetup/Index');
        })->name('index'); // Added a proper route name for the index.

         // --- chartofaccount Routes ---
         Route::prefix('chartofaccounts')->name('chartofaccounts.')->group(function () {
            Route::get('/', [ChartOfAccountController::class, 'index'])->name('index');
            Route::get('/create', [ChartOfAccountController::class, 'create'])->name('create');
            Route::post('/', [ChartOfAccountController::class, 'store'])->name('store');
            Route::get('/{chartofaccount}/edit', [ChartOfAccountController::class, 'edit'])->name('edit');
            Route::put('/{chartofaccount}', [ChartOfAccountController::class, 'update'])->name('update'); 
            Route::delete('/{chartofaccount}', [ChartOfAccountController::class, 'destroy'])->name('destroy');
            Route::get('/search', [ChartOfAccountController::class, 'search'])->name('search');
        });   

        
         // --- accountmapping Routes ---
         Route::prefix('chartofaccountmappings')->name('chartofaccountmappings.')->group(function () {
            Route::get('/', [ChartOfAccountMappingController::class, 'index'])->name('index');
            Route::get('/create', [ChartOfAccountMappingController::class, 'create'])->name('create');
            Route::post('/', [ChartOfAccountMappingController::class, 'store'])->name('store');
            Route::get('/edit', [ChartOfAccountMappingController::class, 'edit'])->name('edit');
            Route::put('/', [ChartOfAccountMappingController::class, 'update'])->name('update'); 
        }); 

    });


    // Routes for Location Setup (Version 3)
    Route::prefix('systemconfiguration4')->name('systemconfiguration4.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('SystemConfiguration/LocationSetup/Index');
        })->name('index'); // Added a proper route name for the index.


         // --- countries Routes ---
        Route::prefix('countries')->name('countries.')->group(function () {
            Route::get('/', [LOCCountryController::class, 'index'])->name('index'); 
            Route::get('/create', [LOCCountryController::class, 'create'])->name('create'); 
            Route::post('/', [LOCCountryController::class, 'store'])->name('store'); 
            Route::get('/{country}/edit', [LOCCountryController::class, 'edit'])->name('edit'); 
            Route::put('/{country}', [LOCCountryController::class, 'update'])->name('update'); 
            Route::delete('/{country}', [LOCCountryController::class, 'destroy'])->name('destroy');
            Route::get('/search', [LOCCountryController::class, 'search'])->name('search'); 
        });

        // --- Product regions Routes ---
        Route::prefix('regions')->name('regions.')->group(function () {
            Route::get('/', [LOCRegionController::class, 'index'])->name('index');
            Route::get('/create', [LOCRegionController::class, 'create'])->name('create');
            Route::post('/', [LOCRegionController::class, 'store'])->name('store');
            Route::get('/{region}/edit', [LOCRegionController::class, 'edit'])->name('edit');
            Route::put('/{region}', [LOCRegionController::class, 'update'])->name('update'); 
            Route::delete('/{region}', [LOCRegionController::class, 'destroy'])->name('destroy');
        });

        // --- District Routes ---
        Route::prefix('districts')->name('districts.')->group(function () {
            Route::get('/', [LOCDistrictController::class, 'index'])->name('index');
            Route::get('/create', [LOCDistrictController::class, 'create'])->name('create');
            Route::post('/', [LOCDistrictController::class, 'store'])->name('store');
            Route::get('/{district}/edit', [LOCDistrictController::class, 'edit'])->name('edit');
            Route::put('/{district}', [LOCDistrictController::class, 'update'])->name('update'); 
            Route::delete('/{district}', [LOCDistrictController::class, 'destroy'])->name('destroy');
        });

        // --- Ward Routes ---
        Route::prefix('wards')->name('wards.')->group(function () {
            Route::get('/', [LOCWardController::class, 'index'])->name('index');
            Route::get('/create', [LOCWardController::class, 'create'])->name('create');
            Route::post('/', [LOCWardController::class, 'store'])->name('store');
            Route::get('/{ward}/edit', [LOCWardController::class, 'edit'])->name('edit');
            Route::put('/{ward}', [LOCWardController::class, 'update'])->name('update'); 
            Route::delete('/{ward}', [LOCWardController::class, 'destroy'])->name('destroy');
        });

        // --- Street Routes ---
        Route::prefix('streets')->name('streets.')->group(function () {
            Route::get('/', [LOCStreetController::class, 'index'])->name('index');
            Route::get('/create', [LOCStreetController::class, 'create'])->name('create');
            Route::post('/', [LOCStreetController::class, 'store'])->name('store');
            Route::get('/{street}/edit', [LOCStreetController::class, 'edit'])->name('edit');
            Route::put('/{street}', [LOCStreetController::class, 'update'])->name('update'); 
            Route::delete('/{street}', [LOCStreetController::class, 'destroy'])->name('destroy');
        });   
        

    });


    // Routes for Facility Setup (Version 3)
    Route::prefix('systemconfiguration5')->name('systemconfiguration5.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('SystemConfiguration/FacilitySetup/Index');
        })->name('index'); // Added a proper route name for the index.

         // --- facilityoption Routes ---
         Route::prefix('facilityoptions')->name('facilityoptions.')->group(function () {
            Route::get('/', [FacilityOptionController::class, 'index'])->name('index');
            Route::get('/create', [FacilityOptionController::class, 'create'])->name('create');
            Route::post('/', [FacilityOptionController::class, 'store'])->name('store');
            Route::get('/{facilityoption}/edit', [FacilityOptionController::class, 'edit'])->name('edit');
            Route::put('/{facilityoption}', [FacilityOptionController::class, 'update'])->name('update'); 
            Route::delete('/{facilityoption}', [FacilityOptionController::class, 'destroy'])->name('destroy');
            Route::get('/search', [FacilityOptionController::class, 'search'])->name('search');
        });   

    });


    // Routes for User Management(Version 3)
    Route::prefix('usermanagement')->name('usermanagement.')->group(function () {

        // Main index route
        Route::get('/', function () {
            return Inertia::render('UserManagement/Index');
        })->name('index'); // Added a proper route name for the index.

         // --- usergroup Routes ---
         Route::prefix('usergroups')->name('usergroups.')->group(function () {
            Route::get('/', [UserGroupController::class, 'index'])->name('index');
            Route::get('/create', [UserGroupController::class, 'create'])->name('create');
            Route::post('/', [UserGroupController::class, 'store'])->name('store');
            Route::get('/{usergroup}/edit', [UserGroupController::class, 'edit'])->name('edit');
            Route::put('/{usergroup}', [UserGroupController::class, 'update'])->name('update'); 
            Route::delete('/{usergroup}', [UserGroupController::class, 'destroy'])->name('destroy');
            Route::get('/search', [UserGroupController::class, 'search'])->name('search');
        });   

         // --- user Routes ---
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/', [UserController::class, 'index'])->name('index');
            Route::get('/create', [UserController::class, 'create'])->name('create');
            Route::post('/', [UserController::class, 'store'])->name('store');
            Route::get('/{user}/edit', [UserController::class, 'edit'])->name('edit');
            Route::put('/{user}', [UserController::class, 'update'])->name('update');           
            Route::post('/{user}/resetPassword', [UserController::class, 'resetPassword'])->name('resetPassword');
            Route::delete('/{user}', [UserController::class, 'destroy'])->name('destroy');

        });  
        
        // --- UserPermission Routes ---
        Route::prefix('userpermission')->name('userpermission.')->group(function () {
            Route::get('/', [UserPermissionController::class, 'index'])->name('index');         
            Route::get('/{userGroup}/permissions', [UserPermissionController::class, 'getPermissions'])->name('getPermissions');
            Route::post('/{userGroup}/permissions', [UserPermissionController::class, 'storePermissions'])->name('storePermissions');
            // New route for fetching modules and items
            Route::get('/modules-and-items', [UserPermissionController::class, 'getModulesAndItems'])->name('modulesAndItems');
        });   

    });
    
});


require __DIR__.'/auth.php';
