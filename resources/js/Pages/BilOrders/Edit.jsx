import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
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


export default function Edit({ order }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        customer_name: order.customer.name,
        customer_id: order.customer_id,
        store_name: order.store.name,
        store_id: order.store_id,
        total: order.total,
        stage: order.stage,
        orderitems: order.orderitems || [],
    });

    const [orderItems, setOrderItems] = useState(data.orderitems);
    
   // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // Customer Search State
    const [customerSearchQuery, setCustomerSearchQuery] = useState(data.customer_name);
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef(null);
    const customerSearchInputRef = useRef(null);

    // Store Search State
    const [storeSearchQuery, setStoreSearchQuery] = useState(data.store_name);
    const [storeSearchResults, setStoreSearchResults] = useState([]);
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const storeDropdownRef = useRef(null);
    const storeSearchInputRef = useRef(null);


    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });

    const [isSaving, setIsSaving] = useState(false);


    // Fetch items dynamically
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

    // Fetch Customers dynamically
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

    // Fetch Stores dynamically
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


    // Debounced search handler
    const debouncedSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    // Debounced customer search handler
    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 300), [fetchCustomers]);
    // Debounced store search handler
    const debouncedStoreSearch = useMemo(() => debounce(fetchStores, 300), [fetchStores]);

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedSearch]);


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
    }, [orderItems, setData]);

    useEffect(() => {
        setOrderItems(data.orderitems); // Update orderItems when data changes
    }, [data.orderitems]);


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

    // Handle click outside store dropdown
    useEffect(() => {
        const handleClickOutsideStore = (event) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target)) {
                setShowStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideStore);
        return () => document.removeEventListener('mousedown', handleClickOutsideStore);
    }, []);


    const handleOrderItemChange = (index, field, value) => {
        const updatedItems = [...orderItems];
        if (field === 'quantity' || field === 'price') {
            let parsedValue = parseFloat(value);
             if (field === 'quantity') {
               parsedValue = parseInt(value, 10);
             }
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
                price: selectedItem.price,
                item: selectedItem
            }
            : {
                item_name: '',
                item_id: null,
                quantity: 1,
                price: 0,
                item: null
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

        const hasEmptyFields = orderItems.some((item) => {
           const itemName = item.item?.name;
           const parsedQuantity =  parseFloat(item.quantity);
            const parsedPrice = parseFloat(item.price);
            return !itemName ||
                   !item.item_id ||
                   isNaN(parsedQuantity) || (parsedQuantity <= 0) ||
                   isNaN(parsedPrice) || parsedPrice < 0;
        });

        if (hasEmptyFields) {
            showAlert('Please ensure all order items have valid item names, quantities, prices, and item IDs.');
             return;
        }

        setIsSaving(true);

        put(route('billing0.update', order.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false)
                showAlert('An error occurred while saving the order. Please check the console for details.');
            },
        });
    };


    const resetForm = () => {
        reset();
        setOrderItems([]);
        showAlert('Order updated successfully!');
    };

    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };

      const handleCustomerSearchChange = (e) => {
          const query = e.target.value;
          setCustomerSearchQuery(query);
          setShowCustomerDropdown(!!query.trim());
           setData('customer_name', query);
      };


     const handleStoreSearchChange = (e) => {
          const query = e.target.value;
          setStoreSearchQuery(query);
          setShowStoreDropdown(!!query.trim());
            setData('store_name', query);
      };

    const handleClearItemSearch = () => {
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
    };

      const handleClearStoreSearch = () => {
        setStoreSearchQuery('');
        setStoreSearchResults([]);
        setShowStoreDropdown(false);
           if (storeSearchInputRef.current) {
            storeSearchInputRef.current.focus();
        }
    };


    const selectCustomer = (selectedCustomer) => {
         setData('customer_name', selectedCustomer.name);
         setData('customer_id', selectedCustomer.id);
         setCustomerSearchQuery(selectedCustomer.name);
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
    };

       const selectStore = (selectedStore) => {
         setData('store_name', selectedStore.name);
         setData('store_id', selectedStore.id);
         setStoreSearchQuery(selectedStore.name);
        setStoreSearchResults([]);
        setShowStoreDropdown(false);
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Order</h2>}
        >
            <Head title="Edit Order" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                           {/* Customer Name */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={customerDropdownRef}>
                                    <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                                        Customer Name
                                    </label>
                                    <input
                                         type="text"
                                        value={customerSearchQuery}
                                        onChange={handleCustomerSearchChange}
                                        onFocus={() => setShowCustomerDropdown(!!customerSearchQuery.trim())}
                                        className="w-full border p-2 rounded text-sm pr-10"
                                        ref={customerSearchInputRef}
                                        autocomplete="new-password"
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
                                    <label htmlFor="store_name" className="block text-sm font-medium text-gray-700">
                                      Store Name
                                    </label>
                                        <input
                                            type="text"
                                            value={storeSearchQuery}
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

                            {/* Order Summary and Stage*/}
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
                                        <option value="1">Draft</option>
                                        <option value="2">Quotation</option>
                                        <option value="3">Approved</option>
                                        <option value="6">Cancelled</option>
                                    </select>
                                    {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
                                </div>
                            </div>

                            {/* Order Items Section */}
                            <div className="flex items-center space-x-4 mb-2 py-1">
                                <div className="relative flex-1" ref={itemDropdownRef}>
                                    <input
                                        type="text"
                                        placeholder="Search item..."
                                        value={itemSearchQuery}
                                        onChange={handleItemSearchChange}
                                        onFocus={() => setShowItemDropdown(!!itemSearchQuery.trim())}
                                        className="w-full border p-2 rounded text-sm pr-10"
                                        ref={itemSearchInputRef}
                                         autocomplete="off"
                                    />
                                    {itemSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearItemSearch}
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
                                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item ? item.item.name : 'Unknown Item'}
                                                </td>
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
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('billing0.index'))}
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
                            </div>
                        </form>
                    </div>
                </div>
            </div>
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