import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react'; // Import router
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faMoneyBill, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
// import { Inertia } from '@inertiajs/inertia'; // router is preferred
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';
import InputField from '../../Components/CustomInputField.jsx';

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function Edit({ order, fromstore, auth, priceCategories: initialPriceCategories, paymentTypes: initialPaymentTypes }) {
    // Ensure order items have a client-side unique key if they don't have 'id' yet or for new items
    const initializeOrderItems = (items) => {
        return items.map((item, index) => ({
            ...item,
            // The 'id' here is the BILOrderItem.id if it exists from the backend
            // 'item_id' is the master Item's ID.
            // 'item_name' is for display convenience.
            item_name: item.item?.name || item.item_name || 'Unknown Item', // Ensure item_name
            clientKey: item.id || `new-${Date.now()}-${index}`, // For React list keys
        }));
    };


    const { data, setData, put, errors, processing, reset } = useForm({
        // Customer details might not be directly editable in the order form,
        // but customer_id is key.
        customer_id: order.customer_id,
        customer_name: order.customer?.company_name || `${order.customer?.first_name || ''} ${order.customer?.surname || ''}`.trim(),
        customer_type: order.customer?.customer_type,
        first_name: order.customer?.first_name || '', // For display or if customer search replaces
        other_names: order.customer?.other_names || '',
        surname: order.customer?.surname || '',
        company_name: order.customer?.company_name || '',
        email: order.customer?.email || '',
        phone: order.customer?.phone || '',

        store_id: order.store_id,
        pricecategory_id: order.pricecategory_id || auth?.user?.pricecategory_id || null, // Use order's or user default
        total: parseFloat(order.total) || 0,
        stage: order.stage,
        // orderitems are handled by local state `orderItems` and then synced to `data.orderitems`
    });

    // Local state for managing items in the UI table, initialized from the prop
    const [orderItems, setOrderItems] = useState(() => initializeOrderItems(order.orderitems || []));

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
    const customerDropdownRef = useRef(null);
    const customerSearchInputRef = useRef(null);
    const [customerIDError, setCustomerIDError] = useState(null);

    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalLoading, setSaveModalLoading] = useState(false);
    const [saveModalSuccess, setSaveModalSuccess] = useState(false);

    const [storeIDError, setStoreIDError] = useState(null);
    const [pricecategoryIDError, setPricecategoryIDError] = useState(null);

    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState(initialPaymentTypes || []); // Initialize from prop
    const [amountDisplay, setAmountDisplay] = useState('0');
    const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
    const [priceCategories, setPriceCategories] = useState(initialPriceCategories || []); // Initialize from prop


    // useForm for Payment Modal
    const {
        data: paymentFormData,
        setData: setPaymentFormData,
        post: postPaymentToBackend, // Renamed to avoid conflict if `put` is also used from main form
        processing: paymentProcessing,
        errors: paymentServerErrors,
        reset: resetPaymentForm,
        clearErrors: clearPaymentServerErrors,
    } = useForm({
        sale_type: 'cash',
        payment_method: auth?.user?.paymenttype_id || '',
        paid_amount: '',
        customer_id: order.customer_id, // Pre-fill from current order
        store_id: order.store_id,       // Pre-fill
        stage: order.stage,             // Current stage
        total: parseFloat(order.total) || 0, // Current total
        orderitems: [], // Will be populated from `orderItems` state
    });


    const fetchItems = useCallback((query) => {
        if (!query.trim() || !data.pricecategory_id) {
            setItemSearchResults([]); return;
        }
        setIsItemSearchLoading(true);
        axios.get(route('systemconfiguration0.items.search'), { params: { query: query.trim(), pricecategory_id: data.pricecategory_id } })
            .then((response) => setItemSearchResults(response.data.items?.slice(0, 10) || []))
            .catch(() => showAlert('Failed to fetch items.'))
            .finally(() => setIsItemSearchLoading(false));
    }, [data.pricecategory_id]);

    const fetchCustomers = useCallback((query) => {
        if (!query.trim()) {
            setCustomerSearchResults([]); return;
        }
        setIsCustomerSearchLoading(true);
        axios.get(route('systemconfiguration0.customers.search'), { params: { query } })
            .then((response) => setCustomerSearchResults(response.data.customers?.slice(0, 10) || []))
            .catch(() => showAlert('Failed to fetch customers.'))
            .finally(() => setIsCustomerSearchLoading(false));
    }, []);

    const fetchPaymentMethodsAPI = useCallback(async () => {
        if (initialPaymentTypes && initialPaymentTypes.length > 0) return; // Already have them
        setPaymentMethodsLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration0.paymenttypes.search'));
            if (response.data && Array.isArray(response.data.paymenttype)) {
                setPaymentMethods(response.data.paymenttype);
                 const userDefaultPM = auth?.user?.paymenttype_id;
                const defaultExists = response.data.paymenttype.some(pm => pm.id === userDefaultPM);
                if (userDefaultPM && defaultExists && !paymentFormData.payment_method) {
                    setPaymentFormData('payment_method', userDefaultPM );
                }
            } else {
                showAlert('Failed to fetch payment methods (invalid format).');
            }
        } catch (error) { showAlert('Failed to fetch payment methods.'); }
        finally { setPaymentMethodsLoading(false); }
    }, [auth?.user?.paymenttype_id, initialPaymentTypes, paymentFormData.payment_method, setPaymentFormData]);

    const fetchPriceCategoriesAPI = useCallback(async () => {
        if (initialPriceCategories && initialPriceCategories.length > 0) return; // Already have them
        try {
            const response = await axios.get(route('systemconfiguration0.pricecategories.viewactive'));
            if (response.data && Array.isArray(response.data.priceCategories)) {
                 setPriceCategories(response.data.priceCategories);
            } else {
                 showAlert('Failed to fetch price categories (invalid format).');
            }
        } catch (error) { showAlert('Failed to fetch price categories.');}
    }, [initialPriceCategories]);


    useEffect(() => { fetchPriceCategoriesAPI(); }, [fetchPriceCategoriesAPI]);
    useEffect(() => { fetchPaymentMethodsAPI(); }, [fetchPaymentMethodsAPI]);


    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 300), [fetchCustomers]);

    useEffect(() => { itemSearchQuery.trim() ? debouncedItemSearch(itemSearchQuery) : setItemSearchResults([]); }, [itemSearchQuery, debouncedItemSearch]);
    useEffect(() => { customerSearchQuery.trim() ? debouncedCustomerSearch(customerSearchQuery) : setCustomerSearchResults([]); }, [customerSearchQuery, debouncedCustomerSearch]);

    useEffect(() => {
        // Sync local orderItems to main form data for submission
        setData('orderitems', orderItems.map(item => ({
            id: item.id, // This is the BILOrderItem.id, crucial for backend to identify existing items
            item_id: item.item_id,
            quantity: parseFloat(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
        })));
        const calculatedTotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);
        setData('total', calculatedTotal);
    }, [orderItems, setData]);


    useEffect(() => {
        const handleClickOutside = (event, ref, setter) => { if (ref.current && !ref.current.contains(event.target)) setter(false); };
        const itemListener = (e) => handleClickOutside(e, itemDropdownRef, setShowItemDropdown);
        const customerListener = (e) => handleClickOutside(e, customerDropdownRef, setShowCustomerDropdown);
        document.addEventListener('mousedown', itemListener);
        document.addEventListener('mousedown', customerListener);
        return () => {
            document.removeEventListener('mousedown', itemListener);
            document.removeEventListener('mousedown', customerListener);
        };
    }, []);

    const handleOrderItemChange = (index, field, value) => {
        const updatedItems = orderItems.map((item, i) => {
            if (i === index) {
                let val = value;
                if (field === 'quantity' || field === 'price') {
                    val = parseFloat(value) || 0;
                    if (val < 0) val = 0;
                }
                return { ...item, [field]: val };
            }
            return item;
        });
        setOrderItems(updatedItems);
    };

    const addOrderItem = (selectedItem = null) => {
        if (!selectedItem) return;
        const newItem = {
            clientKey: `new-${Date.now()}-${orderItems.length}`, // Unique key for new item
            // id: undefined, // New items don't have a DB ID yet
            item_id: selectedItem.id,
            item_name: selectedItem.name,
            quantity: 1,
            price: selectedItem.price,
            item: selectedItem, // Store full item object for display if needed
        };
        setOrderItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
    };

    const removeOrderItem = (index) => {
        const itemToRemove = orderItems[index];
        setModalState({ isOpen: true, message: `Remove "${itemToRemove.item_name}"?`, isAlert: false, itemToRemoveIndex: index });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            setOrderItems(orderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex));
        }
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };

    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    const showAlert = (message) => setModalState({ isOpen: true, message: message, isAlert: true, itemToRemoveIndex: null });
    const isValidInteger = (value) => value !== null && value !== '' && !isNaN(value) && Number.isInteger(Number(value));

    const handleItemSearchChange = (e) => { setItemSearchQuery(e.target.value); setShowItemDropdown(!!e.target.value.trim() && !!data.pricecategory_id); };

    const handleCustomerSearchChange = (e) => {
        const query = e.target.value; setCustomerSearchQuery(query); setShowCustomerDropdown(!!query.trim());
        if (!query.trim()) { // If search cleared, reset customer fields in form but keep original ID as fallback
            setData(prev => ({...prev, customer_id: order.customer_id, customer_name: order.customer?.company_name || `${order.customer?.first_name || ''} ${order.customer?.surname || ''}`.trim()}));
        }
    };
    const selectCustomer = (c) => {
        setData(prev => ({
            ...prev, customer_id: c.id, customer_name: c.customer_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.surname || ''}`.trim(),
            customer_type: c.customer_type, first_name: c.first_name || '', other_names: c.other_names || '', surname: c.surname || '',
            company_name: c.company_name || '', email: c.email, phone: c.phone || '',
        }));
        setCustomerSearchQuery(''); setShowCustomerDropdown(false); setCustomerIDError(null);
    };

    const validateMainForm = () => {
        let isValid = true;
        if (!isValidInteger(data.customer_id)) { setCustomerIDError('Customer is required.'); isValid = false; } else { setCustomerIDError(null); }
        if (!isValidInteger(data.store_id)) { setStoreIDError('Store is required.'); isValid = false; } else { setStoreIDError(null); }
        if (!data.pricecategory_id) { setPricecategoryIDError('Price category is required.'); isValid = false; } else { setPricecategoryIDError(null); }
        if (orderItems.length === 0) { showAlert('Add at least one item.'); isValid = false; }
        else {
            const hasInvalid = orderItems.some(it => !it.item_id || (parseFloat(it.quantity)||0) <= 0 || (parseFloat(it.price)||0) < 0);
            if (hasInvalid) { showAlert('All items need valid details (qty > 0, price >= 0).'); isValid = false; }
        }
        return isValid;
    };

    const handlePayBillsClick = () => {
        if (!validateMainForm()) return;

        setPaymentFormData({
            sale_type: 'cash',
            payment_method: paymentFormData.payment_method || auth?.user?.paymenttype_id || (paymentMethods.length > 0 ? paymentMethods[0].id : ''),
            paid_amount: '',
            customer_id: data.customer_id,
            store_id: data.store_id,
            stage: data.stage,
            total: data.total,
            orderitems: orderItems.map(item => ({
                id: item.id, // BILOrderItem.id
                item_id: item.item_id,
                quantity: parseFloat(item.quantity),
                price: parseFloat(item.price),
            })),
        });
        setAmountDisplay('0');
        clearPaymentServerErrors();
        setPaymentModalOpen(true);
    };

    const handlePaymentModalClose = () => {
        setPaymentModalOpen(false);
        resetPaymentForm('sale_type', 'payment_method', 'paid_amount');
        setAmountDisplay('0');
    };

    const handlePaymentModalConfirm = () => {
        const paidAmountValue = parseFloat(paymentFormData.paid_amount);
        if (!paymentFormData.sale_type) { showAlert('Sale type is required.'); return; }
        if (paymentFormData.sale_type !== "credit" && !paymentFormData.payment_method) { showAlert('Payment method is required.'); return; }
        if (paymentFormData.sale_type !== "credit" && (isNaN(paidAmountValue) || paidAmountValue < 0)) { showAlert('Valid non-negative paid amount is required.'); return; }
        if (paymentFormData.sale_type === "cash" && paidAmountValue < paymentFormData.total) { showAlert('For cash sale, paid amount must be equal to total due.'); return; }
        if (paymentFormData.sale_type === "partial" && paidAmountValue >= paymentFormData.total) { showAlert('For partial sale, paid amount must be less than total due.'); return; }


        const payloadToSend = {
            customer_id: paymentFormData.customer_id,
            store_id: paymentFormData.store_id,
            stage: paymentFormData.stage,
            total: paymentFormData.total,
            orderitems: paymentFormData.orderitems, // Includes 'id' for existing BILOrderItems
            sale_type: paymentFormData.sale_type,
            payment_method: paymentFormData.sale_type !== "credit" ? (parseInt(paymentFormData.payment_method) || null) : null,
            paid_amount: paymentFormData.sale_type !== "credit" ? paidAmountValue : 0,
        };
        
        // Use POST to the `pay` route, but pass the order ID in the route
        // The backend `pay` function's `$orderId` parameter will pick this up.
        postPaymentToBackend(route('billing1.pay', { order: order.id }), { // Note: Using POST to common 'pay' route with ID
            data: payloadToSend,
            // _method: 'PUT', // If your 'pay' route for updates specifically expects PUT, uncomment this.
                            // Otherwise, if your backend `pay` function handles POST with an $orderId for updates, this is fine.
            preserveScroll: true,
            preserveState: (page) => Object.keys(page.props.errors).length > 0,
            onSuccess: () => {
                setPaymentModalOpen(false);
                // Don't reset main form here, user might want to make further edits or see updated state
                // If redirecting, that will refresh data. If staying, update local state if needed.
                showAlert('Payment processed successfully!');
                // Optionally, refresh the order data or redirect
                setTimeout(() => router.visit(route('billing1.index')), 1500); // Or to order's show page
            },
            onError: (errors) => {
                console.error('Payment update failed:', errors);
                showAlert(`Payment update failed:\n${Object.values(errors).join('\n')}`);
            },
        });
    };

    const handlePaidAmountInModalChange = (e) => {
        const value = e.target.value;
        setPaymentFormData('paid_amount', value);
        setAmountDisplay(formatCurrency(parseFloat(value) || 0));
    };

    const handleSaveClick = () => {
        if (!validateMainForm()) return;
        setSaveModalOpen(true);
        setSaveModalLoading(false);
        setSaveModalSuccess(false);
    };
    const handleSaveModalClose = () => { setSaveModalOpen(false); setSaveModalLoading(false); setSaveModalSuccess(false); };

    const handleSaveModalConfirm = () => {
        setSaveModalLoading(true);
        // `data` from main useForm includes `data.orderitems` which are now properly structured with `id`
        put(route('billing1.update', order.id), { // Main form's `put` method
            // `data` is automatically sent.
            onSuccess: () => {
                setSaveModalLoading(false); setSaveModalSuccess(true);
                // reset(); // Might not want to reset if user expects to see saved data.
                // A redirect or explicit data refresh might be better.
                setTimeout(() => { handleSaveModalClose(); showAlert('Order updated successfully!'); router.reload({ only: ['order'] }); }, 1000);
            },
            onError: (formErrors) => {
                setSaveModalLoading(false);
                showAlert(`Failed to update order:\n${Object.values(formErrors).join('\n')}`);
            },
        });
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Edit Order #{order.id}</h2>}
        >
            <Head title={`Edit Order #${order.id}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Customer & Order Setup</h3>
                                <div className="mb-4">
                                    <label htmlFor="customer_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Customer (Currently: {data.customer_name || 'N/A'})
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <div className="relative flex-grow" ref={customerDropdownRef}>
                                            <input
                                                type="text" placeholder="Search to change customer..." value={customerSearchQuery}
                                                onChange={handleCustomerSearchChange} onFocus={() => setShowCustomerDropdown(!!customerSearchQuery.trim())}
                                                className={`w-full border p-2 rounded text-sm pr-10 dark:bg-gray-700 dark:text-gray-200 ${customerIDError || errors.customer_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                ref={customerSearchInputRef} autoComplete="off"
                                            />
                                           {isCustomerSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />}
                                            {showCustomerDropdown && (
                                                <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {customerSearchResults.length > 0 ? customerSearchResults.map((c) => (
                                                        <li key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                                                            {c.customer_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.surname || ''}`} ({c.phone || c.email || 'No Contact'})
                                                        </li>
                                                    )) : !isCustomerSearchLoading && <li className="p-2 text-gray-500 dark:text-gray-400 text-sm">No customers found.</li>}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    {(errors.customer_id || customerIDError) && <p className="text-xs text-red-500 mt-1">{errors.customer_id || customerIDError}</p>}
                                     {data.customer_id && data.customer_id !== order.customer_id && <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-700/50 rounded-md border border-yellow-200 dark:border-yellow-600 text-sm text-yellow-700 dark:text-yellow-300">Changed to: <strong>{data.customer_name}</strong></div>}

                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                                        <select id="store_id" value={data.store_id || ''} onChange={(e) => { setData("store_id", e.target.value); setStoreIDError(null); }}
                                            className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.store_id || storeIDError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                        >
                                            <option value="" disabled>Select Store...</option>
                                            {fromstore.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        {(errors.store_id || storeIDError) && <p className="text-xs text-red-500 mt-1">{errors.store_id || storeIDError}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="pricecategory_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Category</label>
                                        <select id="pricecategory_id" value={data.pricecategory_id || ''} onChange={(e) => { setData("pricecategory_id", e.target.value); setPricecategoryIDError(null); setItemSearchQuery(''); setItemSearchResults([]); /* setOrderItems([]); // Decide if changing price category clears items */ }}
                                            className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.pricecategory_id || pricecategoryIDError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                        >
                                            <option value="" disabled>Select Price Category...</option>
                                            {priceCategories.map(pc => <option key={pc.pricename} value={pc.pricename}>{pc.pricedescription}</option>)}
                                        </select>
                                        {(errors.pricecategory_id || pricecategoryIDError) && <p className="text-xs text-red-500 mt-1">{errors.pricecategory_id || pricecategoryIDError}</p>}
                                    </div>
                                </div>
                            </section>

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Items</h3>
                                <div className="mb-4">
                                    <label htmlFor="item_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Item to Order</label>
                                    <div className="relative flex-grow" ref={itemDropdownRef}>
                                        <input id="item_search" type="text" placeholder="Search item by name or code..." value={itemSearchQuery} onChange={handleItemSearchChange}
                                            onFocus={() => setShowItemDropdown(!!itemSearchQuery.trim() && !!data.pricecategory_id)} disabled={!data.pricecategory_id} ref={itemSearchInputRef}
                                            className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-700/50 border-gray-300 dark:border-gray-600"
                                        />
                                        {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />}
                                        {showItemDropdown && (
                                            <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {itemSearchResults.length > 0 ? itemSearchResults.map((item) => (
                                                    <li key={item.id} onClick={() => addOrderItem(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                                                        {item.name} <span className="text-xs text-gray-500 dark:text-gray-400">(TZS {formatCurrency(item.price)})</span>
                                                    </li>
                                                )) : !isItemSearchLoading && <li className="p-2 text-gray-500 dark:text-gray-400 text-sm">No items found.</li>}
                                            </ul>
                                        )}
                                    </div>
                                    {!data.pricecategory_id && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Select a Price Category to search items.</p>}
                                </div>

                                {orderItems.length > 0 && (
                                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">Subtotal</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {orderItems.map((item, index) => (
                                                    <tr key={item.clientKey || item.id || index}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{item.item_name}</td>
                                                        <td className="px-1 py-1"><InputField id={`qty_${index}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)} className="w-full text-right text-sm dark:bg-gray-700 dark:text-gray-200" error={errors[`orderitems.${index}.quantity`]} /></td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.price)}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.quantity * item.price)}</td>
                                                        <td className="px-4 py-2 text-center"><button type="button" onClick={() => removeOrderItem(index)} className="text-red-500 hover:text-red-700"><FontAwesomeIcon icon={faTrash} /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {/* Display errors for orderitems array itself or specific item errors */}
                                {errors.orderitems && typeof errors.orderitems === 'string' && <p className="text-xs text-red-500 mt-1">{errors.orderitems}</p>}
                                {errors.orderitems && typeof errors.orderitems === 'object' && Object.keys(errors.orderitems).map(key => (
                                    !isNaN(parseInt(key)) && errors.orderitems[key] && typeof errors.orderitems[key] === 'object' ?
                                    Object.values(errors.orderitems[key]).map((err, i) => <p key={`${key}-${i}`} className="text-xs text-red-500 mt-1">Item {parseInt(key)+1}: {err}</p>)
                                    : null
                                ))}


                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                    <div className="w-full md:w-1/3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Total</label>
                                        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md text-right">TZS {formatCurrency(data.total)}</div>
                                    </div>
                                </div>
                            </section>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={route('billing1.index')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm flex items-center"><FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> Close</Link>
                                <button type="button" onClick={handleSaveClick} disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center"><FontAwesomeIcon icon={processing ? faSpinner : faSave} spin={processing} className="mr-2" /> Save Changes</button>
                                {order.stage < 5 && // Only show Pay Bills if not already fully paid (stage 5)
                                    <button type="button" onClick={handlePayBillsClick} disabled={processing || paymentProcessing} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center"><FontAwesomeIcon icon={paymentProcessing ? faSpinner : faMoneyBill} spin={paymentProcessing} className="mr-2" /> Pay Bills</button>
                                }
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title={modalState.isAlert ? "Alert" : "Confirm Action"} message={modalState.message} isAlert={modalState.isAlert} />

            <Modal isOpen={saveModalOpen} onClose={handleSaveModalClose} onConfirm={handleSaveModalConfirm} title="Save Order Changes" confirmButtonText={saveModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : (saveModalSuccess ? "Success!" : 'Save Changes')} confirmButtonDisabled={saveModalLoading || saveModalSuccess}>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select the order stage (current: {order.stage_description || order.stage}):</p>
                <select id="stage" value={data.stage} onChange={(e) => setData('stage', e.target.value)} className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.stage ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={saveModalLoading || saveModalSuccess}>
                    <option value="3">Pending</option>
                    <option value="4">Proforma</option>
                    {/* <option value="5">Paid</option> // Stage 5 should be set by payment action */}
                </select>
                {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
            </Modal>

            <Modal isOpen={paymentModalOpen} onClose={handlePaymentModalClose} onConfirm={handlePaymentModalConfirm} title="Process Payment" confirmButtonText={paymentProcessing ? <><FontAwesomeIcon icon={faSpinner} spin /> Processing...</> : 'Confirm Payment'} confirmButtonDisabled={paymentProcessing}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 flex flex-col"><label htmlFor="total-due-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Due</label><div className="mt-1 text-right font-bold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 p-2 rounded">TZS {formatCurrency(paymentFormData.total)}</div></div>
                    <div className="flex flex-col">
                        <label htmlFor="sale-type-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Type</label>
                        <select id="sale-type-modal" value={paymentFormData.sale_type} onChange={(e) => setPaymentFormData('sale_type', e.target.value)} disabled={paymentProcessing} className={`mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentServerErrors.sale_type ? 'border-red-500' : ''}`}>
                            <option value="cash">Cash Sale</option><option value="credit">Credit Sale</option><option value="partial">Partial Payment</option>
                        </select>
                        {paymentServerErrors.sale_type && <p className="text-sm text-red-600 mt-1">{paymentServerErrors.sale_type}</p>}
                    </div>
                    {paymentFormData.sale_type !== "credit" && (<div className="flex flex-col">
                        <label htmlFor="payment-method-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                        <select id="payment-method-modal" value={paymentFormData.payment_method} onChange={(e) => setPaymentFormData('payment_method', e.target.value)} disabled={paymentProcessing || paymentMethodsLoading} className={`mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentServerErrors.payment_method ? 'border-red-500' : ''}`}>
                            <option value="" disabled>Select Payment Method</option>
                            {paymentMethodsLoading ? <option disabled>Loading...</option> : paymentMethods.map((method) => (<option key={method.id} value={method.id}>{method.name}</option>))}
                        </select>
                        {paymentServerErrors.payment_method && <p className="text-sm text-red-600 mt-1">{paymentServerErrors.payment_method}</p>}
                    </div>)}
                    {paymentFormData.sale_type !== "credit" && (<div className="flex flex-col">
                        <label htmlFor="paid-amount-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid Amount</label>
                        <input type="number" id="paid-amount-modal" placeholder="Paid Amount" value={paymentFormData.paid_amount} onChange={handlePaidAmountInModalChange} disabled={paymentProcessing} className={`mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentServerErrors.paid_amount ? 'border-red-500' : ''}`} />
                        {paymentServerErrors.paid_amount && <p className="text-sm text-red-600 mt-1">{paymentServerErrors.paid_amount}</p>}
                    </div>)}
                    {paymentFormData.sale_type !== "credit" && (<div className="flex flex-col">
                        <label htmlFor="amount-display-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (Display)</label>
                        <div className="mt-1 text-right font-bold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 p-2 rounded">TZS {amountDisplay}</div>
                         { parseFloat(paymentFormData.paid_amount) > 0 && paymentFormData.total > 0 && (
                            <>
                                {paymentFormData.sale_type === 'partial' && parseFloat(paymentFormData.paid_amount) < paymentFormData.total && (
                                    <div className="mt-1 text-xs text-right text-orange-600 dark:text-orange-400">
                                        Balance Due: TZS {formatCurrency(paymentFormData.total - parseFloat(paymentFormData.paid_amount))}
                                    </div>
                                )}
                                {parseFloat(paymentFormData.paid_amount) > paymentFormData.total && (
                                    <div className="mt-1 text-xs text-right text-green-600 dark:text-green-400">
                                        Change: TZS {formatCurrency(parseFloat(paymentFormData.paid_amount) - paymentFormData.total)}
                                    </div>
                                )}
                            </>
                        )}
                    </div>)}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}