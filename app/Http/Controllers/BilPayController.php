<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

use App\Models\{   
    BILOrder,
    BILOrderItem,
    BILSale,
    BILReceipt,
    BILInvoice,
    BILInvoiceLog,

    BILInvoicePayment,
    BILInvoicePaymentDetail,
    

    BILDebtor,
    BILDebtorLog,

    BILVoidedSale,
    BILCollection,
};

use App\Enums\{
    VoidSources,
    BillingTransTypes,
    InvoiceStatus,
    PaymentSources,
    InvoiceTransTypes
};

class BilPayController extends Controller
{
    /**
     * Display a listing of orders.
     */
    
    public function index(Request $request)
    {       
        $query = BILDebtor::with(['invoices', 'customer']); 
    
        // Filtering by customer name using relationship
        if ($request->filled('search')) {
            $query->whereHas('customer', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            });
        }   

        $query->where('balance', '>', 0);
    
        // Paginate and sort orders
        $debtors = $query->orderBy('created_at', 'desc')->paginate(10);
    
        return inertia('BilPays/Index', [
            'debtors' => $debtors,
            'filters' => $request->only(['search']),
        ]);
    }   

    /**
     * Show the form for editing the specified order.
     */
    public function edit(BILDebtor $debtor)
    {   
        // Eager load debtor items and their related items
        $debtor->load(['customer.invoices']);  

        return inertia('BilPays/PayBills', [
            'debtor' => $debtor,
        ]);
    }   
     
    // ... other methods

    public function pay(Request $request, $debtor = null)
    {
        //Log::info('Start processing payment:', ['pay' => $debtor, 'request_data' => $request->all()]);

        try {
            // Create mode: Handle POST request
            $validator = Validator::make($request->all(), [
                'debtorItems' => 'required|array', // Updated to debtorItems
                'debtorItems.*.invoiceno' => 'required|string', // Updated field
                'debtorItems.*.totaldue' => 'required|numeric', // Updated field
                'debtorItems.*.balancedue' => 'required|numeric', // Updated field
                'payment_method' => 'nullable|integer',
                'paid_amount' => 'nullable|numeric',
                'total_paid' => 'nullable|numeric',
                'total' => 'nullable|numeric',  // Total Due     
                'customer_id' => 'required|integer',            
            ]);

            if ($validator->fails()) {
                Log::error('Validation errors during payment create:', [
                    'errors' => $validator->errors()->all(),
                    'request_data' => $request->all(),
                ]);
                return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
            }

            $validated = $validator->validated();
            
            // Fill post Bills table            
            $this->payBills($validated);
            

            return response()->json(['success' => true, 'message' => 'Payment processed successfully.']);

        } catch (\Exception $e) {
            Log::error('Error during payment processing:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'order' => $debtor,
                'request_data' => $request->all(),
            ]);
            return response()->json(['success' => false, 'message' => 'Error during payment processing.'], 500);
        }
    }
      


    public function payBills($data)
    {
        $transdate = Carbon::now(); 
        $customerid = $data['customer_id']; 
        $paidBalance = $data['paid_amount']; 
        $debtorItems = $data['debtorItems'];

        foreach ($debtorItems as $dataitem) {
            
            if ($paidBalance <= 0) {
                break;
            }
         
            $paidForBill = $paidBalance;
            $invoiceBalanceDue = $dataitem['balancedue'];

            if ($invoiceBalanceDue < $paidForBill) {
                $paidForBill = $invoiceBalanceDue;
            }

            // Create a new "row" equivalent to adding to a new collection
            $newRow = [
                'transdate' => $transdate,
                'customer_id' => $customerid,
                'invoiceno' => trim($dataitem['invoiceno']),
                'balancedue' => $invoiceBalanceDue,
                'paidforbill' => $paidForBill,
            ];

            // Add the row to the new collection (equivalent to adding rows in DataTable)
            $DtInvoices[] = $newRow;

            $paidBalance -= $paidForBill;            
        }


        // Generate unique numbers
        $receiptNo = $this->generateUniqueNumber('REC', 'receiptno');
      
        // Use a transaction for atomicity
        DB::transaction(function () use ($DtInvoices, $data, $receiptNo) {
           
            $TransDescription = "Payment";
            $DebtorType = "Individual";
            
            foreach ($DtInvoices as $invoices) {  

                // Parse year and month parts
                $transdate = $invoices['transdate'];
                $yearpart = Carbon::parse($transdate)->year;
                $monthpart = Carbon::parse($transdate)->month;
                
                $invoiceNo = $invoices['invoiceno'];
                $totaldue =  $invoices['balancedue'];
                $paidforinvoice =  $invoices['paidforbill'];
                                    
                // Update the invoice if a receipt exists                    
                // Use the query builder for raw updates
                DB::table('bil_invoices')
                    ->where('invoiceno', $invoiceNo)
                    ->update([
                        'balancedue' => DB::raw("balancedue - {$invoices['paidforbill']}"),
                        'totalpaid' => DB::raw("totalpaid + {$invoices['paidforbill']}"),
                    ]);
        
                // Check if the invoice is fully paid and update the status
                $invoice = BILInvoice::where('invoiceno', $invoiceNo)->first(); // Reload the invoice
                if ($invoice->balancedue == 0) {
                    $invoice->update(['status' => InvoiceStatus::Closed->value]); // For Fully Paid
                }
                    
                // Create the invoice log record
                $invoiceLog = BILInvoiceLog::create([
                    'transdate' => $transdate,
                    'customer_id' => $invoices['customer_id'],
                    'reference' => $receiptNo,
                    'invoiceno' => $invoiceNo,
                    'debitamount' => 0,
                    'creditamount' => $invoices['paidforbill'], 
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,                 
                    'transtype' => InvoiceTransTypes::Payment->value, // For Payments
                    'transdescription' => $TransDescription, 
                    'user_id' => Auth::id(),
                ]);                    
                                
                // Insert into BILInvoicePaymentDetail
                BILInvoicePaymentDetail::create([                        
                    'transdate' => $transdate,
                    'customer_id' => $invoices['customer_id'],                    
                    'receiptno' => $receiptNo,
                    'invoiceno' => $invoiceNo,
                    'totaldue' => $totaldue,
                    'totalpaid' =>$invoices['paidforbill'],                    
                ]);              

                $data['paymentmethod'] = '000001';
                //collection
                // Define payment types with dynamic key
                $paymentTypes = [
                    $data['paymentmethod'] => $invoices['paidforbill'] ?? 0,
                    // Add more payment types if required
                ];
                
                // Initialize base collection data
                $collectionData = [
                    'transdate' =>  $transdate,
                    'receiptno' => $receiptNo, // Trim the receipt number
                    'paymentsource' => 1, // Assuming 1 corresponds to the paymentsource value
                    'customer_id' =>  $invoices['customer_id'], // Customer ID
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,
                    'transtype' => BillingTransTypes::Payment->value, // Transaction type
                    'user_id' => Auth::id(), // Current authenticated user
                ];
                
                // Dynamically add payment types
                foreach ($paymentTypes as $type => $value) {
                    $collectionData['paytype' . $type] = $value;
                }
                
                // Save collection data to the database
                BILCollection::create($collectionData);   

            }

            // Check if the debtor record exists
            $debtor = BILDebtor::where('customer_id', $invoices['customer_id'])
            ->where('debtortype', $DebtorType)
            ->first();            
            $debtor->decrement('balance', $data['paid_amount']);
            

            // Insert a debit transaction into the debtor logs            
            BILDebtorLog::create([
                'transdate' => $transdate,
                'debtor_id' => $debtor->id,
                'reference' => $receiptNo,
                'debtortype' => $DebtorType,
                'debitamount' => 0,
                'creditamount' => $data['paid_amount'],
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::Payment->value, // For Payments
                'transdescription' => $TransDescription, 
                'user_id' => auth()->id(),
            ]);
            

            // Insert into BILInvoicePayment
            BILInvoicePayment::create([
                'transdate' => $transdate,
                'receiptno' => $receiptNo,
                'customer_id' => $invoices['customer_id'],
                'totalpaid' => $data['paid_amount'],
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'user_id' => auth()->id(), // Assuming the authenticated user is creating this record
            ]);
            
        });
    }

    private function generateUniqueNumber($prefix, $column)
    {
        do {
            $number = $prefix . time() . rand(100, 999); // Add randomness to avoid collisions
        } while (BILSale::where($column, $number)->exists());

        return $number;
    }
    

}
