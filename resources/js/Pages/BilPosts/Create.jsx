import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react'; // Import router
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faMoneyBill, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
// import { Inertia } from '@inertiajs/inertia'; // router is preferred for navigation
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

export default function Create({ fromstore, auth }) {
    const { data, setData, post, errors, processing, reset } = useForm({
        customer_name: '', // For display if needed, customer_id is primary
        customer_id: null,
        store_name: '', // For display if needed, store_id is primary
        store_id: auth?.user?.store_id || null,
        pricecategory_name: '', // For display if needed, pricecategory_id is primary
        pricecategory_id: auth?.user?.pricecategory_id || null,
        total: 0,
        stage: 3, // Default stage for a new order (e.g., Pending for "Save" action)
        orderitems: [], // This will be populated from local orderItems state
    });

    const [orderItems, setOrderItems] = useState([]); // Local state for managing items in the UI table

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
    const [customerIDError, setCustomerIDError] = useState(null); // Local validation error for customer ID

    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '',
    });
    const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);
    const [newCustomerModalSuccess, setNewCustomerModalSuccess] = useState(false);

    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalLoading, setSaveModalLoading] = useState(false); // For the "Save" (non-payment) modal
    const [saveModalSuccess, setSaveModalSuccess] = useState(false);

    const [storeIDError, setStoreIDError] = useState(null); // Local validation error for store ID
    const [pricecategoryIDError, setPricecategoryIDError] = useState(null); // Local validation error for price category

    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [amountDisplay, setAmountDisplay] = useState('0');
    const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);

    const {
        data: paymentFormData,
        setData: setPaymentFormData,
        post: postPayment,
        processing: paymentProcessing,
        errors: paymentServerErrors,
        reset: resetPaymentForm,
        clearErrors: clearPaymentServerErrors,
    } = useForm({
        sale_type: 'cash', // Use snake_case here to match backend expectations if sent directly
        payment_method: auth?.user?.paymenttype_id || '',
        paid_amount: '',
        // Fields to be copied from main form, ensure keys match backend if directly used
        customer_id: null,
        store_id: null,
        stage: 3, // Stage of the order *before* payment; backend will set to 5
        total: 0,
        orderitems: [],
    });

    const fetchItems = useCallback((query) => {
        if (!query.trim() || !data.pricecategory_id) {
            setItemSearchResults([]);
            return;
        }
        setIsItemSearchLoading(true);
        axios.get(route('systemconfiguration0.items.search'), { params: { query: query.trim(), pricecategory_id: data.pricecategory_id } })
            .then((response) => setItemSearchResults(response.data.items?.slice(0, 10) || []))
            .catch(() => showAlert('Failed to fetch items.'))
            .finally(() => setIsItemSearchLoading(false));
    }, [data.pricecategory_id]);

    const fetchCustomers = useCallback((query) => {
        if (!query.trim()) {
            setCustomerSearchResults([]);
            return;
        }
        setIsCustomerSearchLoading(true);
        axios.get(route('systemconfiguration0.customers.search'), { params: { query } })
            .then((response) => setCustomerSearchResults(response.data.customers?.slice(0, 10) || []))
            .catch(() => showAlert('Failed to fetch customers.'))
            .finally(() => setIsCustomerSearchLoading(false));
    }, []);

    const fetchPaymentMethods = useCallback(async () => {
        setPaymentMethodsLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration0.paymenttypes.search'));
            if (response.data && Array.isArray(response.data.paymenttype)) {
                setPaymentMethods(response.data.paymenttype);
                const userDefaultPM = auth?.user?.paymenttype_id;
                const defaultExists = response.data.paymenttype.some(pm => pm.id === userDefaultPM);

                if (userDefaultPM && defaultExists) {
                    setPaymentFormData(prev => ({ ...prev, payment_method: userDefaultPM }));
                } else if (response.data.paymenttype.length > 0 && !paymentFormData.payment_method) {
                    // Optionally set to first available if no user default or user default is invalid
                    // setPaymentFormData(prev => ({ ...prev, payment_method: response.data.paymenttype[0].id }));
                }
            } else {
                console.error('Error fetching payment methods: Invalid response format', response.data);
                showAlert('Failed to fetch payment methods (invalid format). Please try again.');
            }
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            showAlert('Failed to fetch payment methods. Please try again.');
        } finally {
            setPaymentMethodsLoading(false);
        }
    }, [auth?.user?.paymenttype_id, setPaymentFormData, paymentFormData.payment_method]);


    const [priceCategories, setPriceCategories] = useState([]);
    useEffect(() => {
        axios.get(route('systemconfiguration0.pricecategories.viewactive'))
            .then(response => setPriceCategories(response.data.priceCategories))
            .catch(() => showAlert('Failed to fetch price categories.'));
    }, []);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 300), [fetchCustomers]);

    useEffect(() => { itemSearchQuery.trim() ? debouncedItemSearch(itemSearchQuery) : setItemSearchResults([]); }, [itemSearchQuery, debouncedItemSearch]);
    useEffect(() => { customerSearchQuery.trim() ? debouncedCustomerSearch(customerSearchQuery) : setCustomerSearchResults([]); }, [customerSearchQuery, debouncedCustomerSearch]);

    useEffect(() => {
        setData('orderitems', orderItems.map(item => ({
            item_id: item.item_id,
            quantity: parseFloat(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
            // id: item.id, // Include if updating existing BILOrderItems for the main "Save"
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

    useEffect(() => { fetchPaymentMethods(); }, [fetchPaymentMethods]);

    const handleOrderItemChange = (index, field, value) => {
        const updatedItems = [...orderItems];
        if (field === 'quantity' || field === 'price') {
            const parsedValue = parseFloat(value);
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? (field === 'quantity' ? 1 : 0) : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setOrderItems(updatedItems);
    };

    const addOrderItem = (selectedItem = null) => {
        if (!selectedItem) return;
        const newItem = { item_name: selectedItem.name, item_id: selectedItem.id, quantity: 1, price: selectedItem.price };
        setOrderItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
    };

    const removeOrderItem = (index) => setModalState({ isOpen: true, message: 'Are you sure you want to remove this item?', isAlert: false, itemToRemoveIndex: index });
    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) setOrderItems(orderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex));
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };
    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    const showAlert = (message) => setModalState({ isOpen: true, message: message, isAlert: true, itemToRemoveIndex: null });
    const isValidInteger = (value) => value !== null && value !== '' && !isNaN(value) && Number.isInteger(Number(value));

    const handleItemSearchChange = (e) => { setItemSearchQuery(e.target.value); setShowItemDropdown(!!e.target.value.trim() && !!data.pricecategory_id); };
    const handleClearSearch = () => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); if (itemSearchInputRef.current) itemSearchInputRef.current.focus(); };

    const handleCustomerSearchChange = (e) => {
        const query = e.target.value;
        setCustomerSearchQuery(query);
        setShowCustomerDropdown(!!query.trim());
        if (!query.trim()) setData((prev) => ({ ...prev, customer_id: null, customer_name: '', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' }));
    };
    const handleClearCustomerSearch = () => {
        setCustomerSearchQuery(''); setShowCustomerDropdown(false);
        setData((prev) => ({ ...prev, customer_id: null, customer_name: '', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' }));
        if (customerSearchInputRef.current) customerSearchInputRef.current.focus();
    };
    const selectCustomer = (c) => {
        setData((prev) => ({
            ...prev, customer_id: c.id, customer_name: c.customer_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.surname || ''}`,
            customer_type: c.customer_type, first_name: c.first_name || '', other_names: c.other_names || '', surname: c.surname || '',
            company_name: c.company_name || '', email: c.email, phone: c.phone || '',
        }));
        setCustomerSearchQuery(''); setShowCustomerDropdown(false); setCustomerIDError(null);
    };

    const handleNewCustomerClick = () => {
        setNewCustomerModalOpen(true); setNewCustomerModalSuccess(false);
        setNewCustomer({ customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' });
    };
    const handleNewCustomerModalClose = () => { setNewCustomerModalOpen(false); setNewCustomerModalLoading(false); setNewCustomerModalSuccess(false); };
    const handleNewCustomerModalConfirm = async () => {
        setNewCustomerModalLoading(true);
        try {
            const response = await axios.post(route('systemconfiguration0.customers.directstore'), newCustomer);
            if (response.data && response.data.id) {
                selectCustomer(response.data); // Use selectCustomer to update main form data
                setNewCustomerModalSuccess(true);
                setTimeout(() => handleNewCustomerModalClose(), 1000);
            } else { showAlert(response.data?.message || 'Error creating new customer!'); }
        } catch (error) {
            console.error("Error creating new customer:", error);
            showAlert(error.response?.data?.message || 'Failed to create new customer.');
        } finally { setNewCustomerModalLoading(false); }
    };
    const handleNewCustomerInputChange = (e) => setNewCustomer(prev => ({ ...prev, [e.target.id]: e.target.value }));

    const validateMainFormForPayment = () => {
        let isValid = true;
        if (!isValidInteger(data.customer_id)) { setCustomerIDError('Customer selection is required.'); isValid = false; } else { setCustomerIDError(null); }
        if (!isValidInteger(data.store_id)) { setStoreIDError('Store selection is required.'); isValid = false; } else { setStoreIDError(null); }
        if (!data.pricecategory_id) { setPricecategoryIDError('Price category is required.'); isValid = false; } else { setPricecategoryIDError(null); }
        if (orderItems.length === 0) { showAlert('Please add at least one item to the order.'); isValid = false; }
        else {
            const hasInvalidItems = orderItems.some(item => !item.item_id || (parseFloat(item.quantity) || 0) <= 0 || (parseFloat(item.price) || 0) < 0);
            if (hasInvalidItems) { showAlert('Ensure all items have valid details (quantity > 0, price >= 0).'); isValid = false; }
        }
        return isValid;
    }

    const handlePayBillsClick = () => {
        if (!validateMainFormForPayment()) return;

        setPaymentFormData({
            // Reset/default modal specific fields
            sale_type: 'cash',
            payment_method: paymentFormData.payment_method || auth?.user?.paymenttype_id || (paymentMethods.length > 0 ? paymentMethods[0].id : ''),
            paid_amount: '',
            // Copy from main form
            customer_id: data.customer_id,
            store_id: data.store_id,
            stage: data.stage, // Current stage of order, backend sets to 5 on payment
            total: data.total,
            orderitems: orderItems.map(item => ({
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
        resetPaymentForm('sale_type', 'payment_method', 'paid_amount'); // Reset specific fields
        setAmountDisplay('0');
    };

    const handlePaymentModalConfirm = () => {
        const paidAmountValue = parseFloat(paymentFormData.paid_amount);

        // Client-side validation for modal fields
        if (!paymentFormData.sale_type) { showAlert('Sale type is required.'); return; }
        if (paymentFormData.sale_type !== "credit" && !paymentFormData.payment_method) { showAlert('Payment method is required.'); return; }
        if (paymentFormData.sale_type !== "credit" && (isNaN(paidAmountValue) || paidAmountValue < 0)) { showAlert('Valid non-negative paid amount is required.'); return; }
        if (paymentFormData.sale_type === "cash" && paidAmountValue < paymentFormData.total) { showAlert('For cash sale, paid amount must be equal to total due.'); return; }
        if (paymentFormData.sale_type === "partial" && paidAmountValue >= paymentFormData.total) { showAlert('For partial sale, paid amount must be less than total due.'); return; }


        const payloadToSend = {
            customer_id: paymentFormData.customer_id,
            store_id: paymentFormData.store_id,
            stage: paymentFormData.stage, // Backend determines final stage (e.g., 5 for paid)
            total: paymentFormData.total,
            orderitems: paymentFormData.orderitems, // Already formatted
            sale_type: paymentFormData.sale_type,
            payment_method: paymentFormData.sale_type !== "credit" ? (parseInt(paymentFormData.payment_method) || null) : null,
            paid_amount: paymentFormData.sale_type !== "credit" ? paidAmountValue : 0,
        };
        
        postPayment(route('billing1.pay'), {
            data: payloadToSend,
            preserveScroll: true,
            preserveState: (page) => Object.keys(page.props.errors).length > 0,
            onSuccess: () => {
                setPaymentModalOpen(false);
                reset(); // Reset main order form
                setOrderItems([]); // Clear local order items state
                // Reset payment form specific fields
                setPaymentFormData(prev => ({
                    ...prev, sale_type: 'cash',
                    payment_method: auth?.user?.paymenttype_id || (paymentMethods.length > 0 ? paymentMethods[0].id : ''),
                    paid_amount: '',
                }));
                setAmountDisplay('0');
                showAlert('Payment processed successfully!');
                setTimeout(() => router.visit(route('billing1.index')), 1500);
            },
            onError: (errors) => {
                console.error('Payment processing failed:', errors);
                const errorMessages = Object.values(errors).join('\n');
                showAlert(`Payment processing failed:\n${errorMessages || 'Please check details and try again.'}`);
            },
        });
    };

    const handlePaidAmountInModalChange = (e) => {
        const value = e.target.value;
        setPaymentFormData('paid_amount', value);
        setAmountDisplay(formatCurrency(parseFloat(value) || 0));
    };

    const handleSaveClick = () => {
        if (!validateMainFormForPayment()) return; // Use the same validation logic
        // data.stage is already bound to the select in the save modal
        setSaveModalOpen(true);
        setSaveModalLoading(false);
        setSaveModalSuccess(false);
    };
    const handleSaveModalClose = () => { setSaveModalOpen(false); setSaveModalLoading(false); setSaveModalSuccess(false); };
    const handleSaveModalConfirm = () => {
        setSaveModalLoading(true);
        // `data` from the main useForm is sent. `data.stage` is set by the modal's select.
        post(route('billing1.store'), { // Main form's post method
            onSuccess: () => {
                setSaveModalLoading(false); setSaveModalSuccess(true);
                reset(); setOrderItems([]); // Reset main form and local items
                setTimeout(() => { handleSaveModalClose(); showAlert('Order saved successfully!'); }, 1000);
            },
            onError: (formErrors) => {
                setSaveModalLoading(false);
                console.error('Save order errors:', formErrors);
                const errorMessages = Object.values(formErrors).join('\n');
                showAlert(`Failed to save order:\n${errorMessages || 'Please check the form.'}`);
            },
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user prop for AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">New Order</h2>}
        >
            <Head title="Create Order" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Customer & Order Setup</h3>
                                <div className="mb-4">
                                    <label htmlFor="customer_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Select or Create Customer
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <div className="relative flex-grow" ref={customerDropdownRef}>
                                            <input
                                                type="text" placeholder="Search customer..." value={customerSearchQuery}
                                                onChange={handleCustomerSearchChange} onFocus={() => setShowCustomerDropdown(!!customerSearchQuery.trim())}
                                                className={`w-full border p-2 rounded text-sm pr-10 dark:bg-gray-700 dark:text-gray-200 ${customerIDError || errors.customer_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                ref={customerSearchInputRef} autoComplete="off"
                                            />
                                            {customerSearchQuery && <button type="button" onClick={handleClearCustomerSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"><FontAwesomeIcon icon={faTimesCircle} /></button>}
                                            {isCustomerSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />}
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
                                        <button type="button" onClick={handleNewCustomerClick} className="bg-green-500 hover:bg-green-600 text-white rounded p-2.5 flex items-center space-x-2 text-sm">
                                            <FontAwesomeIcon icon={faPlus} /> <span className="hidden sm:inline">New</span>
                                        </button>
                                    </div>
                                    {(errors.customer_id || customerIDError) && <p className="text-xs text-red-500 mt-1">{errors.customer_id || customerIDError}</p>}
                                    {data.customer_id && <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">Selected: <strong>{data.customer_name}</strong></div>}
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
                                        <select id="pricecategory_id" value={data.pricecategory_id || ''} onChange={(e) => { setData("pricecategory_id", e.target.value); setPricecategoryIDError(null); setItemSearchQuery(''); setItemSearchResults([]); setOrderItems([]); }}
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
                                                    <tr key={index}>
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
                                {errors.orderitems && typeof errors.orderitems === 'string' && <p className="text-xs text-red-500 mt-1">{errors.orderitems}</p>}
                                {errors.orderitems && typeof errors.orderitems === 'object' && Object.keys(errors.orderitems).map(key => (<p key={key} className="text-xs text-red-500 mt-1">{errors.orderitems[key]}</p>))}

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                    <div className="w-full md:w-1/3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Total</label>
                                        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md text-right">TZS {formatCurrency(data.total)}</div>
                                    </div>
                                </div>
                            </section>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={route('billing1.index')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm flex items-center"><FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> Close</Link>
                                <button type="button" onClick={handleSaveClick} disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center"><FontAwesomeIcon icon={processing ? faSpinner : faSave} spin={processing} className="mr-2" /> Save</button>
                                <button type="button" onClick={handlePayBillsClick} disabled={processing || paymentProcessing} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center"><FontAwesomeIcon icon={processing || paymentProcessing ? faSpinner : faMoneyBill} spin={processing || paymentProcessing} className="mr-2" /> Pay Bills</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal isOpen={newCustomerModalOpen} onClose={handleNewCustomerModalClose} onConfirm={handleNewCustomerModalConfirm} title="Create New Customer" confirmButtonText={newCustomerModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : (newCustomerModalSuccess ? "Success" : 'Confirm')} confirmButtonDisabled={newCustomerModalLoading || newCustomerModalSuccess}>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div><label htmlFor="customer_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Type</label><select id="customer_type" value={newCustomer.customer_type} onChange={handleNewCustomerInputChange} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading || newCustomerModalSuccess}><option value="individual">Individual</option><option value="company">Company</option></select></div>
                    {newCustomer.customer_type === 'individual' && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label><input type="text" id="first_name" value={newCustomer.first_name} onChange={handleNewCustomerInputChange} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading || newCustomerModalSuccess} /></div><div><label htmlFor="other_names" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Other Names</label><input type="text" id="other_names" value={newCustomer.other_names} onChange={handleNewCustomerInputChange} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading || newCustomerModalSuccess} /></div><div><label htmlFor="surname" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Surname</label><input type="text" id="surname" value={newCustomer.surname} onChange={handleNewCustomerInputChange} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading || newCustomerModalSuccess} /></div></div>)}
                    {newCustomer.customer_type === 'company' && (<div><label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label><input type="text" id="company_name" value={newCustomer.company_name} onChange={handleNewCustomerInputChange} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading || newCustomerModalSuccess} /></div>)}
                    <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><input type="email" id="email" value={newCustomer.email} onChange={handleNewCustomerInputChange} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading || newCustomerModalSuccess} /></div>
                    <div><label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label><input type="text" id="phone" value={newCustomer.phone} onChange={handleNewCustomerInputChange} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading || newCustomerModalSuccess} /></div>
                </form>
            </Modal>

            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title={modalState.isAlert ? "Alert" : "Confirm Action"} message={modalState.message} isAlert={modalState.isAlert} />

            <Modal isOpen={saveModalOpen} onClose={handleSaveModalClose} onConfirm={handleSaveModalConfirm} title="Save Order Confirmation" confirmButtonText={saveModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : (saveModalSuccess ? "Success!" : 'Save Order')} confirmButtonDisabled={saveModalLoading || saveModalSuccess}>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select how you want to save this order:</p>
                <select id="stage" value={data.stage} onChange={(e) => setData('stage', e.target.value)} className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.stage ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={saveModalLoading || saveModalSuccess}>
                    <option value="3">Save as Pending</option><option value="4">Save as Proforma</option>
                </select>
                {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
            </Modal>

            <Modal isOpen={paymentModalOpen} onClose={handlePaymentModalClose} onConfirm={handlePaymentModalConfirm} title="Process Payment" confirmButtonText={paymentProcessing ? <><FontAwesomeIcon icon={faSpinner} spin /> Processing...</> : 'Confirm Payment'} confirmButtonDisabled={paymentProcessing}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 flex flex-col"><label htmlFor="total-due" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Due</label><div className="mt-1 text-right font-bold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 p-2 rounded">TZS {formatCurrency(paymentFormData.total)}</div></div>
                    <div className="flex flex-col">
                        <label htmlFor="sale-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Type</label>
                        <select id="sale-type" value={paymentFormData.sale_type} onChange={(e) => setPaymentFormData('sale_type', e.target.value)} disabled={paymentProcessing} className={`mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentServerErrors.sale_type ? 'border-red-500' : ''}`}>
                            <option value="cash">Cash Sale</option><option value="credit">Credit Sale</option><option value="partial">Partial Payment</option>
                        </select>
                        {paymentServerErrors.sale_type && <p className="text-sm text-red-600 mt-1">{paymentServerErrors.sale_type}</p>}
                    </div>
                    {paymentFormData.sale_type !== "credit" && (<div className="flex flex-col">
                        <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                        <select id="payment-method" value={paymentFormData.payment_method} onChange={(e) => setPaymentFormData('payment_method', e.target.value)} disabled={paymentProcessing || paymentMethodsLoading} className={`mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentServerErrors.payment_method ? 'border-red-500' : ''}`}>
                            <option value="" disabled>Select Payment Method</option>
                            {paymentMethodsLoading ? <option disabled>Loading...</option> : paymentMethods.map((method) => (<option key={method.id} value={method.id}>{method.name}</option>))}
                        </select>
                        {paymentServerErrors.payment_method && <p className="text-sm text-red-600 mt-1">{paymentServerErrors.payment_method}</p>}
                    </div>)}
                    {paymentFormData.sale_type !== "credit" && (<div className="flex flex-col">
                        <label htmlFor="paid-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid Amount</label>
                        <input type="number" id="paid-amount" placeholder="Paid Amount" value={paymentFormData.paid_amount} onChange={handlePaidAmountInModalChange} disabled={paymentProcessing} className={`mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentServerErrors.paid_amount ? 'border-red-500' : ''}`} />
                        {paymentServerErrors.paid_amount && <p className="text-sm text-red-600 mt-1">{paymentServerErrors.paid_amount}</p>}
                    </div>)}
                    {paymentFormData.sale_type !== "credit" && (<div className="flex flex-col">
                        <label htmlFor="amount-display" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (Display)</label>
                        <div className="mt-1 text-right font-bold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 p-2 rounded">TZS {amountDisplay}</div>
                        {/* Balance/Change Display (Optional) */}
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