<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Loan;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use App\Notifications\RepaymentReminderNotification;

class SendLoanReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:send-loan-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send loan repayment reminders to customers with due or overdue installments';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = Carbon::today();
        $reminderCount = 0;

        // Get active loans with their related approvals and payments
        $loans = Loan::with(['customer', 'approvals', 'payments'])
            ->where('status', 'approved') // Get only approved loans
            ->get();

        foreach ($loans as $loan) {
            // Find the latest approval for the loan
            $approval = $loan->approvals()->where('status', 'approved')->latest('updated_at')->first();

            if ($approval) {
                $startDate = Carbon::parse($approval->updated_at); // Use approval date as start date
                $duration = $loan->loan_duration; // Loan duration in months
                $dueDates = [];

                // Generate the expected due dates based on the loan start date
                for ($i = 1; $i <= $duration; $i++) {
                    $dueDate = $startDate->copy()->addMonths($i);
                    if ($dueDate->isPast()) {
                        $dueDates[] = $dueDate; // Store past due dates
                    }
                }

                // Check if a payment was made for each due date
                foreach ($dueDates as $dueDate) {
                    $hasPayment = $loan->payments->contains(function ($payment) use ($dueDate) {
                        return Carbon::parse($payment->payment_date)->isSameMonth($dueDate);
                    });

                    // If no payment was made for this due date, send a reminder
                    if (!$hasPayment) {
                        $this->notifyCustomer($loan->customer, $dueDate);
                        $reminderCount++;
                    }
                }
            }
        }

        $this->info("Loan reminders sent: $reminderCount");
    }

    /**
     * Notify the customer about the overdue installment.
     *
     * @param $customer
     * @param $dueDate
     */
    protected function notifyCustomer($customer, $dueDate)
    {
        $message = "Hi {$customer->first_name}, your loan repayment for the installment due on {$dueDate->format('d M Y')} is overdue. Please make your payment as soon as possible.";

        // Notify via email
        Notification::route('mail', $customer->email)->notify(new RepaymentReminderNotification($message));

        // TODO: Add SMS or WhatsApp integration if needed
    }
}
