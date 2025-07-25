import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';
import Modal from '@/Components/CustomModal.jsx'; // Ensure this path is correct

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};

const defaultArray = [];

export default function EditNormalAdjustment({ auth, normaladjustment, stores: initialStores = defaultArray, adjustmentreasons: initialAdjustmentReasons = defaultArray }) {
    const { data, setData, put, errors, processing, reset, clearErrors, setError } = useForm({
        store_id: normaladjustment.store_id || '',
        adjustment_reason_id: normaladjustment.adjustmentreason_id || '',
        total: parseFloat(normaladjustment.total) || 0,
        stage: normaladjustment.stage || 1, // Current stage of the record
        remarks: normaladjustment.remarks || '',
        normaladjustmentitems: normaladjustment.normaladjustmentitems?.map(item => ({
            id: item.id,
            _listId: `adjitem-edit-${item.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: item.item?.name || item.item_name || 'Unknown Item',
            item_id: item.item_id || item.item?.id || null,
            quantity: item.quantity === null || item.quantity === undefined ? '' : String(item.quantity),
            price: parseFloat(item.price) || 0,
        })) || [],
        _method: 'PUT',
        deleted_item_ids: [],
    });

    // isEditable is now derived directly from data.stage, which is updated by useEffect when normaladjustment prop changes.
    const isEditable = data.stage === 1;

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemSearchContainerRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // UI Feedback Modal
    const [uiFeedbackModal, setUiFeedbackModal] = useState({
        isOpen: false, message: '', isAlert: true, title: 'Alert', confirmText: 'OK',
        onConfirmAction: null,
    });

    // Commit Confirmation Modal
    const [commitConfirmationModal, setCommitConfirmationModal] = useState({
        isOpen: false, isLoading: false, isSuccess: false,
    });

    const showAppModal = (title, message, isAlert = true, confirmText = 'OK', onConfirmCallback = null) => {
        setUiFeedbackModal({
            isOpen: true, title, message, isAlert, confirmText,
            onConfirmAction: onConfirmCallback || (() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false }))),
        });
    };

    const fetchItems = useCallback(async (query) => {
        if (!query.trim() || !isEditable) { setItemSearchResults([]); setShowItemDropdown(false); return; }
        setIsItemSearchLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration2.products.search'), { params: { query, store_id: data.store_id } });
            setItemSearchResults(response.data.products?.slice(0, 10) || []);
            setShowItemDropdown(true);
        } catch (error) { console.error('Error fetching products:', error); showAppModal('Fetch Error', 'Failed to fetch products.'); setItemSearchResults([]); setShowItemDropdown(false); }
        finally { setIsItemSearchLoading(false); }
    }, [isEditable]);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);

    useEffect(() => {
        if (itemSearchQuery.trim() && isEditable) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setShowItemDropdown(false);
        }
    }, [itemSearchQuery, debouncedItemSearch, isEditable]);

    useEffect(() => {
        const calculatedTotal = data.normaladjustmentitems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0
        );
        setData('total', calculatedTotal);
    }, [data.normaladjustmentitems, setData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemSearchContainerRef.current && !itemSearchContainerRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Re-initialize form data when `normaladjustment` prop changes.
    // This is crucial for reflecting server-side state after updates.
    useEffect(() => {
        reset(); // Clears previous form state including errors and `processing`
        setData({
            store_id: normaladjustment.store_id || '',
            adjustment_reason_id: normaladjustment.adjustmentreason_id || '',
            total: parseFloat(normaladjustment.total) || 0,
            stage: normaladjustment.stage || 1, // This will correctly update `isEditable`
            remarks: normaladjustment.remarks || '',
            normaladjustmentitems: normaladjustment.normaladjustmentitems?.map(item => ({
                id: item.id,
                _listId: `adjitem-edit-${item.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
                item_name: item.item?.name || item.item_name || 'Unknown Item',
                item_id: item.item_id || item.item?.id || null,
                quantity: item.quantity === null || item.quantity === undefined ? '' : String(item.quantity),
                price: parseFloat(item.price) || 0,
            })) || [],
            _method: 'PUT',
            deleted_item_ids: [], // Always reset deleted_item_ids on prop change
        });
    }, [normaladjustment, setData, reset]); // `setData` and `reset` from `useForm` are stable


    const handleNormalAdjustmentItemChange = (index, field, value) => {
        if (!isEditable) return;
        setData('normaladjustmentitems', data.normaladjustmentitems.map((item, i) => {
            if (i === index) {
                let processedValue = value;
                if (field === 'quantity') {
                    const parsedValue = parseFloat(value);
                    processedValue = isNaN(parsedValue) ? '' : parsedValue;
                }
                return { ...item, [field]: processedValue };
            }
            return item;
        }));
    };

    const addNormalAdjustmentItem = (selectedItem) => {
        if (!isEditable || !selectedItem || !selectedItem.id) return;
        if (data.normaladjustmentitems.some(item => item.item_id === selectedItem.id)) {
            showAppModal('Item Already Added', `"${selectedItem.name}" is already in the list.`);
            return;
        }
        const newItem = {
            id: null, _listId: `adjitem-new-${Date.now()}`, item_name: selectedItem.name,
            item_id: selectedItem.id, quantity: '', price: parseFloat(selectedItem.price) || 0,
        };
        setData('normaladjustmentitems', [...data.normaladjustmentitems, newItem]);
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };

    const confirmRemoveNormalAdjustmentItem = (indexToRemove) => {
        if (!isEditable) return;
        const itemBeingRemoved = data.normaladjustmentitems[indexToRemove];
        showAppModal('Confirm Removal', `Remove "${itemBeingRemoved?.item_name || 'this item'}"?`, false, 'Yes, Remove',
            () => {
                if (itemBeingRemoved.id) {
                    setData('deleted_item_ids', [...data.deleted_item_ids, itemBeingRemoved.id]);
                }
                setData('normaladjustmentitems', data.normaladjustmentitems.filter((_, idx) => idx !== indexToRemove));
                setUiFeedbackModal(prev => ({ ...prev, isOpen: false }));
            }
        );
    };
    
    const validateAdjustmentForm = (isCommitting = false) => {
        clearErrors();
        let isValid = true;
        if (!data.store_id) { setError('store_id', 'Store is required.'); if(isValid) showAppModal("Validation Error", "Please select a store."); isValid = false; }
        if (!data.adjustment_reason_id) { setError('adjustment_reason_id', 'Reason is required.'); if(isValid) showAppModal("Validation Error", "Please select an adjustment reason."); isValid = false; }
        if (data.normaladjustmentitems.length === 0) { if(isValid) showAppModal("Validation Error", "At least one item is required."); isValid = false; }
        
        let itemLineError = false;
        data.normaladjustmentitems.forEach((item, index) => {
            const quantity = parseFloat(item.quantity);
            if (item.quantity === '' || isNaN(quantity) || quantity === 0) {
                setError(`normaladjustmentitems.${index}.quantity`, 'Non-zero quantity required.'); isValid = false; itemLineError = true;
            }
            if (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
                setError(`normaladjustmentitems.${index}.price`, 'Non-negative price required.'); isValid = false; itemLineError = true;
            }
        });
        if (itemLineError && isValid) { 
            showAppModal("Validation Error", "All items require valid, non-zero quantity and non-negative price.");
        }

        if (isCommitting && !data.remarks.trim()) {
            setError('remarks', 'Remarks are required for committing.');
            // This error will be displayed within the commit modal.
            isValid = false;
        }
        return isValid;
    };

    const handleUpdateDraft = (e) => {
        e.preventDefault();
        if (!isEditable || !validateAdjustmentForm(false)) return;

        // Payload explicitly sets stage to 1, sends all current form data
        //const payload = { ...data, stage: 1 };

        setData(prevData => ({ ...prevData, stage: 1 })); // Ensure stage is 1 for draft
        
        put(route('inventory3.normal-adjustment.update', normaladjustment.id),{
            preserveScroll: true,
            onSuccess: () => {
                showAppModal("Success", "Adjustment draft updated successfully!");
                // `normaladjustment` prop update will trigger useEffect to re-sync form
            },
            onError: (pageErrors) => {
                console.error("Update draft errors:", pageErrors);
                const errorMsg = Object.values(pageErrors).flat().join(' ') || 'Failed to update draft.';
                showAppModal("Update Error", errorMsg);
            },
        });
    };

    const openCommitConfirmationModal = () => {
        if (!isEditable || !validateAdjustmentForm(false)) return;
        // Remarks from the main form (if any) will pre-fill the modal's remarks field.
        // Stage is not changed in `data` yet, only in the payload for the PUT request.
        setData(prevData => ({ ...prevData, stage: 2, remarks: '' })); // Set stage for commit, clear remarks for modal
        setCommitConfirmationModal({ isOpen: true, isLoading: false, isSuccess: false });
    };

    const handleCommitWithRemarks = () => {       

        // Validate remarks specifically for the commit modal
        if (!data.remarks.trim()) {
            setError('remarks', 'Remarks are required for committing.');
            return; // Let the modal show the error for its remarks field
        }
        clearErrors('remarks'); // Clear if previously set

        setCommitConfirmationModal(prev => ({ ...prev, isLoading: true }));
        // Construct payload with stage 2 for commit
        //const payload = { ...data, stage: 2 };      

        put(route('inventory3.normal-adjustment.update', normaladjustment.id), {
            preserveScroll: true,
            onSuccess: () => {
                setCommitConfirmationModal({ isOpen: true, isLoading: false, isSuccess: true });
                // After success, `normaladjustment` prop updates -> useEffect re-syncs form -> `isEditable` becomes false.
            },
            onError: (pageErrors) => {
                setCommitConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: false }));
                console.error("Commit errors:", pageErrors);
                const errorMsg = pageErrors.message || Object.values(pageErrors).flat().join(' ') || 'Commit failed.';
                // Set a general error for the commit modal, or rely on specific field errors if backend returns them
                setData(prevData => ({ ...prevData, errors: { ...prevData.errors, commitError: errorMsg } }));
            },
        });
    };

    const formatCurrency = (amount, currencyCode = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return `${currencyCode} 0.00`;
        return parsedAmount.toLocaleString(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={ <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        {isEditable ? `Edit Stock Adjustment (Draft #${normaladjustment.id})` : `View Stock Adjustment (#${normaladjustment.id})`}
                    </h2> }
        >
            <Head title={isEditable ? "Edit Stock Adjustment" : "View Stock Adjustment"} />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className={`bg-white p-6 shadow-sm sm:rounded-lg ${!isEditable ? 'opacity-75' : ''}`}>
                        {/* No onSubmit on the form tag; actions are handled by button onClick */}
                        <form className="space-y-6">
                            {!isEditable && (
                                <div className="p-3 mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
                                    This adjustment is currently <strong>{data.stage === 2 ? 'Committed' : `in Stage ${data.stage}`}</strong> and cannot be edited.
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                {/* Store Select */}
                                <div>
                                    <label htmlFor="store_id_edit" className="block text-sm font-medium leading-6 text-gray-900">Store <span className="text-red-500">*</span></label>
                                    <select id="store_id_edit" name="store_id" value={data.store_id}
                                        onChange={(e) => setData('store_id', e.target.value)} disabled={!isEditable}
                                        className={`mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.store_id ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                                        <option value="">Select a store...</option>
                                        {initialStores.map((store) => (<option key={store.id} value={store.id}>{store.name}</option>))}
                                    </select>
                                    {errors.store_id && <p className="mt-1 text-sm text-red-600">{errors.store_id}</p>}
                                </div>

                                {/* Adjustment Reason Select */}
                                <div>
                                    <label htmlFor="adjustment_reason_id_edit" className="block text-sm font-medium leading-6 text-gray-900">Adjustment Reason <span className="text-red-500">*</span></label>
                                    <select id="adjustment_reason_id_edit" name="adjustment_reason_id" value={data.adjustment_reason_id}
                                        onChange={(e) => setData('adjustment_reason_id', e.target.value)} disabled={!isEditable}
                                        className={`mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.adjustment_reason_id ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                                        <option value="">Select a reason...</option>
                                        {initialAdjustmentReasons.map((reason) => (<option key={reason.id} value={reason.id}>{reason.name} ({reason.action})</option>))}
                                    </select>
                                    {errors.adjustment_reason_id && <p className="mt-1 text-sm text-red-600">{errors.adjustment_reason_id}</p>}
                                </div>
                            </div>

                            {/* Remarks Field */}
                            <div>
                                <label htmlFor="remarks_edit" className="block text-sm font-medium leading-6 text-gray-900">
                                    Remarks {isEditable && <span className="text-gray-500">(Optional for Draft, Required for Commit)</span>}
                                </label>
                                <textarea id="remarks_edit" name="remarks" rows="3" value={data.remarks}
                                    onChange={(e) => setData('remarks', e.target.value)} disabled={!isEditable}
                                    className={`mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.remarks && isEditable ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}></textarea>
                                {errors.remarks && isEditable && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                            </div>

                            {/* Item Search & Add - Only if editable */}
                            {isEditable && (
                                <div className="border-t border-gray-200 pt-6">
                                    <label htmlFor="item-search-edit-adj" className="block text-sm font-medium leading-6 text-gray-900 mb-2">Add/Modify Items</label>
                                    <div className="relative" ref={itemSearchContainerRef}>
                                        <div className="relative">
                                            <input type="text" name="item-search-edit-adj" id="item-search-edit-adj" ref={itemSearchInputRef}
                                                placeholder="Search item by name or code..." value={itemSearchQuery}
                                                onChange={(e) => setItemSearchQuery(e.target.value)}
                                                onFocus={() => { if (itemSearchQuery.trim() || itemSearchResults.length > 0) setShowItemDropdown(true); }} // Show if there are existing results too on focus
                                                className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" autoComplete="off" />
                                            {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />}
                                            {!isItemSearchLoading && itemSearchQuery && (
                                                <button type="button" onClick={() => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); itemSearchInputRef.current?.focus(); }}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear"><FontAwesomeIcon icon={faTimesCircle} /></button>)}
                                        </div>
                                        {showItemDropdown && (itemSearchQuery.trim() || itemSearchResults.length > 0) && ( // Show if query or results exist
                                            <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {itemSearchResults.length > 0 ? itemSearchResults.map((item) => (
                                                    <li key={item.id} className="p-3 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => addNormalAdjustmentItem(item)}>
                                                        <div className="font-medium">{item.name} {item.code ? `(${item.code})` : ''}</div>
                                                        <div className="text-xs text-gray-500">Price: {formatCurrency(item.price)} / Stock: {item.stock_quantity ?? 'N/A'}</div>
                                                    </li>)) : !isItemSearchLoading && itemSearchQuery.trim() && (<li className="p-3 text-sm text-gray-500">No items found.</li>)}
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
                                                        <th scope="col" className="w-40 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Quantity (+/-) {isEditable && <span className="text-red-500">*</span>}</th>
                                                        <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Unit Price</th>
                                                        <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Adj. Value</th>
                                                        {isEditable && <th scope="col" className="w-20 relative py-3.5 pl-3 pr-4 sm:pr-3 text-center"><span className="sr-only">Remove</span></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {data.normaladjustmentitems.map((item, index) => (
                                                        <tr key={item._listId} className={ errors[`normaladjustmentitems.${index}.quantity`] ? "bg-red-50" : ""}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name || 'N/A'}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.quantity} disabled={!isEditable}
                                                                    onChange={(e) => handleNormalAdjustmentItemChange(index, 'quantity', e.target.value)}
                                                                    className={`w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right ${errors[`normaladjustmentitems.${index}.quantity`] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                                    placeholder="e.g., 5 or -2" step="any" required={isEditable} />
                                                               {errors[`normaladjustmentitems.${index}.quantity`] && <p className="text-xs text-red-600 mt-1">{errors[`normaladjustmentitems.${index}.quantity`]}</p>}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.price} readOnly
                                                                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm text-right cursor-not-allowed" />
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">
                                                                {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0))}
                                                            </td>
                                                            {isEditable && (
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
                                                        <th scope="row" colSpan={isEditable ? 3 : 3} className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Total Adj. Value</th>
                                                        <td className="pl-3 pr-4 pt-3 text-right text-sm font-semibold text-gray-900 sm:pr-3">{formatCurrency(data.total)}</td>
                                                        {isEditable && <td></td>}
                                                    </tr>
                                                </tfoot>
                                            </table>
                                            {Object.keys(errors).some(key => key.startsWith('normaladjustmentitems.')) && <p className="mt-2 text-sm text-red-600">Please check item details for errors.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                <Link href={route('inventory3.normal-adjustment.index')} // ADJUST ROUTE
                                    className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />{isEditable ? 'Cancel' : 'Back to List'}
                                </Link>
                                {isEditable && (
                                    <>
                                        <button type="button" onClick={handleUpdateDraft}
                                            disabled={processing}
                                            className="rounded-md bg-slate-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 disabled:opacity-50 flex items-center justify-center">
                                            {processing ? (<><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Saving Draft...</>) : (<><FontAwesomeIcon icon={faSave} className="mr-2" />Save Draft</>)}
                                        </button>
                                        <button type="button" onClick={openCommitConfirmationModal}
                                            disabled={processing}
                                            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faCheck} className="mr-2"/>Commit Adjustment
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* General UI Feedback Modal */}
            <Modal isOpen={uiFeedbackModal.isOpen} onClose={() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={uiFeedbackModal.onConfirmAction} title={uiFeedbackModal.title} message={uiFeedbackModal.message}
                isAlert={uiFeedbackModal.isAlert} confirmButtonText={uiFeedbackModal.confirmText} />

            {/* Commit Confirmation Modal */}
            <Modal isOpen={commitConfirmationModal.isOpen}
                onClose={() => {
                    setCommitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    // If commit was successful, the `normaladjustment` prop would have changed,
                    // and the useEffect would re-initialize the form, making `isEditable` false.
                    // No need to manually change `data.stage` here if the commit was cancelled/failed
                    // because the form data still holds the original `stage` (or it's re-synced from props).
                }}
                onConfirm={commitConfirmationModal.isSuccess ? () => {
                    setCommitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    // Optionally, redirect to index after successful commit, or just let the page update
                    // inertiaRouter.visit(route('inventory3.normal-adjustment.index'));
                } : handleCommitWithRemarks}
                title={commitConfirmationModal.isSuccess ? "Adjustment Committed" : "Commit Stock Adjustment"}
                confirmButtonText={commitConfirmationModal.isSuccess ? "OK" : (commitConfirmationModal.isLoading ? "Committing..." : "Confirm & Commit")}
                confirmButtonDisabled={commitConfirmationModal.isLoading} >
                {commitConfirmationModal.isSuccess ? (
                    <div className="text-center py-4"><FontAwesomeIcon icon={faCheck} className="text-green-500 fa-3x mb-3"/><p className="text-lg">Stock adjustment committed successfully!</p></div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">Please add necessary remarks for committing this adjustment.</p>
                        <div>
                            <label htmlFor="commit_remarks_edit" className="block text-sm font-medium text-gray-700">Remarks <span className="text-red-500">*</span></label>
                            <textarea id="commit_remarks_edit" name="remarks" rows="3"
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.remarks ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                                value={data.remarks} // Uses data.remarks from main form
                                onChange={(e) => { setData('remarks', e.target.value); if (e.target.value.trim()) clearErrors('remarks'); }}
                                disabled={commitConfirmationModal.isLoading} />
                            {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                        </div>
                        {errors.commitError && <p className="mt-2 text-sm text-red-600">{errors.commitError}</p>}
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}