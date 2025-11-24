import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Added faDownload to imports
import { faTimesCircle, faTrash, faSave, faCheck, faSpinner, faDownload } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';
import Modal from '@/Components/CustomModal.jsx';

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};

const defaultArray = [];

export default function CreatePhysicalInventory({ auth, stores: initialStores = defaultArray }) {
    const { data, setData, post, errors, processing, reset, clearErrors, setError } = useForm({
        store_id: '', 
        description: '',
        total_counted_value: 0,
        stage: 1,
        remarks: '',
        physicalinventoryitems: [],
    });

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    
    // NEW: State for loading all items
    const [isLoadingAll, setIsLoadingAll] = useState(false);

    const itemSearchContainerRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [uiFeedbackModal, setUiFeedbackModal] = useState({
        isOpen: false, message: '', isAlert: true, title: 'Alert', confirmText: 'OK',
        onConfirmAction: null,
    });

    const [commitConfirmationModal, setCommitConfirmationModal] = useState({
        isOpen: false, isLoading: false, isSuccess: false,
    });

    const showAppModal = useCallback((title, message, isAlert = true, confirmText = 'OK', onConfirmCallback = null) => {
        setUiFeedbackModal({
            isOpen: true, title, message, isAlert, confirmText,
            onConfirmAction: onConfirmCallback || (() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false }))),
        });
    }, []);

    const fetchItems = useCallback(async (query) => {
        if (!query.trim()) {
            setItemSearchResults([]);
            setShowItemDropdown(false);
            return;
        }

        if (!data.store_id || data.store_id === '') { 
            showAppModal("Store Required", "Please select a store before searching for items.");
            setIsItemSearchLoading(false);
            setShowItemDropdown(false);
            setItemSearchResults([]); 
            return;
        }

        setIsItemSearchLoading(true);
        try {
            const response = await axios.get(
                route('systemconfiguration2.products.search'),
                { params: { query, store_id: data.store_id } } 
            );
            setItemSearchResults(response.data.products?.slice(0, 10) || []);
            setShowItemDropdown(true);
        } catch (error) {
            console.error('Error fetching products:', error);
            showAppModal('Fetch Error', 'Failed to fetch products.');
            setItemSearchResults([]);
            setShowItemDropdown(false);
        } finally {
            setIsItemSearchLoading(false);
        }
    }, [data.store_id, showAppModal]);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]); 
            setShowItemDropdown(false); 
        }
    }, [itemSearchQuery, debouncedItemSearch]);


    useEffect(() => {
        const calculatedTotal = data.physicalinventoryitems.reduce(
            (sum, item) => sum + (parseFloat(item.countedqty) || 0) * (parseFloat(item.price) || 0), 0
        );
        setData('total_counted_value', calculatedTotal);
    }, [data.physicalinventoryitems, setData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemSearchContainerRef.current && !itemSearchContainerRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- NEW FUNCTION: LOAD ALL ITEMS ---
    const handleLoadAllItems = async () => {
        if (!data.store_id) {
            showAppModal("Store Required", "Please select a store first.");
            return;
        }

        // Warn user if there are already items
        if (data.physicalinventoryitems.length > 0) {
            showAppModal(
                "Replace List?", 
                "This will merge all items from the store into your current list. Existing items will be kept.",
                false,
                "Proceed",
                () => executeLoadAll()
            );
        } else {
            executeLoadAll();
        }
    };

    const executeLoadAll = async () => {
        setUiFeedbackModal(prev => ({ ...prev, isOpen: false })); // Close modal if open
        setIsLoadingAll(true);
        try {
            const response = await axios.get(route('systemconfiguration2.products.store-all'), {
                params: { store_id: data.store_id }
            });

            const allProducts = response.data.products || [];
            if (allProducts.length === 0) {
                showAppModal("No Products", "No products found for this configuration.");
                setIsLoadingAll(false);
                return;
            }

            // Get IDs of items already in the list to avoid duplicates (or you can choose to reset)
            const existingIds = new Set(data.physicalinventoryitems.map(i => i.item_id));

            const newItems = allProducts
                .filter(p => !existingIds.has(p.id))
                .map(p => ({
                    _listId: `physitem-${p.id}-${Date.now()}`,
                    item_name: p.name,
                    item_id: p.id,
                    countedqty: '', // Leave blank so user is forced to input
                    expectedqty: parseFloat(p.stock_quantity) || 0,
                    price: parseFloat(p.price) || 0,
                }));

            // Combine existing and new
            setData('physicalinventoryitems', [...data.physicalinventoryitems, ...newItems]);

        } catch (error) {
            console.error("Error loading all items", error);
            showAppModal("Error", "Failed to load items. Please try again.");
        } finally {
            setIsLoadingAll(false);
        }
    };
    // ------------------------------------

    const handlePhysicalInventoryItemChange = (index, field, value) => {
        setData('physicalinventoryitems', data.physicalinventoryitems.map((item, i) => {
            if (i === index) {
                let processedValue = value;
                if (['countedqty', 'expectedqty'].includes(field)) {
                    const parsedValue = parseFloat(value);
                    processedValue = value === '' ? '' : (isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue);
                } else if (field === 'price') { 
                     const parsedValue = parseFloat(value);
                     processedValue = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
                }
                return { ...item, [field]: processedValue };
            }
            return item;
        }));
    };

    const addPhysicalInventoryItem = (selectedItem) => {
        if (!selectedItem || !selectedItem.id) return;
        if (data.physicalinventoryitems.some(item => item.item_id === selectedItem.id)) {
            showAppModal('Item Already Added', `"${selectedItem.name}" is already in the list.`);
            return;
        }
        const newItem = {
            _listId: `physitem-${Date.now()}`, item_name: selectedItem.name, item_id: selectedItem.id,
            countedqty: '',
            expectedqty: parseFloat(selectedItem.stock_quantity) === null || isNaN(parseFloat(selectedItem.stock_quantity)) ? 0 : parseFloat(selectedItem.stock_quantity), 
            price: parseFloat(selectedItem.price) || 0,
        };
        setData('physicalinventoryitems', [...data.physicalinventoryitems, newItem]);
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };

    const confirmRemovePhysicalInventoryItem = (indexToRemove) => {
        showAppModal('Confirm Removal', `Remove "${data.physicalinventoryitems[indexToRemove]?.item_name || 'this item'}"?`, false, 'Yes, Remove',
            () => {
                setData('physicalinventoryitems', data.physicalinventoryitems.filter((_, idx) => idx !== indexToRemove));
                setUiFeedbackModal(prev => ({ ...prev, isOpen: false }));
            }
        );
    };
    
    const validatePhysicalInventoryForm = (isCommitting = false) => {
        clearErrors();
        let isValid = true;
        if (!data.store_id) { setError('store_id', 'Store is required.'); if(isValid) showAppModal("Validation Error", "Please select a store."); isValid = false; }
        if (data.physicalinventoryitems.length === 0 && isValid) { 
            showAppModal("Validation Error", "At least one item is required for the count."); isValid = false; 
        }
        
        let itemLineError = false;
        data.physicalinventoryitems.forEach((item, index) => {
            if (item.countedqty === '' || isNaN(parseFloat(item.countedqty)) || parseFloat(item.countedqty) < 0) {
                setError(`physicalinventoryitems.${index}.countedqty`, 'Counted Qty must be 0 or more.'); isValid = false; itemLineError = true;
            }
            if (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
                 setError(`physicalinventoryitems.${index}.price`, 'Price must be non-negative.'); isValid = false; itemLineError = true;
            }
        });
        if (itemLineError && isValid) { 
            showAppModal("Validation Error", "All items require a valid counted quantity (0 or more) and price.");
        }

        if (isCommitting && !data.remarks.trim()) {
            setError('remarks', 'Remarks are required for committing the inventory count.');
            isValid = false;
        }
        return isValid;
    };

    const handleSaveDraft = (e) => {
        e.preventDefault();
        if (!validatePhysicalInventoryForm(false)) return;
        setData(prevData => ({ ...prevData, stage: 1 })); 

        post(route('inventory3.physical-inventory.store'), {
            preserveScroll: true,
            onSuccess: () => { showAppModal("Success", "Physical inventory saved as draft successfully!"); },
            onError: (pageErrors) => { console.error("Save draft errors:", pageErrors); const errorMsg = Object.values(pageErrors).flat().join(' ') || 'Failed to save draft.'; showAppModal("Save Error", errorMsg); },
        });
    };

    const handleCommitWithRemarks = () => {
        if (!data.remarks.trim()) { setError('remarks', 'Remarks are required for committing.'); return; }
        clearErrors('remarks');
        setCommitConfirmationModal(prev => ({ ...prev, isLoading: true }));
        post(route('inventory3.physical-inventory.commit'), {
            preserveScroll: true,
            onSuccess: () => { setCommitConfirmationModal({ isOpen: true, isLoading: false, isSuccess: true }); reset(); },
            onError: (pageErrors) => { setCommitConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: false })); console.error("Commit errors:", pageErrors); const errorMsg = pageErrors.message || Object.values(pageErrors).flat().join(' ') || 'Commit failed.'; setData(prevData => ({ ...prevData, errors: { ...prevData.errors, commitError: errorMsg } })); },
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
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Physical Inventory Count</h2>}
        >
            <Head title="New Physical Inventory" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <form className="space-y-6"> 
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                {/* Store Select */}
                                <div>
                                    <label htmlFor="store_id_phys" className="block text-sm font-medium leading-6 text-gray-900">
                                        Store <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="store_id_phys"
                                        name="store_id"
                                        value={data.store_id}
                                        onChange={(e) => {
                                            setData(prev => ({...prev, store_id: e.target.value, physicalinventoryitems: []}));
                                            setItemSearchQuery('');
                                            setItemSearchResults([]);
                                            setShowItemDropdown(false);
                                        }}
                                        className={`mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.store_id ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                                    >
                                        <option value="">Select a store...</option>
                                        {initialStores.map((store) => (
                                            <option key={store.id} value={store.id}>
                                                {store.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.store_id && <p className="mt-1 text-sm text-red-600">{errors.store_id}</p>}
                                </div>

                                {/* Description */}
                                <div>
                                    <label htmlFor="description_phys" className="block text-sm font-medium leading-6 text-gray-900">
                                        Description / Count Reason
                                    </label>
                                    <textarea id="description_phys" name="description" rows="3"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className={`mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.description ? "ring-red-500" : ""}`}
                                        placeholder="e.g., Monthly stock count, Discrepancy check" />
                                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                                </div>
                            </div>

                             <div>
                                <label htmlFor="remarks_phys" className="block text-sm font-medium leading-6 text-gray-900">
                                    Remarks <span className="text-gray-500">(Optional for Draft, Required for Commit)</span>
                                </label>
                                <textarea id="remarks_phys" name="remarks" rows="3" value={data.remarks}
                                    onChange={(e) => setData('remarks', e.target.value)}
                                    className={`mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.remarks ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}/>
                                {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                            </div>

                            {/* Item Search & Add */}
                            <div className="border-t border-gray-200 pt-6">
                                <label htmlFor="item-search_phys" className="block text-sm font-medium leading-6 text-gray-900 mb-2">Add Items to Count</label>
                                
                                <div className="flex gap-2">
                                    <div className="relative flex-grow" ref={itemSearchContainerRef}>
                                        <div className="relative">
                                            <input type="text" name="item-search_phys" id="item-search_phys" ref={itemSearchInputRef}
                                                placeholder="Search item (select store first)" value={itemSearchQuery}
                                                onChange={(e) => setItemSearchQuery(e.target.value)}
                                                onFocus={() => { if (itemSearchQuery.trim() || itemSearchResults.length > 0) setShowItemDropdown(true); }}
                                                disabled={!data.store_id} 
                                                className={`block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ${!data.store_id ? 'bg-gray-100 cursor-not-allowed' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`} autoComplete="off" />
                                            {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                            {!isItemSearchLoading && itemSearchQuery && (
                                                <button type="button" onClick={() => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); itemSearchInputRef.current?.focus(); }}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear"><FontAwesomeIcon icon={faTimesCircle} /></button>)}
                                        </div>
                                        {showItemDropdown && (itemSearchQuery.trim() || itemSearchResults.length > 0) && data.store_id && (
                                            <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {itemSearchResults.length > 0 ? itemSearchResults.map((item) => (
                                                    <li key={item.id} className="p-3 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => addPhysicalInventoryItem(item)}>
                                                        <div className="font-medium">{item.name} {item.code ? `(${item.code})` : ''}</div>
                                                        <div className="text-xs text-gray-500">Price: {formatCurrency(item.price)} / System Stock: {item.stock_quantity ?? 'N/A'}</div>
                                                    </li>)) : !isItemSearchLoading && itemSearchQuery.trim() && (<li className="p-3 text-sm text-gray-500">No items found.</li>)}
                                                {isItemSearchLoading && <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Load All Button */}
                                    <button
                                        type="button"
                                        onClick={handleLoadAllItems}
                                        disabled={!data.store_id || isLoadingAll}
                                        className={`flex items-center justify-center px-4 py-1.5 rounded-md text-sm font-semibold shadow-sm text-white
                                            ${!data.store_id || isLoadingAll 
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : 'bg-indigo-600 hover:bg-indigo-500'}`}
                                        title="Load all products for this store"
                                    >
                                        {isLoadingAll ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Loading...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faDownload} className="mr-2" /> Load All Items</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Physical Inventory Items Table */}
                            {data.physicalinventoryitems.length > 0 && (
                                <div className="mt-6 flow-root">
                                   <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <table className="min-w-full divide-y divide-gray-300">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">Item</th>
                                                        <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">System Qty</th>
                                                        <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Counted Qty <span className="text-red-500">*</span></th>
                                                        <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Unit Price</th>
                                                        <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Counted Value</th>
                                                        <th scope="col" className="w-20 relative py-3.5 pl-3 pr-4 sm:pr-3 text-center"><span className="sr-only">Remove</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {data.physicalinventoryitems.map((item, index) => (
                                                        <tr key={item._listId} className={ errors[`physicalinventoryitems.${index}.countedqty`] ? "bg-red-50" : ""}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name || 'N/A'}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.expectedqty}
                                                                    readOnly className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm text-right cursor-not-allowed" />
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.countedqty}
                                                                    onChange={(e) => handlePhysicalInventoryItemChange(index, 'countedqty', e.target.value)}
                                                                    className={`w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right ${errors[`physicalinventoryitems.${index}.countedqty`] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
                                                                    min="0" placeholder="Enter count" required />
                                                               {errors[`physicalinventoryitems.${index}.countedqty`] && <p className="text-xs text-red-600 mt-1">{errors[`physicalinventoryitems.${index}.countedqty`]}</p>}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.price} readOnly
                                                                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm text-right cursor-not-allowed" />
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">
                                                                {formatCurrency((parseFloat(item.countedqty) || 0) * (parseFloat(item.price) || 0))}
                                                            </td>
                                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                                <button type="button" onClick={() => confirmRemovePhysicalInventoryItem(index)}
                                                                    className="text-red-500 hover:text-red-700" title="Remove item"><FontAwesomeIcon icon={faTrash} /></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50">
                                                    <tr>
                                                        <th scope="row" colSpan="4" className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Total Counted Value</th>
                                                        <td className="pl-3 pr-4 pt-3 text-right text-sm font-semibold text-gray-900 sm:pr-3">{formatCurrency(data.total_counted_value)}</td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                            {Object.keys(errors).some(key => key.startsWith('physicalinventoryitems.')) && <p className="mt-2 text-sm text-red-600">Please check item details for errors.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                <Link href={route('inventory3.physical-inventory.index')}
                                    className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />Cancel
                                </Link>
                                <button type="button" onClick={handleSaveDraft} disabled={processing}
                                    className="rounded-md bg-slate-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 disabled:opacity-50 flex items-center justify-center">
                                    {processing && data.stage === 1 ? (<><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Saving Draft...</>) : (<><FontAwesomeIcon icon={faSave} className="mr-2" />Save Draft</>)}
                                </button>
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
                onClose={() => setCommitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false }) }
                onConfirm={commitConfirmationModal.isSuccess ? () => {
                    setCommitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    inertiaRouter.visit(route('inventory3.physical-inventory.index'));
                } : handleCommitWithRemarks}
                title={commitConfirmationModal.isSuccess ? "Inventory Count Committed" : "Commit Physical Inventory Count"}
                confirmButtonText={commitConfirmationModal.isSuccess ? "View Counts" : (commitConfirmationModal.isLoading ? "Committing..." : "Confirm & Commit")}
                confirmButtonDisabled={commitConfirmationModal.isLoading} >
                {commitConfirmationModal.isSuccess ? (
                    <div className="text-center py-4"><FontAwesomeIcon icon={faCheck} className="text-green-500 fa-3x mb-3"/><p className="text-lg">Physical inventory count committed successfully!</p></div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">Please add necessary remarks for committing this inventory count.</p>
                        <div>
                            <label htmlFor="commit_remarks_phys" className="block text-sm font-medium text-gray-700">Remarks <span className="text-red-500">*</span></label>
                            <textarea id="commit_remarks_phys" name="remarks" rows="3"
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.remarks ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                                value={data.remarks}
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