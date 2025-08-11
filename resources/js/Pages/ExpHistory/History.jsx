import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faExclamationTriangle,
    faShoppingCart,
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

import Modal from '../../Components/CustomModal.jsx'; // Ensure this path is correct

// Returns only the formatted number for better reusability.
const formatCurrency = (amount) => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return '0.00';
    return parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


export default function View({ auth, history, flash }) {
    // useForm is used here simply to hold the data structure. No submission is performed.
    const { data } = useForm({
        description: history.description || '',
        facility_name: history.facilityoption?.name || '',
        stage: history.stage?.toString() || "1",
        total: history.total || 0,
        historyitems: history.postitems?.map(item => ({
            _listId: `expenseitem-view-${item.id}`,
            item_name: item.item?.name || 'Unknown Item',
            amount: item.amount || '',
            remarks: item.remarks || '',
        })) || [],
    });

    const [modalState, setModalState] = useState({
        isOpen: false, message: '', isAlert: true, title: 'Alert',
        onConfirmAction: null, type: 'info', confirmButtonText: 'OK',
    });

    // Function to display the modal for alerts (e.g., from flash messages)
    const showAppModal = (title, message, type = 'info') => {
        setModalState({
            isOpen: true, title, message, isAlert: true, type,
            onConfirmAction: () => setModalState(prev => ({ ...prev, isOpen: false })),
            confirmButtonText: 'OK',
        });
    };

    // Effect to display flash messages that might be passed to the page
    useEffect(() => {
        if (flash?.success) {
            showAppModal('Success', flash.success, 'success');
        }
        if (flash?.error) {
            showAppModal('Error', flash.error, 'error');
        }
    }, [flash]);


    // UI state derived from props
    const stageFromProps = data.stage;

    return (
        <AuthenticatedLayout user={auth?.user} header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">View Expense History</h2>}>
            <Head title="View Expense" />
            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 p-6 shadow-xl sm:rounded-lg">
                        <div className="space-y-8">

                            <section aria-labelledby="expense-details-heading">
                                <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
                                    <h3 id="expense-details-heading" className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                        Expense Details
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Current Stage: <span className={`font-medium ${
                                           
                                            stageFromProps === "3" ? 'text-green-600 dark:text-green-400' :
                                            stageFromProps === "4" ? 'text-red-600 dark:text-red-400' :
                                            'text-gray-600 dark:text-gray-400'}`}>
                                            {stageFromProps === "3" ? 'Approved' :
                                             stageFromProps === "4" ? 'Rejected' :
                                             `Unknown (Stage ID: ${stageFromProps})`}
                                        </span>
                                    </p>
                                </div>
                                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                                    <div className="sm:col-span-4">
                                        <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">
                                            Description
                                        </label>
                                        <div className="mt-2 p-2 min-h-[4rem] rounded-md bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                                            {data.description}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">Facility</label>
                                        <div className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/50">
                                            {data.facility_name || 'Not Specified'}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section aria-labelledby="expense-items-heading" className="border-t border-gray-200 dark:border-gray-700 pt-8">
                                <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
                                    <h3 id="expense-items-heading" className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                        Expense Line Items
                                    </h3>
                                </div>

                                {data.historyitems.length > 0 ? (
                                    <div className="mt-6 flow-root">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-1">
                                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                <thead>
                                                    <tr>
                                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Item</th>
                                                        <th scope="col" className="w-40 px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {data.historyitems.map((item) => (
                                                        <tr key={item._listId}>
                                                            <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.item_name}</td>
                                                            <td className="whitespace-nowrap px-3 py-3 text-sm text-right text-gray-500 dark:text-gray-300">{formatCurrency(item.amount)}</td>
                                                            <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500 dark:text-gray-300">{item.remarks || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-10 text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <FontAwesomeIcon icon={faShoppingCart} className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No items were recorded</h3>
                                    </div>
                                )}
                            </section>

                            <section aria-labelledby="summary-heading" className="border-t border-gray-200 dark:border-gray-700 pt-8">
                                 <div className="flex justify-end items-baseline mb-6">
                                    <span className="text-md font-medium text-gray-600 dark:text-gray-300 mr-2">Total Expense:</span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        TZS {formatCurrency(data.total)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-end gap-x-4">
                                    <Link href={route('expenses2.index')} className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                        Back to List
                                    </Link>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal is kept only for simple alerts like flash messages */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalState.onConfirmAction}
                title={modalState.title}
                message={modalState.message}
                isAlert={modalState.isAlert}
                type={modalState.type}
                confirmButtonText={modalState.confirmButtonText}
            />
        </AuthenticatedLayout>
    );
}