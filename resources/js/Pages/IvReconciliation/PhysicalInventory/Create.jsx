import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router as inertiaRouter } from '@inertiajs/react'; // Added Link, inertiaRouter
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Added React
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons'; // Added faSave, faPlus, faSpinner
import '@fortawesome/fontawesome-svg-core/styles.css';
// import { Inertia } from '@inertiajs/inertia'; // Not typically needed with useForm and inertiaRouter
import axios from 'axios';

import Modal from '@/Components/CustomModal.jsx'; // Assuming path is correct
// Removed InputField, will use direct inputs with Tailwind for consistency

// Utility function for debouncing
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export default function CreatePhysicalInventory({ auth }) { // Added auth for AuthenticatedLayout
    const { data, setData, post, errors, processing, reset, clearErrors } = useForm({
        store_name: '', // For display in search
        store_id: null,
        description: '',
        total_counted_value: 0, // Renamed for clarity
        stage: 1, // 1 for Draft, 2 for Submitted/Checked
        physicalinventoryitems: [],
    });

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemSearchContainerRef = useRef(null); // For click outside logic of item search + dropdown
    const itemSearchInputRef = useRef(null);

    // Store Search State
    const [storeSearchQuery, setStoreSearchQuery] = useState(''); // This will drive the input field value
    const [storeSearchResults, setStoreSearchResults] = useState([]);
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const [isStoreSearchLoading, setIsStoreSearchLoading] = useState(false);
    const storeSearchContainerRef = useRef(null); // For click outside logic of store search + dropdown
    const storeSearchInputRef = useRef(null);

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

    // Fetch items dynamically
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
            showGeneralAlert('Fetch Error', 'Failed to fetch products.');
            setItemSearchResults([]);
            setShowItemDropdown(false);
        } finally {
            setIsItemSearchLoading(false);
        }
    }, []); // showGeneralAlert should be stable or memoized if passed as prop

    // Fetch Stores dynamically
    const fetchStores = useCallback(async (query) => {
        if (!query.trim()) {
            setStoreSearchResults([]);
            setShowStoreDropdown(false);
            return;
        }
        setIsStoreSearchLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration2.stores.search'), { params: { query } });
            setStoreSearchResults(response.data.stores?.slice(0, 10) || []);
            setShowStoreDropdown(true);
        } catch (error) {
            console.error('Error fetching stores:', error);
            showGeneralAlert('Fetch Error', 'Failed to fetch stores.');
            setStoreSearchResults([]);
            setShowStoreDropdown(false);
        } finally {
            setIsStoreSearchLoading(false);
        }
    }, []); // showGeneralAlert dependency

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);
    const debouncedStoreSearch = useMemo(() => debounce(fetchStores, 350), [fetchStores]);

    useEffect(() => {
        debouncedItemSearch(itemSearchQuery);
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => {
        debouncedStoreSearch(storeSearchQuery);
    }, [storeSearchQuery, debouncedStoreSearch]);

    // Calculate total counted value
    useEffect(() => {
        const calculatedTotal = data.physicalinventoryitems.reduce(
            (sum, item) => sum + (parseFloat(item.countedqty) || 0) * (parseFloat(item.price) || 0),
            0
        );
        if (data.total_counted_value !== calculatedTotal) {
            setData('total_counted_value', calculatedTotal);
        }
    }, [data.physicalinventoryitems, data.total_counted_value, setData]);

    // Handle click outside item dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemSearchContainerRef.current && !itemSearchContainerRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
            if (storeSearchContainerRef.current && !storeSearchContainerRef.current.contains(event.target)) {
                setShowStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const handlePhysicalInventoryItemChange = (index, field, value) => {
        setData(prevData => {
            const updatedItems = prevData.physicalinventoryitems.map((item, i) => {
                if (i === index) {
                    let processedValue = value;
                    if (['countedqty', 'expectedqty', 'price'].includes(field)) {
                        const parsedValue = parseFloat(value);
                        // Allow 0, but treat NaN as 0 for calculations, or keep empty for input if preferred
                        processedValue = isNaN(parsedValue) ? '' : (parsedValue < 0 ? 0 : parsedValue);
                        if (value === '' && ['countedqty', 'expectedqty'].includes(field)) processedValue = ''; // Allow empty input for quantities
                    }
                    return { ...item, [field]: processedValue };
                }
                return item;
            });
            return { ...prevData, physicalinventoryitems: updatedItems };
        });
    };

    const addPhysicalInventoryItem = (selectedItem) => {
        if (!selectedItem || !selectedItem.id) {
            console.warn("Add item: Invalid selected item provided.");
            return;
        }
        const newItem = {
            _listId: `physitem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            item_name: selectedItem.name,
            item_id: selectedItem.id,
            countedqty: '', // Start empty for user input
            expectedqty: parseFloat(selectedItem.stock_quantity) || 0, // Prefill expected from product data if available
            price: parseFloat(selectedItem.price) || 0,
        };

        if (data.physicalinventoryitems.some(item => item.item_id === newItem.item_id)) {
            showGeneralAlert('Item Already Added', `"${newItem.item_name}" is already in the list. You can adjust its quantities.`);
            return;
        }

        setData(prevData => ({
            ...prevData,
            physicalinventoryitems: [...prevData.physicalinventoryitems, newItem]
        }));

        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        itemSearchInputRef.current?.focus();
    };

    const handleRemoveItemConfirmed = (indexToRemove) => {
        if (indexToRemove !== null && typeof indexToRemove === 'number') {
            setData(prevData => ({
                ...prevData,
                physicalinventoryitems: prevData.physicalinventoryitems.filter((_, idx) => idx !== indexToRemove)
            }));
        }
        setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null }));
    };

    const confirmRemovePhysicalInventoryItem = (index) => {
        setUiFeedbackModal({
            isOpen: true,
            message: `Are you sure you want to remove "${data.physicalinventoryitems[index]?.item_name || 'this item'}"?`,
            isAlert: false,
            itemIndexToRemove: index,
            onConfirmAction: () => handleRemoveItemConfirmed(index),
            title: 'Confirm Removal',
            confirmText: 'Yes, Remove'
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
        setData(prevData => ({
            ...prevData,
            store_id: selectedStore.id,
            store_name: selectedStore.name // Keep store_name in data if you want to display it easily
        }));
        setStoreSearchQuery(selectedStore.name); // Update search input to reflect selection
        setShowStoreDropdown(false);
        setStoreSearchResults([]); // Clear results
        storeSearchInputRef.current?.blur(); // Optional: blur input after selection
    };


    const handleSubmitPhysicalInventory = (e) => {
        e.preventDefault();
        clearErrors();

        if (!data.store_id) {
            showGeneralAlert("Validation Error", "Please select a store.");
            // You might want to set an error on the store_id field too:
            // setData('errors', { ...data.errors, store_id: 'Store is required.' });
            return;
        }
        if (data.physicalinventoryitems.length === 0) {
            showGeneralAlert("Validation Error", "Please add at least one item to the count.");
            return;
        }

        const hasInvalidItems = data.physicalinventoryitems.some(item =>
            item.countedqty === '' || isNaN(parseFloat(item.countedqty)) || parseFloat(item.countedqty) < 0 ||
            isNaN(parseFloat(item.expectedqty)) || parseFloat(item.expectedqty) < 0 || // Expected can be 0
            isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0
        );

        if (hasInvalidItems) {
            showGeneralAlert("Validation Error", "Some items have invalid or negative quantities/prices. Please correct them.");
            return;
        }

        post(route('inventory3.physical-inventory.store'), {
            preserveScroll: true,
            onSuccess: () => {
                showGeneralAlert("Success", "Physical inventory saved successfully!");
                reset(); // Reset form fields
                setStoreSearchQuery(''); // Reset store search query
            },
            onError: (pageErrors) => {
                console.error("Save errors:", pageErrors);
                showGeneralAlert("Save Error", pageErrors.message || 'Failed to save physical inventory. Please check errors.');
            },
        });
    };

    const formatCurrency = (amount, currencyCode = 'TZS') => { // Assuming TZS or make dynamic
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return '0.00'; // No currency code if just number
        return parsedAmount.toLocaleString(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };


    return (
        <AuthenticatedLayout
            user={auth?.user} // Pass auth if needed by AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Physical Inventory Count</h2>}
        >
            <Head title="New Physical Inventory" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8"> {/* Consistent max-width */}
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg"> {/* Consistent shadow */}
                        <form onSubmit={handleSubmitPhysicalInventory} className="space-y-6">
                            {/* Store Search and Description */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                <div className="relative" ref={storeSearchContainerRef}>
                                    <label htmlFor="store-search" className="block text-sm font-medium leading-6 text-gray-900">
                                        Store <span className="text-red-500">*</span>
                                    </label>
                                    <div className="mt-2 flex rounded-md shadow-sm">
                                        <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                            <input
                                                type="text"
                                                name="store-search"
                                                id="store-search"
                                                ref={storeSearchInputRef}
                                                placeholder="Search store by name..."
                                                value={storeSearchQuery} // Controlled by storeSearchQuery state
                                                onChange={(e) => {
                                                    setStoreSearchQuery(e.target.value);
                                                    if (!e.target.value.trim()) { // If cleared, reset store_id
                                                        setData('store_id', null);
                                                        setData('store_name', '');
                                                    }
                                                }}
                                                onFocus={() => storeSearchQuery.trim() && setShowStoreDropdown(true)}
                                                className={`block w-full rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ${errors.store_id ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                                                autoComplete="off"
                                            />
                                            {isStoreSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                            {storeSearchQuery && !isStoreSearchLoading && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setStoreSearchQuery('');
                                                        setData('store_id', null);
                                                        setData('store_name', '');
                                                        setStoreSearchResults([]);
                                                        setShowStoreDropdown(false);
                                                        storeSearchInputRef.current?.focus();
                                                    }}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    title="Clear store search"
                                                >
                                                    <FontAwesomeIcon icon={faTimesCircle} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {errors.store_id && <p className="mt-1 text-sm text-red-600">{errors.store_id}</p>}
                                    {showStoreDropdown && storeSearchQuery.trim() && (
                                        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {storeSearchResults.length > 0 ? (
                                                storeSearchResults.map((store) => (
                                                    <li
                                                        key={store.id}
                                                        className="p-3 hover:bg-indigo-50 cursor-pointer text-sm"
                                                        onClick={() => handleSelectStore(store)}
                                                    >
                                                        {store.name}
                                                    </li>
                                                ))
                                            ) : !isStoreSearchLoading && (
                                                <li className="p-3 text-sm text-gray-500">No stores found matching "{storeSearchQuery}".</li>
                                            )}
                                            {isStoreSearchLoading && <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>}
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900">
                                        Description / Reason
                                    </label>
                                    <div className="mt-2">
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows="3"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${errors.description ? "ring-red-500" : ""}`}
                                            placeholder="e.g., Monthly stock count, Discrepancy check"
                                        />
                                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                                    </div>
                                </div>
                            </div>


                            {/* Item Search & Add */}
                            <div className="border-t border-gray-200 pt-6">
                                <label htmlFor="item-search" className="block text-sm font-medium leading-6 text-gray-900">
                                    Add Items to Count
                                </label>
                                <div className="relative" ref={itemSearchContainerRef}>
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
                                                autoComplete="off"
                                            />
                                            {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                            {itemSearchQuery && !isItemSearchLoading && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); itemSearchInputRef.current?.focus(); }}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    title="Clear item search"
                                                >
                                                    <FontAwesomeIcon icon={faTimesCircle} />
                                                </button>
                                            )}
                                        </div>
                                        {/* Add button is removed, selection from dropdown */}
                                    </div>
                                    {showItemDropdown && itemSearchQuery.trim() && (
                                        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {itemSearchResults.length > 0 ? (
                                                itemSearchResults.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="p-3 hover:bg-indigo-50 cursor-pointer text-sm"
                                                        onClick={() => addPhysicalInventoryItem(item)}
                                                    >
                                                        <div className="font-medium">{item.name}</div>
                                                        <div className="text-xs text-gray-500">Current Price: {formatCurrency(item.price)} / System Stock: {item.stock_quantity === null || typeof item.stock_quantity === 'undefined' ? 'N/A' : item.stock_quantity}</div>
                                                    </li>
                                                ))
                                            ) : !isItemSearchLoading && (
                                                <li className="p-3 text-sm text-gray-500">No items found matching "{itemSearchQuery}".</li>
                                            )}
                                            {isItemSearchLoading && <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>}
                                        </ul>
                                    )}
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
                                                        <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Expected Qty</th>
                                                        <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Counted Qty <span className="text-red-500">*</span></th>
                                                        <th scope="col" className="w-32 px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Unit Price</th>
                                                        <th scope="col" className="w-36 px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Counted Value</th>
                                                        <th scope="col" className="w-20 relative py-3.5 pl-3 pr-4 sm:pr-3 text-center"><span className="sr-only">Remove</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {data.physicalinventoryitems.map((item, index) => (
                                                        <tr key={item._listId}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{item.item_name || 'N/A'}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input
                                                                    type="number"
                                                                    value={item.expectedqty}
                                                                    onChange={(e) => handlePhysicalInventoryItemChange(index, 'expectedqty', e.target.value)}
                                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                                                                    min="0"
                                                                    placeholder="0"
                                                                />
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input
                                                                    type="number"
                                                                    value={item.countedqty}
                                                                    onChange={(e) => handlePhysicalInventoryItemChange(index, 'countedqty', e.target.value)}
                                                                    className={`w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right ${errors[`physicalinventoryitems.${index}.countedqty`] ? 'border-red-500 ring-red-500' : 'border-gray-300'}`}
                                                                    min="0"
                                                                    placeholder="Enter count"
                                                                    required
                                                                />
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                                <input
                                                                    type="number"
                                                                    value={item.price}
                                                                    onChange={(e) => handlePhysicalInventoryItemChange(index, 'price', e.target.value)}
                                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-right"
                                                                    min="0"
                                                                    step="0.01"
                                                                    readOnly // Price usually from system, not editable during count
                                                                    title="Price is based on current item cost"
                                                                />
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">
                                                                {formatCurrency((parseFloat(item.countedqty) || 0) * (parseFloat(item.price) || 0))}
                                                            </td>
                                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => confirmRemovePhysicalInventoryItem(index)}
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
                                                        <th scope="row" colSpan="4" className="pl-4 pr-3 pt-3 text-right text-sm font-semibold text-gray-900 sm:pl-3">Total Counted Value</th>
                                                        <td className="pl-3 pr-4 pt-3 text-right text-sm font-semibold text-gray-900 sm:pr-3">{formatCurrency(data.total_counted_value)}</td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {errors.physicalinventoryitems && typeof errors.physicalinventoryitems === 'string' && (
                                <p className="mt-1 text-sm text-red-600">{errors.physicalinventoryitems}</p>
                            )}
                            {Object.keys(errors).some(key => key.startsWith('physicalinventoryitems.')) && (
                                <p className="mt-1 text-sm text-red-600">Please check item details for errors.</p>
                            )}


                            {/* Actions: Save, Cancel */}
                            <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-gray-200 pt-6">
                                <Link
                                    href={route('inventory3.physical-inventory.index')} // Adjust route as needed
                                    className="rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                                >
                                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                                    {processing ? 'Saving...' : 'Save Inventory Count'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* UI Feedback Modal */}
            <Modal
                isOpen={uiFeedbackModal.isOpen}
                onClose={() => setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null }))}
                onConfirm={() => {
                    if (uiFeedbackModal.onConfirmAction) {
                        uiFeedbackModal.onConfirmAction();
                    } else {
                        setUiFeedbackModal(prev => ({ ...prev, isOpen: false, itemIndexToRemove: null, onConfirmAction: null }));
                    }
                }}
                title={uiFeedbackModal.title}
                message={uiFeedbackModal.message}
                isAlert={uiFeedbackModal.isAlert}
                confirmButtonText={uiFeedbackModal.confirmText}
            />
        </AuthenticatedLayout>
    );
}