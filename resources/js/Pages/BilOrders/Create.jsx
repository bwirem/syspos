import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm ,Link} from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle,faCheck } from '@fortawesome/free-solid-svg-icons';
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


export default function Create({fromstore}) {
    // Form state using Inertia's useForm hook
    const { data, setData, post, errors, processing, reset } = useForm({
        customer_name: '',
        customer_id: null,
        store_name: '',
        store_id: null,
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
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);


    // Customer Search State
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef(null);
    const customerSearchInputRef = useRef(null);
    const [customerIDError, setCustomerIDError] = useState(null);

    // New Customer Modal State
    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);
    const [newCustomerModalSuccess, setNewCustomerModalSuccess] = useState(false);

    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalLoading, setSaveModalLoading] = useState(false);
    const [saveModalSuccess, setSaveModalSuccess] = useState(false);

    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submitModalLoading, setSubmitModalLoading] = useState(false);
    const [submitModalSuccess, setSubmitModalSuccess] = useState(false);


    
    const [storeIDError, setStoreIDError] = useState(null);

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


    // Fetch Customers dynamically (using Inertia)
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

    

    // Reset the form
    const resetForm = () => {
        reset();
        setOrderItems([]);
        setCustomerIDError(null);
        setStoreIDError(null);
        showAlert('Order created successfully!');
    };


    // Handle item search input change
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };


    // Handle customer search input change
    const handleCustomerSearchChange = (e) => {
        const query = e.target.value;
        setCustomerSearchQuery(query);
        setData('customer_name', query); // Keep existing line
        setShowCustomerDropdown(!!query.trim());
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


    // Clear customer search
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


    // Handle customer selection
    const selectCustomer = (selectedCustomer) => {
        setData('customer_name', selectedCustomer.name);
        setData('customer_id', selectedCustomer.id);
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
    };

  

    // Function to handle new customer button click (Open the modal)
    const handleNewCustomerClick = () => {
        setNewCustomerModalOpen(true);
        setNewCustomerModalSuccess(false); //reset state in case open again
    };
    // Function to close the modal
    const handleNewCustomerModalClose = () => {
        setNewCustomerModalOpen(false);
        setNewCustomerName('');
        setNewCustomerModalLoading(false);
        setNewCustomerModalSuccess(false);
    };
    // Function to confirm new customer (you should implement saving logic here)
    const handleNewCustomerModalConfirm = async () => {
        setNewCustomerModalLoading(true);
        try {
            const response = await axios.post(route('systemconfiguration0.customers.directstore'), { name: newCustomerName });

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

    
    const handleSaveClick = () => {

         // Validate customer_id
         if (data.customer_id !== null && !Number.isInteger(Number(data.customer_id))) {
            setCustomerIDError('Customer ID must be an integer.');
            return; // Stop form submission
        } else {
            setCustomerIDError(null); //clear the error when valid
        }

        // Validate store_id
        if (data.store_id !== null && !Number.isInteger(Number(data.store_id))) {
            setStoreIDError('Store ID must be an integer.');
            return; // Stop form submission
        } else {
            setStoreIDError(null);//clear the error when valid
        }

        const hasEmptyFields = orderItems.some(
            (item) => !item.item_name || !item.item_id || item.quantity <= 0 || item.price < 0
        );

        if (hasEmptyFields) {
            showAlert('Please ensure all order items have valid item names, quantities, prices, and item IDs.');
            return;
        }


        if (data.orderitems.length === 0) {
            showAlert('Please add at least one guarantor before saveting.');
            return;
        }       

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
         if (data.customer_id !== null && !Number.isInteger(Number(data.customer_id))) {
            setCustomerIDError('Customer ID must be an integer.');
            return; // Stop form submission
        } else {
            setCustomerIDError(null); //clear the error when valid
        }

        // Validate store_id
        if (data.store_id !== null && !Number.isInteger(Number(data.store_id))) {
            setStoreIDError('Store ID must be an integer.');
            return; // Stop form submission
        } else {
            setStoreIDError(null);//clear the error when valid
        }

        const hasEmptyFields = orderItems.some(
            (item) => !item.item_name || !item.item_id || item.quantity <= 0 || item.price < 0
        );

        if (hasEmptyFields) {
            showAlert('Please ensure all order items have valid item names, quantities, prices, and item IDs.');
            return;
        }
       
        if (data.orderitems.length === 0) {
            showAlert('Please add at least one guarantor before submitting.');
            return;
        }       

        setSubmitModalOpen(true);       
        setSubmitModalLoading(false); // Reset loading state
        setSubmitModalSuccess(false); // Reset success state
    };

    
    const handleSubmitModalClose = () => {
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
                            {/* Customer Name and Store Name */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={customerDropdownRef}>
                                    <div className="flex items-center justify-between h-10">
                                        <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mr-2">
                                            Customer Name
                                        </label>
                                        {/* New Customer Button Added Here */}
                                        <button
                                            type="button"
                                            onClick={handleNewCustomerClick}
                                            className="bg-green-500 text-white rounded p-2 flex items-center space-x-2"
                                        >
                                            <FontAwesomeIcon icon={faPlus} />
                                        </button>
                                    </div>
                                    {/* Added autocomplete attribute here */}
                                    <input
                                        type="text"
                                        placeholder="Search customer..."
                                        value={data.customer_name} // Use the value to bind data
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

                                <div className="relative flex-1">
                                    <div className="flex items-center h-10">
                                        <label htmlFor="store_name" className="block text-sm font-medium text-gray-700 mr-2">
                                            Store Name
                                        </label>                                        
                                    </div>

                                    <select
                                        id="store_id"
                                        value={data.store_id}
                                        onChange={(e) => setData("store_id", e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.store_id ? "border-red-500" : ""}`}
                                    >
                                        <option value="">Select From Store...</option>
                                        {fromstore.map(store => (
                                            <option key={store.id} value={store.id}>
                                                {store.name} 
                                            </option>
                                        ))}
                                    </select>
                                    {errors.store_id && <p className="text-sm text-red-600 mt-1">{errors.store_id}</p>} 
                                      
                                </div>
                            </div>

                            {/* Order Summary and Stage */}
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
                            </div>

                            {/* Order Items Section */}
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

                            {/* Order Items Table */}
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

                            {/* Submit Button */}
                            <div className="flex justify-end space-x-4 mt-6">
                                <Link
                                    href={route('billing0.index')}  // Using the route for navigation
                                    method="get"  // Optional, if you want to define the HTTP method (GET is default)
                                    preserveState={true}  // Keep the page state (similar to `preserveState: true` in the button)
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleSaveClick}
                                    className="bg-blue-500 text-white rounded p-2 flex items-center space-x-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>Save</span>
                                </button>
                                

                                <button
                                    type="button"
                                    onClick={handleSubmitClick}
                                    className="bg-green-500 text-white rounded p-2 flex items-center space-x-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                >
                                    <FontAwesomeIcon icon={faCheck} />
                                    <span>Submit</span>
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

            {/* Save Confirmation Modal */}
            <Modal
                isOpen={saveModalOpen}
                onClose={handleSaveModalClose}
                onConfirm={handleSaveModalConfirm}
                title="Save Confirmation"
                confirmButtonText={saveModalLoading ? 'Loading...' : (saveModalSuccess ? "Success" : 'Save')}
                confirmButtonDisabled={saveModalLoading || saveModalSuccess}
            >
                
                <div className="flex-1">
                    <label htmlFor="stage" className="block text-sm font-medium text-gray-700">
                        Saving Option
                    </label>
                    <select
                        id="stage"
                        value={data.stage}
                        onChange={(e) => setData('stage', e.target.value)}
                        className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.stage ? 'border-red-500' : ''}`}
                    >
                        <option value="1">Draft</option>
                        <option value="2">Quotation</option>                                           
                    </select>
                    {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
                </div>
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
                <div>
                    <p>
                        Are you sure you want to issue the goods to <strong>
                            {data.customer_type === 'individual' ? (
                                `${data.first_name} ${data.other_names ? data.other_names + ' ' : ''}${data.surname}`
                            ) : (
                                data.company_name
                            )}
                        </strong>?
                    </p>                    
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
        </AuthenticatedLayout>
    );
}