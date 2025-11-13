import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faTimes } from '@fortawesome/free-solid-svg-icons';

// This component receives the payment to be paid and a list of available payment types.
export default function Payment({ auth, payment, paymentTypes }) {
    
    // The form hook manages the state for the fields that are captured at this final step.
    const { data, setData, patch, processing, errors } = useForm({
        payment_method: paymentTypes.length > 0 ? paymentTypes[0].name : '',
        reference_number: '',
    });

    // This function handles the form submission.
    const handleConfirmPayment = (e) => {
        e.preventDefault();
        // It sends a PATCH request to the `pay` route with the form data.
        patch(route('accounting1.pay', payment.id), {
            preserveScroll: true,
            // THIS IS THE FIX: Replaces the current page in the browser history.
            // After this, clicking the browser's back button will skip this page.
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Confirm Payment Execution</h2>}>
            <Head title={`Pay Payment #${payment.id}`} />
            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    {/* The entire component is a form that submits the final details */}
                    <form onSubmit={handleConfirmPayment} className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Payment</h3>
                        <p className="mb-6 text-sm text-gray-600">You are about to mark this payment as **Paid**. This will create the final journal entries and cannot be undone.</p>
                        
                        {/* A read-only summary of the payment being processed */}
                        <div className="border rounded-lg p-4 space-y-4 mb-8 bg-gray-50">
                            <div><span className="font-semibold w-40 inline-block text-gray-600">Recipient:</span> {payment.recipient.display_name}</div>
                            <div><span className="font-semibold w-40 inline-block text-gray-600">Payment Date:</span> {new Date(payment.transdate).toLocaleDateString()}</div>
                            <div><span className="font-semibold w-40 inline-block text-gray-600">Paying From Account:</span> {payment.facilityoption.chart_of_account.account_name}</div>
                            <div className="font-bold text-xl mt-2"><span className="font-semibold w-40 inline-block text-gray-800">Amount to Pay:</span> {parseFloat(payment.total_amount).toLocaleString()} {payment.currency}</div>
                        </div>

                        {/* The form fields for collecting the final payment details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">Payment Method</label>
                                <select
                                    id="payment_method"
                                    value={data.payment_method}
                                    onChange={e => setData('payment_method', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                >
                                    {paymentTypes.map(pt => (
                                        <option key={pt.id} value={pt.name}>{pt.name}</option>
                                    ))}
                                </select>
                                {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method}</p>}
                            </div>
                            <div>
                                <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700">Reference # (Optional)</label>
                                <input
                                    type="text"
                                    id="reference_number"
                                    value={data.reference_number}
                                    onChange={e => setData('reference_number', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    placeholder="e.g., Cheque #, TXN ID"
                                />
                                {errors.reference_number && <p className="text-red-500 text-xs mt-1">{errors.reference_number}</p>}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            <Link href={route('accounting1.edit', payment.id)} className="text-gray-700 hover:text-gray-900 font-medium">
                               <FontAwesomeIcon icon={faTimes} className="mr-2"/> Go Back
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 font-semibold disabled:bg-green-300"
                            >
                                <FontAwesomeIcon icon={faMoneyBillWave} />
                                {processing ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}