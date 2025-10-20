import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '@/Components/CustomModal.jsx';

export default function RepaymentPreview({ auth, repayment }) {
    // useForm is now configured for the 'put' (void) action and includes the 'remarks' field.
    const { data, setData, put, processing, errors, clearErrors } = useForm({
        remarks: '',
    });

    // State to manage the visibility of the void confirmation modal
    const [isVoidModalOpen, setVoidModalOpen] = useState(false);
    const [clientRemarksError, setClientRemarksError] = useState(null);

    // --- Direct Prop Access for Display ---
    const repaymentItemsToDisplay = repayment.items || [];
    const customer = repayment.customer || {};
    const currencyCode = repayment.currency_code || 'TZS';

    // --- Event Handlers for the Void Action ---

    // Opens the modal and resets any previous errors or remarks.
    const handleVoidClick = useCallback(() => {
        clearErrors('remarks');
        setData('remarks', '');
        setClientRemarksError(null);
        setVoidModalOpen(true);
    }, [setData, clearErrors]);

    // Closes the modal and cleans up form state if not processing.
    const handleModalClose = useCallback(() => {
        setVoidModalOpen(false);
        if (!processing) {
            setData('remarks', '');
            clearErrors('remarks');
        }
    }, [processing, setData, clearErrors]);

    // Confirms and submits the void request.
    const handleModalConfirm = useCallback(() => {
        // 1. Client-side validation for the remarks field.
        if (!data.remarks.trim()) {
            setClientRemarksError('Void reason is required.');
            return;
        }
        setClientRemarksError(null);

        // 2. Submit the PUT request to the new void route.
        put(route("billing4.void", repayment.id), {
            preserveScroll: true,
            onSuccess: () => handleModalClose(), // Close modal on success
            onError: (serverErrors) => console.error("Failed to void repayment:", serverErrors),
        });
    }, [data.remarks, put, repayment.id, handleModalClose]);


    // --- Helper Function for Formatting ---
    const formatCurrency = (amount) => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return 'N/A';
        return parsedAmount.toLocaleString(undefined, {
            style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2,
        });
    };

    // Calculate total on the fly for display
    const totalRepaid = repaymentItemsToDisplay.reduce((sum, item) => sum + (parseFloat(item.totalpaid) || 0), 0);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Repayment Preview - Ref #{repayment.receiptno || 'N/A'}</h2>}
        >
            <Head title={`Preview Repayment - ${repayment.receiptno || 'Details'}`} />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="space-y-8">

                            {/* Customer Details Section */}
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    Customer Details
                                </h3>
                                {customer.id ? (
                                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                                        {customer.customer_type === 'individual' ? (
                                            <>
                                                <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">First Name</dt><dd className="mt-1 text-sm text-gray-900">{customer.first_name || 'N/A'}</dd></div>
                                                <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Other Names</dt><dd className="mt-1 text-sm text-gray-900">{customer.other_names || 'N/A'}</dd></div>
                                                <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Surname</dt><dd className="mt-1 text-sm text-gray-900">{customer.surname || 'N/A'}</dd></div>
                                            </>
                                        ) : (
                                            <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Company Name</dt><dd className="mt-1 text-sm text-gray-900">{customer.company_name || 'N/A'}</dd></div>
                                        )}
                                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Email</dt><dd className="mt-1 text-sm text-gray-900">{customer.email || 'N/A'}</dd></div>
                                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Phone</dt><dd className="mt-1 text-sm text-gray-900">{customer.phone || 'N/A'}</dd></div>
                                    </dl>
                                ) : (
                                    <p className="text-sm text-gray-500">Customer details not available.</p>
                                )}
                            </div>

                            {/* Repayment Allocation Section */}
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    Repayment Allocation
                                </h3>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoice #</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Original Invoice Due</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amount Paid (This Repayment)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {repaymentItemsToDisplay.length > 0 ? repaymentItemsToDisplay.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.invoiceno || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(item.totaldue)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-right text-gray-700">{formatCurrency(item.totalpaid)}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" className="px-4 py-10 text-center text-sm text-gray-500">No invoice allocations for this repayment.</td></tr>
                                            )}
                                        </tbody>
                                        {repaymentItemsToDisplay.length > 0 && (
                                            <tfoot className="bg-gray-100">
                                                <tr className="font-semibold">
                                                    <td colSpan="2" className="px-4 py-3 text-right text-sm uppercase text-gray-700">Total Amount Repaid</td>
                                                    <td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(totalRepaid)}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* Action Buttons Section */}
                            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6 mt-6">
                                <Link href={route('billing4.repaymenthistory')} className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2 h-4 w-4" />
                                    Close
                                </Link>

                                {/* Conditional Void Button */}
                                {repayment.voided === 0 && (
                                    <button
                                        onClick={handleVoidClick}
                                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                        disabled={processing}
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                                        Void Repayment
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Void Repayment Confirmation Modal */}
            <Modal
                isOpen={isVoidModalOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                title="Confirm Void Repayment"
                confirmButtonText={processing ? 'Voiding...' : 'Confirm Void'}
                isProcessing={processing}
            >
                <div>
                    <p className="text-sm text-gray-600">
                        Are you sure you want to void this repayment (Ref: <strong>{repayment.receiptno}</strong>)? This will reverse the payment allocation and increase the customer's balance.
                    </p>

                    {/* Remarks/Reason Textarea */}
                    <label htmlFor="void_remarks" className="mt-4 block text-sm font-medium text-gray-700">
                        Reason for Void <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="void_remarks"
                        name="remarks"
                        rows="3"
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${ (errors.remarks || clientRemarksError) ? 'border-red-500' : ''}`}
                        value={data.remarks}
                        onChange={(e) => setData('remarks', e.target.value)}
                        disabled={processing}
                    />
                    {clientRemarksError && (<p className="mt-1 text-sm text-red-600">{clientRemarksError}</p>)}
                    {errors.remarks && (<p className="mt-1 text-sm text-red-600">{errors.remarks}</p>)}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}