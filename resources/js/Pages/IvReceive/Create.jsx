import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave, faCheck, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '@/Components/CustomModal.jsx';

// Utility function for debouncing
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const defaultStores = [];

export default function Create({ auth, fromstore: initialFromStore = defaultStores, tostore: initialToStore = defaultStores }) {
    // Ensure fromstore and tostore are always arrays for mapping
    const fromstore = Array.isArray(initialFromStore) ? initialFromStore : defaultStores;
    const tostore = Array.isArray(initialToStore) ? initialToStore : defaultStores;

    const { data, setData, post, errors, processing, reset, clearErrors } = useForm({
        from_store_id: '',
        to_store_id: '',
        total: 0,
        stage: 1, // 1 for Draft, 2 for Submitted
        remarks: '',
        receiveitems: [],
    });

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [uiFeedbackModal, setUiFeedbackModal] = useState({
        isOpen: false,
        message: '',
        isAlert: true,
        itemIndexToRemove: null, // Still can be used for display, but not for the action logic
        onConfirmAction: null,
        title: 'Alert',
        confirmText: 'OK'
    });

    const [submitConfirmationModal, setSubmitConfirmationModal] = useState({
        isOpen: false,
        isLoading: false,
        isSuccess: false
    });

    const fetchItems = useCallback(async (query) => {
        if (!query.trim()) {
            setItemSearchResults([]);
            setShowItemDropdown(false);
            return;
        }
        setIsItemSearchLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration2.products.search'), { params: { query } });
            setItemSearchResults(response.data.products?.slice(0, 10) || []);
            setShowItemDropdown(true);
        } catch (error) {
            console.error('Error fetching products:', error);
            setItemSearchResults([]);
            setShowItemDropdown(false);
            // Optionally, use showGeneralAlert here if you want to notify the user
            // showGeneralAlert("Fetch Error", "Could not load items. Please try again.");
        } finally {
            setIsItemSearchLoading(false);
        }
    }, []); // Removed showGeneralAlert from deps, as it's stable if defined correctly or outside

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);

    useEffect(() => {
        debouncedItemSearch(itemSearchQuery);
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => {
        const calculatedTotal = data.receiveitems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        // setData will typically only trigger a re-render if the value actually changes.
        // The explicit check `data.total !== calculatedTotal` is often redundant and
        // including `data.total` in dependencies for this pattern can cause an extra effect run.
        setData('total', calculatedTotal);
    }, [data.receiveitems, setData]); // `setData` is stable from useForm.

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleReceiveItemChange = (index, field, value) => {
        setData(prevData => {
            const updatedItems = prevData.receiveitems.map((item, i) => {
                if (i === index) {
                    let processedValue = value;
                    if (field === 'quantity' || field === 'price') {
                        const parsedValue = parseFloat(value);
                        if (field === 'quantity') {
                            processedValue = isNaN(parsedValue) || parsedValue < 1 ? 1 : parsedValue;
                        } else {
                            processedValue = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
                        }
                    }
                    return { ...item, [field]: processedValue };
                }
                return item;
            });
            return { ...prevData, receiveitems: updatedItems };
        });
    };

    const addReceiveItemFromSelection = (selectedItem) => {
        console.log("Adding item from selection:", selectedItem);

        if (!selectedItem || !selectedItem.id) {
            console.warn("Add item: Invalid selected item provided.");
            return;
        }

        const newItem = {
            _listId: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: selectedItem.name,
            item_id: selectedItem.id,
            quantity: 1,
            price: parseFloat(selectedItem.price) || 0,
        };

        if (data.receiveitems.some(item => item.item_id === newItem.item_id)) {
            setUiFeedbackModal({
                isOpen: true,
                message: `"${newItem.item_name}" is already in the list. You can adjust its quantity.`,
                isAlert: true, title: 'Item Already Added', confirmText: 'OK',
                onConfirmAction: () => setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null })),
                itemIndexToRemove: null // Ensure reset for general alerts
            });
            return;
        }

        setData(prevData => ({
            ...prevData,
            receiveitems: [...prevData.receiveitems, newItem]
        }));

        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };

    // MODIFIED: handleRemoveItemConfirmed now accepts indexToRemove
    const handleRemoveItemConfirmed = (indexToRemove) => {
        console.log('[handleRemoveItemConfirmed] Called with index:', indexToRemove);
        if (indexToRemove !== null && typeof indexToRemove === 'number') {
            console.log('[handleRemoveItemConfirmed] Valid index to remove:', indexToRemove);
            setData(prevData => {
                console.log('[handleRemoveItemConfirmed] prevData.receiveitems (before filter):', JSON.parse(JSON.stringify(prevData.receiveitems)));
                const updatedItems = prevData.receiveitems.filter((_, idx) => idx !== indexToRemove);
                console.log('[handleRemoveItemConfirmed] updatedItems (after filter):', JSON.parse(JSON.stringify(updatedItems)));
                return { ...prevData, receiveitems: updatedItems };
            });
        } else {
            console.warn('[handleRemoveItemConfirmed] indexToRemove was invalid. Value:', indexToRemove);
        }
        setUiFeedbackModal(prev => ({ 
            ...prev, 
            isOpen: false, 
            itemIndexToRemove: null, 
            onConfirmAction: null, // Clear action
            message: '',
            isAlert: true,
            title: 'Alert',
            confirmText: 'OK'
        }));
        console.log('[handleRemoveItemConfirmed] uiFeedbackModal state after action and reset.');
    };

    // MODIFIED: confirmRemoveReceiveItem now passes index via closure to onConfirmAction
    const confirmRemoveReceiveItem = (index) => {
        console.log('[confirmRemoveReceiveItem] Index to confirm removal for:', index);
        setUiFeedbackModal({
            isOpen: true,
            message: `Are you sure you want to remove "${data.receiveitems[index]?.item_name || 'this item'}"?`,
            isAlert: false, 
            itemIndexToRemove: index, // Still can be kept for potential use in modal message
            onConfirmAction: () => handleRemoveItemConfirmed(index), // Pass index here
            title: 'Confirm Removal', 
            confirmText: 'Yes, Remove'
        });
    };


    const showGeneralAlert = (title, message) => {
        setUiFeedbackModal({
            isOpen: true, title: title, message: message, isAlert: true, confirmText: 'OK',
            onConfirmAction: () => setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null })),
            itemIndexToRemove: null // Ensure reset for general alerts
        });
    };

    const handleSaveDraft = (e) => {
        e.preventDefault();
        clearErrors();
        setData('stage', 1);

        if (!data.from_store_id) { showGeneralAlert("Validation Error", "Please select 'From Store'."); return; }
        if (!data.to_store_id) { showGeneralAlert("Validation Error", "Please select 'To Store'."); return; }
        if (data.receiveitems.length === 0) { showGeneralAlert("Validation Error", "Please add at least one item."); return; }

        post(route('inventory2.store'), {
            preserveScroll: true,
            onSuccess: () => {
                showGeneralAlert("Success", "Receive saved as draft successfully!");
            },
            onError: (pageErrors) => {
                console.error("Save draft errors:", pageErrors);
                showGeneralAlert("Save Error", pageErrors.message || 'Failed to save draft. Please check for errors above.');
            },
        });
    };

    const openSubmitConfirmationModal = () => {
        clearErrors();
        if (!data.from_store_id) { showGeneralAlert("Validation Error", "Please select 'From Store'."); return; }
        if (!data.to_store_id) { showGeneralAlert("Validation Error", "Please select 'To Store'."); return; }
        if (data.receiveitems.length === 0) { showGeneralAlert("Validation Error", "Please add at least one item before submitting."); return; }

        const hasInvalidItems = data.receiveitems.some(item => !(item.quantity > 0) || !(item.price >= 0) || !item.item_id);
        if (hasInvalidItems) {
            showGeneralAlert("Validation Error", "Some items have invalid quantities, prices, or were not selected from search. Please correct them.");
            return;
        }

        setData('stage', 2);
        setData('remarks', ''); // Clear remarks when opening submit modal
        setSubmitConfirmationModal({ isOpen: true, isLoading: false, isSuccess: false });
    };

    const handleSubmitWithRemarks = () => {
        if (!data.remarks.trim()) {
            setData(prev => ({ ...prev, errors: { ...prev.errors, remarks: 'Remarks are required for submission.' } }));
            return;
        }
        clearErrors('remarks');

        setSubmitConfirmationModal(prev => ({ ...prev, isLoading: true }));
        post(route('inventory2.store'), {
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

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Receive</h2>}
        >
            <Head title="Create Receive" />
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
                                    Add Items to Receive
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
                                                onFocus={() => {
                                                    if (itemSearchQuery.trim() || itemSearchResults.length > 0) {
                                                        setShowItemDropdown(true);
                                                    }
                                                }}
                                                className="block w-full rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                            />
                                            {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                            {itemSearchQuery && !isItemSearchLoading && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); itemSearchInputRef.current?.focus(); }}
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
                                                        onClick={() => addReceiveItemFromSelection(item)}
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

                            {/* Receive Items Table */}
                            {data.receiveitems.length > 0 && (
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
                                            {data.receiveitems.map((item, index) => (
                                                <tr key={item._listId}>
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name || 'N/A'}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleReceiveItemChange(index, 'quantity', e.target.value)}
                                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                                                            min="1"
                                                        />
                                                        {errors[`receiveitems.${index}.quantity`] && <p className="mt-1 text-xs text-red-500">{errors[`receiveitems.${index}.quantity`]}</p>}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => handleReceiveItemChange(index, 'price', e.target.value)}
                                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                                                            min="0"
                                                            step="0.01"
                                                            readOnly={!!item.item_id}
                                                            title={!!item.item_id ? "Price is fetched from product data" : "Enter price"}
                                                        />
                                                        {errors[`receiveitems.${index}.price`] && <p className="mt-1 text-xs text-red-500">{errors[`receiveitems.${index}.price`]}</p>}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">{formatCurrency(item.quantity * item.price)}</td>
                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => confirmRemoveReceiveItem(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                            title="Remove item"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
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
                            {errors.receiveitems && typeof errors.receiveitems === 'string' && <p className="mt-1 text-sm text-red-600">{errors.receiveitems}</p>}

                            {/* Actions: Save Draft, Submit, Cancel */}
                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                <Link
                                    href={route('inventory2.index')}
                                    className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                    Cancel
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    disabled={processing && data.stage === 1}
                                    className="rounded-md bg-slate-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:opacity-50"
                                >
                                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                                    {processing && data.stage === 1 ? 'Saving...' : 'Save Draft'}
                                </button>
                                <button
                                    type="button"
                                    onClick={openSubmitConfirmationModal}
                                    disabled={(processing && data.stage === 2) || data.receiveitems.length === 0}
                                    className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                                >
                                    <FontAwesomeIcon icon={faCheck} className="mr-2"/>
                                    Submit Receive
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* General UI Feedback Modal (for item removal confirmation & alerts) */}
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

            {/* Modal for Final Submission with Remarks */}
            <Modal
                isOpen={submitConfirmationModal.isOpen}
                onClose={() => {
                    if (submitConfirmationModal.isSuccess) {
                        setSubmitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        inertiaRouter.visit(route('inventory2.index'));
                    } else {
                        setSubmitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        if (data.stage === 2 && !submitConfirmationModal.isLoading) {
                             setData(prevData => ({ ...prevData, stage: 1 }));
                        }
                    }
                }}
                onConfirm={submitConfirmationModal.isSuccess ? () => {
                    setSubmitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    inertiaRouter.visit(route('inventory2.index'));
                } : handleSubmitWithRemarks}
                title={submitConfirmationModal.isSuccess ? "Submission Successful" : "Submit Receive with Remarks"}
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
                        <p className="text-lg">Receive submitted successfully!</p>
                        <p className="text-sm text-gray-600">You will be redirected, or click "Close".</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            You are about to submit this receive. Please add any necessary remarks below.
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