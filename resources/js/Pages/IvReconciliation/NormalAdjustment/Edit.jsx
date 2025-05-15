import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react'; // Added Link, inertiaRouter
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Added React
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
// import { Inertia } from '@inertiajs/inertia'; // Not usually needed with useForm/router
import axios from 'axios';

import Modal from '@/Components/CustomModal.jsx'; // Assuming path is correct
// Removed InputField

// Utility function for debouncing
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export default function EditNormalAdjustment({ auth, normaladjustment }) { // Added auth
    const { data, setData, put, errors, processing, reset, clearErrors } = useForm({
        store_name: normaladjustment.store?.name || '',
        store_id: normaladjustment.store_id || null,
        adjustment_reason_name: normaladjustment.adjustmentreason?.name || '',
        adjustment_reason_id: normaladjustment.adjustmentreason_id || null,
        total: parseFloat(normaladjustment.total) || 0,
        stage: normaladjustment.stage || 1,
        normaladjustmentitems: normaladjustment.normaladjustmentitems?.map(item => ({
            id: item.id, // DB ID of the normaladjustmentitem
            _listId: `adjitem-edit-${item.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: item.item_name || item.item?.name || 'Unknown Item',
            item_id: item.item_id || item.item?.id || null, // product ID
            quantity: item.quantity === null || item.quantity === undefined ? '' : item.quantity, // Allow empty for input
            price: parseFloat(item.price) || 0,
        })) || [],
    });

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemSearchContainerRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // Store Search State
    const [storeSearchQuery, setStoreSearchQuery] = useState(data.store_name); // Initialize with current name
    const [storeSearchResults, setStoreSearchResults] = useState([]);
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const [isStoreSearchLoading, setIsStoreSearchLoading] = useState(false);
    const storeSearchContainerRef = useRef(null);
    const storeSearchInputRef = useRef(null);

    // AdjustmentReason Search State
    const [adjReasonSearchQuery, setAdjReasonSearchQuery] = useState(data.adjustment_reason_name); // Initialize
    const [adjReasonSearchResults, setAdjReasonSearchResults] = useState([]);
    const [showAdjReasonDropdown, setShowAdjReasonDropdown] = useState(false);
    const [isAdjReasonSearchLoading, setIsAdjReasonSearchLoading] = useState(false);
    const adjReasonSearchContainerRef = useRef(null);
    const adjReasonSearchInputRef = useRef(null);

    // Unified UI Feedback Modal
    const [uiFeedbackModal, setUiFeedbackModal] = useState({
        isOpen: false,
        message: '',
        isAlert: true,
        itemIndexToRemove: null,
        onConfirmAction: null,
        title: 'Alert',
        confirmText: 'OK'
    });

    const isReadOnly = data.stage > 1; // Determine if form should be read-only

    // Fetch items
    const fetchItems = useCallback(async (query) => {
        if (!query.trim() || isReadOnly) { setItemSearchResults([]); setShowItemDropdown(false); return; }
        setIsItemSearchLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration2.products.search'), { params: { query } });
            setItemSearchResults(response.data.products?.slice(0, 10) || []);
            setShowItemDropdown(true);
        } catch (error) { console.error('Error fetching products:', error); showGeneralAlert('Fetch Error', 'Failed to fetch products.'); setItemSearchResults([]); setShowItemDropdown(false); }
        finally { setIsItemSearchLoading(false); }
    }, [isReadOnly]);

    // Fetch Stores
    const fetchStores = useCallback(async (query) => {
        if (!query.trim() || isReadOnly) { setStoreSearchResults([]); setShowStoreDropdown(false); return; }
        setIsStoreSearchLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration2.stores.search'), { params: { query } });
            setStoreSearchResults(response.data.stores?.slice(0, 10) || []);
            setShowStoreDropdown(true);
        } catch (error) { console.error('Error fetching stores:', error); showGeneralAlert('Fetch Error', 'Failed to fetch stores.'); setStoreSearchResults([]); setShowStoreDropdown(false); }
        finally { setIsStoreSearchLoading(false); }
    }, [isReadOnly]);

    // Fetch Adjustment Reasons
    const fetchAdjustmentReasons = useCallback(async (query) => {
        if (!query.trim() || isReadOnly) { setAdjReasonSearchResults([]); setShowAdjReasonDropdown(false); return; }
        setIsAdjReasonSearchLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration2.adjustmentreasons.search'), { params: { query } });
            setAdjReasonSearchResults(response.data.adjustmentreasons?.slice(0, 10) || []);
            setShowAdjReasonDropdown(true);
        } catch (error) { console.error('Error fetching adjustment reasons:', error); showGeneralAlert('Fetch Error', 'Failed to fetch adjustment reasons.'); setAdjReasonSearchResults([]); setShowAdjReasonDropdown(false); }
        finally { setIsAdjReasonSearchLoading(false); }
    }, [isReadOnly]);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);
    const debouncedStoreSearch = useMemo(() => debounce(fetchStores, 350), [fetchStores]);
    const debouncedAdjReasonSearch = useMemo(() => debounce(fetchAdjustmentReasons, 350), [fetchAdjustmentReasons]);

    useEffect(() => { debouncedItemSearch(itemSearchQuery); }, [itemSearchQuery, debouncedItemSearch]);
    useEffect(() => { debouncedStoreSearch(storeSearchQuery); }, [storeSearchQuery, debouncedStoreSearch]);
    useEffect(() => { debouncedAdjReasonSearch(adjReasonSearchQuery); }, [adjReasonSearchQuery, debouncedAdjReasonSearch]);

    // Calculate total
    useEffect(() => {
        const calculatedTotal = data.normaladjustmentitems.reduce(
            (sum, item) => sum + (Math.abs(parseFloat(item.quantity)) || 0) * (parseFloat(item.price) || 0),
            0
        );
        if (data.total !== calculatedTotal) {
            setData('total', calculatedTotal);
        }
    }, [data.normaladjustmentitems, data.total, setData]);

    // Handle click outside dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemSearchContainerRef.current && !itemSearchContainerRef.current.contains(event.target)) setShowItemDropdown(false);
            if (storeSearchContainerRef.current && !storeSearchContainerRef.current.contains(event.target)) setShowStoreDropdown(false);
            if (adjReasonSearchContainerRef.current && !adjReasonSearchContainerRef.current.contains(event.target)) setShowAdjReasonDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNormalAdjustmentItemChange = (index, field, value) => {
        if (isReadOnly) return;
        setData(prevData => {
            const updatedItems = prevData.normaladjustmentitems.map((item, i) => {
                if (i === index) {
                    let processedValue = value;
                    if (field === 'quantity') {
                        const parsedValue = parseFloat(value);
                        processedValue = isNaN(parsedValue) ? '' : parsedValue;
                    } else if (field === 'price') {
                        const parsedValue = parseFloat(value);
                        processedValue = isNaN(parsedValue) ? '' : (parsedValue < 0 ? 0 : parsedValue);
                    }
                    return { ...item, [field]: processedValue };
                }
                return item;
            });
            return { ...prevData, normaladjustmentitems: updatedItems };
        });
    };

    const addNormalAdjustmentItem = (selectedItem) => {
        if (isReadOnly || !selectedItem || !selectedItem.id) return;
        const newItem = {
            _listId: `adjitem-edit-new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: selectedItem.name,
            item_id: selectedItem.id,
            quantity: '',
            price: parseFloat(selectedItem.price) || 0,
            id: null, // No DB ID for new item
        };
        if (data.normaladjustmentitems.some(item => item.item_id === newItem.item_id)) {
            showGeneralAlert('Item Already Added', `"${newItem.item_name}" is already in the list.`);
            return;
        }
        setData(prevData => ({ ...prevData, normaladjustmentitems: [...prevData.normaladjustmentitems, newItem] }));
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); itemSearchInputRef.current?.focus();
    };

    const handleRemoveItemConfirmed = (indexToRemove) => {
        if (indexToRemove !== null) {
            setData(prevData => ({ ...prevData, normaladjustmentitems: prevData.normaladjustmentitems.filter((_, idx) => idx !== indexToRemove) }));
        }
        setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null }));
    };

    const confirmRemoveNormalAdjustmentItem = (index) => {
        if (isReadOnly) return;
        setUiFeedbackModal({
            isOpen: true,
            message: `Remove "${data.normaladjustmentitems[index]?.item_name || 'this item'}"?`,
            isAlert: false, itemIndexToRemove: index,
            onConfirmAction: () => handleRemoveItemConfirmed(index),
            title: 'Confirm Removal', confirmText: 'Yes, Remove'
        });
    };

    const showGeneralAlert = (title, message) => {
        setUiFeedbackModal({
            isOpen: true, title: title, message: message, isAlert: true, confirmText: 'OK',
            onConfirmAction: () => setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null })),
            itemIndexToRemove: null
        });
    };

    const handleSelectStore = (selectedStore) => {
        if (isReadOnly) return;
        setData(prev => ({ ...prev, store_id: selectedStore.id, store_name: selectedStore.name }));
        setStoreSearchQuery(selectedStore.name);
        setShowStoreDropdown(false); setStoreSearchResults([]); storeSearchInputRef.current?.blur();
    };

    const handleSelectAdjReason = (selectedReason) => {
        if (isReadOnly) return;
        setData(prev => ({ ...prev, adjustment_reason_id: selectedReason.id, adjustment_reason_name: selectedReason.name }));
        setAdjReasonSearchQuery(selectedReason.name);
        setShowAdjReasonDropdown(false); setAdjReasonSearchResults([]); adjReasonSearchInputRef.current?.blur();
    };

    const handleSubmitChanges = (e) => {
        e.preventDefault();
        if (isReadOnly) { showGeneralAlert("Read Only", "This record cannot be edited."); return; }
        clearErrors();
        if (!data.store_id) { showGeneralAlert("Validation Error", "Please select a store."); return; }
        if (!data.adjustment_reason_id) { showGeneralAlert("Validation Error", "Please select an adjustment reason."); return; }
        if (data.normaladjustmentitems.length === 0) { showGeneralAlert("Validation Error", "Please add at least one item."); return; }
        const hasInvalidItems = data.normaladjustmentitems.some(item =>
            item.quantity === '' || isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) === 0 ||
            isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0
        );
        if (hasInvalidItems) { showGeneralAlert("Validation Error", "Items must have a non-zero quantity and valid price."); return; }

        put(route('inventory3.normal-adjustment.update', normaladjustment.id), {
            preserveScroll: true,
            onSuccess: () => { showGeneralAlert("Success", "Adjustment updated successfully!"); },
            onError: (pageErrors) => { console.error("Update errors:", pageErrors); showGeneralAlert("Update Error", pageErrors.message || 'Failed to update adjustment.'); },
        });
    };

    const formatCurrency = (amount, currencyCode = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return '0.00';
        return parsedAmount.toLocaleString(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Stock Adjustment</h2>}
        >
            <Head title="Edit Stock Adjustment" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleSubmitChanges} className="space-y-6">
                            {/* Store and Adjustment Reason Search */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                {/* Store Search */}
                                <div className="relative" ref={storeSearchContainerRef}>
                                    <label htmlFor="store-search-edit-adj" className="block text-sm font-medium leading-6 text-gray-900">Store <span className="text-red-500">*</span></label>
                                    <div className="mt-2 flex rounded-md shadow-sm">
                                        <input type="text" name="store-search-edit-adj" id="store-search-edit-adj" ref={storeSearchInputRef}
                                            placeholder="Search store..." value={storeSearchQuery} readOnly={isReadOnly}
                                            onChange={(e) => { if(!isReadOnly) { setStoreSearchQuery(e.target.value); if (!e.target.value.trim()) setData(p => ({...p, store_id: null})); }}}
                                            onFocus={() => !isReadOnly && storeSearchQuery.trim() && setShowStoreDropdown(true)}
                                            className={`block w-full rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ${errors.store_id ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`} autoComplete="off" />
                                        {isStoreSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                        {storeSearchQuery && !isStoreSearchLoading && !isReadOnly && (
                                            <button type="button" onClick={() => { setStoreSearchQuery(''); setData(p=>({...p,store_id:null, store_name:''})); setStoreSearchResults([]); setShowStoreDropdown(false); storeSearchInputRef.current?.focus(); }}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear"><FontAwesomeIcon icon={faTimesCircle} /></button>)}
                                    </div>
                                    {errors.store_id && <p className="mt-1 text-sm text-red-600">{errors.store_id}</p>}
                                    {showStoreDropdown && storeSearchQuery.trim() && !isReadOnly && (
                                        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {storeSearchResults.length > 0 ? storeSearchResults.map((store) => (<li key={store.id} className="p-3 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => handleSelectStore(store)}>{store.name}</li>)) : !isStoreSearchLoading && (<li className="p-3 text-sm text-gray-500">No stores found.</li>)}
                                            {isStoreSearchLoading && <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>}
                                        </ul>
                                    )}
                                </div>
                                {/* Adjustment Reason Search */}
                                <div className="relative" ref={adjReasonSearchContainerRef}>
                                    <label htmlFor="adj-reason-search-edit" className="block text-sm font-medium leading-6 text-gray-900">Adjustment Reason <span className="text-red-500">*</span></label>
                                    <div className="mt-2 flex rounded-md shadow-sm">
                                        <input type="text" name="adj-reason-search-edit" id="adj-reason-search-edit" ref={adjReasonSearchInputRef}
                                            placeholder="Search reason..." value={adjReasonSearchQuery} readOnly={isReadOnly}
                                            onChange={(e) => { if(!isReadOnly) { setAdjReasonSearchQuery(e.target.value); if (!e.target.value.trim()) setData(p => ({...p,adjustment_reason_id: null})); }}}
                                            onFocus={() => !isReadOnly && adjReasonSearchQuery.trim() && setShowAdjReasonDropdown(true)}
                                            className={`block w-full rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ${errors.adjustment_reason_id ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`} autoComplete="off" />
                                        {isAdjReasonSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                        {adjReasonSearchQuery && !isAdjReasonSearchLoading && !isReadOnly && (
                                            <button type="button" onClick={() => { setAdjReasonSearchQuery(''); setData(p=>({...p,adjustment_reason_id:null, adjustment_reason_name:''})); setAdjReasonSearchResults([]); setShowAdjReasonDropdown(false); adjReasonSearchInputRef.current?.focus(); }}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear"><FontAwesomeIcon icon={faTimesCircle} /></button>)}
                                    </div>
                                    {errors.adjustment_reason_id && <p className="mt-1 text-sm text-red-600">{errors.adjustment_reason_id}</p>}
                                    {showAdjReasonDropdown && adjReasonSearchQuery.trim() && !isReadOnly && (
                                        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {adjReasonSearchResults.length > 0 ? adjReasonSearchResults.map((reason) => (<li key={reason.id} className="p-3 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => handleSelectAdjReason(reason)}>{reason.name}</li>)) : !isAdjReasonSearchLoading && (<li className="p-3 text-sm text-gray-500">No reasons found.</li>)}
                                            {isAdjReasonSearchLoading && <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Stage Display */}
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Current Stage</dt>
                                <dd className="mt-1 text-sm text-gray-900 p-2 bg-gray-100 rounded-md">
                                    {data.stage === 1 ? 'Draft' : data.stage === 2 ? 'Checked' : data.stage === 6 ? 'Cancelled' : `Stage ${data.stage}`}
                                </dd>
                            </div>

                            {/* Item Search & Add */}
                            {!isReadOnly && (
                                <div className="border-t border-gray-200 pt-6">
                                    <label htmlFor="item-search-edit-adj" className="block text-sm font-medium leading-6 text-gray-900">Add Items for Adjustment</label>
                                    <div className="relative" ref={itemSearchContainerRef}>
                                        <div className="mt-2 flex rounded-md shadow-sm">
                                            <input type="text" name="item-search-edit-adj" id="item-search-edit-adj" ref={itemSearchInputRef}
                                                placeholder="Search item..." value={itemSearchQuery}
                                                onChange={(e) => setItemSearchQuery(e.target.value)}
                                                onFocus={() => itemSearchQuery.trim() && setShowItemDropdown(true)}
                                                className="block w-full rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" autoComplete="off" />
                                            {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                            {itemSearchQuery && !isItemSearchLoading && (<button type="button" onClick={() => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); itemSearchInputRef.current?.focus(); }} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear"><FontAwesomeIcon icon={faTimesCircle} /></button>)}
                                        </div>
                                        {showItemDropdown && itemSearchQuery.trim() && (
                                            <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {itemSearchResults.length > 0 ? itemSearchResults.map((item) => (<li key={item.id} className="p-3 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => addNormalAdjustmentItem(item)}><div className="font-medium">{item.name}</div><div className="text-xs text-gray-500">Price: {formatCurrency(item.price)} / Stock: {item.stock_quantity ?? 'N/A'}</div></li>)) : !isItemSearchLoading && (<li className="p-3 text-sm text-gray-500">No items found.</li>)}
                                                {isItemSearchLoading && <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Normal Adjustment Items Table */}
                            {data.normaladjustmentitems.length > 0 && (
                                <div className="mt-6 flow-root">
                                   <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <table className="min-w-full divide-y divide-gray-300">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">Item</th>
                                                        <th scope="col" className="w-40 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Quantity (+/-) <span className="text-red-500">*</span></th>
                                                        <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Unit Price</th>
                                                        <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Adjustment Value</th>
                                                        {!isReadOnly && <th scope="col" className="w-20 relative py-3.5 pl-3 pr-4 sm:pr-3 text-center"><span className="sr-only">Remove</span></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {data.normaladjustmentitems.map((item, index) => (
                                                        <tr key={item._listId || item.id}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name || 'N/A'}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.quantity} readOnly={isReadOnly}
                                                                    onChange={(e) => handleNormalAdjustmentItemChange(index, 'quantity', e.target.value)}
                                                                    className={`w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right ${errors[`normaladjustmentitems.${index}.quantity`] ? 'border-red-500 ring-red-500' : 'border-gray-300'}`}
                                                                    placeholder="e.g., 5 or -2" step="any" required />
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.price} readOnly
                                                                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm text-right" />
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">
                                                                {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0))}
                                                            </td>
                                                            {!isReadOnly && (
                                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                                    <button type="button" onClick={() => confirmRemoveNormalAdjustmentItem(index)}
                                                                        className="text-red-500 hover:text-red-700" title="Remove item"><FontAwesomeIcon icon={faTrash} /></button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50">
                                                    <tr>
                                                        <th scope="row" colSpan={isReadOnly ? 3 : 3} className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Total Adjustment Value</th>
                                                        <td className="pl-3 pr-4 pt-3 text-right text-sm font-semibold text-gray-900 sm:pr-3">{formatCurrency(data.total)}</td>
                                                        {!isReadOnly && <td></td>}
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {errors.normaladjustmentitems && typeof errors.normaladjustmentitems === 'string' && <p className="mt-1 text-sm text-red-600">{errors.normaladjustmentitems}</p>}
                            {Object.keys(errors).some(key => key.startsWith('normaladjustmentitems.')) && <p className="mt-1 text-sm text-red-600">Please check item details for errors.</p>}

                            {/* Actions */}
                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                <Link href={route('inventory3.normal-adjustment.index')}
                                    className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />Cancel
                                </Link>
                                {!isReadOnly && (
                                    <button type="submit" disabled={processing}
                                        className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
                                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal isOpen={uiFeedbackModal.isOpen}
                onClose={() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null }))}
                onConfirm={() => { if (uiFeedbackModal.onConfirmAction) uiFeedbackModal.onConfirmAction(); else setUiFeedbackModal(prev => ({ ...prev, isOpen: false })); }}
                title={uiFeedbackModal.title} message={uiFeedbackModal.message} isAlert={uiFeedbackModal.isAlert} confirmButtonText={uiFeedbackModal.confirmText} />
        </AuthenticatedLayout>
    );
}