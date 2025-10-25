import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx'; // Assuming path is correct

// Utility function for debouncing
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const defaultStores = [];

export default function Edit({ auth, requistion, fromstore: initialFromStore, tostore: initialToStore }) {
    const fromstore = Array.isArray(initialFromStore) ? initialFromStore : defaultStores;
    const tostore = Array.isArray(initialToStore) ? initialToStore : defaultStores;

    const { data, setData, put, errors, processing, reset, clearErrors } = useForm({
        from_store_id: requistion.fromstore_id || '',
        to_store_id: requistion.tostore_id || '',
        total: parseFloat(requistion.total) || 0,
        stage: requistion.stage || 1,
        remarks: requistion.remarks || '',
        requistionitems: requistion.requistionitems?.map(item => ({
            id: item.id,
            _listId: `item-${item.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: item.item_name || item.item?.name || 'Unknown Item',
            item_id: item.item_id || item.item?.id || null,
            quantity: parseInt(item.quantity) || 1,
            price: parseFloat(item.price) || 0,
        })) || [],
    });

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);
    const isInitialMount = useRef(true); // +++ ADDED +++ To track initial render

    const [uiFeedbackModal, setUiFeedbackModal] = useState({
        isOpen: false,
        message: '',
        isAlert: true,
        itemIndexToRemove: null,
        onConfirmAction: null,
        title: 'Alert',
        confirmText: 'OK'
    });

    const [submitConfirmationModal, setSubmitConfirmationModal] = useState({
        isOpen: false,
        isLoading: false,
        isSuccess: false
    });
    
    const showGeneralAlert = (title, message) => {
        setUiFeedbackModal({
            isOpen: true,
            title: title,
            message: message,
            isAlert: true,
            confirmText: 'OK',
            onConfirmAction: () => setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null })),
            itemIndexToRemove: null
        });
    };

    // --- MODIFIED ---: Replaced the old fetchItems with the more robust fetchData pattern
    const fetchData = useCallback(async (endpoint, query, setLoading, setResults, setShowDropdown, entityName) => {
        if (!query.trim()) {
            setResults([]);
            setShowDropdown(false);
            return;
        }
        setLoading(true);

        const params = { query };

        // This is the key change: conditionally add the from_store_id to the request
        if (data.from_store_id) {
            params.store_id = data.from_store_id;
        } else {
            // Prevent search if no store is selected
            showGeneralAlert("Selection Required", "Please select a 'From Store' before searching for items.");
            setLoading(false);
            setResults([]);
            setShowDropdown(false);
            return;
        }

        try {
            const response = await axios.get(route(endpoint), { params });
            setResults(response.data[entityName]?.slice(0, 10) || []);
            setShowDropdown(true);
        } catch (error) {
            console.error(`Error fetching ${entityName}:`, error);
            showGeneralAlert('Fetch Error', `Failed to fetch ${entityName}.`);
            setResults([]);
            setShowDropdown(false);
        } finally {
            setLoading(false);
        }
    }, [data.from_store_id]); // Dependency on from_store_id is crucial

    // --- MODIFIED ---: Simplified fetchItems to use the new generic fetchData
    const fetchItems = useCallback((query) => fetchData('systemconfiguration2.products.search', query, setIsItemSearchLoading, setItemSearchResults, setShowItemDropdown, 'products'), [fetchData]);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);

    // +++ ADDED +++: Effect to clear items when the source store changes to ensure data accuracy.
    useEffect(() => {
        // We use a ref to prevent this from running on the initial component mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        // If the store is changed and there are items in the list, clear them.
        if (data.requistionitems.length > 0) {
            setData('requistionitems', []);
            showGeneralAlert(
                'Store Changed',
                'The "From Store" has been changed. To ensure stock accuracy, the item list has been cleared. Please re-add any necessary items.'
            );
        }
    }, [data.from_store_id]);


    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setShowItemDropdown(false);
        }
    }, [itemSearchQuery, debouncedItemSearch]);


    useEffect(() => {
        const calculatedTotal = data.requistionitems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        if (data.total !== calculatedTotal) {
            setData('total', calculatedTotal);
        }
    }, [data.requistionitems, data.total, setData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRequistionItemChange = (index, field, value) => {
        setData(prevData => {
            const updatedItems = prevData.requistionitems.map((item, i) => {
                if (i === index) {
                    let processedValue = value;
                    if (field === 'quantity' || field === 'price') {
                        const parsedValue = parseFloat(value);
                        if (field === 'quantity') {
                            processedValue = isNaN(parsedValue) || parsedValue < 1 ? 1 : parseInt(parsedValue, 10);
                        } else {
                            processedValue = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
                        }
                    }
                    return { ...item, [field]: processedValue };
                }
                return item;
            });
            return { ...prevData, requistionitems: updatedItems };
        });
    };

    const addRequistionItemFromSelection = (selectedItem) => {
        if (!selectedItem || !selectedItem.id) {
            return;
        }

        const newItem = {
            _listId: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: selectedItem.name,
            item_id: selectedItem.id,
            quantity: 1,
            price: parseFloat(selectedItem.price) || 0,
            id: null,
        };

        if (data.requistionitems.some(item => item.item_id === newItem.item_id)) {
            showGeneralAlert('Item Already Added', `"${newItem.item_name}" is already in the list. You can adjust its quantity.`);
            return;
        }

        setData(prevData => ({
            ...prevData,
            requistionitems: [...prevData.requistionitems, newItem]
        }));

        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };

    const handleRemoveItemConfirmed = (indexToRemove) => {
        if (indexToRemove !== null && typeof indexToRemove === 'number') {
            setData(prevData => {
                const itemBeingRemoved = prevData.requistionitems[indexToRemove];
                if (!itemBeingRemoved) {
                    return prevData;
                }
                const updatedItems = prevData.requistionitems.filter((_, idx) => idx !== indexToRemove);
                return { ...prevData, requistionitems: updatedItems };
            });
        }

        setUiFeedbackModal(prev => ({
            ...prev,
            isOpen: false,
            itemIndexToRemove: null,
            message: '',
            isAlert: true,
            onConfirmAction: null,
            title: 'Alert',
            confirmText: 'OK'
        }));
    };

    const confirmRemoveRequistionItem = (index) => {
        setUiFeedbackModal({
            isOpen: true,
            message: `Are you sure you want to remove "${data.requistionitems[index]?.item_name || 'this item'}"?`,
            isAlert: false,
            itemIndexToRemove: index,
            onConfirmAction: () => handleRemoveItemConfirmed(index),
            title: 'Confirm Removal',
            confirmText: 'Yes, Remove'
        });
    };
    
    const handleSaveChanges = (e) => {
        e.preventDefault();
        clearErrors();

        if (!data.from_store_id) { showGeneralAlert("Validation Error", "Please select 'From Store'."); return; }
        if (!data.to_store_id) { showGeneralAlert("Validation Error", "Please select 'To Store'."); return; }
        if (data.requistionitems.length === 0) { showGeneralAlert("Validation Error", "Please add at least one item."); return; }

        const hasInvalidItems = data.requistionitems.some(item =>
            !item.item_name || !item.item_id || !(item.quantity > 0) || !(item.price >= 0)
        );
        if (hasInvalidItems) {
            showGeneralAlert("Validation Error", "Some items have invalid details. Please correct them.");
            return;
        }

        put(route('inventory0.update', requistion.id), {
            preserveScroll: true,
            onSuccess: () => {
                showGeneralAlert("Success", "Requisition updated successfully!");
            },
            onError: (pageErrors) => {
                console.error("Update errors:", pageErrors);
                showGeneralAlert("Update Error", pageErrors.message || 'Failed to update requisition. Please check for errors.');
            },
        });
    };

    const openSubmitConfirmationModal = () => {
        clearErrors();
        if (!data.from_store_id) { showGeneralAlert("Validation Error", "Please select 'From Store'."); return; }
        if (!data.to_store_id) { showGeneralAlert("Validation Error", "Please select 'To Store'."); return; }
        if (data.requistionitems.length === 0) { showGeneralAlert("Validation Error", "Please add at least one item before submitting."); return; }

        const hasInvalidItems = data.requistionitems.some(item => !(item.quantity > 0) || !(item.price >= 0) || !item.item_id);
        if (hasInvalidItems) {
            showGeneralAlert("Validation Error", "Some items have invalid quantities, prices, or were not selected from search. Please correct them.");
            return;
        }

        setData('stage', 2);
        setSubmitConfirmationModal({ isOpen: true, isLoading: false, isSuccess: false });
    };

    const handleSubmitWithRemarks = () => {
        if (!data.remarks.trim()) {
            setData(prev => ({ ...prev, errors: { ...prev.errors, remarks: 'Remarks are required for submission.' } }));
            return;
        }
        clearErrors('remarks');
        setSubmitConfirmationModal(prev => ({ ...prev, isLoading: true }));

        put(route('inventory0.update', requistion.id), {
            preserveScroll: true,
            onSuccess: () => {
                setSubmitConfirmationModal({ isOpen: true, isLoading: false, isSuccess: true });
                reset();
            },
            onError: (pageErrors) => {
                setSubmitConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: false }));
                console.error("Submission errors:", pageErrors);
            },
        });
    };

    const formatCurrency = (amount, currencyCode = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return '0.00 ' + currencyCode;
        return parsedAmount.toLocaleString(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleClearItemSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };


    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Requisition</h2>}
        >
            <Head title="Edit Requisition" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="space-y-6">
                            {/* Store Selection */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="from_store_id" className="block text-sm font-medium leading-6 text-gray-900">
                                        From Store <span className="text-red-500">*</span>
                                    </label>
                                    <div className="mt-2">
                                        <select
                                            id="from_store_id"
                                            name="from_store_id"
                                            value={data.from_store_id}
                                            onChange={(e) => setData("from_store_id", e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.from_store_id ? "ring-red-500" : ""}`}
                                            disabled={data.stage > 1}
                                        >
                                            <option value="">Select From Store...</option>
                                            {fromstore.map(store => (
                                                <option key={store.id} value={store.id}>{store.name}</option>
                                            ))}
                                        </select>
                                        {errors.from_store_id && <p className="mt-1 text-sm text-red-600">{errors.from_store_id}</p>}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="to_store_id" className="block text-sm font-medium leading-6 text-gray-900">
                                        To Store <span className="text-red-500">*</span>
                                    </label>
                                    <div className="mt-2">
                                        <select
                                            id="to_store_id"
                                            name="to_store_id"
                                            value={data.to_store_id}
                                            onChange={(e) => setData("to_store_id", e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.to_store_id ? "ring-red-500" : ""}`}
                                            disabled={data.stage > 1}
                                        >
                                            <option value="">Select To Store...</option>
                                            {tostore.map(store => (
                                                <option key={store.id} value={store.id}>{store.name}</option>
                                            ))}
                                        </select>
                                        {errors.to_store_id && <p className="mt-1 text-sm text-red-600">{errors.to_store_id}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Item Search & Add */}
                            <div className="border-t border-gray-200 pt-6">
                                <label htmlFor="item-search" className="block text-sm font-medium leading-6 text-gray-900">
                                    Add Items to Requisition
                                </label>
                                <div className="relative" ref={itemDropdownRef}>
                                    <div className="mt-2 flex rounded-md shadow-sm">
                                        <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                            <input
                                                type="text"
                                                name="item-search"
                                                id="item-search"
                                                ref={itemSearchInputRef}
                                                placeholder="Search item by name or code..."
                                                value={itemSearchQuery}
                                                onChange={(e) => setItemSearchQuery(e.target.value)}
                                                onFocus={() => itemSearchQuery.trim() && setShowItemDropdown(true)}
                                                className="block w-full rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                disabled={data.stage > 1}
                                                autoComplete="off"
                                            />
                                            {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                            {itemSearchQuery && !isItemSearchLoading && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearItemSearch}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    title="Clear search"
                                                >
                                                    <FontAwesomeIcon icon={faTimesCircle} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {showItemDropdown && itemSearchQuery.trim() && (
                                        <ul className="absolute top-full left-0 z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {itemSearchResults.length > 0 ? (
                                                itemSearchResults.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="p-3 hover:bg-indigo-50 cursor-pointer text-sm"
                                                        onClick={() => addRequistionItemFromSelection(item)}
                                                    >
                                                        <div className="font-medium">{item.name}</div>
                                                        <div className="text-xs text-gray-500">Price: {formatCurrency(item.price)} / Stock: {item.stock_quantity === null || typeof item.stock_quantity === 'undefined' ? 'N/A' : item.stock_quantity}</div>
                                                    </li>
                                                ))
                                            ) : !isItemSearchLoading && (
                                                <li className="p-3 text-sm text-gray-500">No items found matching "{itemSearchQuery}".</li>
                                            )}
                                            {isItemSearchLoading &&  <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Requisition Items Table */}
                            {data.requistionitems.length > 0 && (
                                <div className="mt-6 flow-root">
                                   <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">Item</th>
                                                <th scope="col" className="w-28 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Quantity</th>
                                                <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Price</th>
                                                <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Subtotal</th>
                                                <th scope="col" className="w-20 relative py-3.5 pl-3 pr-4 sm:pr-3 text-center"><span className="sr-only">Remove</span></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {data.requistionitems.map((item, index) => (
                                                <tr key={item._listId || item.id || index}>
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name || 'N/A'}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleRequistionItemChange(index, 'quantity', e.target.value)}
                                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                                                            min="1"
                                                            disabled={data.stage > 1}
                                                        />
                                                        {errors[`requistionitems.${index}.quantity`] && <p className="mt-1 text-xs text-red-500">{errors[`requistionitems.${index}.quantity`]}</p>}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => handleRequistionItemChange(index, 'price', e.target.value)}
                                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                                                            min="0"
                                                            step="0.01"
                                                            readOnly={!!item.item_id && data.stage <=1}
                                                            disabled={data.stage > 1}
                                                            title={!!item.item_id ? "Price is fetched from product data" : "Enter price"}
                                                        />
                                                        {errors[`requistionitems.${index}.price`] && <p className="mt-1 text-xs text-red-500">{errors[`requistionitems.${index}.price`]}</p>}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">{formatCurrency(item.quantity * item.price)}</td>
                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                        {data.stage <= 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => confirmRemoveRequistionItem(index)}
                                                                className="text-red-500 hover:text-red-700"
                                                                title="Remove item"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr>
                                                <th scope="row" colSpan="3" className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Grand Total</th>
                                                <td className="pl-3 pr-4 pt-3 text-right text-sm font-semibold text-gray-900 sm:pr-3">{formatCurrency(data.total)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    </div>
                                    </div>
                                </div>
                            )}
                            {errors.requistionitems && typeof errors.requistionitems === 'string' && <p className="mt-1 text-sm text-red-600">{errors.requistionitems}</p>}

                            {/* Actions */}
                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                <Link
                                    href={route('inventory0.index')}
                                    className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                    Cancel
                                </Link>
                                {data.stage === 1 && (
                                    <button
                                        type="button"
                                        onClick={handleSaveChanges}
                                        disabled={processing}
                                        className="rounded-md bg-slate-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:opacity-50"
                                    >
                                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                                {data.stage === 1 && (
                                    <button
                                        type="button"
                                        onClick={openSubmitConfirmationModal}
                                        disabled={processing || data.requistionitems.length === 0}
                                        className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                                    >
                                        <FontAwesomeIcon icon={faCheck} className="mr-2"/>
                                        Submit Requisition
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* General UI Feedback Modal */}
            <Modal
                isOpen={uiFeedbackModal.isOpen}
                onClose={() => {
                    console.log('[Modal onClose] Closing UI feedback modal.');
                    setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null }));
                }}
                onConfirm={() => {
                    console.log('[Modal onConfirm] Confirming action for UI feedback modal.');
                    if (uiFeedbackModal.onConfirmAction) {
                        uiFeedbackModal.onConfirmAction(); // This will execute `() => handleRemoveItemConfirmed(index)`
                    } else {
                        console.warn('[Modal onConfirm] onConfirmAction was null. Closing modal.');
                        setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null }));
                    }
                }}
                title={uiFeedbackModal.title}
                message={uiFeedbackModal.message}
                isAlert={uiFeedbackModal.isAlert}
                confirmButtonText={uiFeedbackModal.confirmText}
            />

            {/* Submit Confirmation Modal */}
            <Modal
                isOpen={submitConfirmationModal.isOpen}
                onClose={() => {
                    if (submitConfirmationModal.isSuccess) {
                        setSubmitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        inertiaRouter.visit(route('inventory0.index'));
                    } else {
                        setSubmitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        if (data.stage === 2 && !submitConfirmationModal.isLoading) {
                             setData(prevData => ({ ...prevData, stage: 1 }));
                        }
                    }
                }}
                onConfirm={submitConfirmationModal.isSuccess ? () => {
                    setSubmitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    inertiaRouter.visit(route('inventory0.index'));
                } : handleSubmitWithRemarks}
                title={submitConfirmationModal.isSuccess ? "Submission Successful" : "Submit Requisition with Remarks"}
                confirmButtonText={
                    submitConfirmationModal.isSuccess ? "Close" :
                    submitConfirmationModal.isLoading ? "Submitting..." : "Confirm Submit"
                }
                confirmButtonDisabled={submitConfirmationModal.isLoading || (processing && data.stage === 2 && !submitConfirmationModal.isSuccess)}
                isProcessing={submitConfirmationModal.isLoading || (processing && data.stage === 2)}
            >
                {submitConfirmationModal.isSuccess ? (
                    <div className="text-center py-4">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500 fa-3x mb-3"/>
                        <p className="text-lg">Requisition submitted successfully!</p>
                        <p className="text-sm text-gray-600">You will be redirected, or click "Close".</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            You are about to submit this requisition. Please add any necessary remarks below.
                        </p>
                        <div>
                            <label htmlFor="submission_remarks" className="block text-sm font-medium text-gray-700">
                                Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="submission_remarks"
                                rows="3"
                                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm ${errors.remarks ? 'border-red-500 ring-red-500' : ''}`}
                                value={data.remarks}
                                onChange={(e) => setData('remarks', e.target.value)}
                                disabled={submitConfirmationModal.isLoading || (processing && data.stage === 2)}
                            />
                            {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                        </div>
                        {errors.message && data.stage === 2 && <p className="mt-2 text-sm text-red-600">{errors.message}</p>}
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}