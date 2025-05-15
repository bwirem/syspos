import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useEffect } from 'react'; // Removed unused imports like useCallback, useMemo, useRef for this context
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faArrowLeft, faCheck, faBan } from '@fortawesome/free-solid-svg-icons'; // faBan for Reject/Return
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '../../Components/CustomModal.jsx'; // Assuming path is correct

const defaultStoresArray = []; // For safety if fromstore/tostore are not passed as arrays

export default function Approve({ auth, requistion, fromstore: initialFromStore, tostore: initialToStore }) {
    // Ensure fromstore and tostore are always arrays for mapping
    const fromstore = Array.isArray(initialFromStore) ? initialFromStore : defaultStoresArray;
    const tostore = Array.isArray(initialToStore) ? initialToStore : defaultStoresArray;

    const { data, setData, put, errors, processing, reset, clearErrors } = useForm({
        // Keep essential data from requisition for display and for the PUT request
        from_store_name: requistion.fromstore?.name || 'N/A',
        from_store_id: requistion.fromstore_id || null,
        to_store_name: requistion.tostore?.name || // Handle different tostore structures
            (requistion.tostore?.customer_type === 'individual' ?
                `${requistion.tostore.first_name || ''} ${requistion.tostore.other_names || ''} ${requistion.tostore.surname || ''}`.trim() :
                requistion.tostore?.company_name) || 'N/A',
        to_store_id: requistion.tostore_id || null,
        total: parseFloat(requistion.total) || 0,
        stage: requistion.stage, // Current stage
        remarks: '', // For approval/rejection remarks
        requistionitems: requistion.requistionitems?.map(item => ({ // Keep items for display
            id: item.id,
            _listId: `item-approve-${item.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: item.item_name || item.item?.name || 'Unknown Item',
            item_id: item.item_id || item.item?.id || null,
            quantity: parseInt(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
        })) || [],
        // Fields for approval action
        action_type: '', // Will be 'approve' or 'return'/'reject'
    });

    // Unified UI Feedback Modal (for general alerts)
    const [uiFeedbackModal, setUiFeedbackModal] = useState({
        isOpen: false,
        message: '',
        isAlert: true,
        onConfirmAction: null,
        title: 'Alert',
        confirmText: 'OK'
    });

    // Confirmation Modal State (for Approve/Return actions)
    const [actionConfirmationModal, setActionConfirmationModal] = useState({
        isOpen: false,
        isLoading: false,
        isSuccess: false,
        title: '',
        actionText: '',
        targetStage: null, // Stage to set upon successful action
    });


    // Calculate total (only needs to run once if items are not editable on this screen)
    useEffect(() => {
        const calculatedTotal = data.requistionitems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        if (data.total !== calculatedTotal) {
            setData('total', calculatedTotal);
        }
    }, [data.requistionitems]); // data.total and setData removed from deps as per previous best practice


    const showGeneralAlert = (title, message) => {
        setUiFeedbackModal({
            isOpen: true,
            title: title,
            message: message,
            isAlert: true,
            confirmText: 'OK',
            onConfirmAction: () => setUiFeedbackModal(prev => ({ ...prev, isOpen: false })),
        });
    };

    const openActionConfirmationModal = (type) => {
        clearErrors();
        setData('remarks', ''); // Clear previous remarks for new action

        if (type === 'approve') {
            setData('action_type', 'approve');
            setActionConfirmationModal({
                isOpen: true,
                isLoading: false,
                isSuccess: false,
                title: 'Confirm Approval',
                actionText: 'Approve',
                targetStage: 3, // Example: Stage 3 for Approved
            });
        } else if (type === 'return') {
            setData('action_type', 'return');
            setActionConfirmationModal({
                isOpen: true,
                isLoading: false,
                isSuccess: false,
                title: 'Confirm Return/Rejection',
                actionText: 'Return to Draft',
                targetStage: 1, // Example: Stage 1 for Returned to Draft
            });
        }
    };

    const handleActionConfirm = () => {
        if (!data.remarks.trim()) {
            setData(prev => ({ ...prev, errors: { ...prev.errors, remarks: 'Remarks are required for this action.' } }));
            return;
        }
        clearErrors('remarks');

        setActionConfirmationModal(prev => ({ ...prev, isLoading: true }));

        const payload = {
            remarks: data.remarks,
            action_type: data.action_type, // 'approve' or 'return'
            // The backend will typically determine the next stage based on action_type
        };

        // Use the appropriate route for handling approval/rejection actions
        // This might be the same update route, or a specific action route.
        // For simplicity, using the update route and backend logic discerns the action.
        put(route('inventory1.update', requistion.id), { // Adjust route if needed
            data: payload, // Sending specific payload
            preserveScroll: true,
            onSuccess: () => {
                setActionConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: true }));
                // `reset()` might not be appropriate here as we want to show success then redirect
                // reset();
            },
            onError: (pageErrors) => {
                setActionConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: false }));
                console.error("Action errors:", pageErrors);
                // Errors will be in `errors` prop, display in modal or form
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
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Requisition Approval</h2>}
        >
            <Head title="Requisition Approval" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8"> {/* Consistent max-width */}
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg"> {/* Consistent shadow */}
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
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {data.stage === 1 ? 'Draft' : data.stage === 2 ? 'Submitted for Approval' : data.stage === 3 ? 'Approved' : data.stage === 4 ? 'Processed' : 'Unknown'}
                                    </dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">From Store</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{data.from_store_name}</dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">To Store / Customer</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{data.to_store_name}</dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Initial Remarks (from submission)</dt>
                                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{requistion.remarks || 'No initial remarks.'}</dd>
                                </div>
                            </dl>

                            {/* Requisition Items Table - Read Only */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-3">Items Requested</h3>
                                {data.requistionitems.length > 0 ? (
                                    <div className="flow-root">
                                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                                <table className="min-w-full divide-y divide-gray-300">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">Item</th>
                                                            <th scope="col" className="w-28 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Quantity</th>
                                                            <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Price</th>
                                                            <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-3">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {data.requistionitems.map((item) => (
                                                            <tr key={item._listId}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name || 'N/A'}</td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">{item.quantity}</td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">{formatCurrency(item.price)}</td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500 sm:pr-3">{formatCurrency(item.quantity * item.price)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50">
                                                        <tr>
                                                            <th scope="row" colSpan="3" className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Grand Total</th>
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


                            {/* Actions: Approve, Return/Reject, Cancel */}
                            {/* Only show action buttons if the requisition is in a stage that allows approval (e.g., stage 2) */}
                            {requistion.stage === 2 && (
                                <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                    <Link
                                        href={route('inventory1.index')} // Or specific dashboard
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
                                        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> {/* Or faBan for Reject */}
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
                            )}
                             {requistion.stage !== 2 && (
                                 <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                     <Link
                                        href={route('inventory1.index')} // Or specific dashboard
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

            {/* General UI Feedback Modal (for alerts after actions) */}
            <Modal
                isOpen={uiFeedbackModal.isOpen}
                onClose={() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={uiFeedbackModal.onConfirmAction || (() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false })))}
                title={uiFeedbackModal.title}
                message={uiFeedbackModal.message}
                isAlert={uiFeedbackModal.isAlert}
                confirmButtonText={uiFeedbackModal.confirmText}
            />

            {/* Modal for Action Confirmation (Approve/Return) */}
            <Modal
                isOpen={actionConfirmationModal.isOpen}
                onClose={() => {
                    if (actionConfirmationModal.isSuccess) {
                        setActionConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        inertiaRouter.visit(route('inventory1.index')); // Redirect to list/dashboard
                    } else {
                        setActionConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        // Optionally reset data.action_type if modal is closed without confirming
                        if (!actionConfirmationModal.isLoading) setData('action_type', '');
                    }
                }}
                onConfirm={actionConfirmationModal.isSuccess ? () => {
                    setActionConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    inertiaRouter.visit(route('inventory1.index'));
                } : handleActionConfirm}
                title={actionConfirmationModal.title}
                confirmButtonText={
                    actionConfirmationModal.isSuccess ? "Close" :
                    actionConfirmationModal.isLoading ? "Processing..." : actionConfirmationModal.actionText
                }
                confirmButtonDisabled={actionConfirmationModal.isLoading || (processing && !actionConfirmationModal.isSuccess)}
                isProcessing={actionConfirmationModal.isLoading || processing}
            >
                {actionConfirmationModal.isSuccess ? (
                    <div className="text-center py-4">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500 fa-3x mb-3"/>
                        <p className="text-lg">Action completed successfully!</p>
                        <p className="text-sm text-gray-600">You will be redirected, or click "Close".</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Please provide remarks for this action.
                        </p>
                        <div>
                            <label htmlFor="action_remarks" className="block text-sm font-medium text-gray-700">
                                Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="action_remarks"
                                rows="3"
                                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm ${errors.remarks ? 'border-red-500 ring-red-500' : ''}`}
                                value={data.remarks}
                                onChange={(e) => setData('remarks', e.target.value)}
                                disabled={actionConfirmationModal.isLoading || processing}
                            />
                            {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                        </div>
                        {/* General errors from the `put` call during action */}
                        {errors.message && <p className="mt-2 text-sm text-red-600">{errors.message}</p>}
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}