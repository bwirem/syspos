import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faCheck, faUserPlus, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
// No need to import this directly if FontAwesomeIcon component is used
// import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';
import InputField from '../../Components/CustomInputField.jsx'; // Assuming this handles errors well

// Utility function for debouncing (remains the same)
const debounce = (func, delay) => { /* ... */ };

// Helper for currency formatting
const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


export default function CreateOrder({ fromstore, auth, successMessage, errorMessage }) { // Renamed for clarity, added message props
    const { data, setData, post, errors, processing, reset, recentlySuccessful, clearErrors } = useForm({
        customer_name: '', // Will be populated by search or new customer
        customer_id: null,
        store_name: fromstore?.find(s => s.id === (auth?.user?.store_id || null))?.name || '', // Pre-fill store name if ID is set
        store_id: auth?.user?.store_id || null,
        pricecategory_name: '', // This could be derived if pricecategory_id is a simple ID
        pricecategory_id: auth?.user?.pricecategory_id || null,
        total: 0,
        stage: '1', // Default to Draft, ensure it's a string if select expects string
        orderitems: [],
    });

    const [orderItems, setOrderItems] = useState(data.orderitems);

    // Item Search
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // Customer Search
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
    const customerDropdownRef = useRef(null);
    const customerSearchInputRef = useRef(null);

    // New Customer Modal
    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ /* ... initial state ... */ });
    const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);
    const [newCustomerModalSuccess, setNewCustomerModalSuccess] = useState(false);
    const [newCustomerModalError, setNewCustomerModalError] = useState('');


    // Save/Submit Modals
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    // Using `processing` from useForm for modal loading state directly

    // Generic Alert Modal
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
    // Confirmation Modal for removing item
    const [confirmRemoveModal, setConfirmRemoveModal] = useState({ isOpen: false, itemIndex: null });


    // Error states from useForm.errors are preferred, but keeping these for direct validation feedback
    const [customerIDError, setCustomerIDError] = useState(null);
    const [storeIDError, setStoreIDError] = useState(null);
    const [pricecategoryIDError, setPricecategoryIDError] = useState(null);


    const [priceCategories, setPriceCategories] = useState([]);

    // --- DATA FETCHING ---
    useEffect(() => {
        axios.get(route('systemconfiguration0.pricecategories.viewactive'))
            .then(response => setPriceCategories(response.data.priceCategories || [])) // Ensure it's an array
            .catch(() => showAlert('Error', 'Failed to fetch price categories.'));
    }, []);

    const fetchItems = useCallback((query) => {
        if (!query.trim() || !data.pricecategory_id) { // Ensure price category is selected
            setItemSearchResults([]);
            setShowItemDropdown(false);
            return;
        }
        setIsItemSearchLoading(true);
        axios.get(route('systemconfiguration0.items.search'), {
            params: { query: query.trim(), pricecategory_id: data.pricecategory_id }
        })
        .then((response) => setItemSearchResults(response.data.items?.slice(0, 10) || [])) // Increased limit, ensure array
        .catch(() => showAlert('Error', 'Failed to fetch items.'))
        .finally(() => setIsItemSearchLoading(false));
    }, [data.pricecategory_id]);

    const fetchCustomers = useCallback((query) => {
        if (!query.trim()) {
            setCustomerSearchResults([]);
            setShowCustomerDropdown(false);
            return;
        }
        setIsCustomerSearchLoading(true);
        axios.get(route('systemconfiguration0.customers.search'), { params: { query } })
            .then((response) => setCustomerSearchResults(response.data.customers?.slice(0, 10) || [])) // Increased limit
            .catch(() => showAlert('Error', 'Failed to fetch customers.'))
            .finally(() => setIsCustomerSearchLoading(false));
    }, []);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 350), [fetchItems]);
    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 350), [fetchCustomers]);

    useEffect(() => { // Item search trigger
        if (itemSearchQuery.trim()) debouncedItemSearch(itemSearchQuery);
        else { setItemSearchResults([]); setShowItemDropdown(false); }
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => { // Customer search trigger
        if (customerSearchQuery.trim()) debouncedCustomerSearch(customerSearchQuery);
        else { setCustomerSearchResults([]); setShowCustomerDropdown(false); }
    }, [customerSearchQuery, debouncedCustomerSearch]);


    // --- FORM DATA & TOTAL CALCULATION ---
    useEffect(() => {
        setData('orderitems', orderItems);
        const calculatedTotal = orderItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0
        );
        setData('total', calculatedTotal);
    }, [orderItems]); // Removed setData from deps, it's stable

    // --- CLICK OUTSIDE HANDLERS ---
    const useClickOutside = (ref, callback) => {
        useEffect(() => {
            const handleClick = (event) => {
                if (ref.current && !ref.current.contains(event.target)) {
                    callback();
                }
            };
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }, [ref, callback]);
    };
    useClickOutside(itemDropdownRef, () => setShowItemDropdown(false));
    useClickOutside(customerDropdownRef, () => setShowCustomerDropdown(false));


    // --- ORDER ITEM MANAGEMENT ---
    const handleOrderItemChange = (index, field, value) => {
        const updatedItems = [...orderItems];
        const parsedValue = parseFloat(value);
        if (field === 'quantity') {
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue <= 0 ? 1 : parsedValue; // Default to 1 if invalid
        } else if (field === 'price') {
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setOrderItems(updatedItems);
    };

    const addOrderItem = (selectedItem = null) => {
        const newItem = selectedItem
            ? { item_name: selectedItem.name, item_id: selectedItem.id, quantity: 1, price: selectedItem.price || 0 }
            : { item_name: '', item_id: null, quantity: 1, price: 0 };
        setOrderItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if(itemSearchInputRef.current) itemSearchInputRef.current.focus(); // Focus back to search for next item
    };

    const confirmRemoveOrderItem = (index) => {
        setConfirmRemoveModal({ isOpen: true, itemIndex: index });
    };

    const handleRemoveItem = () => {
        if (confirmRemoveModal.itemIndex !== null) {
            const updatedItems = orderItems.filter((_, idx) => idx !== confirmRemoveModal.itemIndex);
            setOrderItems(updatedItems);
        }
        setConfirmRemoveModal({ isOpen: false, itemIndex: null });
    };


    // --- CUSTOMER MANAGEMENT ---
    const handleItemSearchChange = (e) => {
        setItemSearchQuery(e.target.value);
        setShowItemDropdown(!!e.target.value.trim() && !!data.pricecategory_id); // Only show if price category selected
        if (!data.pricecategory_id && e.target.value.trim()) {
            showAlert('Info', 'Please select a Price Category first to search items.');
        }
    };

    const handleClearItemSearch = () => { /* ... as before ... */ };
    const handleCustomerSearchChange = (e) => { /* ... as before, clear data.customer_id etc. ... */ };
    const handleClearCustomerSearch = () => { /* ... as before, clear data fields ... */ };

    const selectCustomer = (customer) => {
        setData(prev => ({
            ...prev,
            customer_id: customer.id,
            customer_name: customer.customer_type === 'company' ? customer.company_name : `${customer.first_name} ${customer.surname}`,
            // Optionally prefill more details if needed, or just store ID and name
        }));
        setCustomerSearchQuery(data.customer_name); // Show selected customer in search bar
        setShowCustomerDropdown(false);
        setCustomerSearchResults([]);
        setCustomerIDError(null); // Clear error on selection
    };

    const openNewCustomerModal = () => {
        setNewCustomerModalOpen(true);
        setNewCustomerModalSuccess(false);
        setNewCustomerModalError('');
        setNewCustomer({ customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' });
    };
    const closeNewCustomerModal = () => setNewCustomerModalOpen(false);

    const handleNewCustomerInputChange = (e) => { /* ... as before ... */ };

    const confirmNewCustomer = async () => {
        setNewCustomerModalLoading(true);
        setNewCustomerModalError('');
        try {
            const response = await axios.post(route('systemconfiguration0.customers.directstore'), newCustomer);
            if (response.data?.customer) { // Assuming backend returns customer object
                selectCustomer(response.data.customer); // Use selectCustomer to populate form
                setNewCustomerModalSuccess(true);
                setTimeout(() => {
                    closeNewCustomerModal();
                    setNewCustomerModalSuccess(false);
                }, 1500);
            } else {
                setNewCustomerModalError(response.data?.message || 'Error creating customer.');
            }
        } catch (error) {
            setNewCustomerModalError(error.response?.data?.message || 'Failed to create customer. Please try again.');
        } finally {
            setNewCustomerModalLoading(false);
        }
    };


    // --- FORM VALIDATION & SUBMISSION ---
    const validateForm = () => {
        clearErrors(); // Clear previous Inertia errors
        let isValid = true;
        if (!data.customer_id) { setCustomerIDError('Please select or create a customer.'); isValid = false; } else { setCustomerIDError(null); }
        if (!data.store_id) { setStoreIDError('Please select a store.'); isValid = false; } else { setStoreIDError(null); }
        if (!data.pricecategory_id) { setPricecategoryIDError('Please select a price category.'); isValid = false; } else { setPricecategoryIDError(null); }

        if (!orderItems.length) {
            showAlert('Validation Error', 'Please add at least one item to the order.');
            isValid = false;
        } else {
            const hasInvalidItem = orderItems.some(item => !item.item_id || (item.quantity <= 0 && item.price !== 0) || item.price < 0);
            if (hasInvalidItem) {
                showAlert('Validation Error', 'Ensure all items have valid details, quantity > 0 (unless price is 0), and price >= 0.');
                isValid = false;
            }
        }
        return isValid;
    };

    const handleSave = () => {
        if (!validateForm()) return;
        setSaveModalOpen(true);
    };

    const confirmSave = () => {
        // data.stage is already set via select in modal
        post(route('billing0.store'), {
            onSuccess: () => {
                setSaveModalOpen(false);
                showAlert('Success', 'Order saved successfully as ' + (data.stage === '1' ? 'Draft!' : 'Quotation!'));
                reset(); // Reset form data, including orderItems via useEffect
                setOrderItems([]); // Explicitly clear orderItems state
            },
            onError: () => showAlert('Error', 'Failed to save order. Check errors below form fields.'),
            onFinish: () => setSaveModalOpen(false), // Close modal regardless of outcome if not handled by success/error
        });
    };

    const handleSubmitOrder = () => {
        if (!validateForm()) return;
        setData('stage', '3'); // Mark for submission
        setSubmitModalOpen(true);
    };

    const confirmSubmitOrder = () => {
        post(route('billing0.store'), {
            onSuccess: () => {
                setSubmitModalOpen(false);
                showAlert('Success', 'Order submitted successfully!');
                reset();
                setOrderItems([]);
            },
            onError: () => showAlert('Error', 'Failed to submit order. Check errors below form fields.'),
            onFinish: () => setSubmitModalOpen(false),
        });
    };


    // --- ALERT MODAL ---
    const showAlert = (title, message) => {
        setAlertModal({ isOpen: true, title, message });
    };


    // --- UI RENDER ---
    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user if AuthenticatedLayout needs it
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">New Sales Order</h2>}
        >
            <Head title="Create Sales Order" />

            {/* Global Success/Error Messages from Flash */}
            {successMessage && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {errorMessage}
                </div>
            )}

            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8"> {/* Reduced max-width for better focus */}
                    <div className="bg-white dark:bg-gray-800 p-6 shadow-xl sm:rounded-lg">
                        <form className="space-y-6">
                            {/* Section 1: Customer & Order Details */}
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Customer & Order Setup</h3>
                                {/* Customer Search & New Button */}
                                <div className="mb-4">
                                    <label htmlFor="customer_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Select or Create Customer
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <div className="relative flex-grow" ref={customerDropdownRef}>
                                            <input
                                                id="customer_search"
                                                type="text"
                                                placeholder="Search customer by name or company..."
                                                value={customerSearchQuery}
                                                onChange={(e) => { setCustomerSearchQuery(e.target.value); setShowCustomerDropdown(!!e.target.value.trim()); setData('customer_id', null); setCustomerIDError(null); /* Clear selection on new search */ }}
                                                onFocus={() => setShowCustomerDropdown(!!customerSearchQuery.trim())}
                                                className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.customer_id || customerIDError ? 'border-red-500' : 'border-gray-300'}`}
                                                ref={customerSearchInputRef}
                                                autoComplete="off"
                                            />
                                            {isCustomerSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />}
                                            {showCustomerDropdown && (
                                                <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {customerSearchResults.length > 0 ? (
                                                        customerSearchResults.map((c) => (
                                                            <li key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                                                                {c.customer_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.surname || ''}`} ({c.phone || c.email || 'No Contact'})
                                                            </li>
                                                        ))
                                                    ) : (
                                                        !isCustomerSearchLoading && <li className="p-2 text-gray-500 dark:text-gray-400 text-sm">No customers found. Type to search.</li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                        <button type="button" onClick={openNewCustomerModal} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm flex items-center whitespace-nowrap">
                                            <FontAwesomeIcon icon={faUserPlus} className="mr-2" /> New
                                        </button>
                                    </div>
                                    {(errors.customer_id || customerIDError) && <p className="text-xs text-red-500 mt-1">{errors.customer_id || customerIDError}</p>}
                                    {data.customer_id && (
                                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-sm">
                                            Selected: <strong className="text-gray-700 dark:text-gray-100">{data.customer_name}</strong> (ID: {data.customer_id})
                                        </div>
                                    )}
                                </div>

                                {/* Store & Price Category */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                                        <select id="store_id" value={data.store_id || ''} onChange={(e) => { setData("store_id", e.target.value); setStoreIDError(null); }}
                                            className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.store_id || storeIDError ? 'border-red-500' : 'border-gray-300'}`}
                                        >
                                            <option value="" disabled>Select Store...</option>
                                            {fromstore.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        {(errors.store_id || storeIDError) && <p className="text-xs text-red-500 mt-1">{errors.store_id || storeIDError}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="pricecategory_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Category</label>
                                        <select id="pricecategory_id" value={data.pricecategory_id || ''} onChange={(e) => { setData("pricecategory_id", e.target.value); setPricecategoryIDError(null); setItemSearchQuery(''); setItemSearchResults([]); /* Reset items on price change */ }}
                                            className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.pricecategory_id || pricecategoryIDError ? 'border-red-500' : 'border-gray-300'}`}
                                        >
                                            <option value="" disabled>Select Price Category...</option>
                                            {priceCategories.map(pc => <option key={pc.pricename} value={pc.pricename}>{pc.pricedescription}</option>)}
                                        </select>
                                        {(errors.pricecategory_id || pricecategoryIDError) && <p className="text-xs text-red-500 mt-1">{errors.pricecategory_id || pricecategoryIDError}</p>}
                                    </div>
                                </div>
                                
                            </section>

                            {/* Section 2: Order Items */}
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Items</h3>
                                <div className="mb-4">
                                    <label htmlFor="item_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Item to Order</label>
                                    <div className="relative flex-grow" ref={itemDropdownRef}>
                                        <input
                                            id="item_search"
                                            type="text"
                                            placeholder="Search item by name or code..."
                                            value={itemSearchQuery}
                                            onChange={handleItemSearchChange}
                                            onFocus={() => setShowItemDropdown(!!itemSearchQuery.trim() && !!data.pricecategory_id)}
                                            className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 border-gray-300"
                                            ref={itemSearchInputRef}
                                            disabled={!data.pricecategory_id} // Disable if no price category
                                        />
                                        {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />}
                                         {showItemDropdown && (
                                            <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {itemSearchResults.length > 0 ? (
                                                    itemSearchResults.map((item) => (
                                                        <li key={item.id} onClick={() => addOrderItem(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                                                            {item.name} <span className="text-xs text-gray-500 dark:text-gray-400">(TZS {formatCurrency(item.price)})</span>
                                                        </li>
                                                    ))
                                                ) : (
                                                    !isItemSearchLoading && <li className="p-2 text-gray-500 dark:text-gray-400 text-sm">No items found for selected price category.</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                     {!data.pricecategory_id && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Select a Price Category to enable item search.</p>}
                                </div>

                                {/* Items Table */}
                                {orderItems.length > 0 && (
                                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Item</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32">Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32">Subtotal</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {orderItems.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{item.item_name} <span className="text-xs text-gray-400">(ID: {item.item_id})</span></td>
                                                        <td className="px-1 py-1">
                                                            <InputField id={`qty_${index}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)} className="w-full text-right text-sm" error={errors[`orderitems.${index}.quantity`]} />
                                                        </td>
                                                        <td className="px-1 py-1">
                                                            <InputField id={`price_${index}`} type="number" min="0" step="0.01" value={item.price} onChange={(e) => handleOrderItemChange(index, 'price', e.target.value)} className="w-full text-right text-sm" error={errors[`orderitems.${index}.price`]}/>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.quantity * item.price)}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button type="button" onClick={() => confirmRemoveOrderItem(index)} className="text-red-500 hover:text-red-700">
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {errors.orderitems && typeof errors.orderitems === 'string' && <p className="text-xs text-red-500 mt-1">{errors.orderitems}</p>}


                                {/* Order Total */}
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                    <div className="w-full md:w-1/3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Total</label>
                                        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-right">
                                            TZS {formatCurrency(data.total)}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Actions */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={route('billing0.index')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm flex items-center">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> Cancel
                                </Link>
                                <button type="button" onClick={handleSave} disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center">
                                    <FontAwesomeIcon icon={processing ? faSpinner : faSave} spin={processing} className="mr-2" /> Save
                                </button>
                                <button type="button" onClick={handleSubmitOrder} disabled={processing}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center">
                                    <FontAwesomeIcon icon={processing ? faSpinner : faCheck} spin={processing} className="mr-2" /> Submit Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={newCustomerModalOpen} onClose={closeNewCustomerModal} onConfirm={confirmNewCustomer} title="Create New Customer"
                confirmButtonText={newCustomerModalLoading ? "Saving..." : (newCustomerModalSuccess ? "Saved!" : "Create Customer")}
                confirmButtonDisabled={newCustomerModalLoading || newCustomerModalSuccess}
                confirmButtonClassName={newCustomerModalSuccess ? "bg-green-500 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"}
            >
                {/* ... New Customer Form from previous example, ensure inputs are styled consistently ... */}
                 {newCustomerModalError && <p className="text-sm text-red-500 mb-3">{newCustomerModalError}</p>}
                 {/* Form fields... */}
            </Modal>

            <Modal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} onConfirm={confirmSave} title="Confirm Save Order"
                confirmButtonText={processing ? "Saving..." : "Confirm Save"} confirmButtonDisabled={processing}
            >
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select how you want to save this order:</p>
                <select id="stage_save" value={data.stage} onChange={(e) => setData('stage', e.target.value)}
                    className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 border-gray-300"
                >
                    <option value="1">Save as Draft</option>
                    <option value="2">Save as Quotation</option>
                </select>
                {errors.stage && <p className="text-xs text-red-500 mt-1">{errors.stage}</p>}
            </Modal>

            <Modal isOpen={submitModalOpen} onClose={() => setSubmitModalOpen(false)} onConfirm={confirmSubmitOrder} title="Confirm Submit Order"
                confirmButtonText={processing ? "Submitting..." : "Confirm Submit"} confirmButtonDisabled={processing}
            >
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Are you sure you want to submit this order for <strong>{data.customer_name || "the selected customer"}</strong>? This will finalize the order.
                </p>
            </Modal>

            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal({ ...alertModal, isOpen: false })} title={alertModal.title || "Alert"} isAlert>
                <p className="text-sm text-gray-600 dark:text-gray-300">{alertModal.message}</p>
            </Modal>

            <Modal isOpen={confirmRemoveModal.isOpen} onClose={() => setConfirmRemoveModal({ ...confirmRemoveModal, isOpen: false })} onConfirm={handleRemoveItem} title="Remove Item"
                confirmButtonText="Remove" confirmButtonClassName="bg-red-600 hover:bg-red-700"
            >
                <p className="text-sm text-gray-600 dark:text-gray-300">Are you sure you want to remove this item from the order?</p>
            </Modal>

        </AuthenticatedLayout>
    );
}