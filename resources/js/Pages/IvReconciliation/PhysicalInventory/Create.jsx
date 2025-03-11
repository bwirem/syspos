import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';

import Modal from '@/Components/CustomModal';
import InputField from '@/Components/CustomInputField';

// Utility function for debouncing
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export default function Create() {
    // Form state using Inertia's useForm hook
    const { data, setData, post, errors, processing, reset } = useForm({
        store_name: '',
        store_id: null,
        description: '',
        total: 0, // You might want to rethink how total is calculated for physical inventory
        stage: 1,
        physicalinventoryitems: [],
    });

    // Physicalinventory items state
    const [physicalinventoryItems, setPhysicalinventoryItems] = useState(data.physicalinventoryitems);

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // Store Search State
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [storeSearchResults, setStoreSearchResults] = useState([]);
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const storeDropdownRef = useRef(null);
    const storeSearchInputRef = useRef(null);
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

        axios.get(route('systemconfiguration2.products.search'), { params: { query } })
            .then((response) => {
                setItemSearchResults(response.data.products.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
                showAlert('Failed to fetch products. Please try again later.');
                setItemSearchResults([]);
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
    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    // Debounced Store search handler
    const debouncedStoreSearch = useMemo(() => debounce(fetchStores, 300), [fetchStores]);


    // Fetch items on search query change
    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedItemSearch]);

    // Fetch Stores on search query change
    useEffect(() => {
        if (storeSearchQuery.trim()) {
            debouncedStoreSearch(storeSearchQuery);
        } else {
            setStoreSearchResults([]);
        }
    }, [storeSearchQuery, debouncedStoreSearch]);

    // Update physicalinventory items in the form data whenever the local state changes.
    useEffect(() => {
        setData('physicalinventoryitems', physicalinventoryItems);
    }, [physicalinventoryItems, setData]);

     // *Remove* the useEffect that calculates 'total' based on quantity and price.
     //  This calculation is likely *incorrect* for a physical inventory count.

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

    // Handle click outside Store dropdown
    useEffect(() => {
        const handleClickOutsideStore = (event) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target)) {
                setShowStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideStore);
        return () => document.removeEventListener('mousedown', handleClickOutsideStore);
    }, []);



    // Handle changes in physicalinventory item fields
    const handlePhysicalinventoryItemChange = (index, field, value) => {
      const updatedItems = [...physicalinventoryItems];
      if (field === 'countedqty' || field === 'expectedqty' || field === 'price') {
          // Ensure numeric input, treat empty/invalid as 0
          const parsedValue = parseFloat(value);
          updatedItems[index][field] = isNaN(parsedValue) ? 0 : parsedValue;
      } else {
          updatedItems[index][field] = value;
      }
      setPhysicalinventoryItems(updatedItems);
  };

    // Add new physicalinventory item
    const addPhysicalinventoryItem = (selectedItem = null) => {
        const newItem = selectedItem
            ? {
                item_name: selectedItem.name,
                item_id: selectedItem.id,
                countedqty: 0, // Initialize countedqty
                expectedqty: 0, // Initialize expectedqty
                price: selectedItem.price, // Keep price
            }
            : {
                item_name: '',
                item_id: null,
                countedqty: 0,
                expectedqty: 0,
                price: 0,
            };
        setPhysicalinventoryItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    // Remove physicalinventory item
    const removePhysicalinventoryItem = (index) => {
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
            const updatedItems = physicalinventoryItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setPhysicalinventoryItems(updatedItems);
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

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate store_id
        if (data.store_id !== null && !Number.isInteger(Number(data.store_id))) {
            setStoreIDError('Store ID must be an integer.');
            return; // Stop form submission
        } else {
            setStoreIDError(null);
        }

        // Validation for physicalinventory items
        const hasEmptyFields = physicalinventoryItems.some(
            (item) => !item.item_name || !item.item_id || item.price < 0
        );

        if (hasEmptyFields) {
            showAlert('Please ensure all physical inventory items have valid item names, and item IDs.');
            return;
        }
         // Check for negative countedqty and expectedqty
        const hasNegativeQuantities = physicalinventoryItems.some(
            (item) => item.countedqty < 0 || item.expectedqty < 0
        );

        if (hasNegativeQuantities) {
            showAlert('Counted and Expected Quantities cannot be negative.');
            return;
        }


        setIsSaving(true);
        post(route('inventory3.physical-inventory.store'), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (error) => {
                console.error(error);
                setIsSaving(false);
                showAlert('An error occurred while saving the physical inventory.');
            },
        });
    };

    // Reset the form
    const resetForm = () => {
        reset();
        setPhysicalinventoryItems([]);
        setStoreIDError(null);
        showAlert('Physical inventory created successfully!');
    };

    // Handle item search input change
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };

    // Handle Store search input change
    const handleStoreSearchChange = (e) => {
        const query = e.target.value;
        setStoreSearchQuery(query);
        setData('store_name', query);
        setShowStoreDropdown(!!query.trim());
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

    // Clear Store search
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



    // Handle Store selection
    const selectStore = (selectedStore) => {
        setData('store_name', selectedStore.name);
        setData('store_id', selectedStore.id);
        setStoreSearchQuery('');
        setStoreSearchResults([]);
        setShowStoreDropdown(false);
    };



    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Physical Inventory</h2>}
        >
            <Head title="New Physical Inventory" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Store Name and Description */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={storeDropdownRef}>
                                    <div className="flex items-center  h-6">
                                        <label htmlFor="store_name" className="block text-sm font-medium text-gray-700 mr-2">
                                            Store
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search Store..."
                                        value={data.store_name}
                                        onChange={handleStoreSearchChange}
                                        onFocus={() => setShowStoreDropdown(!!storeSearchQuery.trim())}
                                         className={`w-full border p-2 rounded text-sm pr-10 ${storeIDError ? 'border-red-500' : ''}`}
                                        ref={storeSearchInputRef}
                                        autoComplete="new-password"
                                    />
                                    {storeIDError && <p className="text-sm text-red-600 mt-1">{storeIDError}</p>}
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
                                {/* Description Input Field */}
                                <div className="flex-1">
                                     <InputField
                                        label="Description"
                                        id="description"
                                        name="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Enter description"
                                        error={errors.description}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Physical Inventory Summary and Stage */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                {/*  Remove or repurpose the 'Total' section. It's not directly applicable.
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
                                */}
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
                                        <option value="2">Checked</option>
                                        <option value="6">Cancelled</option>
                                    </select>
                                    {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
                                </div>
                            </div>

                            {/* Physical Inventory Items Section */}
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
                                                        onClick={() => addPhysicalinventoryItem(item)}
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

                            {/* Physical Inventory Items Table */}
                            <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Counted Qty</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Qty</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                           {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th> remove total column */}
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                     {physicalinventoryItems.map((item, index) => (
                                        <tr key={index} className="bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {item.item_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                <InputField
                                                    id={`countedqty_${index}`}
                                                    type="number"
                                                    value={item.countedqty}
                                                    onChange={(e) => handlePhysicalinventoryItemChange(index, 'countedqty', e.target.value)}
                                                    error={errors.physicalinventoryitems && errors.physicalinventoryitems[index]?.countedqty}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                <InputField
                                                    id={`expectedqty_${index}`}
                                                    type="number"
                                                    value={item.expectedqty}
                                                    onChange={(e) => handlePhysicalinventoryItemChange(index, 'expectedqty', e.target.value)}
                                                    error={errors.physicalinventoryitems && errors.physicalinventoryitems[index]?.expectedqty}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                <InputField
                                                    id={`price_${index}`}
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handlePhysicalinventoryItemChange(index, 'price', e.target.value)}
                                                    error={errors.physicalinventoryitems && errors.physicalinventoryitems[index]?.price}
                                                />
                                            </td>
                                            {/*
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                 Consider removing or repurposing the Total column
                                                {parseFloat(item.quantity * item.price).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}

                                            </td>
                                            */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.item_id && <span className="text-xs text-gray-400">ID: {item.item_id}</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => removePhysicalinventoryItem(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <FontAwesomeIcon icon={faTimesCircle} />
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
                                    onClick={() => Inertia.get(route('inventory3.physical-inventory.index'))}
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
                                    <span>{isSaving ? 'Saving...' : 'Save Inventory'}</span> {/* Updated button text */}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* Modal */}
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