import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function Payment({ auth, payment }) {
    const { processing } = useForm();

    const handleConfirmPayment = () => {
        router.patch(route('accounting1.pay', payment.id), {}, {
             // On success, Inertia will redirect to the edit page, now in a read-only "Paid" state.
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Confirm Payment Execution</h2>}>
            <Head title={`Pay Payment #${payment.id}`} />
            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Payment</h3>
                        <p className="mb-6 text-sm text-gray-600">You are about to mark this payment as **Paid**. This will create the final journal entries and cannot be undone.</p>
                        
                        {/* Summary Card */}
                        <div className="border rounded-lg p-4 space-y-4 mb-6">
                            <div><span className="font-semibold w-40 inline-block">Recipient:</span> {payment.recipient.display_name}</div>
                            <div><span className="font-semibold w-40 inline-block">Payment Date:</span> {new Date(payment.transdate).toLocaleDateString()}</div>
                            <div><span className="font-semibold w-40 inline-block">Paying From Account:</span> {payment.facilityoption.chart_of_account.account_name}</div>
                            <div className="font-bold text-xl"><span className="font-semibold w-40 inline-block">Amount to Pay:</span> {parseFloat(payment.total_amount).toLocaleString()} {payment.currency}</div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            <Link href={route('accounting1.edit', payment.id)} className="text-gray-700 hover:text-gray-900 font-medium">
                               <FontAwesomeIcon icon={faTimes} className="mr-2"/> Go Back
                            </Link>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={processing}
                                className="px-6 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 font-semibold disabled:bg-green-300"
                            >
                                <FontAwesomeIcon icon={faMoneyBillWave} />
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}