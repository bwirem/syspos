<?php

namespace App\Http\Controllers;

use App\Models\Loan;
use App\Models\BLSPackage;
use App\Models\BLSPaymentType;
use App\Models\BLSCustomer;
use App\Models\Transaction;
use App\Models\Saving;

use App\Models\{ChartOfAccount,ChartOfAccountMapping, JournalEntry, JournalEntryLine};

use App\Enums\AccountType;
use App\Enums\LoanStage;
use App\Enums\TransactionType;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class LoanDisbursementController extends Controller
{
    /**
     * Display a listing of loans.
     */
    
     public function index(Request $request)
     {
         $user = auth()->user();
     
         // 1. Get ALL facility branches associated with the authenticated user
         $userFacilityBranches = $user->facilityBranches()->get();
     
         // 2. If the user has no facility branches, return empty loans
         if ($userFacilityBranches->isEmpty()) {
             return inertia('LoanDisbursement/Index', [
                 'loans' => ['data' => []], // Or an empty paginator: Loan::query()->paginate(10)
                 'facilityBranches' => collect(), // Pass empty collection
                 'filters' => $request->only(['search', 'facilitybranch_id']), // Stage is fixed, so not needed in filters here
             ]);
         }
     
         // 3. Get the IDs of the user's facility branches to filter loans
         $userFacilityBranchIds = $userFacilityBranches->pluck('id')->toArray();
     
         // 4. Build the Loan query
         $query = Loan::with(['customer', 'loanPackage', 'user']);
     
         // 4a. CRITICAL: Filter loans to only those in the user's assigned facility branches
         $query->whereIn('facilitybranch_id', $userFacilityBranchIds);
     
         // 4b. Set the specific stage for disbursement
         $query->where('stage', '=', '7'); // Only loans at stage 7 (ready for disbursement)
     
         // 4c. Search functionality (corrected to search on customer)
         if ($request->filled('search')) {
             $query->whereHas('customer', function ($q) use ($request) {
                 $q->where('first_name', 'like', '%' . $request->search . '%')
                   ->orWhere('other_names', 'like', '%' . $request->search . '%')
                   ->orWhere('surname', 'like', '%' . $request->search . '%')
                   ->orWhere('company_name', 'like', '%' . $request->search . '%');
             });
         }
     
         // 4d. Filter by specific facility branch (if requested by user via UI filter)
         if ($request->filled('facilitybranch_id')) {
             // Ensure the requested facilitybranch_id is one the user has access to
             if (in_array($request->facilitybranch_id, $userFacilityBranchIds)) {
                 $query->where('facilitybranch_id', $request->facilitybranch_id);
             } else {
                 // If user tries to filter by a branch they don't own, return no results for that filter attempt
                 $query->whereRaw('1 = 0'); // Effectively makes the query return nothing
             }
         }
     
         // 5. Paginate the results
         $loans = $query->orderBy('created_at', 'desc')->paginate(10);
     
         // 6. Return data to Inertia view
         return inertia('LoanDisbursement/Index', [
             'loans' => $loans,
             'facilityBranches' => $userFacilityBranches, // Pass all user's branches for dropdown
             'filters' => $request->only(['search', 'facilitybranch_id']), // Stage is fixed to 7
         ]);
     } 
    
    /**
     * Show the form for editing the specified loan.
     */
    public function edit(Loan $loan)
    {     
        $loan->load('customer'); 
        $loan->load('loanGuarantors.guarantor'); // Eager load the relationship and the guarantor details
        $loan->load('approvals.approver.userGroup'); 

        $loan->loanGuarantors->transform(function ($loanGuarantor) {
            return [    
                //'id' => $loanGuarantor->id,         
                'collateral_doc' => $loanGuarantor->collateral_doc, // Or format as needed    
                'collateralDocName' => $loanGuarantor->collateral_docname,         
                'first_name' => $loanGuarantor->guarantor->first_name,               
                'surname' => $loanGuarantor->guarantor->surname,
                'company_name' => $loanGuarantor->guarantor->company_name,
                'guarantor_type' => $loanGuarantor->guarantor->guarantor_type,
                'guarantor_id' => $loanGuarantor->guarantor->id,  

            ];
        });
     
        return inertia('LoanDisbursement/Edit', [
            'loan' => $loan,
            'loanTypes' => BLSPackage::all(),
            'paymentTypes'=> BLSPaymentType::all(),           
        ]);
        
    }

    /**
     * Update the specified loan in storage.
     */  
   
     public function disburse(Request $request, Loan $loan)
     {
         // Validation (payment type, remarks) - removed amount
         $validatedData = $request->validate([
             'payment_type_id' => 'required|integer|min:1',
             'remarks' => 'required|string',
         ]);
     
         if ($loan->stage < LoanStage::Approved->value) {
             abort(400, 'Loan is not yet fully approved or already disbursed.');
         }
     
         // Check if loan amount is valid
         if ($loan->loan_amount <= 0) {
             abort(400, 'Invalid loan amount for disbursement.');
         }
     
         $paymentType = BLSPaymentType::findOrFail($validatedData['payment_type_id']);
         
         // Retrieve Chart of Account Mapping once
         $chartOfAccountMapping = ChartOfAccountMapping::first();
         $customer_loan_code = $chartOfAccountMapping->customer_loan_code;
         $customer_deposit_code = $chartOfAccountMapping->customer_deposit_code;
     
         DB::transaction(function () use ($validatedData, $loan, $paymentType, $customer_loan_code, $customer_deposit_code) {
             
             $currentStage = LoanStage::from($loan->stage);
             
             if (!$currentStage) {
                 abort(400, 'Invalid loan stage.');
             }
     
             $nextStage = match ($currentStage) {
                 LoanStage::LoanOfficerReview => LoanStage::ManagerReview,
                 LoanStage::ManagerReview => LoanStage::CommitteeReview,
                 LoanStage::CommitteeReview => LoanStage::Approved,
                 LoanStage::Approved => LoanStage::Disbursed,
                 default => null,
             };
     
             $disbursementAmount = $loan->loan_amount;
     
             if ($nextStage) {
                 $loan->update(['stage' => $nextStage->value]);
     
                 $transaction = Transaction::create([
                     'customer_id' => $loan->customer_id,
                     'user_id' => auth()->user()->id,
                     'loan_id' => $loan->id,
                     'amount' => $disbursementAmount,
                     'type' => TransactionType::Disbursement->value,
                     'payment_type_id' => $validatedData['payment_type_id'],
                     'transaction_reference' => $this->generateTransactionReference(),
                     'description' => $validatedData['remarks'],
                 ]);
     
                 // Retrieve the customer using the loan's customer_id
                 $customer = BLSCustomer::findOrFail($loan->customer_id);
     
                 // Use the customer's data to build the description
                 $description = match ($customer->customer_type) {
                     'individual' => 'Loan Disbursement - ' . $customer->first_name . ' ' . $customer->surname,
                     'company' => 'Loan Disbursement - ' . $customer->company_name,
                     'group' => 'Loan Disbursement - ' . $customer->company_name,
                     default => 'Loan Disbursement - Customer ' . $loan->customer_id,
                 };
     
                 $journalEntry = JournalEntry::create([
                     'entry_date' => now()->toDateString(),
                     'reference_number' => $transaction->transaction_reference,
                     'description' => $description,
                     'transaction_id' => $transaction->id,
                 ]);
     
                 // Debit: Loan Receivable Account (Increase)
                 $loanReceivableAccount = ChartOfAccount::findOrFail($customer_loan_code);
                 JournalEntryLine::create([
                     'journal_entry_id' => $journalEntry->id,
                     'account_id' => $loanReceivableAccount->id,
                     'debit' => $disbursementAmount,
                     'credit' => 0,
                 ]);
     
                 // Handle savings account deposit if applicable
                 if ($paymentType->chart_of_account_id == $customer_deposit_code) {
                     // Handle savings account logic
                     $saving = Saving::where('customer_id', $loan->customer_id)->first();
                     if (!$saving) {
                         $saving = Saving::create(['customer_id' => $loan->customer_id, 'balance' => 0]);
                     }
     
                     $saving->balance += $disbursementAmount;
                     $saving->save();
     
                     // Record savings deposit transaction
                     Transaction::create([
                         'customer_id' => $loan->customer_id,
                         'user_id' => auth()->user()->id,
                         'savings_id' => $saving->id,
                         'amount' => $disbursementAmount,
                         'type' => TransactionType::Deposit->value,
                         'payment_type_id' => $validatedData['payment_type_id'],
                         'transaction_reference' => $this->generateTransactionReference(),
                         'description' => 'Loan disbursement deposit',
                     ]);
     
                     // Credit: Savings Account (Decrease)
                     $savingsAccount = ChartOfAccount::findOrFail($customer_deposit_code);
                     JournalEntryLine::create([
                         'journal_entry_id' => $journalEntry->id,
                         'account_id' => $savingsAccount->id,
                         'debit' => 0,
                         'credit' => $disbursementAmount,
                     ]);
     
                 } else { 
                     // If not a savings disbursement, assume it's a cash disbursement
     
                     // Retrieve the Cash account directly using the chart_of_account_id
                     $cashAccount = ChartOfAccount::findOrFail($paymentType->chart_of_account_id);
     
                     JournalEntryLine::create([
                         'journal_entry_id' => $journalEntry->id,
                         'account_id' => $cashAccount->id,
                         'debit' => 0,
                         'credit' => $disbursementAmount,
                     ]);
                 }
             }
     
         });
     
         return redirect()->route('loan2.index')->with('success', 'Loan disbursed successfully!');
     }
     
     


    private function generateTransactionReference()
    {
        // Implement your logic to generate a unique transaction reference
        // Example:
        return 'DISB-' . uniqid();
    }
    
}

