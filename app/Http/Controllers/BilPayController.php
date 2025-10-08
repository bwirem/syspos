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

    BLSPaymentType,
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
                $q->where('first_name', 'like', '%' . $request->search . '%')
                ->orWhere('surname', 'like', '%' . $request->search . '%')
                ->orWhere('other_names', 'like', '%' . $request->search . '%')
                ->orWhere('company_name', 'like', '%' . $request->search . '%');
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
            'payment_types' => BLSPaymentType::all(),
        ]);
    }   
     
    
   
    public function pay(Request $request, $debtor = null) // Assuming $debtor might be part of the route or not strictly used here
    {
        //Log::info('Start processing payment:', ['pay_debtor_param' => $debtor, 'request_data' => $request->all()]);

        try {
            $validator = Validator::make($request->all(), [
                'debtorItems' => 'required|array',
                'debtorItems.*.invoiceno' => 'required|string',
                'debtorItems.*.totaldue' => 'required|numeric',
                'debtorItems.*.balancedue' => 'required|numeric',
                'payment_method' => 'nullable|integer', // Make it required if it always should be
                'paid_amount' => 'required|numeric|min:0.01', // Usually paid amount must be > 0
                'total_paid' => 'required|numeric|min:0.01',  // Same as paid_amount
                'total' => 'required|numeric|min:0', // Total Due for selected items
                'customer_id' => 'required|integer|exists:bls_customers,id', // Example: ensure customer exists
            ]);

            if ($validator->fails()) {
                Log::error('Validation errors during payment create:', [
                    'errors' => $validator->errors()->toArray(), // Send errors as an array
                    'request_data' => $request->all(),
                ]);
                // Inertia expects validation errors to be returned with a 422 status.
                // It will automatically handle them on the frontend.
                // No need to return JSON here if it's an Inertia request.
                // The `post` method from `useForm` will automatically handle this.
                // However, if you *must* return JSON for some reason, you'd need to
                // handle it differently on the frontend (not as a standard Inertia form submission).
                // For standard Inertia form submissions, just let the validation exception happen
                // or redirect back with errors.
                //
                // For Inertia, on validation failure, Laravel's default behavior of redirecting
                // back with errors in the session is what Inertia expects.
                // If you're manually creating the validator, you might need to manually redirect.
                // A simpler way is to use $request->validate() which does this automatically.

                // If using manual Validator, redirect back with errors for Inertia:
                 return back()->withErrors($validator)->withInput();
            }

            $validated = $validator->validated();

            // Fill post Bills table
            $this->payBills($validated); // Assuming this method exists and works

            // SUCCESS RESPONSE FOR INERTIA:
            return redirect()->route('billing2.index') // Or any other relevant route
                             ->with('success', 'Payment processed successfully.'); // Flash message

        } catch (\Exception $e) {
            Log::error('Error during payment processing:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'order_param' => $debtor, // Changed key to avoid conflict if $order is a variable
                'request_data' => $request->all(),
            ]);

            // For general exceptions, redirect back with an error message
            return back()->with('error', 'Error during payment processing. ' . $e->getMessage());
            // OR if you want to stay on the same page but show a general error (less common for POST success/fail):
            // return inertia('YourPaymentPage', ['error' => 'Error during payment processing.']);
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
