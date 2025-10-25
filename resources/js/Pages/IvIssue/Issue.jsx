import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheck, faTruckRampBox } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '../../Components/CustomModal.jsx';

export default function Issue({ auth, requistion }) {
    // The form only needs to manage the data for THIS specific action.
    const { data, setData, put, errors, processing, clearErrors } = useForm({
        remarks: '', // This is the only user-editable field for this action.
        // We must include the other fields so the backend validation passes.
        tostore_type: requistion.tostore_type,
        from_store_id: requistion.fromstore_id,
        to_store_id: requistion.tostore_id,
        total: parseFloat(requistion.total) || 0,
        stage: requistion.stage,
        requistionitems: requistion.requistionitems,
        delivery_no: requistion.delivery_no,        
    });

    const [issueConfirmationModal, setIssueConfirmationModal] = useState({
        isOpen: false, isLoading: false, isSuccess: false,
    });

    // Correctly finds the approval remarks from the history.
    const approvalRemarks = useMemo(() => {
        if (requistion?.history && Array.isArray(requistion.history)) {
            const historyEntry = requistion.history.find(h => h.stage === 3);
            return historyEntry ? historyEntry.remarks : 'No approval remarks were provided.';
        }
        return 'History not available.';
    }, [requistion]);

    // Derived state for display purposes.
    const displayData = {        
        from_store_name: requistion.fromstore?.name || 'N/A',
        to_store_name: requistion.tostore?.name ||
            (requistion.tostore?.customer_type === 'individual' ?
                `${requistion.tostore.first_name || ''} ${requistion.tostore.other_names || ''} ${requistion.tostore.surname || ''}`.trim() :
                requistion.tostore?.company_name) || 'N/A',
        total: parseFloat(requistion.total) || 0,
        requistionitems: requistion.requistionitems?.map(item => ({
            _listId: `item-issue-${item.id}`,
            item_name: item.item_name || item.item?.name || 'Unknown Item',
            quantity: parseInt(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
        })) || [],        
    };

    const openIssueConfirmationModal = () => {
        clearErrors();
        setIssueConfirmationModal({ isOpen: true, isLoading: false, isSuccess: false });
    };

    const handleConfirmIssue = () => {
        if (!data.remarks.trim()) {
            setData(prev => ({ ...prev, errors: { ...prev.errors, remarks: 'Issuance remarks are required.' } }));
            return;
        }
        clearErrors('remarks');
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
        if (isNaN(parsedAmount)) return `0.00 ${currencyCode}`;
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
                                <p className="mt-1 text-sm text-gray-500">Review approved requisition details and confirm issuance.</p>
                            </div>

                            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Requisition ID</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{requistion.id || 'N/A'}</dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Current Stage</dt>
                                    <dd className="mt-1 text-sm font-semibold text-green-600">
                                        Approved, Pending Issuance
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
                                    <dt className="text-sm font-medium text-gray-500">Approval Remarks</dt>
                                    <dd className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-md border whitespace-pre-wrap">{approvalRemarks}</dd>
                                </div>
                            </dl>

                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-3">Items to Issue</h3>
                                {displayData.requistionitems.length > 0 ? (
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
                                                            <th scope="row" colSpan={3} className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Grand Total</th>
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

                            {requistion.stage === 3 && (
                                <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                    <Link
                                        href={route('inventory1.index')}
                                        className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300"
                                    >
                                        <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                        Cancel
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={openIssueConfirmationModal}
                                        disabled={processing}
                                        className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                                    >
                                        <FontAwesomeIcon icon={faTruckRampBox} className="mr-2"/>
                                        Confirm and Issue Goods
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={issueConfirmationModal.isOpen}
                onClose={() => {
                    if (issueConfirmationModal.isSuccess) {
                        inertiaRouter.visit(route('inventory1.index'));
                    } else if (!issueConfirmationModal.isLoading) {
                        setIssueConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    }
                }}
                onConfirm={issueConfirmationModal.isSuccess ? () => inertiaRouter.visit(route('inventory1.index')) : handleConfirmIssue}
                title={issueConfirmationModal.isSuccess ? "Issuance Successful" : "Confirm Goods Issuance"}
                confirmButtonText={issueConfirmationModal.isSuccess ? "Close" : issueConfirmationModal.isLoading ? "Processing..." : "Confirm Issue"}
                confirmButtonDisabled={issueConfirmationModal.isLoading}
                isProcessing={issueConfirmationModal.isLoading}
            >
                {issueConfirmationModal.isSuccess ? (
                    <div className="text-center py-4">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500 fa-3x mb-3"/>
                        <p className="text-lg">Goods issued successfully!</p>
                        <p className="text-sm text-gray-600">You will be redirected momentarily.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Please provide remarks for this issuance. This will be recorded in the requisition history.
                        </p>
                        <div>
                            <label htmlFor="issuance_remarks" className="block text-sm font-medium text-gray-700">
                                Issuance Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="remarks"
                                name="remarks"
                                rows="4"
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.remarks ? 'border-red-500 ring-red-500' : 'border-gray-300'}`}
                                value={data.remarks}
                                onChange={(e) => setData('remarks', e.target.value)}
                                disabled={issueConfirmationModal.isLoading}
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
