import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faFileInvoice, faTruck } from '@fortawesome/free-solid-svg-icons'; // Added faFileInvoice, faTruck
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '@/Components/CustomModal.jsx';

export default function SalePreview({ auth, sale }) {
    // useForm is now dedicated to handling the void action
    const { data, setData, put, processing, errors, clearErrors } = useForm({
        remarks: '', // Field for the void reason
    });

    // State to manage the visibility of the void confirmation modal
    const [isVoidModalOpen, setVoidModalOpen] = useState(false);
    const [clientRemarksError, setClientRemarksError] = useState(null);

    // --- Direct Prop Access for Display ---
    const saleItemsToDisplay = sale.items || [];
    const customer = sale.customer || {};
    const currencyCode = sale.currency_code || 'TZS';

    // --- Event Handlers for Void Action ---
    const handleVoidClick = useCallback(() => {
        clearErrors('remarks');
        setData('remarks', '');
        setClientRemarksError(null);
        setVoidModalOpen(true);
    }, [setData, clearErrors]);

    const handleVoidModalClose = useCallback(() => {
        setVoidModalOpen(false);
        if (!processing) {
            setData('remarks', '');
            clearErrors('remarks');
        }
    }, [processing, setData, clearErrors]);

    const handleVoidModalConfirm = useCallback(() => {
        if (!data.remarks.trim()) {
            setClientRemarksError('Void remarks are required.');
            return;
        }
        setClientRemarksError(null);

        // Submit the PUT request to the void route
        put(route('billing3.voidsale', sale.id), {
            preserveScroll: true,
            onSuccess: () => handleVoidModalClose(),
            onError: (serverErrors) => console.error('Voiding errors:', serverErrors),
        });
    }, [data.remarks, put, sale.id, handleVoidModalClose]);


    // --- Helper Functions for Formatting ---
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

    const formatNumber = (amount, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return 'N/A';
        return parsedAmount.toLocaleString(undefined, {
            minimumFractionDigits: minimumFractionDigits,
            maximumFractionDigits: maximumFractionDigits,
        });
    };

    // Calculate total on the fly for display, relying on server props for definitive values
    const calculatedSubTotal = saleItemsToDisplay.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Sale Preview - Invoice #{sale.invoice_number || sale.receiptno || 'N/A'}</h2>}
        >
            <Head title={`Preview Sale - ${sale.invoice_number || 'Details'}`} />

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

                            {/* Sale Items Section */}
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    Sale Items
                                </h3>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Quantity</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {saleItemsToDisplay.length > 0 ? saleItemsToDisplay.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.item?.name || 'Unknown Item'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">{formatNumber(item.quantity, 0, 2)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(item.price)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(item.quantity * item.price)}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="4" className="px-4 py-10 text-center text-sm text-gray-500">No items in this sale.</td></tr>
                                            )}
                                        </tbody>
                                        {saleItemsToDisplay.length > 0 && (
                                            <tfoot className="bg-gray-100">
                                                <tr className="font-semibold"><td colSpan="3" className="px-4 py-3 text-right text-sm uppercase text-gray-700">Sub Total</td><td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(calculatedSubTotal)}</td></tr>
                                                <tr className="font-semibold border-t-2 border-gray-300"><td colSpan="3" className="px-4 py-3 text-right text-sm uppercase text-gray-700">Net Amount Due</td><td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(sale.totaldue)}</td></tr>
                                                <tr><td colSpan="3" className="px-4 py-3 text-right text-sm text-gray-700">Amount Paid</td><td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(sale.totalpaid)}</td></tr>
                                                <tr className="font-semibold"><td colSpan="3" className="px-4 py-3 text-right text-sm uppercase text-gray-700">Balance Due</td><td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(sale.totaldue - sale.totalpaid)}</td></tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* Action Buttons Section */}
                            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6 mt-6">
                                
                                {/* PRINT DELIVERY NOTE BUTTON */}
                                <a 
                                    href={route('billing3.print.delivery', sale.id)} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <FontAwesomeIcon icon={faTruck} className="mr-2 h-4 w-4 text-blue-600" />
                                    Delivery Note
                                </a>

                                {/* PRINT INVOICE/RECEIPT BUTTON */}
                                <a 
                                    href={route('billing3.print.invoice', sale.id)} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <FontAwesomeIcon icon={faFileInvoice} className="mr-2 h-4 w-4 text-green-600" />
                                    {sale.invoiceno ? 'Print Invoice' : 'Print Receipt'}
                                </a>

                                <Link href={route('billing3.salehistory')} className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2 h-4 w-4" />
                                    Close
                                </Link>

                                {/* Conditional Void Button */}
                                {sale.voided === 0 && (
                                    <button
                                        onClick={handleVoidClick}
                                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                        disabled={processing}
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                                        Void Sale
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Void Sale Confirmation Modal */}
            <Modal
                isOpen={isVoidModalOpen}
                onClose={handleVoidModalClose}
                onConfirm={handleVoidModalConfirm}
                title="Confirm Void Sale"
                confirmButtonText={processing ? 'Voiding...' : 'Confirm Void'}
                isProcessing={processing}
            >
                <div>
                    <p className="text-sm text-gray-600">
                        Are you sure you want to void the sale for reference <strong>{sale.invoice_number || sale.receiptno}</strong>? This action cannot be undone.
                    </p>
                    <label htmlFor="void_remarks" className="mt-4 block text-sm font-medium text-gray-700">
                        Void Remarks <span className="text-red-500">*</span>
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