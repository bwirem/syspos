<?php

namespace App\Http\Controllers\Traits;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

// Import all necessary Models and Enums for the voiding process
use App\Models\{
    BILSale,
    BILReceipt,
    BILInvoice,
    BILInvoiceLog,
    BILInvoicePayment,
    BILInvoicePaymentDetail,
    BILDebtor,
    BILDebtorLog,
    BILVoidedSale
};
use App\Enums\{
    PaymentSources,
    VoidSources,
    InvoiceStatus,
    BillingTransTypes
};

trait HandlesVoiding
{
    // This trait will use the methods from the GeneratesUniqueNumbers trait
    use GeneratesUniqueNumbers;

    /**
     * Voids a simple cash sale (receipt) and all associated records.
     * This is self-contained and manages its own database transaction.
     */
    private function voidReceipt($receiptno, $transdate, $reasons)
    {
        $yearpart = Carbon::parse($transdate)->year;
        $monthpart = Carbon::parse($transdate)->month;

       
        $voidno = $this->generateUniqueNumber(BILVoidedSale::class, 'voidno', 'VOD');

        $receipt = BILReceipt::where('receiptno', $receiptno)->firstOrFail();

        DB::transaction(function () use ($receipt, $transdate, $voidno, $reasons, $yearpart, $monthpart) {
            // Update the original receipt to mark as voided
            $receipt->update([
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'voiduser_id' => Auth::id(),
            ]);

            // Update the corresponding sale to mark as voided
            $sale = BILSale::where('receiptno', $receipt->receiptno)->first();
            if ($sale) {
                $sale->update([
                    'voided' => 1,
                    'voidsysdate' => now(),
                    'voidtransdate' => $transdate,
                    'voidno' => $voidno,
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,
                    'transtype' => BillingTransTypes::SaleCancellation->value,
                    'voiduser_id' => Auth::id(),
                ]);
            }
    
            // Create the historical voided sale record
            $voidedsale = BILVoidedSale::create([
                'transdate' => $transdate,
                'customer_id' => $receipt->customer_id,
                'receiptno'=> $receipt->receiptno,
                'totaldue' => $receipt->totaldue,
                'totalpaid' => $receipt->totalpaid,
                'balancedue' => $receipt->totaldue - $receipt->totalpaid,
                'voidsource' => VoidSources::CashSale->value,
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'voiduser_id' => Auth::id(),
                'currency_id' => $receipt->currency_id,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'user_id' => $receipt->user_id,
                'reasons' => $reasons,
            ]);
    
            // Reverse inventory by creating negative item entries and log original items
            $receiptItems = $receipt->items()->where('quantity', '>', 0)->get();
    
            foreach ($receiptItems as $receiptItem) {
                $reversalItemData = ['item_id' => $receiptItem->item_id, 'quantity' => -$receiptItem->quantity, 'price' => $receiptItem->price];
                $receipt->items()->create($reversalItemData);
                if ($sale) {
                    $sale->items()->create($reversalItemData);
                }
                $historicalItemData = ['item_id' => $receiptItem->item_id, 'quantity' => $receiptItem->quantity, 'price' => $receiptItem->price];
                $voidedsale->items()->create($historicalItemData);
            }
        });
    }
     
    /**
     * Orchestrates the voiding of a credit sale (invoice) and all associated payments.
     * This method contains the single, atomic database transaction for the entire operation.
     */
    private function voidInvoice(BILSale $sale, $transdate, $reasons)
    {               
        $yearpart = $transdate->year;
        $monthpart = $transdate->month;
        $voidno = $this->generateUniqueNumber(BILVoidedSale::class, 'voidno', 'VOD');
        
        // Get the invoice number from the sale object
        $invoiceno = $sale->invoiceno;
        $invoice = BILInvoice::where('invoiceno', $invoiceno)->firstOrFail();

        // The entire operation is wrapped in one atomic transaction.
        DB::transaction(function () use ($sale, $invoice, $transdate, $voidno, $reasons, $yearpart, $monthpart) {
            
            // --- Step 1: Find and void all associated payments ---
            $paymentDetails = BILInvoicePaymentDetail::where('invoiceno', $invoice->invoiceno)->get();
            foreach ($paymentDetails as $detail) {
                $payment = BILInvoicePayment::where('receiptno', $detail->receiptno)->where('voided', 0)->first();
                if ($payment) {
                    $this->voidPayment($payment, $transdate, "Voided due to cancellation of Invoice #{$invoice->invoiceno}");
                }
            }

            // --- Step 2: Update the BILInvoice record to voided ---
            $invoice->update([
                'status' => InvoiceStatus::Cancelled->value,  
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'voiduser_id' => Auth::id(),
            ]);

            // --- Step 3: Update the original BILSale record to voided ---
            $sale->update([                 
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'voiduser_id' => Auth::id(),
            ]);
        
            // --- Step 4: Create the primary historical BILVoidedSale record ---
            $voidedsale = BILVoidedSale::create([
                'transdate' => $transdate,
                'customer_id' => $invoice->customer_id, 
                'invoiceno'=> $invoice->invoiceno,
                'totaldue' => $invoice->totaldue,
                
                // CORRECTED: Use the totalpaid from the original $sale object.
                'totalpaid' => $sale->totalpaid, 
                
                'balancedue' => $invoice->balancedue, 
                'paidforinvoice' => $invoice->paidforinvoice,  
                'status' => InvoiceStatus::Cancelled->value,                
                'voidsource' => VoidSources::InvoiceSale->value,
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'voiduser_id' => Auth::id(),
                'currency_id' => $invoice->currency_id,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'user_id' => $invoice->user_id,
                'reasons' => $reasons,
            ]);
            
            // --- Step 5: Reverse inventory/stock by creating negative item entries ---
            $invoiceItems = $invoice->items()->where('quantity', '>', 0)->get();
            foreach ($invoiceItems as $invoiceItem) {
                $reversalItemData = ['item_id' => $invoiceItem->item_id, 'quantity' => -$invoiceItem->quantity, 'price' => $invoiceItem->price];
                $invoice->items()->create($reversalItemData);
                if ($sale) {
                    $sale->items()->create($reversalItemData);
                }
                $historicalItemData = ['item_id' => $invoiceItem->item_id, 'quantity' => $invoiceItem->quantity, 'price' => $invoiceItem->price];
                $voidedsale->items()->create($historicalItemData);
            }

            // --- Step 6: Reverse the original debt creation from the debtor's account ---
            $debtor = BILDebtor::where('customer_id', $invoice->customer_id)->first();
            if ($debtor) {
                // This reverses the initial debt. The payments were reversed in Step 1.
                $debtor->decrement('balance', $invoice->totaldue);
                BILDebtorLog::create([
                    'transdate' => $transdate,
                    'debtor_id' => $debtor->id,
                    'reference' => $voidno,
                    'debtortype' => "Individual",
                    'debitamount' => 0,
                    'creditamount' => $invoice->totaldue,
                    'transtype' => BillingTransTypes::SaleCancellation->value,
                    'transdescription' => "Cancellation of Invoice #{$invoice->invoiceno}", 
                    'user_id' => auth()->id(),
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,
                ]);
            }
        });
    }

