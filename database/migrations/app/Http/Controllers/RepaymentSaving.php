<?php

namespace App\Http\Controllers;

use App\Models\{Loan,LoanGuarantor,Saving, Repayment, Transaction};
use App\Models\{BLSPackage, BLSPaymentType, BLSCustomer}; 
use App\Models\{ChartOfAccount, ChartOfAccountMapping, JournalEntry, JournalEntryLine};
use App\Enums\{AccountType,LoanStage,ApprovalStatus,TransactionType};





use Inertia\Inertia;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

use Carbon\Carbon;


class RepaymentSaving extends Controller
{
    
    /**
     * Show the form for creating a new loan.
     */
    public function repaymentIndex()
    {
        return inertia('RepaymentSaving/Repayment', [ 
            'paymentTypes'=> BLSPaymentType::all(),         
            'loanTypes' => BLSPackage::all(),
        ]);
    } 

    
   public function storeRepayment(Request $request, Loan $loan)
    {
        $validatedData = $request->validate([
            'amount' => 'required|numeric|min:0',
            'payment_type_id' => 'required|exists:bls_paymenttypes,id',
            'remarks' => 'required|string',
            'payment_date' => 'required|date',
        ]);

        $outstandingBalance = $this->calculateOutstandingBalance($loan);

        if ($validatedData['amount'] > $outstandingBalance) {
            return back()->withErrors(['amount' => 'Repayment amount exceeds outstanding balance.']);
        }

        DB::transaction(function () use ($validatedData, $loan, $outstandingBalance) {

            $chartOfAccountMapping = ChartOfAccountMapping::firstOrFail();
            $customer_loan_code = $chartOfAccountMapping->customer_loan_code;
            $customer_deposit_code = $chartOfAccountMapping->customer_deposit_code;
            $customer_loan_interest_code = $chartOfAccountMapping->customer_loan_interest_code;
        
            $customer = BLSCustomer::findOrFail($loan->customer_id);
        
            // Calculate interest already paid
            $interestPaid = $loan->payments()->sum('interest_paid');
        
            // Determine how much interest remains
            $interestRemaining = max($loan->interest_amount - $interestPaid, 0);
        
            // From this installment, pay off interest first
            $interestDue = min($interestRemaining, $validatedData['amount']);
            $principalPayment = $validatedData['amount'] - $interestDue;
        
            // Create repayment record
            $repayment = $loan->payments()->create([
                'user_id' => auth()->user()->id,
                'amount_paid' => $validatedData['amount'],
                'interest_paid' => $interestDue, // Add this column in your repayments table
                'payment_date' => $validatedData['payment_date'],
                'balance_before' => $outstandingBalance,
                'balance_after' => $outstandingBalance - $validatedData['amount'],
            ]);
        
            // Transaction
            $transaction = Transaction::create([
                'customer_id' => $loan->customer_id,
                'user_id' => auth()->user()->id,
                'loan_id' => $loan->id,
                'amount' => $validatedData['amount'],
                'type' => TransactionType::LoanPayment->value,
                'payment_type_id' => $validatedData['payment_type_id'],
                'transaction_reference' => $this->generateTransactionReference(),
                'description' => $validatedData['remarks'],
            ]);
        
            $repayment->transaction_id = $transaction->id;
            $repayment->save();
        
            $description = match ($customer->customer_type) {
                'individual' => 'Loan Repayment - ' . $customer->first_name . ' ' . $customer->surname,
                'company', 'group' => 'Loan Repayment - ' . $customer->company_name,
                default => 'Loan Repayment - Customer ' . $loan->customer_id,
            };
        
            $journalEntry = JournalEntry::create([
                'entry_date' => $validatedData['payment_date'],
                'reference_number' => $transaction->transaction_reference,
                'description' => $description,
                'transaction_id' => $transaction->id,
            ]);
        
            // Debit Cash/Bank
            $paymentType = BLSPaymentType::findOrFail($validatedData['payment_type_id']);
            $cashAccount = ChartOfAccount::findOrFail($paymentType->chart_of_account_id);
            JournalEntryLine::create([
                'journal_entry_id' => $journalEntry->id,
                'account_id' => $cashAccount->id,
                'debit' => $validatedData['amount'],
                'credit' => 0,
            ]);
        
            // Credit Loan Interest
            if ($interestDue > 0) {
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $customer_loan_interest_code,
                    'debit' => 0,
                    'credit' => $interestDue,
                ]);
            }
        
            // Credit Loan Receivable (principal)
            if ($principalPayment > 0) {
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $customer_loan_code,
                    'debit' => 0,
                    'credit' => $principalPayment,
                ]);
            }
        
            if ($outstandingBalance - $validatedData['amount'] <= 0) {
                $loan->status = 'repaid';
                $loan->save();
            }
        });
        

        return redirect()->back()->with('success', 'Repayment successful!');
    }

    // Helper function to calculate outstanding balance (you'll need to implement the actual logic)
    private function calculateOutstandingBalance(Loan $loan)
    {
        // Implement your outstanding balance calculation logic here.
        // This should take into account the initial loan amount, interest, fees, and previous payments.

        // Placeholder example (replace with your actual calculation):
        return $loan->total_repayment - $loan->payments()->sum('amount_paid'); // Simple example – adjust as needed.

    }

    
    public function savingIndex()
    {
        return inertia('RepaymentSaving/Saving', [ 
            'paymentTypes'=> BLSPaymentType::all(),         
            'savings,' => Saving::all(),
        ]);
    }

    public function showCustomerSaving($customerId)
    {
        
        try {

            $customer = BLSCustomer::with('savings')->findOrFail($customerId); // Fetch customer along with saving details
            
            // Return a JSON response
            if ($customer) {

                return response()->json(['savings' => $customer->savings]); // Include balance in response
            
            } else {
                return response()->json(['loan' => null]); // Or an empty object {} if preferred
            }     

        } catch (\Exception $e) {
            \Log::error("Error in customersavingss:", ['error' => $e]);
            return response()->json(['error' => 'Failed to fetch saving details.'], 500);
        }
    }
    
    public function storeTransaction(Request $request, $customerId)
    {
        $validatedData = $request->validate([
            'amount' => 'required|numeric|min:0',
            'payment_type_id' => 'required|exists:bls_paymenttypes,id',
            'remarks' => 'required|string',
            'transaction_type' => 'required|in:deposit,withdrawal',
        ]);

        $saving = Saving::firstOrCreate(
            ['customer_id' => $customerId],
            ['balance' => 0]
        );

        $amount = $validatedData['amount'];

        // Load chart of account mapping
        $chartOfAccountMapping = ChartOfAccountMapping::firstOrFail();
        $customer_deposit_code = $chartOfAccountMapping->customer_deposit_code;

        DB::transaction(function () use ($validatedData, $saving, $amount, $customerId, $customer_deposit_code) {

            if ($validatedData['transaction_type'] === 'deposit') {
                $saving->balance += $amount;
                $transactionType = TransactionType::Deposit;
            } else {
                if ($saving->balance < $amount) {
                    throw ValidationException::withMessages(['amount' => 'Insufficient funds in savings account.']);
                }
                $saving->balance -= $amount;
                $transactionType = TransactionType::Withdrawal;
            }

            $saving->save();

            $transaction = $saving->transactions()->create([
                'customer_id' => $customerId,
                'user_id' => auth()->user()->id,
                'amount' => $amount,
                'type' => $transactionType->value,
                'payment_type_id' => $validatedData['payment_type_id'],
                'transaction_reference' => $this->generateTransactionReference(),
                'description' => $validatedData['remarks'],
            ]);

            $customer = BLSCustomer::findOrFail($customerId);

            $description = match ($customer->customer_type) {
                'individual' => 'Savings ' . ucfirst($validatedData['transaction_type']) . ' - ' . $customer->first_name . ' ' . $customer->surname,
                'company', 'group' => 'Savings ' . ucfirst($validatedData['transaction_type']) . ' - ' . $customer->company_name,
                default => 'Savings ' . ucfirst($validatedData['transaction_type']) . ' - Customer ' . $customerId,
            };

            $journalEntry = JournalEntry::create([
                'entry_date' => now()->toDateString(),
                'reference_number' => $transaction->transaction_reference,
                'description' => $description,
                'transaction_id' => $transaction->id,
            ]);


            // Get payment type account (Cash/Bank/etc)
            $paymentType = BLSPaymentType::findOrFail($validatedData['payment_type_id']);
            $cashOrBankAccount = ChartOfAccount::findOrFail($paymentType->chart_of_account_id);

            // Determine debit/credit for savings control account
            $savingsDebit = ($validatedData['transaction_type'] === 'deposit') ? 0 : $amount;
            $savingsCredit = ($validatedData['transaction_type'] === 'deposit') ? $amount : 0;

            // Journal entry: Savings Control Account (Liability)
            JournalEntryLine::create([
                'journal_entry_id' => $journalEntry->id,
                'account_id' => $customer_deposit_code, // Mapped savings liability account
                'debit' => $savingsDebit,
                'credit' => $savingsCredit,
            ]);

            // Counterparty entry (Cash or Bank asset account)
            JournalEntryLine::create([
                'journal_entry_id' => $journalEntry->id,
                'account_id' => $cashOrBankAccount->id, // Asset account (Cash/Bank)
                'debit' => $savingsCredit,
                'credit' => $savingsDebit,
            ]);
        });

        return redirect()->back()->with('success', 'Transaction successful!');
    }


    private function generateTransactionReference()
    {
        return 'TRANS-' . uniqid(); // Or a more robust logic
    }

    
}