import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faMoneyBill } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
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


export default function Create() {
    const { data, setData, post, errors, processing, reset } = useForm({
        customer_name: '',
        customer_id: null,
        store_name: '',
        store_id: null,
        total: 0,
        stage: 3,
        orderitems: [],
    });

    const [orderItems, setOrderItems] = useState(data.orderitems);

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef(null);
    const customerSearchInputRef = useRef(null);    
    const [customerIDError, setCustomerIDError] = useState(null);

    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);
    const [newCustomerModalSuccess, setNewCustomerModalSuccess] = useState(false);

    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [storeSearchResults, setStoreSearchResults] = useState([]);
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const storeDropdownRef = useRef(null);
    const storeSearchInputRef = useRef(null);
    const [storeIDError, setStoreIDError] = useState(null);

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [totalDue, setTotalDue] = useState(0);
    const [totalPaid, setTotalPaid] = useState('');
    const [saleType, setSaleType] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paidAmount, setPaidAmount] = useState('');
    const [amountDisplay, setAmountDisplay] = useState('');
    const [paymentErrors, setPaymentErrors] = useState({});
    const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);

    const fetchItems = useCallback((query) => {
        if (!query.trim()) {
            setItemSearchResults([]);
            return;
        }

        axios.get(route('systemconfiguration0.items.search'), { params: { query } })
            .then((response) => {
                setItemSearchResults(response.data.items.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching items:', error);
                showAlert('Failed to fetch items. Please try again later.');
                setItemSearchResults([]);
            });
    }, []);

    const fetchCustomers = useCallback((query) => {
        if (!query.trim()) {
            setCustomerSearchResults([]);
            return;
        }

        axios.get(route('systemconfiguration0.customers.search'), { params: { query } })
            .then((response) => {
                setCustomerSearchResults(response.data.customers.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching customers:', error);
                showAlert('Failed to fetch customers. Please try again later.');
                setCustomerSearchResults([]);
            });
    }, []);

    const fetchStores = useCallback((query) => {
        if (!query.trim()) {
            setStoreSearchResults([]);
            return;
        }

        axios.get(route('systemconfiguration2.stores.search'), { params: { query } })
            .then((response) => {
                setStoreSearchResults(response.data.stores.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching stores:', error);
                showAlert('Failed to fetch stores. Please try again later.');
                setStoreSearchResults([]);
            });
    }, []);

    const fetchPaymentMethods = useCallback(async () => {
        setPaymentMethodsLoading(true);
        try {
             const response = await axios.get(route('systemconfiguration0.paymenttypes.search'));
            if (response.data && response.data.paymenttype) {
                setPaymentMethods(response.data.paymenttype);
            } else {
                console.error('Error fetching payment methods: Invalid response format');
                showAlert('Failed to fetch payment methods. Please try again.');
            }
        } catch (error) {
            console.error('Error fetching payment methods:', error);
             showAlert('Failed to fetch payment methods. Please try again.');
        } finally {
            setPaymentMethodsLoading(false);
        }
    }, []);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 300), [fetchCustomers]);
    const debouncedStoreSearch = useMemo(() => debounce(fetchStores, 300), [fetchStores]);

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => {
        if (customerSearchQuery.trim()) {
            debouncedCustomerSearch(customerSearchQuery);
        } else {
            setCustomerSearchResults([]);
        }
    }, [customerSearchQuery, debouncedCustomerSearch]);

    useEffect(() => {
        if (storeSearchQuery.trim()) {
            debouncedStoreSearch(storeSearchQuery);
        } else {
            setStoreSearchResults([]);
        }
    }, [storeSearchQuery, debouncedStoreSearch]);

    useEffect(() => {
        setData('orderitems', orderItems);
        const calculatedTotal = orderItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
        setTotalDue(calculatedTotal);
    }, [orderItems, setData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutsideCustomer = (event) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
                setShowCustomerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideCustomer);
        return () => document.removeEventListener('mousedown', handleClickOutsideCustomer);
    }, []);

    useEffect(() => {
        const handleClickOutsideStore = (event) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target)) {
                setShowStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideStore);
        return () => document.removeEventListener('mousedown', handleClickOutsideStore);
    }, []);

    useEffect(() => {
        fetchPaymentMethods();
        }, [fetchPaymentMethods]);
    const handleOrderItemChange = (index, field, value) => {
        const updatedItems = [...orderItems];
        if (field === 'quantity' || field === 'price') {
            const parsedValue = parseFloat(value);
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setOrderItems(updatedItems);
    };

    const addOrderItem = (selectedItem = null) => {
        const newItem = selectedItem
            ? {
                item_name: selectedItem.name,
                item_id: selectedItem.id,
                quantity: 1,
                price: selectedItem.price
            }
            : {
                item_name: '',
                item_id: null,
                quantity: 1,
                price: 0
            };
        setOrderItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    const removeOrderItem = (index) => {
        setModalState({
            isOpen: true,
            message: 'Are you sure you want to remove this item?',
            isAlert: false,
            itemToRemoveIndex: index,
        });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = orderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setOrderItems(updatedItems);
        }
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };

    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            itemToRemoveIndex: null,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (data.customer_id !== null && !Number.isInteger(Number(data.customer_id))) {
            setCustomerIDError('Customer ID must be an integer.');
            return;
        } else {
            setCustomerIDError(null);
        }

        if (data.store_id !== null && !Number.isInteger(Number(data.store_id))) {
            setStoreIDError('Store ID must be an integer.');
            return;
        } else {
            setStoreIDError(null);
        }

        const hasEmptyFields = orderItems.some(
            (item) => !item.item_name || !item.item_id || item.quantity <= 0 || item.price < 0
        );

        if (hasEmptyFields) {
            showAlert('Please ensure all order items have valid item names, quantities, prices, and item IDs.');
            return;
        }

        setIsSaving(true);
        post(route('billing1.store'), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (error) => {
                console.error(error);
                setIsSaving(false);
                showAlert('An error occurred while saving the order.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setOrderItems([]);
        setCustomerIDError(null);
        setStoreIDError(null);
        showAlert('Order created successfully!');
    };

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };

    const handleCustomerSearchChange = (e) => {
        const query = e.target.value;
        setCustomerSearchQuery(query);
        setData('customer_name', query);
        setShowCustomerDropdown(!!query.trim());
    };

    const handleStoreSearchChange = (e) => {
        const query = e.target.value;
        setStoreSearchQuery(query);
        setData('store_name', query);
        setShowStoreDropdown(!!query.trim());
    };

    const handleClearSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };

    const handleClearCustomerSearch = () => {
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
        if (customerSearchInputRef.current) {
            customerSearchInputRef.current.focus();
        }
        setData('customer_name', '');
        setData('customer_id', null);
    };

    const handleClearStoreSearch = () => {
        setStoreSearchQuery('');
        setStoreSearchResults([]);
        setShowStoreDropdown(false);
        if (storeSearchInputRef.current) {
            storeSearchInputRef.current.focus();
        }
        setData('store_name', '');
        setData('store_id', null);
    };

    const selectCustomer = (selectedCustomer) => {
        setData('customer_name', selectedCustomer.name);
        setData('customer_id', selectedCustomer.id);
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
    };

    const selectStore = (selectedStore) => {
        setData('store_name', selectedStore.name);
        setData('store_id', selectedStore.id);
        setStoreSearchQuery('');
        setStoreSearchResults([]);
        setShowStoreDropdown(false);
    };

     const handlePayBillsClick = () => {
        setPaymentModalOpen(true);
    };

      const handlePaymentModalClose = () => {
        setPaymentModalOpen(false);
        setTotalPaid('');
        setSaleType('');
        setPaymentMethod('');
        setPaidAmount('');
        setAmountDisplay('');
        setPaymentErrors({});
    };

        const handlePaymentModalConfirm = async () => {
            const errors = {};
            if (!totalPaid && saleType !== "credit") {
              errors.totalPaid = 'Total paid is required';
            }
        
            if (!saleType) {
              errors.saleType = 'Sale type is required';
            }
        
            if (!paymentMethod && saleType !== "credit") {
              errors.paymentMethod = 'Payment method is required';
            }
            if (!paidAmount && saleType !== "credit") {
              errors.paidAmount = 'Paid amount is required';
            }
        
            setPaymentErrors(errors);
        
            if (Object.keys(errors).length === 0) {
              try {
                const payload = {
                   customer_id: data.customer_id,
                   store_id: data.store_id,
                   stage: data.stage,
                   total: data.total,
                    orderitems: orderItems.map(item => ({
                        item_id: item.item_id,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    payment_method: saleType !== "credit" ? paymentMethod : null,
                    paid_amount: saleType !== "credit" ? paidAmount : 0,
                    total_paid: saleType !== "credit" ? totalPaid : 0,
                    sale_type: saleType
                };

                if (saleType !== 'credit') {
                    // Find the selected payment method object
                    const selectedPaymentMethod = paymentMethods.find(method => method.name === paymentMethod);
   
                    if (selectedPaymentMethod) {
                        payload.payment_method = selectedPaymentMethod.id; // Set the ID instead of the name
                    }else {
                        showAlert('Invalid Payment Method. Please try again.');
                        return;
                    }
                }
                
                setIsSaving(true);
                
                  let response = await axios.post(route('billing1.pay'), payload);
                     
                  if (response.data && response.data.success) {
                    setIsSaving(false);
                    setPaymentModalOpen(false);
                   setTotalPaid('');
                   setSaleType('');
                   setPaymentMethod('');
                   setPaidAmount('');
                   setAmountDisplay('');
                   setPaymentErrors({});
                   Inertia.get(route('billing1.index'));
                  }else {
                     setIsSaving(false);
                    showAlert('Payment processing failed. Please try again.');
                    console.error('Payment processing failed:', response.data.message || 'Unknown error');
                }
              } catch (error) {
                  setIsSaving(false);
                console.error('Error during payment processing:', error);
                showAlert('An error occurred during payment processing.');
              }
            }
          };

       const handlePaidAmountChange = (e) => {
            const value = e.target.value;
             setPaidAmount(value);

             const dueAmount = parseFloat(totalDue) || 0;
             const paidValue = parseFloat(value) || 0;
             const diff = (paidValue).toFixed(2);

             setAmountDisplay(diff);

        };

    const handleNewCustomerClick = () => {
        setNewCustomerModalOpen(true);
        setNewCustomerModalSuccess(false);
    };

    const handleNewCustomerModalClose = () => {
        setNewCustomerModalOpen(false);
        setNewCustomerName('');
        setNewCustomerModalLoading(false);
        setNewCustomerModalSuccess(false);
    };

    const handleNewCustomerModalConfirm = async () => {
        setNewCustomerModalLoading(true);
        try {
            const response = await axios.post(route('customers.directstore'), { name: newCustomerName });

            if (response.data && response.data.id) {
                setData('customer_name', response.data.name);
                setData('customer_id', response.data.id);

                setNewCustomerModalSuccess(true);
            } else {
                  showAlert('Error creating new customer!');
            }
        } catch (error) {
            console.error("Error creating new customer:", error);
            showAlert('Failed to create new customer. Please try again.');
        } finally {
            setNewCustomerModalLoading(false);
             setTimeout(() => {
                    setNewCustomerModalOpen(false);
                    setNewCustomerName('');
                    setNewCustomerModalSuccess(false);
             },1000)

        }

    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Order</h2>}
        >
            <Head title="Create Order" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={customerDropdownRef}>
                                    <div className="flex items-center justify-between h-10">
                                        <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mr-2">
                                            Customer Name
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleNewCustomerClick}
                                            className="bg-green-500 text-white rounded p-2 flex items-center space-x-2"
                                        >
                                            <FontAwesomeIcon icon={faPlus} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search customer..."
                                        value={data.customer_name}
                                        onChange={handleCustomerSearchChange}
                                        onFocus={() => setShowCustomerDropdown(!!customerSearchQuery.trim())}
                                        className={`w-full border p-2 rounded text-sm pr-10 ${customerIDError ? 'border-red-500' : ''}`}
                                        ref={customerSearchInputRef}
                                        autocomplete="new-password"
                                    />
                                    {customerIDError && <p className="text-sm text-red-600 mt-1">{customerIDError}</p>}
                                    {customerSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearCustomerSearch}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            <FontAwesomeIcon icon={faTimesCircle} />
                                        </button>
                                    )}
                                    {showCustomerDropdown && (
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                            {customerSearchResults.length > 0 ? (
                                                customerSearchResults.map((customer) => (
                                                    <li
                                                        key={customer.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => selectCustomer(customer)}
                                                    >
                                                        {customer.name}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-gray-500">No customers found.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                <div className="relative flex-1" ref={storeDropdownRef}>
                                    <div className="flex items-center h-10">
                                        <label htmlFor="store_name" className="block text-sm font-medium text-gray-700 mr-2">
                                            Store Name
                                        </label>
                                    </div>
                                        <input
                                            type="text"
                                            placeholder="Search store..."
                                            value={data.store_name}
                                            onChange={handleStoreSearchChange}
                                            onFocus={() => setShowStoreDropdown(!!storeSearchQuery.trim())}
                                            className="w-full border p-2 rounded text-sm pr-10"
                                            ref={storeSearchInputRef}
                                            autocomplete="new-password"
                                        />
                                        {storeSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={handleClearStoreSearch}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                <FontAwesomeIcon icon={faTimesCircle} />
                                            </button>
                                        )}
                                        {showStoreDropdown && (
                                            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                                {storeSearchResults.length > 0 ? (
                                                    storeSearchResults.map((store) => (
                                                        <li
                                                            key={store.id}
                                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => selectStore(store)}
                                                        >
                                                            {store.name}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="p-2 text-gray-500">No stores found.</li>
                                                )}
                                            </ul>
                                        )}
                                  </div>
                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="flex-1">
                                    <label htmlFor="total" className="block text-sm font-medium text-gray-700 text-right">
                                        Total (Auto-calculated)
                                    </label>
                                    <div className="mt-1  text-right font-bold text-gray-800 bg-gray-100 p-2 rounded">
                                        {parseFloat(data.total).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="stage" className="block text-sm font-medium text-gray-700">
                                        Stage
                                    </label>
                                    <select
                                        id="stage"
                                        value={data.stage}
                                        onChange={(e) => setData('stage', e.target.value)}
                                        className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.stage ? 'border-red-500' : ''}`}
                                    >
                                        <option value="3">Approved</option>
                                        <option value="4">Profoma</option>
                                        <option value="5">Completed</option>
                                        <option value="6">Cancelled</option>
                                    </select>
                                    {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 mb-2 py-1">
                                <div className="relative flex-1" ref={itemDropdownRef}>
                                    <input
                                        type="text"
                                        placeholder="Search item..."
                                        value={itemSearchQuery}
                                        onChange={handleSearchChange}
                                        onFocus={() => setShowItemDropdown(!!itemSearchQuery.trim())}
                                        className="w-full border p-2 rounded text-sm pr-10"
                                        ref={itemSearchInputRef}
                                    />
                                    {itemSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            <FontAwesomeIcon icon={faTimesCircle} />
                                        </button>
                                    )}
                                    {showItemDropdown && (
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                            {itemSearchResults.length > 0 ? (
                                                itemSearchResults.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => addOrderItem(item)}
                                                    >
                                                        {item.name}
                                                        <span className="text-gray-500 text-xs ml-2">({item.price})</span>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-gray-500">No items found.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {orderItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.item_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`quantity_${index}`}
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)}
                                                        error={errors.orderitems && errors.orderitems[index]?.quantity}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`price_${index}`}
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => handleOrderItemChange(index, 'price', e.target.value)}
                                                        error={errors.orderitems && errors.orderitems[index]?.price}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {parseFloat(item.quantity * item.price).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.item_id && <span className="text-xs text-gray-400">ID: {item.item_id}</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOrderItem(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('billing1.index'))}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || isSaving}
                                    className="bg-blue-600 text-white rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save Order'}</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={processing || isSaving}
                                    className="bg-green-600 text-white rounded p-2 flex items-center space-x-2"
                                    onClick={handlePayBillsClick}
                                >
                                <FontAwesomeIcon icon={faMoneyBill} />
                                    <span>Pay Bills</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>            

        {/* New Customer Modal */}
        <Modal
            isOpen={newCustomerModalOpen}
            onClose={handleNewCustomerModalClose}
            onConfirm={handleNewCustomerModalConfirm}
            title="Create New Customer"
            confirmButtonText={newCustomerModalLoading ? 'Loading...' : (newCustomerModalSuccess ? "Success" : 'Confirm')}
            confirmButtonDisabled={newCustomerModalLoading || newCustomerModalSuccess}
        >
            <div>
                <label htmlFor="new_customer_name" className="block text-sm font-medium text-gray-700">
                    Customer Name
                </label>
                <input
                    type="text"
                    id="new_customer_name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                     disabled={newCustomerModalLoading || newCustomerModalSuccess}
                />
            </div>
        </Modal>

        <Modal
            isOpen={modalState.isOpen}
            onClose={handleModalClose}
            onConfirm={handleModalConfirm}
            title={modalState.isAlert ? "Alert" : "Confirm Action"}
            message={modalState.message}
            isAlert={modalState.isAlert}
        />

        {/* Payment Modal */}
        <Modal
             isOpen={paymentModalOpen}
             onClose={handlePaymentModalClose}
             onConfirm={handlePaymentModalConfirm}
             title="Process Payment"
            confirmButtonText={'Confirm Payment'}
            confirmButtonDisabled={false}
         >
            <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
                <label htmlFor="total-due" className="block text-sm font-medium text-gray-700">
                    Total Due
                </label>
                    <div className="mt-1  text-right font-bold text-gray-800 bg-gray-100 p-2 rounded">
                        {parseFloat(totalDue).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                     </div>
                </div>
              <div className="flex flex-col">
                <label htmlFor="total-paid" className="block text-sm font-medium text-gray-700">
                    Total Paid
                </label>
                 <input
                    type="number"
                    id="total-paid"
                    value={totalPaid}
                    onChange={(e) => setTotalPaid(e.target.value)}
                    placeholder="Total Paid"
                     className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentErrors.totalPaid ? 'border-red-500' : ''}`}
                  />
                     {paymentErrors.totalPaid && <p className="text-sm text-red-600 mt-1">{paymentErrors.totalPaid}</p>}
              </div>


              <div className="flex flex-col">
                <label htmlFor="sale-type" className="block text-sm font-medium text-gray-700">
                    Sale Type
                </label>
                 <select
                    id="sale-type"
                     value={saleType}
                     onChange={(e)=> setSaleType(e.target.value)}
                    className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentErrors.saleType ? 'border-red-500' : ''}`}
                 >
                    <option value="" disabled >Select Sale Type</option>
                     <option value="cash">Cash Sale</option>
                     <option value="credit">Credit Sale</option>
                     <option value="partial">Partial Payment</option>
                </select>
                  {paymentErrors.saleType && <p className="text-sm text-red-600 mt-1">{paymentErrors.saleType}</p>}
                </div>

              {saleType !== "credit" && (  // Conditional rendering starts here
                 <div className="flex flex-col">
                     <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">
                          Payment Method
                      </label>
                    <select
                        id="payment-method"
                        value={paymentMethod}
                        onChange={(e)=> setPaymentMethod(e.target.value)}
                        className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentErrors.paymentMethod ? 'border-red-500' : ''}`}
                     >
                        <option value="" disabled >Select Payment Method</option>
                         {paymentMethodsLoading ? (
                            <option disabled>Loading Payment Methods...</option>
                        ) : (
                            paymentMethods.map((method) => (
                                <option key={method.id} value={method.name}>{method.name}</option>
                            ))
                        )}
                   </select>
                    {paymentErrors.paymentMethod && <p className="text-sm text-red-600 mt-1">{paymentErrors.paymentMethod}</p>}
                </div>
             )}
              {saleType !== "credit" && (
                <div className="flex flex-col">
                    <label htmlFor="paid-amount" className="block text-sm font-medium text-gray-700">
                             Paid Amount
                        </label>
                     <input
                        type="number"
                        id="paid-amount"
                        value={paidAmount}
                        onChange={handlePaidAmountChange}
                         placeholder="Paid Amount"
                         className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentErrors.paidAmount ? 'border-red-500' : ''}`}
                      />
                     {paymentErrors.paidAmount && <p className="text-sm text-red-600 mt-1">{paymentErrors.paidAmount}</p>}
                </div>
                )}
                 {saleType !== "credit" && (
                <div className="flex flex-col">
                     <label htmlFor="amount-display" className="block text-sm font-medium text-gray-700">
                         Amount Display
                     </label>
                    <div className="mt-1  text-right font-bold text-gray-800 bg-gray-100 p-2 rounded">
                        {parseFloat(amountDisplay).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                    </div>
                </div>
               )}  {/* Conditional rendering ends here*/}
            </div>
        </Modal>
    </AuthenticatedLayout>
    );
}