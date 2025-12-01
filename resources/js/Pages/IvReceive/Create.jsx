import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react'; 
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';
import { toast } from 'react-toastify'; 

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

export default function Create({ auth, fromstore: initialFromStore = defaultStores, tostore: initialToStore = defaultStores, flash }) { 
    const fromstore = Array.isArray(initialFromStore) ? initialFromStore : defaultStores;
    const tostore = Array.isArray(initialToStore) ? initialToStore : defaultStores;

    const { data, setData, post, errors, processing, reset, clearErrors } = useForm({
        fromstore_type: 3,
        from_store_id: '',
        to_store_id: '',        
        total: 0,
        stage: 1, 
        delivery_no: '',
        remarks: '',
        receiveitems: [],
    });

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // Removed uiFeedbackModal state as we are using toast now

    // Flash message handling
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

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
            toast.error("Could not load items. Please try again.");
        } finally {
            setIsItemSearchLoading(false);
        }
    }, []); 

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);

    useEffect(() => {
        debouncedItemSearch(itemSearchQuery);
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => {
        const calculatedTotal = data.receiveitems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
    }, [data.receiveitems, setData]);

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
        if (!selectedItem || !selectedItem.id) {
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
            toast.info(`"${newItem.item_name}" is already in the list.`);
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

    const removeReceiveItem = (index) => {
        if (window.confirm(`Are you sure you want to remove "${data.receiveitems[index]?.item_name || 'this item'}"?`)) {
            setData(prevData => {
                const updatedItems = prevData.receiveitems.filter((_, idx) => idx !== index);
                return { ...prevData, receiveitems: updatedItems };
            });
            toast.success("Item removed.");
        }
    };

    const handleSaveDraft = (e) => {
        e.preventDefault();
        clearErrors();
        
        setData('stage', 1); 

        if (!data.from_store_id) { toast.error("Please select 'From Store'."); return; }
        if (!data.to_store_id) { toast.error("Please select 'To Store'."); return; }
        if (!data.delivery_no) { toast.error("Please enter 'Delivery Note Number'."); return; }
        if (data.receiveitems.length === 0) { toast.error("Please add at least one item."); return; }

        post(route('inventory2.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Receipt draft saved successfully!");
            },
            onError: (pageErrors) => {
                console.error("Save draft errors:", pageErrors);
                toast.error("Failed to save draft. Please check the form.");
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

    const getFromStoreName = (fromstore) => {
        if (!fromstore) return "N/A";       
        if (fromstore.supplier_type) {
            return fromstore.supplier_type === 'individual'
                ? `${fromstore.first_name || ''} ${fromstore.other_names || ''} ${fromstore.surname || ''}`.trim()
                : fromstore.company_name || 'N/A';
        }
        return fromstore.name || 'N/A';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Receipt</h2>}
        >
            <Head title="Create Receive" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleSaveDraft} className="space-y-6"> 
                            {/* Store Selection */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="from_store_id" className="block text-sm font-medium leading-6 text-gray-900">
                                        From Store/Supplier <span className="text-red-500">*</span>
                                    </label>
                                    <div className="mt-2">
                                        <select
                                            id="from_store_id"
                                            name="from_store_id"
                                            value={data.from_store_id}
                                            onChange={(e) => setData("from_store_id", e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.from_store_id ? "ring-red-500" : ""}`}
                                        >
                                            <option value="">Select From Store/Supplier...</option>
                                            {fromstore.map(store => (
                                                <option key={store.id} value={store.id}>{getFromStoreName(store)}</option>
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

                            {/* Delivery Note & Remarks */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">

                                {/* delivery_no Textbox */}
                                <div className="relative flex-1">
                                    <label htmlFor="delivery_no" className="block text-sm font-medium leading-6 text-gray-900">
                                        Delivery Note Number<span className="text-red-500">*</span>
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="delivery_no"
                                            type="text"
                                            placeholder="Enter delivery_no..."
                                            value={data.delivery_no}
                                            onChange={(e) => setData('delivery_no', e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.delivery_no ? "ring-red-500" : ""}`}
                                        />
                                        {errors.delivery_no && <p className="mt-1 text-sm text-red-600">{errors.delivery_no}</p>}
                                    </div>
                                </div> 

                                {/* Remarks for Draft */}
                                <div className="relative flex-1">
                                    <label htmlFor="remarks" className="block text-sm font-medium leading-6 text-gray-900">
                                        Remarks (Optional)
                                    </label>
                                    <div className="mt-2">
                                        <textarea
                                            id="remarks"
                                            name="remarks"
                                            rows="3"
                                            value={data.remarks}
                                            onChange={(e) => setData('remarks', e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.remarks ? "ring-red-500" : ""}`}
                                            placeholder="Enter any notes for this draft..."
                                        />
                                        {errors.remarks && <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>}
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
                                                            onClick={() => removeReceiveItem(index)}
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

                            {/* Actions: Save Draft, Cancel */}
                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                <Link
                                    href={route('inventory2.index')}
                                    className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                    Cancel
                                </Link>
                                <button 
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-md bg-slate-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:opacity-50"
                                >
                                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                                    {processing ? 'Saving...' : 'Save Draft'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}