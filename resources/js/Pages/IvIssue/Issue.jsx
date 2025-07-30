import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheck, faTruckRampBox } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '../../Components/CustomModal.jsx';

// Define constants for StoreType integer values based on your PHP Enum
const STORE_TYPE_STORE = 1;
const STORE_TYPE_CUSTOMER = 2;
const STORE_TYPE_SUPPLIER = 3;

// Helper to get display label (optional, but good for UI consistency)
const getStoreTypeLabel = (value) => {
    switch (value) {
        case STORE_TYPE_STORE: return 'Store';
        case STORE_TYPE_CUSTOMER: return 'Customer';
        case STORE_TYPE_SUPPLIER: return 'Supplier';
        default: return 'Unknown';
    }
};

export default function IssueGoods({ auth, requistion }) {
    const { data, setData, put, errors, processing, reset, clearErrors } = useForm({
        from_store_name: requistion.fromstore?.name || 'N/A',
        from_store_id: requistion.fromstore_id || null,

        // CRITICAL: Ensure requistion.tostore_type from PHP is the integer (1, 2, or 3)
        // The fallback to STORE_TYPE_STORE (1) is a guess if requistion.tostore_type is missing.
        // It's better if requistion.tostore_type is always reliably provided as an integer.
        tostore_type: Number.isInteger(requistion.tostore_type) ? requistion.tostore_type : STORE_TYPE_STORE,

        to_store_name: requistion.tostore?.name ||
            (requistion.tostore?.customer_type === 'individual' ? // This logic is for display name, separate from tostore_type
                `${requistion.tostore.first_name || ''} ${requistion.tostore.other_names || ''} ${requistion.tostore.surname || ''}`.trim() :
                requistion.tostore?.company_name) || 'N/A',
        to_store_id: requistion.tostore_id || null,

        total: parseFloat(requistion.total) || 0,
        current_stage_display: requistion.stage,
        stage: requistion.stage,

        requistionitems: requistion.requistionitems?.map(item => ({
            id: item.id,
            _listId: `item-issue-${item.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: item.item_name || item.item?.name || 'Unknown Item',
            item_id: item.item_id || item.item?.id || null,
            quantity: parseInt(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
        })) || [],

        delivery_no: requistion.delivery_no || '',
        expiry_date: requistion.expiry_date || null,
        double_entry: requistion.double_entry ?? true,
        remarks: '',
    });

    const [uiFeedbackModal, setUiFeedbackModal] = useState({
        isOpen: false, message: '', isAlert: true, onConfirmAction: null, title: 'Alert', confirmText: 'OK'
    });
    const [issueConfirmationModal, setIssueConfirmationModal] = useState({
        isOpen: false, isLoading: false, isSuccess: false,
    });

    useEffect(() => {
        const calculatedTotal = data.requistionitems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0
        );
        if (data.total !== calculatedTotal) {
            setData('total', calculatedTotal);
        }
    }, [data.requistionitems]);

    const showGeneralAlert = (title, message) => {
        setUiFeedbackModal({
            isOpen: true, title: title, message: message, isAlert: true, confirmText: 'OK',
            onConfirmAction: () => setUiFeedbackModal(prev => ({ ...prev, isOpen: false })),
        });
    };

    const openIssueConfirmationModal = () => {
        clearErrors();
        // CORRECTED: Compare with the integer value for Customer
        if (data.tostore_type !== STORE_TYPE_CUSTOMER && !data.delivery_no.trim()) {
             showGeneralAlert("Validation Error", "Please enter a Delivery Note Number for non-customer transfers.");
             return;
        }
        setIssueConfirmationModal({ isOpen: true, isLoading: false, isSuccess: false });
    };

    const handleConfirmIssue = () => {
        if (!data.remarks.trim()) {
            setData(prev => ({ ...prev, errors: { ...prev.errors, remarks: 'Issuance remarks are required.' } }));
            return;
        }
        clearErrors('remarks');
        console.log("Submitting data:", data); // Good for debugging what's being sent
        setIssueConfirmationModal(prev => ({ ...prev, isLoading: true }));

        put(route('inventory1.update', requistion.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIssueConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: true }));
            },
            onError: (pageErrors) => {
                setIssueConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: false }));
                console.error("Issuance errors:", pageErrors);
            },
        });
    };

    const formatCurrency = (amount, currencyCode = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return '0.00 ' + currencyCode;
        return parsedAmount.toLocaleString(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Goods Issuance</h2>}
        >
            <Head title="Goods Issuance" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="space-y-6">
                            <div className="border-b border-gray-200 pb-5">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Requisition to Issue</h3>
                                <p className="mt-1 text-sm text-gray-500">Review approved requisition details and provide issuance information.</p>
                            </div>

                            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                                {/* ... other dl items ... */}
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">To Store / Customer Type</dt>
                                    {/* Displaying the label for the tostore_type integer */}
                                    <dd className="mt-1 text-sm text-gray-900">{data.to_store_name} ({getStoreTypeLabel(data.tostore_type)})</dd>
                                </div>
                                {/* ... other dl items ... */}
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Requisition ID</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{requistion.id || 'N/A'}</dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Current Stage</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {data.current_stage_display === 3 ? 'Approved, Pending Issuance' : `Status: ${data.current_stage_display}`}
                                    </dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">From Store</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{data.from_store_name}</dd>
                                </div>
                                 <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Approval Remarks (if any)</dt>
                                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{requistion.remarks || 'N/A'}</dd>
                                </div>
                            </dl>

                            <div className="border-t border-gray-200 pt-6 space-y-4">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Issuance Information</h3>
                                <div>
                                    <label htmlFor="delivery_no" className="block text-sm font-medium leading-6 text-gray-900">
                                        Delivery Note Number {data.tostore_type !== STORE_TYPE_CUSTOMER && <span className="text-red-500">*</span>}
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            name="delivery_no"
                                            id="delivery_no"
                                            value={data.delivery_no}
                                            onChange={(e) => setData('delivery_no', e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.delivery_no ? "ring-red-500" : ""}`}
                                        />
                                        {errors.delivery_no && <p className="mt-1 text-sm text-red-600">{errors.delivery_no}</p>}
                                    </div>
                                </div>
                              
                                 <div>
                                    <label htmlFor="double_entry" className="flex items-center text-sm font-medium leading-6 text-gray-900">
                                        Enable Double Entry Accounting
                                        <input
                                            type="checkbox"
                                            name="double_entry"
                                            id="double_entry"
                                            checked={data.double_entry}
                                            onChange={(e) => setData('double_entry', e.target.checked)}
                                            className="ml-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                    </label>
                                    {errors.double_entry && <p className="mt-1 text-sm text-red-600">{errors.double_entry}</p>}
                                </div>
                            </div>

                            {/* ... Requisition Items Table and Actions ... */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-3">Items to Issue</h3>
                                {errors.total && <p className="my-2 text-sm text-red-600">Total Error: {errors.total}</p>}
                                {errors.requistionitems && <p className="my-2 text-sm text-red-600">Item Error: {typeof errors.requistionitems === 'string' ? errors.requistionitems : 'Please check item details.'}</p>}
                                {data.requistionitems.length > 0 ? (
                                    <div className="flow-root">
                                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                                <table className="min-w-full divide-y divide-gray-300">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">Item</th>
                                                            <th scope="col" className="w-28 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Qty to Issue</th>
                                                            <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Price</th>
                                                            <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-3">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {data.requistionitems.map((item, index) => (
                                                            <tr key={item._listId}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">
                                                                    {item.item_name || 'N/A'}
                                                                    {errors[`requistionitems.${index}.item_id`] && <p className="mt-1 text-xs text-red-600">{errors[`requistionitems.${index}.item_id`]}</p>}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">
                                                                    {item.quantity}
                                                                    {errors[`requistionitems.${index}.quantity`] && <p className="mt-1 text-xs text-red-600">{errors[`requistionitems.${index}.quantity`]}</p>}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">
                                                                    {formatCurrency(item.price)}
                                                                    {errors[`requistionitems.${index}.price`] && <p className="mt-1 text-xs text-red-600">{errors[`requistionitems.${index}.price`]}</p>}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500 sm:pr-3">{formatCurrency(item.quantity * item.price)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50">
                                                        <tr>
                                                            <th scope="row" colSpan={3} className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Grand Total</th>
                                                            <td className="pl-3 pr-4 pt-3 text-right text-sm font-semibold text-gray-900 sm:pr-3">{formatCurrency(data.total)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No items in this requisition.</p>
                                )}
                            </div>

                            {data.current_stage_display === 3 && (
                                <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                    <Link
                                        href={route('inventory1.index')}
                                        className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                                    >
                                        <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                        Cancel
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={openIssueConfirmationModal}
                                        disabled={processing || issueConfirmationModal.isLoading}
                                        className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                                    >
                                        <FontAwesomeIcon icon={faTruckRampBox} className="mr-2"/>
                                        Confirm Issue
                                    </button>
                                </div>
                            )}
                            {data.current_stage_display !== 3 && (
                                 <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                     <Link
                                        href={route('inventory1.index')}
                                        className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                                    >
                                        <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                        Close
                                    </Link>
                                 </div>
                             )}

                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={uiFeedbackModal.isOpen}
                onClose={() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={uiFeedbackModal.onConfirmAction || (() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false })))}
                title={uiFeedbackModal.title}
                message={uiFeedbackModal.message}
                isAlert={uiFeedbackModal.isAlert}
                confirmButtonText={uiFeedbackModal.confirmText}
            />

            <Modal
                isOpen={issueConfirmationModal.isOpen}
                onClose={() => {
                    if (issueConfirmationModal.isSuccess) {
                        setIssueConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        inertiaRouter.visit(route('inventory1.index'));
                    } else {
                        setIssueConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    }
                }}
                onConfirm={issueConfirmationModal.isSuccess ? () => {
                    setIssueConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    inertiaRouter.visit(route('inventory1.index'));
                } : handleConfirmIssue}
                title={issueConfirmationModal.isSuccess ? "Issuance Successful" : "Confirm Goods Issuance"}
                confirmButtonText={
                    issueConfirmationModal.isSuccess ? "Close" :
                    issueConfirmationModal.isLoading ? "Processing..." : "Confirm Issue"
                }
                confirmButtonDisabled={issueConfirmationModal.isLoading || (processing && !issueConfirmationModal.isSuccess)}
                isProcessing={issueConfirmationModal.isLoading || processing}
            >
                {issueConfirmationModal.isSuccess ? (
                    <div className="text-center py-4">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500 fa-3x mb-3"/>
                        <p className="text-lg">Goods issued successfully!</p>
                        <p className="text-sm text-gray-600">You will be redirected, or click "Close".</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Please provide remarks for this issuance.
                        </p>
                        <div>
                            <label htmlFor="issuance_remarks" className="block text-sm font-medium text-gray-700">
                                Issuance Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="remarks" // Changed id to match data key
                                name="remarks"
                                rows="3"
                                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm ${errors.remarks ? 'border-red-500 ring-red-500' : ''}`}
                                value={data.remarks}
                                onChange={(e) => setData('remarks', e.target.value)}
                                disabled={issueConfirmationModal.isLoading || processing}
                            />
                            {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                        </div>
                        {errors.message && <p className="mt-2 text-sm text-red-600">{errors.message}</p>}
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}