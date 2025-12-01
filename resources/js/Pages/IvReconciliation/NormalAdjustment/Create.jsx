import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';
import { toast } from 'react-toastify';

import Modal from '@/Components/CustomModal.jsx';

// Utility function for debouncing
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};

const defaultArray = [];

export default function CreateNormalAdjustment({ auth, stores: initialStores = defaultArray, adjustmentreasons: initialAdjustmentReasons = defaultArray, facilityOptions }) {
    const { data, setData, post, errors, processing, reset, clearErrors, setError } = useForm({
        store_id: '',
        adjustment_reason_id: '',
        total: 0,
        stage: 1, 
        normaladjustmentitems: [],
        remarks: '', 
    });

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemSearchContainerRef = useRef(null);
    const itemSearchInputRef = useRef(null);
    
    // Track initial mount to prevent clearing items on first load
    const isInitialMount = useRef(true);

    // Commit Confirmation Modal
    const [commitConfirmationModal, setCommitConfirmationModal] = useState({
        isOpen: false, isLoading: false, isSuccess: false,
    });

    // Fetch Items
    const fetchData = useCallback(async (endpoint, query, setLoading, setResults, setShowDropdown, entityName) => {
        if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
        
        // Prevent searching if store is not selected (Critical for correct stock data)
        if (!data.store_id) {
            toast.warn("Please select a store first.");
            setResults([]); setShowDropdown(false); return;
        }

        setLoading(true);

        const params = { query };
        if (data.store_id) {
            params.store_id = data.store_id;
        }

        try {
            const response = await axios.get(route(endpoint), { params } );
            setResults(response.data[entityName]?.slice(0, 10) || []);
            setShowDropdown(true);
        } catch (error) {
            console.error(`Error fetching ${entityName}:`, error);
            toast.error(`Failed to fetch ${entityName}.`);
            setResults([]); setShowDropdown(false);
        } finally { setLoading(false); }
    },  [data.store_id]); 

    const fetchItems = useCallback((query) => fetchData('systemconfiguration2.products.search', query, setIsItemSearchLoading, setItemSearchResults, setShowItemDropdown, 'products'), [fetchData]);
    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);

    // --- EFFECT: Clear items on Store Change ---
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        if (data.normaladjustmentitems.length > 0) {
            setData('normaladjustmentitems', []);
            toast.info('Store changed. Item list cleared to ensure stock accuracy.');
        }
    }, [data.store_id]);
    // -------------------------------------------

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setShowItemDropdown(false);
        }
    }, [itemSearchQuery, debouncedItemSearch]);

    // Calculate total
    useEffect(() => {
        const calculatedTotal = data.normaladjustmentitems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
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

    const handleNormalAdjustmentItemChange = (index, field, value) => {
        setData('normaladjustmentitems', data.normaladjustmentitems.map((item, i) => {
            if (i === index) {
                let processedValue = value;
                
                if (field === 'quantity') { 
                    const parsedValue = parseFloat(value);
                    processedValue = isNaN(parsedValue) ? '' : parsedValue;

                    // --- STOCK VALIDATION ---
                    // Rule: If negative quantity (deduction), absolute value cannot exceed available stock.
                    const allowNegative = facilityOptions?.allownegativestock ?? false;
                    const hasStockData = item.stock_quantity !== undefined && item.stock_quantity !== null;

                    // Check if: Negative Stock Disallowed AND Stock Data Exists AND User input is negative
                    if (!allowNegative && hasStockData && parsedValue < 0) {
                        const currentStock = parseFloat(item.stock_quantity);
                        const deductionAmount = Math.abs(parsedValue);

                        if (deductionAmount > currentStock) {
                            toast.error(`Insufficient stock for "${item.item_name}". Available: ${currentStock}, Trying to deduct: ${deductionAmount}`, {
                                autoClose: 5000
                            });
                            // Prevent the change (reset to 0 or previous value if tracked)
                            processedValue = 0; 
                        }
                    }
                    // ------------------------

                } else if (field === 'price') { 
                    const parsedValue = parseFloat(value);
                    processedValue = isNaN(parsedValue) ? '' : Math.max(0, parsedValue);
                }
                return { ...item, [field]: processedValue };
            }
            return item;
        }));
    };

    const addNormalAdjustmentItem = (selectedItem) => {
        if (!selectedItem || !selectedItem.id) return;
        if (data.normaladjustmentitems.some(item => item.item_id === selectedItem.id)) {
            toast.info(`"${selectedItem.name}" is already in the list.`);
            return;
        }
        
        const newItem = {
            _listId: `adjitem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: selectedItem.name,
            item_id: selectedItem.id,
            quantity: '', // Start empty
            price: parseFloat(selectedItem.price) || 0,
            // IMPORTANT: Persist stock_quantity from search result
            stock_quantity: selectedItem.stock_quantity !== undefined ? parseFloat(selectedItem.stock_quantity) : 0
        };
        
        setData('normaladjustmentitems', [...data.normaladjustmentitems, newItem]);
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };

    const confirmRemoveNormalAdjustmentItem = (indexToRemove) => {
        if(window.confirm(`Remove "${data.normaladjustmentitems[indexToRemove]?.item_name || 'this item'}"?`)) {
             setData('normaladjustmentitems', data.normaladjustmentitems.filter((_, idx) => idx !== indexToRemove));
             toast.success("Item removed.");
        }
    };
    
    const validateAdjustmentForm = (isSubmitting = false) => {
        clearErrors();
        let isValid = true;
        if (!data.store_id) {
            setError('store_id', 'Please select a store.');
            toast.error("Please select a store.");
            isValid = false;
        }
        if (!data.adjustment_reason_id) {
            setError('adjustment_reason_id', 'Please select an adjustment reason.');
            if (isValid) toast.error("Please select an adjustment reason.");
            isValid = false;
        }
        if (data.normaladjustmentitems.length === 0) {
            if (isValid) toast.error("Please add at least one item to adjust.");
            isValid = false;
        }

        let itemLineError = false;
        data.normaladjustmentitems.forEach((item, index) => {
            const quantity = parseFloat(item.quantity);
            if (item.quantity === '' || isNaN(quantity) || quantity === 0) {
                setError(`normaladjustmentitems.${index}.quantity`, 'Quantity must be a non-zero number.');
                isValid = false;
                itemLineError = true;
            }
            if (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
                setError(`normaladjustmentitems.${index}.price`, 'Price must be a non-negative number.');
                isValid = false;
                itemLineError = true;
            }
        });
        
        if (itemLineError && isValid) { 
             toast.error("All items must have a valid, non-zero quantity and a non-negative price.");
        }
        
        if (isSubmitting && !data.remarks.trim()) {
            setError('remarks', 'Remarks are required for committing the adjustment.');
            isValid = false;
        }
        return isValid;
    };


    const handleSaveDraft = (e) => {
        e.preventDefault();
        if (!validateAdjustmentForm(false)) return;

        setData(prevData => ({ ...prevData, stage: 1 })); 

        post(route('inventory3.normal-adjustment.store'), { 
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Stock adjustment saved as draft successfully!");
            },
            onError: (pageErrors) => {
                console.error("Save draft errors:", pageErrors);
                toast.error("Failed to save draft. Please check errors.");
            },
        });
    };

    const openCommitConfirmationModal = () => {
        if (!validateAdjustmentForm(false)) return;

        setData(prevData => ({ ...prevData, stage: 2, remarks: '' })); 
        setCommitConfirmationModal({ isOpen: true, isLoading: false, isSuccess: false });
    };

    const handleCommitWithRemarks = () => {
        if (!data.remarks.trim()) {
            setError('remarks', 'Remarks are required for committing the adjustment.');
            return; 
        }
        clearErrors('remarks');

        setCommitConfirmationModal(prev => ({ ...prev, isLoading: true }));
        post(route('inventory3.normal-adjustment.store'), { 
            preserveScroll: true,
            onSuccess: () => {
                setCommitConfirmationModal({ isOpen: true, isLoading: false, isSuccess: true });
                toast.success("Stock adjustment committed successfully!");
            },
            onError: (pageErrors) => {
                setCommitConfirmationModal(prev => ({ ...prev, isLoading: false, isSuccess: false }));
                console.error("Commit errors:", pageErrors);
                toast.error("Commit failed. Please check errors.");
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
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Stock Adjustment</h2>}
        >
            <Head title="New Stock Adjustment" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <form className="space-y-6"> 
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                {/* Store Select */}
                                <div>
                                    <label htmlFor="store_id" className="block text-sm font-medium leading-6 text-gray-900">
                                        Store <span className="text-red-500">*</span>
                                    </label>
                                    <div className="mt-2">
                                        <select
                                            id="store_id"
                                            name="store_id"
                                            value={data.store_id}
                                            onChange={(e) => setData('store_id', e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.store_id ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                                        >
                                            <option value="">Select a store...</option>
                                            {initialStores.map((store) => (
                                                <option key={store.id} value={store.id}>
                                                    {store.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {errors.store_id && <p className="mt-1 text-sm text-red-600">{errors.store_id}</p>}
                                </div>

                                {/* Adjustment Reason Select */}
                                <div>
                                    <label htmlFor="adjustment_reason_id" className="block text-sm font-medium leading-6 text-gray-900">
                                        Adjustment Reason <span className="text-red-500">*</span>
                                    </label>
                                    <div className="mt-2">
                                        <select
                                            id="adjustment_reason_id"
                                            name="adjustment_reason_id"
                                            value={data.adjustment_reason_id}
                                            onChange={(e) => setData('adjustment_reason_id', e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.adjustment_reason_id ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                                        >
                                            <option value="">Select a reason...</option>
                                            {initialAdjustmentReasons.map((reason) => (
                                                <option key={reason.id} value={reason.id}>
                                                    {reason.name} ({reason.action})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {errors.adjustment_reason_id && <p className="mt-1 text-sm text-red-600">{errors.adjustment_reason_id}</p>}
                                </div>
                            </div>

                            {/* Remarks Field */}
                            <div>
                                <label htmlFor="remarks" className="block text-sm font-medium leading-6 text-gray-900">
                                    Remarks <span className="text-gray-500">(Optional for Draft, Required for Commit)</span>
                                </label>
                                <div className="mt-2">
                                    <textarea id="remarks" name="remarks" rows="3"
                                        value={data.remarks}
                                        onChange={(e) => setData('remarks', e.target.value)}
                                        className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.remarks ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                                    ></textarea>
                                    {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                                </div>
                            </div>

                            {/* Item Search & Add */}
                            <div className="border-t border-gray-200 pt-6">
                                <label htmlFor="item-search-adj" className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                                    Add Items for Adjustment
                                </label>
                                <div className="relative" ref={itemSearchContainerRef}>
                                    <div className="relative">
                                         <input type="text" name="item-search-adj" id="item-search-adj" ref={itemSearchInputRef}
                                            placeholder="Search item by name or code..." value={itemSearchQuery}
                                            onChange={(e) => {
                                                setItemSearchQuery(e.target.value);
                                                if (e.target.value.trim()) setShowItemDropdown(true); else setShowItemDropdown(false);
                                            }}
                                            onFocus={() => {if(itemSearchQuery.trim()) setShowItemDropdown(true);}}
                                            className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                            autoComplete="off" />
                                        {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                        {!isItemSearchLoading && itemSearchQuery && (
                                            <button type="button" onClick={() => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); itemSearchInputRef.current?.focus(); }}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear">
                                                <FontAwesomeIcon icon={faTimesCircle} />
                                            </button>
                                        )}
                                    </div>
                                    {showItemDropdown && itemSearchQuery.trim() && (
                                        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {itemSearchResults.length > 0 ? itemSearchResults.map((item) => (
                                                <li key={item.id} className="p-3 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => addNormalAdjustmentItem(item)}>
                                                    <div className="font-medium">{item.name} {item.code ? `(${item.code})` : ''}</div>
                                                    <div className="text-xs text-gray-500">Price: {formatCurrency(item.price)} / Stock: {item.stock_quantity ?? 'N/A'}</div>
                                                </li>
                                            )) : !isItemSearchLoading && (<li className="p-3 text-sm text-gray-500">No items found.</li>)}
                                            {isItemSearchLoading && <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>}
                                        </ul>
                                    )}
                                </div>
                            </div>

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
                                                        <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Adj. Value</th>
                                                        <th scope="col" className="w-20 relative py-3.5 pl-3 pr-4 sm:pr-3 text-center"><span className="sr-only">Remove</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {data.normaladjustmentitems.map((item, index) => (
                                                        <tr key={item._listId} className={ errors[`normaladjustmentitems.${index}.quantity`] || errors[`normaladjustmentitems.${index}.price`] ? "bg-red-50" : ""}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name || 'N/A'}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.quantity}
                                                                    onChange={(e) => handleNormalAdjustmentItemChange(index, 'quantity', e.target.value)}
                                                                    className={`w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right ${errors[`normaladjustmentitems.${index}.quantity`] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
                                                                    placeholder="e.g., 5 or -2" step="any" required />
                                                               {errors[`normaladjustmentitems.${index}.quantity`] && <p className="text-xs text-red-600 mt-1">{errors[`normaladjustmentitems.${index}.quantity`]}</p>}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input type="number" value={item.price} readOnly
                                                                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm text-right cursor-not-allowed" />
                                                               {errors[`normaladjustmentitems.${index}.price`] && <p className="text-xs text-red-600 mt-1">{errors[`normaladjustmentitems.${index}.price`]}</p>}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">
                                                                {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0))}
                                                            </td>
                                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                                <button type="button" onClick={() => confirmRemoveNormalAdjustmentItem(index)}
                                                                    className="text-red-500 hover:text-red-700" title="Remove item">
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50">
                                                    <tr>
                                                        <th scope="row" colSpan="3" className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Total Adj. Value</th>
                                                        <td className="pl-3 pr-4 pt-3 text-right text-sm font-semibold text-gray-900 sm:pr-3">{formatCurrency(data.total)}</td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                            {Object.keys(errors).some(key => key.startsWith('normaladjustmentitems.')) &&
                                                <p className="mt-2 text-sm text-red-600">Please check item details for errors.</p>
                                            }
                                            {errors.normaladjustmentitems && typeof errors.normaladjustmentitems === 'string' && <p className="mt-2 text-sm text-red-600">{errors.normaladjustmentitems}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                <Link href={route('inventory3.normal-adjustment.index')} 
                                    className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />Cancel
                                </Link>
                                <button type="button" onClick={handleSaveDraft} disabled={processing && data.stage === 1}
                                    className="rounded-md bg-slate-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:opacity-50 flex items-center justify-center">
                                    {processing && data.stage === 1 ? (
                                        <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Saving Draft...</>
                                    ) : (
                                        <><FontAwesomeIcon icon={faSave} className="mr-2" />Save Draft</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal for Final Commit with Remarks */}
            <Modal
                isOpen={commitConfirmationModal.isOpen}
                onClose={() => {
                    if (commitConfirmationModal.isSuccess) {
                        setCommitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        inertiaRouter.visit(route('inventory3.normal-adjustment.index')); 
                    } else {
                        setCommitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                        if (data.stage === 2 && !commitConfirmationModal.isLoading) {
                             setData(prevData => ({ ...prevData, stage: 1 })); 
                        }
                    }
                }}
                onConfirm={commitConfirmationModal.isSuccess ? () => {
                    setCommitConfirmationModal({ isOpen: false, isLoading: false, isSuccess: false });
                    inertiaRouter.visit(route('inventory3.normal-adjustment.index')); 
                } : handleCommitWithRemarks}
                title={commitConfirmationModal.isSuccess ? "Adjustment Committed" : "Commit Stock Adjustment"}
                confirmButtonText={
                    commitConfirmationModal.isSuccess ? "View Adjustments" :
                    commitConfirmationModal.isLoading ? "Committing..." : "Confirm & Commit"
                }
                confirmButtonDisabled={commitConfirmationModal.isLoading}
            >
                {commitConfirmationModal.isSuccess ? (
                    <div className="text-center py-4">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500 fa-3x mb-3"/>
                        <p className="text-lg">Stock adjustment committed successfully!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            You are about to commit this stock adjustment. Please add necessary remarks below.
                        </p>
                        <div>
                            <label htmlFor="commit_remarks" className="block text-sm font-medium text-gray-700">
                                Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="commit_remarks"
                                name="remarks"
                                rows="3"
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.remarks ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                                value={data.remarks}
                                onChange={(e) => {
                                    setData('remarks', e.target.value);
                                    if (e.target.value.trim()) clearErrors('remarks'); 
                                }}
                                disabled={commitConfirmationModal.isLoading}
                            />
                            {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
                        </div>
                        {errors.commitError && <p className="mt-2 text-sm text-red-600">{errors.commitError}</p>}
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}