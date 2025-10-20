import React, { useCallback } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUndo, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

export default function Refund({ auth, voided_sale, payment_methods = [] }) {
    const customer = voided_sale.customer || {};
    const currencyCode = voided_sale.currency_code || 'TZS';
    const maxRefundableAmount = parseFloat(voided_sale.totalpaid) || 0;

    // Initialize the form state with useForm
    const { data, setData, post, processing, errors } = useForm({
        transdate: getTodayDate(),
        refund_amount: maxRefundableAmount.toFixed(2), // Default to the max refundable amount
        paymentmethod_id: '', // User must select a method
        remarks: '',
        voidedsale_id: voided_sale.id, // Pass the ID for server-side context
    });

    const formatCurrency = (amount) => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return 'N/A';
        return parsedAmount.toLocaleString(undefined, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setData(name, value);
    }, [setData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Post the form data to the new refund store route
        post(route('billing5.refund.store', voided_sale.id), {
            preserveScroll: true,
            onSuccess: () => {
                // On success, you'll likely be redirected by the controller
            },
            onError: (errs) => {
                console.error("Refund processing errors:", errs);
            }
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Process Refund</h2>}
        >
            <Head title="Process Refund" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="space-y-6">
                            
                            {/* Refund Context Section */}
                            <div className="p-4 border rounded-md bg-gray-50">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Refund Details</h3>
                                <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Customer</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{customer.customer_type === 'individual' ? `${customer.first_name} ${customer.surname}` : customer.company_name}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">Original Ref #</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{voided_sale.invoice_number || voided_sale.receiptno}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-sm font-medium text-gray-500">Original Amount Paid (Max Refundable)</dt>
                                        <dd className="mt-1 text-lg font-semibold text-green-700">{formatCurrency(maxRefundableAmount)}</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Form Fields Section */}
                            <div>
                                {/* Refund Amount */}
                                <div>
                                    <label htmlFor="refund_amount" className="block text-sm font-medium text-gray-700">Refund Amount <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        id="refund_amount"
                                        name="refund_amount"
                                        value={data.refund_amount}
                                        onChange={handleInputChange}
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.refund_amount ? 'border-red-500' : ''}`}
                                        step="0.01"
                                        min="0.01"
                                        max={maxRefundableAmount}
                                        required
                                    />
                                    {errors.refund_amount && <p className="mt-1 text-sm text-red-600">{errors.refund_amount}</p>}
                                </div>
                                
                                {/* Payment Method */}
                                <div className="mt-4">
                                    <label htmlFor="paymentmethod_id" className="block text-sm font-medium text-gray-700">Refund Method <span className="text-red-500">*</span></label>
                                    <select
                                        id="paymentmethod_id"
                                        name="paymentmethod_id"
                                        value={data.paymentmethod_id}
                                        onChange={handleInputChange}
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.paymentmethod_id ? 'border-red-500' : ''}`}
                                        required
                                    >
                                        <option value="">-- Select a method --</option>
                                        {payment_methods.map(method => (
                                            <option key={method.id} value={method.id}>{method.name}</option>
                                        ))}
                                    </select>
                                    {errors.paymentmethod_id && <p className="mt-1 text-sm text-red-600">{errors.paymentmethod_id}</p>}
                                </div>

                                {/* Refund Date */}
                                <div className="mt-4">
                                    <label htmlFor="transdate" className="block text-sm font-medium text-gray-700">Refund Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        id="transdate"
                                        name="transdate"
                                        value={data.transdate}
                                        onChange={handleInputChange}
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.transdate ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {errors.transdate && <p className="mt-1 text-sm text-red-600">{errors.transdate}</p>}
                                </div>

                                {/* Remarks */}
                                <div className="mt-4">
                                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">Remarks / Reason</label>
                                    <textarea
                                        id="remarks"
                                        name="remarks"
                                        rows="3"
                                        value={data.remarks}
                                        onChange={handleInputChange}
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.remarks ? 'border-red-500' : ''}`}
                                    ></textarea>
                                    {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6 mt-6">
                            <Link
                                href={route('billing5.voidsalehistory')}
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                disabled={processing}
                            >
                                <FontAwesomeIcon icon={faTimesCircle} className="mr-2 h-4 w-4" />
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                disabled={processing}
                            >
                                <FontAwesomeIcon icon={faUndo} className="mr-2 h-4 w-4" />
                                {processing ? 'Processing...' : 'Submit Refund'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}