import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTrash,
    faTimesCircle,
    faSpinner,
    faCheckCircle,
    faExclamationTriangle,
    faShoppingCart,
    faSearch,
    faPencilAlt,
    faPaperPlane, // for Submit
    faUndo,      // for Return to Draft
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx'; // Ensure this path is correct

// Debounce utility to prevent rapid firing of search requests
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

// Refined: Returns only the formatted number for better reusability.
const formatCurrency = (amount) => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return '0.00';
    return parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


export default function Edit({ auth, approval, flash }) {
    const { data, setData, errors, processing, reset, clearErrors, setError } = useForm({
        description: approval.description || '',
        facility_name: approval.facilityoption?.name || '',
        facility_id: approval.facilityoption_id || null,
        stage: approval.stage?.toString() || "1",
        total: approval.total || 0,
        approvalitems: approval.postitems?.map(item => ({
            id: item.id,
            _listId: `expenseitem-edit-${item.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: item.item?.name || 'Unknown Item',
            item_id: item.item_id || item.item?.id,
            amount: item.amount || '',
            remarks: item.remarks || '',
        })) || [],
        approval_remarks: '',
    });

    // Component state management
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemSearchContainerRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [modalState, setModalState] = useState({
        isOpen: false, message: '', isAlert: true, title: 'Alert',
        onConfirmAction: null, type: 'info', confirmButtonText: 'OK', showRemarksInput: false,
    });

    const [activeSubmitStage, setActiveSubmitStage] = useState(null);

    // Function to display the modal for alerts and confirmations
    const showAppModal = (title, message, type = 'info', isAlert = true, onConfirmCallback = null, confirmText = 'OK', requireRemarks = false) => {
        if (requireRemarks) setData('approval_remarks', '');
        setModalState({
            isOpen: true, title, message, isAlert, type,
            onConfirmAction: onConfirmCallback || (() => setModalState(prev => ({ ...prev, isOpen: false }))),
            confirmButtonText: isAlert ? 'OK' : confirmText,
            showRemarksInput: !isAlert && requireRemarks,
        });
    };

    // Effect to display flash messages from the backend
    useEffect(() => {
        if (flash?.success) {
            showAppModal('Success', flash.success, 'success');
        }
        if (flash?.error) {
            showAppModal('Error', flash.error, 'error');
        }
    }, [flash]);

    // Generic data fetching utility for item search
    const fetchData = useCallback(async (endpoint, query, setLoading, setResults, setShowDropdown, entityName, errorMsgEntity) => {
        if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
        setLoading(true);
        try {
            const response = await axios.get(route(endpoint), { params: { query } });
            setResults(response.data[entityName]?.slice(0, 10) || []);
            setShowDropdown(true);
        } catch (error) {
            console.error(`Error fetching ${errorMsgEntity}:`, error);
            showAppModal('Fetch Error', `Failed to fetch ${errorMsgEntity}. Please try again later.`, 'error');
        } finally { setLoading(false); }
    }, []);

    const fetchItems = useCallback((query) => fetchData('systemconfiguration1.items.search', query, setIsItemSearchLoading, setItemSearchResults, setShowItemDropdown, 'items', 'items'), [fetchData]);
    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setShowItemDropdown(false);
        }
    }, [itemSearchQuery, debouncedItemSearch]);

    // Effect to auto-calculate total when items change
    useEffect(() => {
        const calculatedTotal = data.approvalitems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        if (data.total !== calculatedTotal) {
            setData('total', calculatedTotal);
        }
    }, [data.approvalitems]);

    // Effect to close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemSearchContainerRef.current && !itemSearchContainerRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handlers for line item changes
    const handleApprovalItemChange = (index, field, value) => {
        setData('approvalitems', data.approvalitems.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addApprovalItem = (selectedItem) => {
        if (!selectedItem || !selectedItem.id) return;
        if (data.approvalitems.some(pi => pi.item_id === selectedItem.id)) {
            showAppModal('Item Exists', `"${selectedItem.name}" is already in the list.`, 'warning');
            return;
        }
        const newItem = {
            id: null,
            _listId: `expenseitem-new-${Date.now()}`,
            item_name: selectedItem.name,
            item_id: selectedItem.id,
            amount: '',
            remarks: '',
        };
        setData('approvalitems', items => [...items, newItem]);
        setItemSearchQuery('');
        setShowItemDropdown(false);
        setTimeout(() => document.getElementById(`amount-${newItem._listId}`)?.focus(), 100);
    };

    const confirmRemoveApprovalItem = (indexToRemove) => {
        showAppModal('Confirm Removal', `Remove "${data.approvalitems[indexToRemove]?.item_name}"?`, 'confirmation', false,
            () => {
                setData('approvalitems', items => items.filter((_, idx) => idx !== indexToRemove));
                setModalState(prev => ({ ...prev, isOpen: false }));
            }, 'Yes, Remove');
    };

    // Core form validation logic
    const validateForm = (isCheckingRemarks = false) => {
        clearErrors();
        const newErrors = {};
        if (!data.description?.trim()) newErrors.description = 'Description is required.';
        if (data.approvalitems.length === 0) newErrors.approvalitems = 'Please add at least one expense item.';
        data.approvalitems.forEach((item, index) => {
            if (!item.amount || parseFloat(item.amount) <= 0) {
                newErrors[`approvalitems.${index}.amount`] = 'A positive amount is required for each item.';
            }
        });
        if (isCheckingRemarks && !data.approval_remarks.trim()) {
            newErrors.approval_remarks = 'Remarks are required for this action.';
        }

        if (Object.keys(newErrors).length > 0) {
            setError(newErrors);
            showAppModal("Validation Error", Object.values(newErrors).find(msg => typeof msg === 'string'), 'error');
            return false;
        }
        return true;
    };

    // Function to submit data to the backend
    const actualUpdate = (targetStage, remarks = null) => {
        setActiveSubmitStage(targetStage);
        const dataForBackend = {
            ...data,
            stage: targetStage.toString(),
            approval_remarks: remarks || data.approval_remarks,
            _method: 'PUT',
        };
        router.put(route('expenses1.update', approval.id), dataForBackend, {
            preserveScroll: true,
            onSuccess: page => {
                setData('stage', page.props.approval?.stage?.toString() || targetStage.toString());
                setData('approval_remarks', '');
            },
            onError: pageErrors => {
                const errorMessages = Object.values(pageErrors).flat().join(' ');
                showAppModal("Update Error", errorMessages || "An unknown error occurred.", 'error');
            },
            onFinish: () => {
                setActiveSubmitStage(null);
                setModalState(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Main handler for all action buttons
    const handleApprovalAction = (targetStage, requiresRemarks = false, modalTitle = '', modalMessage = '') => {
        if (requiresRemarks) {
            const onConfirmCallback = () => {
                const remarksInput = document.getElementById('approval_remarks_modal');
                const remarksValue = remarksInput ? remarksInput.value.trim() : '';

                if (!remarksValue) {
                    setError('approval_remarks', 'Remarks are required for this action.');
                    setModalState(prev => ({ ...prev, isOpen: true })); // Keep modal open to show error
                    return;
                }
                clearErrors('approval_remarks');

                if (!validateForm(false)) { // Validate rest of the form but not remarks again
                    setModalState(prev => ({ ...prev, isOpen: false })); // Close modal, main page shows other errors
                    return;
                }
                actualUpdate(targetStage, remarksValue);
            };

            showAppModal(modalTitle, modalMessage, 'confirmation', false, onConfirmCallback, 'Confirm', true);
        } else {
            if (!validateForm()) return;
            actualUpdate(targetStage);
        }
    };

    // UI state derived from props
    const stageFromProps = data.stage;
    const isPendingSubmission = stageFromProps === "1";
    const isPendingApproval = stageFromProps === "2";
    const canEditFields = isPendingSubmission || isPendingApproval;

    // --- Configuration object for action buttons to clean up JSX ---
    const actionButtons = [
        {
            label: "Submit for Approval", targetStage: "2", icon: faPaperPlane,
            className: "bg-indigo-600 hover:bg-indigo-500", loadingText: "Submitting...",
            displayOn: ["1"], // Show only when stage is '1' (Draft)
        },
        {
            label: "Approve", targetStage: "3", icon: faCheckCircle,
            className: "bg-green-600 hover:bg-green-500", loadingText: "Approving...",
            requiresRemarks: true, modalTitle: "Confirm Approval",
            modalMessage: "Please provide remarks for approving this expense.",
            displayOn: ["2"], // Show only when stage is '2' (Pending Approval)
        },
        {
            label: "Reject", targetStage: "4", icon: faTimesCircle,
            className: "bg-red-600 hover:bg-red-500", loadingText: "Rejecting...",
            requiresRemarks: true, modalTitle: "Confirm Rejection",
            modalMessage: "Please provide the reason for rejecting this expense.",
            displayOn: ["2"],
        },
        // {
        //     label: "Save Changes", targetStage: "2", icon: faPencilAlt,
        //     className: "bg-blue-600 hover:bg-blue-500", loadingText: "Saving...",
        //     displayOn: ["2"],
        // },
        {
            label: "Return to Draft", targetStage: "1", icon: faUndo,
            className: "bg-gray-600 hover:bg-gray-500", loadingText: "Returning...",
            displayOn: ["2"],
        },
    ];

    return (
        <AuthenticatedLayout user={auth?.user} header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Process Expense Approval</h2>}>
            <Head title="Process Expense" />
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
                                            stageFromProps === "1" ? 'text-orange-600 dark:text-orange-400' :
                                            stageFromProps === "2" ? 'text-yellow-600 dark:text-yellow-400' :
                                            stageFromProps === "3" ? 'text-green-600 dark:text-green-400' :
                                            stageFromProps === "4" ? 'text-red-600 dark:text-red-400' :
                                            'text-gray-600 dark:text-gray-400'}`}>
                                            {stageFromProps === "1" ? 'Draft' :
                                             stageFromProps === "2" ? 'Pending Approval' :
                                             stageFromProps === "3" ? 'Approved' :
                                             stageFromProps === "4" ? 'Rejected' :
                                             `Unknown (Stage ID: ${stageFromProps})`}
                                        </span>
                                    </p>
                                </div>
                                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                                    <div className="sm:col-span-4">
                                        <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">
                                            Description <span className="text-red-500">*</span>
                                        </label>
                                        <textarea id="description" name="description" rows="3"
                                            value={data.description} onChange={(e) => setData('description', e.target.value)}
                                            className={`mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-gray-200 dark:bg-gray-700 shadow-sm ring-1 ring-inset ${errors.description ? 'ring-red-500' : 'ring-gray-300 dark:ring-gray-600'} sm:text-sm`}
                                            disabled={!canEditFields}
                                        />
                                        {errors.description && <p className="mt-2 text-sm text-red-600 flex items-center"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-1.5 h-4 w-4" />{errors.description}</p>}
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">Facility</label>
                                        <div className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 sm:text-sm">
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
                                {canEditFields && (
                                    <div className="mt-6">
                                        <div className="relative" ref={itemSearchContainerRef}>
                                            <div className="relative rounded-md shadow-sm">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input type="text" ref={itemSearchInputRef} placeholder="Search and add item..."
                                                    value={itemSearchQuery} onChange={(e) => setItemSearchQuery(e.target.value)} onFocus={() => {if(itemSearchQuery.trim()) setShowItemDropdown(true);}}
                                                    className="block w-full rounded-md border-0 py-2 pl-10 pr-10 text-gray-900 dark:text-gray-200 dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                                                    autoComplete="off" />
                                                {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute inset-y-0 right-10 flex items-center pr-3 text-gray-400"/>}
                                                {itemSearchQuery && !isItemSearchLoading && (
                                                    <button type="button" onClick={() => setItemSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                        <FontAwesomeIcon icon={faTimesCircle} className="h-5 w-5 text-gray-400 hover:text-gray-600"/>
                                                    </button>
                                                )}
                                            </div>
                                            {showItemDropdown && (
                                                <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {itemSearchResults.length > 0 ? itemSearchResults.map((item) => (
                                                        <li key={item.id} onClick={() => addApprovalItem(item)}
                                                            className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
                                                            {item.name}
                                                        </li>
                                                    )) : !isItemSearchLoading && (<li className="p-3 text-sm text-gray-500">No items found.</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {data.approvalitems.length > 0 ? (
                                    <div className="mt-6 flow-root">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-1">
                                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                <thead>
                                                    <tr>
                                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Item</th>
                                                        <th scope="col" className="w-40 px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Amount <span className="text-red-500">*</span></th>
                                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Remarks</th>
                                                        {canEditFields && <th scope="col" className="w-16 relative py-3.5 text-center"><span className="sr-only">Actions</span></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {data.approvalitems.map((item, index) => (
                                                        <tr key={item._listId} className={errors[`approvalitems.${index}.amount`] ? "bg-red-50 dark:bg-red-900/10" : ""}>
                                                            <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.item_name}</td>
                                                            <td className="px-3 py-1.5">
                                                                <input type="number" id={`amount-${item._listId}`} step="0.01" min="0.01"
                                                                    value={item.amount} onChange={(e) => handleApprovalItemChange(index, 'amount', e.target.value)}
                                                                    className={`block w-full rounded-md border-0 py-1.5 text-right text-gray-900 dark:text-gray-200 dark:bg-gray-700 ring-1 ring-inset ${errors[`approvalitems.${index}.amount`] ? 'ring-red-500' : 'ring-gray-300 dark:ring-gray-600'} sm:text-sm`}
                                                                    disabled={!canEditFields}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-1.5">
                                                                <input type="text" value={item.remarks} onChange={(e) => handleApprovalItemChange(index, 'remarks', e.target.value)}
                                                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-gray-200 dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 sm:text-sm"
                                                                    disabled={!canEditFields}
                                                                />
                                                            </td>
                                                            {canEditFields && (
                                                                <td className="relative whitespace-nowrap py-3 pl-3 pr-4 text-center">
                                                                    <button type="button" onClick={() => confirmRemoveApprovalItem(index)}
                                                                        className="text-red-600 hover:text-red-800 p-1 rounded-full">
                                                                        <FontAwesomeIcon icon={faTrash} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {errors.approvalitems && <p className="mt-2 text-sm text-red-600 flex items-center"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-1.5 h-4 w-4" />{errors.approvalitems}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-10 text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <FontAwesomeIcon icon={faShoppingCart} className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No items added</h3>
                                        {canEditFields && <p className="mt-1 text-sm text-gray-500">Use the search bar above to add expense items.</p>}
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
                                    <Link href={route('expenses1.index')} className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                        Back to List
                                    </Link>

                                    {actionButtons
                                        .filter(btn => btn.displayOn.includes(stageFromProps))
                                        .map(btn => (
                                            <button
                                                key={btn.label} type="button"
                                                onClick={() => handleApprovalAction(btn.targetStage, btn.requiresRemarks, btn.modalTitle, btn.modalMessage)}
                                                disabled={processing}
                                                className={`rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 flex items-center justify-center ${btn.className}`}
                                            >
                                                {processing && activeSubmitStage === btn.targetStage ? (
                                                    <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />{btn.loadingText}</>
                                                ) : (
                                                    <><FontAwesomeIcon icon={btn.icon} className="mr-2" />{btn.label}</>
                                                )}
                                            </button>
                                        ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalState.onConfirmAction}
                title={modalState.title}
                message={modalState.message}
                isAlert={modalState.isAlert}
                type={modalState.type}
                confirmButtonText={modalState.confirmButtonText}
            >
                {modalState.showRemarksInput && (
                    <div className="mt-4">
                        <label htmlFor="approval_remarks_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Remarks <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="approval_remarks_modal" rows="3"
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm dark:bg-gray-700 dark:text-gray-200 ${errors.approval_remarks ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'}`}
                            value={data.approval_remarks}
                            onChange={(e) => {
                                setData('approval_remarks', e.target.value);
                                if (errors.approval_remarks) clearErrors('approval_remarks');
                            }}
                            placeholder="Enter remarks for this action..."
                        />
                        {errors.approval_remarks && <p className="mt-1 text-xs text-red-500">{errors.approval_remarks}</p>}
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}