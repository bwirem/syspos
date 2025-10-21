import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm ,Link} from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle,faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx'; 
import InputField from '../../Components/CustomInputField.jsx'; 


// Utility function for debouncing
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

// Helper for currency formatting
const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function Create({fromstore , auth, priceCategories}) {
    // Form state using Inertia's useForm hook
    const { data, setData, post, errors, processing, reset } = useForm({
        customer_name: '',
        customer_id: null,
        store_name: '',
        store_id: auth?.user?.store_id || null, 
        pricecategory_name: '',
        pricecategory_id: auth?.user?.pricecategory_id || null,
        total: 0,
        stage: 1,
        orderitems: [],
    });

    // Order items state
    const [orderItems, setOrderItems] = useState(data.orderitems);

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);


    // Customer Search State
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
    const customerDropdownRef = useRef(null);
    const customerSearchInputRef = useRef(null);
    const [customerIDError, setCustomerIDError] = useState(null);

     // New Customer Modal State
     const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
     const [newCustomer, setNewCustomer] = useState({
         customer_type: 'individual',
         first_name: '',
         other_names: '',
         surname: '',
         company_name: '',
         email: '',
         phone: '',
     });
     const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);
     const [newCustomerModalSuccess, setNewCustomerModalSuccess] = useState(false);

    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalLoading, setSaveModalLoading] = useState(false);
    const [saveModalSuccess, setSaveModalSuccess] = useState(false);

    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submitModalLoading, setSubmitModalLoading] = useState(false);
    const [submitModalSuccess, setSubmitModalSuccess] = useState(false);


    
    const [storeIDError, setStoreIDError] = useState(null);
    const [pricecategoryIDError, setPricecategoryIDError] = useState(null);

    // Modal state
    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });

    // Saving state
    const [isSaving, setIsSaving] = useState(false);


    // Fetch items dynamically (using Inertia)
    const fetchItems = useCallback((query) => {
        if (!query.trim()) {
            setItemSearchResults([]);
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


    // Fetch Customers dynamically (using Inertia)
    const fetchCustomers = useCallback((query) => {
        if (!query.trim()) {
            setCustomerSearchResults([]);
            return;
        }

        setIsCustomerSearchLoading(true);
        axios.get(route('systemconfiguration0.customers.search'), { params: { query } })
            .then((response) => setCustomerSearchResults(response.data.customers?.slice(0, 10) || [])) // Increased limit
            .catch(() => showAlert('Error', 'Failed to fetch customers.'))
            .finally(() => setIsCustomerSearchLoading(false));
    }, []);

       
    // Debounced search handler
    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    // Debounced customer search handler
    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 300), [fetchCustomers]);    

    // Fetch items on search query change
    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedItemSearch]);

    // Fetch customers on search query change
    useEffect(() => {
        if (customerSearchQuery.trim()) {
            debouncedCustomerSearch(customerSearchQuery);
        } else {
            setCustomerSearchResults([]);
        }
    }, [customerSearchQuery, debouncedCustomerSearch]);
   

    // Update total on order item changes
    useEffect(() => {
        setData('orderitems', orderItems);
        const calculatedTotal = orderItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
    }, [orderItems, setData]);


    // Handle click outside item dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // Handle click outside customer dropdown
    useEffect(() => {
        const handleClickOutsideCustomer = (event) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
                setShowCustomerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideCustomer);
        return () => document.removeEventListener('mousedown', handleClickOutsideCustomer);
    }, []);
    

    // Handle changes in order item fields
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


    // Add new order item
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


    // Remove order item
    const removeOrderItem = (index) => {
        setModalState({
            isOpen: true,
            message: 'Are you sure you want to remove this item?',
            isAlert: false,
            itemToRemoveIndex: index,
        });
    };

    // Handle modal confirmation
    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = orderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setOrderItems(updatedItems);
        }
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };

    // Handle modal close
    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            itemToRemoveIndex: null,
        });
    };

     // Utility function to validate integers properly
     const isValidInteger = (value) => {
        return value !== null && value !== '' && !isNaN(value) && Number.isInteger(Number(value));
    };


    // Handle item search input change
    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };    
  
    // Clear item search
    const handleClearSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };

    // Handle customer search input change
    const handleCustomerSearchChange = (e) => {
        const query = e.target.value;
        setCustomerSearchQuery(query);
        setCustomerSearchResults([]); // Clear previous results
        setShowCustomerDropdown(!!query.trim());

        // Update appropriate fields based on customer type
        setData((prevData) => ({
            ...prevData,
            first_name: '',
            other_names: '',
            surname: '',
            company_name: '',
            email: '',
            phone: '',
            customer_id: null,
        }));
    };

    // Clear customer search
    const handleClearCustomerSearch = () => {
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
        if (customerSearchInputRef.current) {
            customerSearchInputRef.current.focus();
        }

        setData((prevData) => ({
            ...prevData,
            first_name: '',
            other_names: '',
            surname: '',
            company_name: '',
            email: '',
            phone: '',
            customer_id: null,
        }));
    };


    // Handle customer selection
    const selectCustomer = (selectedCustomer) => {
        setData((prevData) => ({
            ...prevData,
            customer_type: selectedCustomer.customer_type,
            first_name: selectedCustomer.first_name || '',
            other_names: selectedCustomer.other_names || '',
            surname: selectedCustomer.surname || '',
            company_name: selectedCustomer.company_name || '',
            email: selectedCustomer.email,
            phone: selectedCustomer.phone || '',
            customer_id: selectedCustomer.id,
        }));

        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
    };

  
    // Function to handle new customer button click (Open the modal)
    const handleNewCustomerClick = () => {
        setNewCustomerModalOpen(true);
        setNewCustomerModalSuccess(false); //reset state in case open again
        setNewCustomer({
            customer_type: 'individual',
            first_name: '',
            other_names: '',
            surname: '',
            company_name: '',
            email: '',
            phone: '',
        });
    };
    // Function to close the modal
    const handleNewCustomerModalClose = () => {
        setNewCustomerModalOpen(false);
        setNewCustomerModalLoading(false);
        setNewCustomerModalSuccess(false);
    };

    // Function to confirm new customer (you should implement saving logic here)
    const handleNewCustomerModalConfirm = async () => {
        setNewCustomerModalLoading(true);
        try {
            const response = await axios.post(route('systemconfiguration0.customers.directstore'), newCustomer);

            if (response.data && response.data.id) {
                setData((prevData) => ({
                    ...prevData,
                    customer_type: response.data.customer_type,
                    first_name: response.data.first_name,
                    other_names: response.data.other_names,
                    surname: response.data.surname,
                    company_name: response.data.company_name,
                    email: response.data.email,
                    phone: response.data.phone,
                    customer_id: response.data.id,
                }));

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
                setNewCustomerModalSuccess(false);
            }, 1000)

        }

    };

    const handleNewCustomerInputChange = (e) => {
        const { id, value } = e.target;
        setNewCustomer(prevState => ({
            ...prevState,
            [id]: value,
        }));
    };

    
    const handleSaveClick = () => {       
    
        // Validate customer_id
        if (!isValidInteger(data.customer_id)) {
            setCustomerIDError('Customer ID must be a valid integer.');
            return;
        } else {
            setCustomerIDError(null); // Clear the error when valid
        }
    
        // Validate store_id
        if (!isValidInteger(data.store_id)) {
            setStoreIDError('Store ID must be a valid integer.');
            return;
        } else {
            setStoreIDError(null); // Clear the error when valid
        }
        
    
        // Check if orderitems array exists and has at least one item
        if (!Array.isArray(data.orderitems) || data.orderitems.length === 0) {
            showAlert('Please add at least one item before saving.');
            return;
        }
    
        // Validate contents of each order item
        const hasEmptyFields = data.orderitems.some(
            (item) =>
                !item.item_name || 
                !item.item_id || 
                item.quantity === undefined || 
                item.quantity <= 0 || 
                item.price === undefined || 
                item.price < 0
        );
    
        if (hasEmptyFields) {
            showAlert('Please ensure all order items have valid item names, item IDs, quantities, and prices.');
            return;
        }
    
        // All validations passed — proceed to show confirmation modal
        setSaveModalOpen(true);
        setSaveModalLoading(false); // Reset loading state
        setSaveModalSuccess(false); // Reset success state
    };
    
    
    const handleSaveModalClose = () => {
      
        setSaveModalOpen(false);        
        setSaveModalLoading(false); // Reset loading state
        setSaveModalSuccess(false); // Reset success state
    };

    const handleSaveModalConfirm = () => {        
    
        const formData = new FormData();      
    
        setSaveModalLoading(true); // Set loading state
    
        post(route('billing0.store'), formData, {
            forceFormData: true,
            onSuccess: () => {
                setSaveModalLoading(false);
                reset(); // Reset form data
                setSaveModalSuccess(true); // Set success state
                handleSaveModalClose(); // Close the modal on success
            },
            onError: (errors) => {
                setSaveModalLoading(false);
                console.error('Submission errors:', errors);
            },
        });
    };


    const handleSubmitClick = () => {
       
          // Validate customer_id
        if (!isValidInteger(data.customer_id)) {
            setCustomerIDError('Customer ID must be a valid integer.');
            return;
        } else {
            setCustomerIDError(null); // Clear the error when valid
        }
    
        // Validate store_id
        if (!isValidInteger(data.store_id)) {
            setStoreIDError('Store ID must be a valid integer.');
            return;
        } else {
            setStoreIDError(null); // Clear the error when valid
        }       

        const hasEmptyFields = orderItems.some(
            (item) => !item.item_name || !item.item_id || item.quantity <= 0 || item.price < 0
        );

        if (hasEmptyFields) {
            showAlert('Please ensure all order items have valid item names, quantities, prices, and item IDs.');
            return;
        }
       
        if (data.orderitems.length === 0) {
            showAlert('Please add at least one item before submitting.');
            return;
        }   

        setData('stage', 3); // Set stage to 3 for submission

        setSubmitModalOpen(true);       
        setSubmitModalLoading(false); // Reset loading state
        setSubmitModalSuccess(false); // Reset success state
    };

    
    const handleSubmitModalClose = () => {

        setData('stage', 1); // Set stage back to 1 for draft

        setSubmitModalOpen(false);        
        setSubmitModalLoading(false); // Reset loading state
        setSubmitModalSuccess(false); // Reset success state
    };

    const handleSubmitModalConfirm = () => {        
    
        const formData = new FormData();      
    
        setSubmitModalLoading(true); // Set loading state
    
        post(route('billing0.store'), formData, {
           
            onSuccess: () => {
                setSubmitModalLoading(false);
                reset(); // Reset form data
                setSubmitModalSuccess(true); // Set success state
                handleSubmitModalClose(); // Close the modal on success
            },
            onError: (errors) => {
                setSubmitModalLoading(false);
                console.error('Submission errors:', errors);
            },
        });
    };

   

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Order</h2>}
        >
            <Head title="Create Order" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
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
                                                type="text"
                                                placeholder="Search customer..."
                                                value={customerSearchQuery}
                                                onChange={handleCustomerSearchChange}
                                                onFocus={() => setShowCustomerDropdown(!!customerSearchQuery.trim())}
                                                className={`w-full border p-2 rounded text-sm pr-10 ${customerIDError ? 'border-red-500' : ''}`}
                                                ref={customerSearchInputRef}
                                                autoComplete="off"
                                            />
                                          
                                            {customerSearchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearCustomerSearch}
                                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    <FontAwesomeIcon icon={faTimesCircle} />
                                                </button>
                                            )}
                                            
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

                                            <button
                                                type="button"
                                                onClick={handleNewCustomerClick}
                                                className="bg-green-500 text-white rounded p-2 flex items-center space-x-2"
                                            >
                                                <FontAwesomeIcon icon={faPlus} />
                                            </button>
                                    </div>

                                    {(errors.customer_id || customerIDError) && <p className="text-xs text-red-500 mt-1">{errors.customer_id || customerIDError}</p>}

                                    {data.customer_id && (
                                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-sm">
                                            Selected: <strong className="text-gray-700 dark:text-gray-100">{data.customer_type === 'individual' ? (
                                                `${data.first_name} ${data.other_names ? data.other_names + ' ' : ''}${data.surname}`
                                            ) : (
                                                data.company_name
                                            )}</strong>
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
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{item.item_name} <span className="text-xs text-gray-400"></span></td>
                                                            <td className="px-1 py-1">
                                                                <InputField id={`qty_${index}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)} className="w-full text-right text-sm" error={errors[`orderitems.${index}.quantity`]} />
                                                            </td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.price)}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.quantity * item.price)}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <button type="button" onClick={() => removeOrderItem(index)} className="text-red-500 hover:text-red-700">
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
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> Close
                                </Link>

                                <button type="button" onClick={handleSaveClick} disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center">
                                    <FontAwesomeIcon icon={processing ? faSpinner : faSave} spin={processing} className="mr-2" /> Save
                                </button>
                                <button type="button" onClick={handleSubmitClick} disabled={processing}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center">
                                    <FontAwesomeIcon icon={processing ? faSpinner : faCheck} spin={processing} className="mr-2" /> Submit
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
                <form className="space-y-4">
                    <div>
                        <label htmlFor="customer_type" className="block text-sm font-medium text-gray-700">Customer Type</label>
                        <select
                            id="customer_type"
                            value={newCustomer.customer_type}
                            onChange={handleNewCustomerInputChange}
                            className="w-full border p-2 rounded text-sm"
                            disabled={newCustomerModalLoading || newCustomerModalSuccess}
                        >
                            <option value="individual">Individual</option>
                            <option value="company">Company</option>
                        </select>
                    </div>

                    {newCustomer.customer_type === 'individual' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    type="text"
                                    id="first_name"
                                    value={newCustomer.first_name}
                                    onChange={handleNewCustomerInputChange}
                                    className="w-full border p-2 rounded text-sm"
                                    disabled={newCustomerModalLoading || newCustomerModalSuccess}
                                />
                            </div>
                            <div>
                                <label htmlFor="other_names" className="block text-sm font-medium text-gray-700">Other Names</label>
                                <input
                                    type="text"
                                    id="other_names"
                                    value={newCustomer.other_names}
                                    onChange={handleNewCustomerInputChange}
                                    className="w-full border p-2 rounded text-sm"
                                    disabled={newCustomerModalLoading || newCustomerModalSuccess}
                                />
                            </div>
                            <div>
                                <label htmlFor="surname" className="block text-sm font-medium text-gray-700">Surname</label>
                                <input
                                    type="text"
                                    id="surname"
                                    value={newCustomer.surname}
                                    onChange={handleNewCustomerInputChange}
                                    className="w-full border p-2 rounded text-sm"
                                    disabled={newCustomerModalLoading || newCustomerModalSuccess}
                                />
                            </div>
                        </div>
                    )}

                    {newCustomer.customer_type === 'company' && (
                        <div>
                            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">Company Name</label>
                            <input
                                type="text"
                                id="company_name"
                                value={newCustomer.company_name}
                                onChange={handleNewCustomerInputChange}
                                className="w-full border p-2 rounded text-sm"
                                disabled={newCustomerModalLoading || newCustomerModalSuccess}
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={newCustomer.email}
                            onChange={handleNewCustomerInputChange}
                            className="w-full border p-2 rounded text-sm"
                            disabled={newCustomerModalLoading || newCustomerModalSuccess}
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                            type="text"
                            id="phone"
                            value={newCustomer.phone}
                            onChange={handleNewCustomerInputChange}
                            className="w-full border p-2 rounded text-sm"
                            disabled={newCustomerModalLoading || newCustomerModalSuccess}
                        />
                    </div>
                </form>
            </Modal>

            {/* Save Confirmation Modal */}
            <Modal
                isOpen={saveModalOpen}
                onClose={handleSaveModalClose}
                onConfirm={handleSaveModalConfirm}
                title="Save Confirmation"
                confirmButtonText={saveModalLoading ? 'Loading...' : (saveModalSuccess ? "Success" : 'Save')}
                confirmButtonDisabled={saveModalLoading || saveModalSuccess}
            >
                
                         

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select how you want to save this order:</p>
                    <select id="stage" value={data.stage} onChange={(e) => setData('stage', e.target.value)}
                        className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 border-gray-300"
                    >
                        <option value="1">Save as Draft</option>
                        <option value="2">Save as Quotation</option>
                    </select>
                    {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
              
            </Modal>

            {/* Submit Confirmation Modal */}
            <Modal
                isOpen={submitModalOpen}
                onClose={handleSubmitModalClose}
                onConfirm={handleSubmitModalConfirm}
                title="Submit Confirmation"
                confirmButtonText={submitModalLoading ? 'Loading...' : (submitModalSuccess ? "Success" : 'Submit')}
                confirmButtonDisabled={submitModalLoading || submitModalSuccess}
            >
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Are you sure you want to submit this order for <strong>
                        {data.customer_type === 'individual' ? (
                            `${data.first_name} ${data.other_names ? data.other_names + ' ' : ''}${data.surname}`
                        ) : (
                            data.company_name
                        )}
                    </strong>? This will finalize the order.
                </p>  
            </Modal>

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}