import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react'; // Import router
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTrash,
    faSave,
    faTimesCircle,
    faSpinner,
    faPlus,
    faCheckCircle,
    faExclamationTriangle,
    faInfoCircle,
    faShoppingCart,
    faSearch,
    faPencilAlt
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const formatCurrency = (amount, currencyCode = 'TZS') => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return `${currencyCode} 0.00`;
    return parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


export default function Edit({ auth, post, flash }) {
    const { data, setData, errors, processing, reset, clearErrors, setError } = useForm({ // Removed `put` from here as we use global router.put
        description: post.description || '',
        facility_name: post.facilityoption?.name || '',
        facility_id: post.facilityoption_id || null,
        stage: post.stage?.toString() || "1",
        total: post.total || 0,
        postitems: post.postitems?.map(item => ({
            id: item.id,
            _listId: `expenseitem-edit-${item.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: item.item?.name || item.item_name || 'Unknown Item',
            item_id: item.item_id || item.item?.id,
            amount: item.amount || '',
            remarks: item.remarks || '',
        })) || [],
    });

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemSearchContainerRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [modalState, setModalState] = useState({
        isOpen: false, message: '', isAlert: true, title: 'Alert',
        itemToRemoveIndex: null, onConfirmAction: null, type: 'info',
        confirmButtonText: 'OK',
    });

    const [activeSubmitStage, setActiveSubmitStage] = useState(null);

    const showAppModal = (title, message, type = 'info', isAlert = true, onConfirmCallback = null, confirmText = 'OK') => {
        setModalState({
            isOpen: true, title, message, isAlert, type, itemToRemoveIndex: null,
            onConfirmAction: onConfirmCallback || (() => setModalState(prev => ({ ...prev, isOpen: false }))),
            confirmButtonText: isAlert ? 'OK' : confirmText,
        });
    };

     useEffect(() => {
        if (flash?.success) {
            showAppModal('Success', flash.success, 'success');
        }
        if (flash?.error) {
            showAppModal('Error', flash.error, 'error');
        }
    }, [flash]);

    const fetchData = useCallback(async (endpoint, query, setLoading, setResults, setShowDropdown, entityName, errorMsgEntity) => {
        if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
        setLoading(true);
        try {
            const response = await axios.get(route(endpoint), { params: { query } });
            setResults(response.data[entityName]?.slice(0, 10) || []);
            setShowDropdown(true);
        } catch (error) {
            console.error(`Error fetching ${errorMsgEntity}:`, error); // Keep this console.error for actual errors
            showAppModal('Fetch Error', `Failed to fetch ${errorMsgEntity}. Please try again later.`, 'error');
            setResults([]); setShowDropdown(false);
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

    useEffect(() => {
        const calculatedTotal = data.postitems.reduce(
            (sum, item) => sum + (parseFloat(item.amount) || 0),
            0
        );
        if (data.total !== calculatedTotal) {
            setData('total', calculatedTotal);
        }
    }, [data.postitems, data.total, setData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemSearchContainerRef.current && !itemSearchContainerRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePostItemChange = (index, field, value) => {
        setData('postitems', data.postitems.map((item, i) => {
            if (i === index) {
                let processedValue = value;
                if (field === 'amount') {
                    const parsedValue = parseFloat(value);
                    processedValue = value === '' ? '' : (isNaN(parsedValue) || parsedValue < 0 ? '' : parsedValue.toString());
                }
                return { ...item, [field]: processedValue };
            }
            return item;
        }));
    };

    const addPostItem = (selectedItem) => {
        if (!selectedItem || !selectedItem.id) return;
        if (data.postitems.some(pi => pi.item_id === selectedItem.id)) {
            showAppModal('Item Exists', `"${selectedItem.name}" is already in the list.`, 'warning');
            itemSearchInputRef.current?.focus();
            return;
        }
        const newItem = {
            id: null,
            _listId: `expenseitem-new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: selectedItem.name,
            item_id: selectedItem.id,
            amount: '',
            remarks: '',
        };
        setData('postitems', [...data.postitems, newItem]);
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };

    const confirmRemovePostItem = (indexToRemove) => {
        showAppModal(
            'Confirm Removal',
            `Remove "${data.postitems[indexToRemove]?.item_name || 'this item'}" from the list?`,
            'confirmation', false,
            () => {
                setData('postitems', data.postitems.filter((_, idx) => idx !== indexToRemove));
                setModalState(prev => ({ ...prev, isOpen: false }));
            },
            'Yes, Remove'
        );
    };

    const validateForm = () => {
        clearErrors();
        let isValid = true;
        const newErrors = {};

        if (!data.description?.trim()) {
            newErrors.description = 'Description is required.';
            isValid = false;
        }
        if (!data.facility_id) {
            newErrors.facility_id = 'Facility information is missing.';
            isValid = false;
        }

        if (data.postitems.length === 0) {
            newErrors.postitems = 'Please add at least one expense item.';
            isValid = false;
        }

        let itemLineError = false;
        data.postitems.forEach((item, index) => {
            if (!item.item_id) {
                newErrors[`postitems.${index}.item_id`] = 'Item selection is invalid.';
                isValid = false; itemLineError = true;
            }
            const amount = parseFloat(item.amount);
            if (item.amount === '' || isNaN(amount) || amount <= 0) {
                newErrors[`postitems.${index}.amount`] = 'Amount must be a positive number.';
                isValid = false; itemLineError = true;
            }
        });

        if (Object.keys(newErrors).length > 0) {
             Object.entries(newErrors).forEach(([key, value]) => setError(key, value));
        }

        if (!isValid) {
            const generalErrorMsg = itemLineError ? "Please correct errors in the item list." :
                                    newErrors.postitems ? newErrors.postitems :
                                    newErrors.description || newErrors.facility_id || "Please fill all required fields correctly.";
            showAppModal("Validation Error", generalErrorMsg, 'error');
        }
        return isValid;
    };

    const actualUpdate = (targetStageFromCaller) => {
        setActiveSubmitStage(targetStageFromCaller);

        const dataForBackend = {
            description: data.description,
            facility_id: data.facility_id,
            total: data.total,
            stage: targetStageFromCaller.toString(),
            postitems: data.postitems.map(item => ({
                id: item.id,
                item_id: item.item_id,
                amount: item.amount,
                remarks: item.remarks,
            })),
            _method: 'PUT',
        };

        router.put(route('expenses0.update', post.id), dataForBackend, {
            preserveScroll: true,
            onSuccess: () => {
                setData('stage', targetStageFromCaller.toString());
                const stageName = targetStageFromCaller === "1" ? "Draft" :
                                  targetStageFromCaller === "2" ? "Approved" :
                                  targetStageFromCaller === "5" ? "Cancelled" :
                                  "Other";
                showAppModal("Success!", `Expense updated successfully (New Stage: ${stageName}).`, 'success');
            },
            onError: (pageErrors) => {
                const errorMessages = pageErrors && typeof pageErrors === 'object' ? Object.values(pageErrors).flat().join(' ') : 'Failed to update expense.';
                showAppModal("Update Error", errorMessages, 'error');
                if (pageErrors && typeof pageErrors === 'object') {
                    Object.keys(pageErrors).forEach(key => {
                        setError(key, pageErrors[key][0] || pageErrors[key]);
                    });
                }
            },
            onFinish: () => {
                setActiveSubmitStage(null);
                setModalState(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleUpdate = (targetStageOnClick) => {
        if (!validateForm()) return;

        if ((data.stage === "1" || data.stage === 1) && targetStageOnClick === "2") {
            showAppModal(
                'Confirm Submission for Approval',
                'Are you sure you want to submit this draft for approval? This will change its stage.',
                'confirmation',
                false,
                () => actualUpdate(targetStageOnClick),
                'Yes, Submit for Approval'
            );
        } else {
            actualUpdate(targetStageOnClick);
        }
    };

    const handleItemSearchInputChange = (e) => setItemSearchQuery(e.target.value);
    const clearItemSearch = () => {
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };

    const isCurrentStageDraft = data.stage === "1" || data.stage === 1;
    const isCurrentStageApproved = data.stage === "2" || data.stage === 2;
    const isCurrentStageCancelled = data.stage === "5" || data.stage === 5;


    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Edit Expense</h2>}
        >
            <Head title="Edit Expense" />
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
                                            isCurrentStageDraft ? 'text-yellow-600 dark:text-yellow-400' :
                                            isCurrentStageApproved ? 'text-green-600 dark:text-green-400' :
                                            isCurrentStageCancelled ? 'text-red-600 dark:text-red-400' :
                                            'text-gray-600 dark:text-gray-400'}`}>
                                            {isCurrentStageDraft ? 'Draft' :
                                             isCurrentStageApproved ? 'Approved' :
                                             isCurrentStageCancelled ? 'Cancelled' :
                                             `Other (ID: ${data.stage})`}
                                        </span>
                                    </p>
                                </div>
                                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                                    <div className="sm:col-span-4">
                                        <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">
                                            Description <span className="text-red-500">*</span>
                                        </label>
                                        <div className="mt-2">
                                            <textarea
                                                id="description" name="description" rows="3"
                                                placeholder="e.g., Office supplies for Q3, Travel expenses for client meeting"
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                className={`block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-gray-200 dark:bg-gray-700 shadow-sm ring-1 ring-inset ${errors.description ? 'ring-red-500 focus:ring-red-500' : 'ring-gray-300 dark:ring-gray-600 focus:ring-indigo-600 dark:focus:ring-indigo-500'} placeholder:text-gray-400 dark:placeholder-gray-500 sm:text-sm sm:leading-6`}
                                                disabled={isCurrentStageApproved || isCurrentStageCancelled}
                                            />
                                        </div>
                                        {errors.description && <p className="mt-2 text-sm text-red-600 flex items-center"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-1.5 h-4 w-4" />{errors.description}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">
                                            Facility <span className="text-red-500">*</span>
                                        </label>
                                        <div className="mt-2">
                                            <div className={`block w-full rounded-md border-0 py-1.5 px-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 sm:text-sm sm:leading-6 ${!data.facility_name ? 'italic text-gray-500 dark:text-gray-400' : ''}`}>
                                                {data.facility_name || 'Not Specified'}
                                            </div>
                                        </div>
                                        {errors.facility_id && <p className="mt-2 text-sm text-red-600 flex items-center"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-1.5 h-4 w-4" />{errors.facility_id}</p>}
                                    </div>
                                </div>
                            </section>

                            <section aria-labelledby="expense-items-heading" className="border-t border-gray-200 dark:border-gray-700 pt-8">
                                <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
                                    <h3 id="expense-items-heading" className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                        Expense Line Items
                                    </h3>
                                </div>
                                {!(isCurrentStageApproved || isCurrentStageCancelled) && (
                                    <div className="mt-6">
                                        <label htmlFor="item-search-expense" className="sr-only">Search Items</label>
                                        <div className="relative" ref={itemSearchContainerRef}>
                                            <div className="relative rounded-md shadow-sm">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                                                </div>
                                                <input type="text" name="item-search-expense" id="item-search-expense" ref={itemSearchInputRef}
                                                    placeholder="Search item to add..." value={itemSearchQuery}
                                                    onChange={handleItemSearchInputChange}
                                                    onFocus={() => {if(itemSearchQuery.trim()) setShowItemDropdown(true);}}
                                                    className="block w-full rounded-md border-0 py-2 pl-10 pr-10 text-gray-900 dark:text-gray-200 dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                                    autoComplete="off" />
                                                {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute inset-y-0 right-10 flex items-center pr-3 text-gray-400"/>}
                                                {!isItemSearchLoading && itemSearchQuery && (
                                                    <button type="button" onClick={clearItemSearch}
                                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Clear Item Search">
                                                        <FontAwesomeIcon icon={faTimesCircle} className="h-5 w-5"/>
                                                    </button>
                                                )}
                                            </div>
                                            {showItemDropdown && itemSearchQuery.trim() && (
                                                <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {itemSearchResults.length > 0 ? itemSearchResults.map((item) => (
                                                        <li key={item.id} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
                                                            onClick={() => addPostItem(item)}>
                                                            {item.name} {item.code ? `(${item.code})` : ''}
                                                        </li>
                                                    )) : !isItemSearchLoading && (<li className="p-3 text-sm text-gray-500 dark:text-gray-400">No items found matching your search.</li>)}
                                                    {isItemSearchLoading && <li className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">Searching...</li>}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {data.postitems.length > 0 ? (
                                    <div className="mt-6 flow-root">
                                       <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-3">Item</th>
                                                            <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Remarks (Optional)</th>
                                                            {!(isCurrentStageApproved || isCurrentStageCancelled) && <th scope="col" className="w-20 relative py-3.5 pl-3 pr-4 sm:pr-3 text-center"><span className="sr-only">Actions</span></th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                        {data.postitems.map((item, index) => (
                                                            <tr key={item._listId} className={ errors[`postitems.${index}.amount`] ? "bg-red-50 dark:bg-red-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-3">{item.item_name}</td>
                                                                <td className="px-3 py-2.5 text-sm">
                                                                    <input type="number" value={item.amount} step="0.01" min="0.01"
                                                                        onChange={(e) => handlePostItemChange(index, 'amount', e.target.value)}
                                                                        className={`block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-gray-200 dark:bg-gray-700 shadow-sm ring-1 ring-inset ${errors[`postitems.${index}.amount`] ? 'ring-red-500 focus:ring-red-500' : 'ring-gray-300 dark:ring-gray-600 focus:ring-indigo-600 dark:focus:ring-indigo-500'} placeholder:text-gray-400 dark:placeholder-gray-500 sm:text-sm sm:leading-6 text-right`}
                                                                        placeholder="0.00" aria-label={`Amount for ${item.item_name}`}
                                                                        disabled={isCurrentStageApproved || isCurrentStageCancelled}
                                                                    />
                                                                   {errors[`postitems.${index}.amount`] && <p className="mt-1 text-xs text-red-600">{errors[`postitems.${index}.amount`]}</p>}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-sm">
                                                                    <input type="text" value={item.remarks}
                                                                        onChange={(e) => handlePostItemChange(index, 'remarks', e.target.value)}
                                                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-gray-200 dark:bg-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                                                        placeholder="e.g., Specific brand, purpose" aria-label={`Remarks for ${item.item_name}`}
                                                                        disabled={isCurrentStageApproved || isCurrentStageCancelled}
                                                                    />
                                                                </td>
                                                                {!(isCurrentStageApproved || isCurrentStageCancelled) && (
                                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                                        <button type="button" onClick={() => confirmRemovePostItem(index)}
                                                                            className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800" title="Remove item">
                                                                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4"/>
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {errors.postitems && typeof errors.postitems === 'string' &&
                                                    <p className="mt-2 text-sm text-red-600 flex items-center"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-1.5 h-4 w-4" />{errors.postitems}</p>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                 <div className="mt-10 text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    <FontAwesomeIcon icon={faShoppingCart} className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No items for this expense</h3>
                                    {!(isCurrentStageApproved || isCurrentStageCancelled) && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add items using the search bar above.</p>}
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
                                    <Link href={route('expenses0.index')}
                                        className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <FontAwesomeIcon icon={faTimesCircle} className="mr-2 align-text-bottom" />Cancel
                                    </Link>

                                    {isCurrentStageDraft && (
                                        <>
                                            <button type="button" onClick={() => handleUpdate("1")} disabled={processing || activeSubmitStage === "2"}
                                                className="rounded-md bg-slate-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:opacity-50 flex items-center justify-center">
                                                {processing && activeSubmitStage === "1" ? (
                                                    <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Saving Draft...</>
                                                ) : (
                                                    <><FontAwesomeIcon icon={faSave} className="mr-2 align-text-bottom" />Update Draft</>
                                                )}
                                            </button>
                                            <button type="button" onClick={() => handleUpdate("2")} disabled={processing || activeSubmitStage === "1"}
                                                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 flex items-center justify-center">
                                                {processing && activeSubmitStage === "2" ? (
                                                    <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Submitting...</>
                                                ) : (
                                                    <><FontAwesomeIcon icon={faCheckCircle} className="mr-2 align-text-bottom" />Submit for Approval</>
                                                )}
                                            </button>
                                        </>
                                    )}
                                    {isCurrentStageApproved && (
                                        <button type="button" onClick={() => handleUpdate("2")} disabled={processing}
                                            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 flex items-center justify-center">
                                            {processing && activeSubmitStage === "2" ? (
                                                <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Updating...</>
                                            ) : (
                                                <><FontAwesomeIcon icon={faPencilAlt} className="mr-2 align-text-bottom" />Update Approved Expense</>
                                            )}
                                        </button>
                                    )}
                                    {isCurrentStageCancelled && (
                                        <button type="button" onClick={() => handleUpdate("1")} disabled={processing}
                                            className="rounded-md bg-orange-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 flex items-center justify-center">
                                            {processing && activeSubmitStage === "1" ? (
                                                 <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Re-opening...</>
                                            ) : (
                                                 <>
                                                     <FontAwesomeIcon icon={faSave} className="mr-2 align-text-bottom" /> Re-open as Draft
                                                 </>
                                            )}
                                        </button>
                                    )}

                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalState.onConfirmAction || (() => setModalState(prev => ({ ...prev, isOpen: false })))}
                title={modalState.title}
                message={modalState.message}
                isAlert={modalState.isAlert}
                type={modalState.type}
                confirmButtonText={modalState.confirmButtonText}
            />
        </AuthenticatedLayout>
    );
}