    /**
     * Helper function to perform the database operations for voiding a single payment.
     * This function does NOT have its own transaction wrapper and must be called from within one.
     */
    private function voidPayment(BILInvoicePayment $payment, $transdate, $reasons)
    {               
        $yearpart = $transdate->year;
        $monthpart = $transdate->month;
        $voidno = $this->generateUniqueNumber(BILVoidedSale::class, 'voidno', 'VOD');
    
        // Step 1: Void the main BILInvoicePayment record.
        $payment->update([              
            'voided' => 1, 'voidsysdate' => now(), 'voidtransdate' => $transdate, 'voidno' => $voidno,
            'yearpart' => $yearpart, 'monthpart' => $monthpart, 'transtype' => BillingTransTypes::PaymentCancellation->value,
            'voiduser_id' => Auth::id(),
        ]);           

        // Step 2: Create a historical record of the voided payment.
        BILVoidedSale::create([
            'transdate' => $transdate, 'customer_id' => $payment->customer_id, 'receiptno' => $payment->receiptno,                
            'totalpaid' => $payment->totalpaid, 'voidsource' => VoidSources::InvoicePayment->value, 'voided' => 1,
            'voidsysdate' => now(), 'voidtransdate' => $transdate, 'voidno' => $voidno, 'voiduser_id' => Auth::id(),
            'currency_id' => $payment->currency_id, 'yearpart' => $yearpart, 'monthpart' => $monthpart,
            'transtype' => BillingTransTypes::PaymentCancellation->value, 'user_id' => $payment->user_id, 'reasons' => $reasons,
        ]);

        // Step 3: Reverse the payment's effect on all related invoices.
        $paymentDetails = BILInvoicePaymentDetail::where('receiptno', $payment->receiptno)->get();
        foreach($paymentDetails as $detail) {
            $invoice = BILInvoice::where('invoiceno', $detail->invoiceno)->first();
            if ($invoice) {
                $invoice->increment('balancedue', $detail->totalpaid);
                $invoice->decrement('totalpaid', $detail->totalpaid);
                if ($invoice->status == InvoiceStatus::Closed->value) {
                    $invoice->status = InvoiceStatus::Open->value;
                }
                $invoice->save();
                BILInvoiceLog::create([
                    'transdate' => $transdate, 'customer_id' => $invoice->customer_id, 'reference' => $voidno,
                    'invoiceno' => $invoice->invoiceno, 'debitamount' => $detail->totalpaid, 'creditamount' => 0, 
                    'yearpart' => $yearpart, 'monthpart' => $monthpart, 'transtype' => BillingTransTypes::PaymentCancellation->value,
                    'transdescription' => "Reversal for Payment #{$payment->receiptno}", 'user_id' => Auth::id(),
                ]);
            }
        }

        // Step 4: Reverse the payment's effect on the customer's overall debtor balance.
        $debtor = BILDebtor::where('customer_id', $payment->customer_id)->first();
        if ($debtor) {
            $debtor->increment('balance', $payment->totalpaid);
            BILDebtorLog::create([
                'transdate' => $transdate, 'debtor_id' => $debtor->id, 'reference' => $voidno,
                'debtortype' => "Individual", 'debitamount' => $payment->totalpaid, 'creditamount' => 0,
                'yearpart' => $yearpart, 'monthpart' => $monthpart, 'transtype' => BillingTransTypes::PaymentCancellation->value,
                'transdescription' => "Payment Reversal #{$payment->receiptno}", 'user_id' => auth()->id(),
            ]);
        }
    }
}