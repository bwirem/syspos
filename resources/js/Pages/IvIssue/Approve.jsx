
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faArrowLeft, faCheck } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '../../Components/CustomModal.jsx'; // Adjust path if necessary

export default function Approve({ auth, requistion }) {
    const { data, setData, put, errors, processing, clearErrors } = useForm({
        // Fields for the approval/return action payload
        remarks: '',
        action_type: '', // Will be 'approve' or 'return'
    });

    // Confirmation Modal State (for Approve/Return actions)
    const [actionConfirmationModal, setActionConfirmationModal] = useState({
        isOpen: false,
        isLoading: false,
        isSuccess: false,
        title: '',
        actionText: '',
    });

    // useMemo is perfect for efficiently finding the submission remarks
    // without re-calculating on every render unless the requisition prop changes.
    const submissionRemarks = useMemo(() => {
        if (requistion?.history && Array.isArray(requistion.history)) {
            // Find the history entry where the stage was set to 2 (Submitted)
            const historyEntry = requistion.history.find(h => h.stage === 2);
            return historyEntry ? historyEntry.remarks : 'No submission remarks were provided.';
        }
        return 'History not available.';
    }, [requistion]);

    // Derived state for display purposes
    const displayData = {
        from_store_name: requistion.fromstore?.name || 'N/A',
        to_store_name: requistion.tostore?.name || // Handles different tostore structures
            (requistion.tostore?.customer_type === 'individual' ?
                `${requistion.tostore.first_name || ''} ${requistion.tostore.other_names || ''} ${requistion.tostore.surname || ''}`.trim() :
                requistion.tostore?.company_name) || 'N/A',
        total: parseFloat(requistion.total) || 0,
        stage: requistion.stage,
        requistionitems: requistion.requistionitems?.map(item => ({
            _listId: `item-approve-${item.id}`,
            item_name: item.item_name || item.item?.name || 'Unknown Item',
            quantity: parseInt(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
        })) || [],
    };

    // Function to configure and open the modal based on the chosen action
    const openActionConfirmationModal = (type) => {
        clearErrors();
        setData({ remarks: '', action_type: type }); // Reset form data for the action

        if (type === 'approve') {
            setActionConfirmationModal({
                isOpen: true,
                isLoading: false,
                isSuccess: false,
                title: 'Confirm Requisition Approval',
                actionText: 'Approve',
            });
        } else if (type === 'return') {
            setActionConfirmationModal({
                isOpen: true,
                isLoading: false,
                isSuccess: false,
                title: 'Confirm Return to Draft',
                actionText: 'Return to Draft',
            });
        }
    };

    // Handles the final submission from the modal
    const handleActionConfirm = () => {
        if (!data.remarks.trim()) {
            setData(prev => ({ ...prev, errors: { ...prev.errors, remarks: 'Remarks are required for this action.' } }));
            return;
        }
        clearErrors('remarks');

        setActionConfirmationModal(prev => ({ ...prev, isLoading: true }));

        // The payload is simple, just the action type and the approver's remarks.
        // The backend uses this data to update the stage and create a history log.
        put(route('inventory1.update', requistion.id), {
            preserveScroll: true,
            onSuccess: () => {
                setActionConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: true }));
            },
            onError: (pageErrors) => {
                setActionConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: false }));
                console.error("Action errors:", pageErrors);
            },
        });
    };

    const formatCurrency = (amount, currencyCode = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return `0.00 ${currencyCode}`;
        return parsedAmount.toLocaleString(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Requisition Approval</h2>}
        >
            <Head title="Requisition Approval" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="space-y-6">
                            {/* Requisition Details Section - Read Only */}
                            <div className="border-b border-gray-200 pb-5">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Requisition Details</h3>
                                <p className="mt-1 text-sm text-gray-500">Review the details below before taking action.</p>
                            </div>

                            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Requisition ID</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{requistion.id || 'N/A'}</dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Current Stage</dt>
                                    <dd className="mt-1 text-sm font-semibold text-blue-600">
                                        {'Submitted for Approval'}
                                    </dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">From Store</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{displayData.from_store_name}</dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">To Store / Customer</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{displayData.to_store_name}</dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Submission Remarks</dt>
                                    <dd className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-md border whitespace-pre-wrap">{submissionRemarks}</dd>
                                </div>
                            </dl>

                            {/* Requisition Items Table - Read Only */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-3">Items Requested</h3>
                                {displayData.requistionitems.length > 0 ? (
                                    <div className="flow-root">
                                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                                <table className="min-w-full divide-y divide-gray-300">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">Item</th>
                                                            <th scope="col" className="w-28 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Quantity</th>
                                                            <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Unit Price</th>
                                                            <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-3">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {displayData.requistionitems.map((item) => (
                                                            <tr key={item._listId}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name}</td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">{item.quantity}</td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">{formatCurrency(item.price)}</td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500 sm:pr-3">{formatCurrency(item.quantity * item.price)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50">
                                                        <tr>
                                                            <th scope="row" colSpan="3" className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Grand Total</th>
                                                            <td className="pl-3 pr-4 pt-3 text-right text-sm font-semibold text-gray-900 sm:pr-3">{formatCurrency(displayData.total)}</td>
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

                            {/* Action Buttons: Conditionally rendered */}
                            {requistion.stage === 2 ? (
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
                                        onClick={() => openActionConfirmationModal('return')}
                                        disabled={processing}
                                        className="rounded-md bg-orange-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-50"
                                    >
                                        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                                        Return to Draft
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openActionConfirmationModal('approve')}
                                        disabled={processing}
                                        className="rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
                                    >
                                        <FontAwesomeIcon icon={faCheck} className="mr-2"/>
                                        Approve
                                    </button>
                                </div>
                            ) : (
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

            {/* Modal for Action Confirmation (Approve/Return) */}
            <Modal
                isOpen={actionConfirmationModal.isOpen}
                onClose={() => {
                    if (actionConfirmationModal.isSuccess) {
                        setActionConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        inertiaRouter.visit(route('inventory1.index'));
                    } else if (!actionConfirmationModal.isLoading) {
                        setActionConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    }
                }}
                onConfirm={actionConfirmationModal.isSuccess ? () => inertiaRouter.visit(route('inventory1.index')) : handleActionConfirm}
                title={actionConfirmationModal.title}
                confirmButtonText={
                    actionConfirmationModal.isSuccess ? "Close" :
                    actionConfirmationModal.isLoading ? "Processing..." : actionConfirmationModal.actionText
                }
                confirmButtonDisabled={actionConfirmationModal.isLoading}
                isProcessing={actionConfirmationModal.isLoading}
            >
                {actionConfirmationModal.isSuccess ? (
                    <div className="text-center py-4">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500 fa-3x mb-3"/>
                        <p className="text-lg">Action completed successfully!</p>
                        <p className="text-sm text-gray-600">You will be redirected momentarily.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Please provide remarks for this action. This will be recorded in the requisition history.
                        </p>
                        <div>
                            <label htmlFor="action_remarks" className="block text-sm font-medium text-gray-700">
                                Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="action_remarks"
                                rows="4"
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.remarks ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                                value={data.remarks}
                                onChange={(e) => setData('remarks', e.target.value)}
                                disabled={actionConfirmationModal.isLoading}
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
