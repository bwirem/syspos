import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave } from '@fortawesome/free-solid-svg-icons';
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

export default function Edit({ physicalinventory }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        store_name: physicalinventory.store?.name || '',
        store_id: physicalinventory.store_id || null,
        description: physicalinventory.description || '',
        stage: physicalinventory.stage,
        physicalinventoryitems: physicalinventory.physicalinventoryitems || [],
    });

    // Initialize physicalinventoryItems with countedqty and expectedqty
    const [physicalinventoryItems, setPhysicalinventoryItems] = useState(() => {
        return data.physicalinventoryitems.map(item => ({
            item_name: item.item_name || item.item?.name || '',
            item_id: item.item_id || item.item?.id || null,
            countedqty: item.countedqty || 0,    // Use countedqty
            expectedqty: item.expectedqty || 0,  // Use expectedqty
            price: item.price || 0,
            item: item.item || null,
        }));
    });

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // Store Search State
    const [storeSearchQuery, setStoreSearchQuery] = useState(data.store_name);
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

    // Fetch items dynamically
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
                showAlert('Failed to fetch Stores. Please try again later.');
                setStoreSearchResults([]);
            });
    }, []);



    // Debounced search handler
    const debouncedSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
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
        if (storeSearchQuery.trim()) {
            debouncedStoreSearch(storeSearchQuery);
        } else {
            setStoreSearchResults([]);
        }
    }, [storeSearchQuery, debouncedStoreSearch]);

    //Update physicalinventoryitems
    useEffect(() => {
        setData('physicalinventoryitems', physicalinventoryItems);
    }, [physicalinventoryItems, setData]);


    useEffect(() => {
        // This useEffect is designed to only run when data.physicalinventoryitems changes in identity
        // not on every render, to prevent infinite loops.
        const newItemList = data.physicalinventoryitems.map(item => ({
            item_name: item.item_name || item.item?.name || '',
            item_id: item.item_id || item.item?.id || null,
            countedqty: item.countedqty || 0,  // Use countedqty
            expectedqty: item.expectedqty || 0, // Use expectedqty
            price: item.price || 0,
            item: item.item || null,
        }));

        // Use a simple equality check to prevent unnecessary state updates
        const areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

        if (!areEqual(physicalinventoryItems, newItemList)) {
            setPhysicalinventoryItems(newItemList);
        }
    }, [data.physicalinventoryitems]);

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


    // Updated handlePhysicalinventoryItemChange to handle new fields
    const handlePhysicalinventoryItemChange = (index, field, value) => {
        const updatedItems = [...physicalinventoryItems];
        if (field === 'countedqty' || field === 'expectedqty' || field === 'price') {
            let parsedValue = parseFloat(value);
            if (field === 'countedqty' || field === 'expectedqty') {
                parsedValue = parseInt(value, 10); // Parse as integer for quantities
            }
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setPhysicalinventoryItems(updatedItems);
    };

    //addphysicalinventory
    const addPhysicalinventoryItem = (selectedItem = null) => {
        const newItem = selectedItem
            ? {
                item_name: selectedItem.name,
                item_id: selectedItem.id,
                countedqty: 0,     // Initialize countedqty
                expectedqty: 0,   // Initialize expectedqty
                price: selectedItem.price,
                item: selectedItem
            }
            : {
                item_name: '',
                item_id: null,
                countedqty: 0,
                expectedqty: 0,
                price: 0,
                item: null
            };

        setPhysicalinventoryItems((prevItems) => {
            const updatedItems = [...prevItems, newItem];
            setData('physicalinventoryitems', updatedItems); // Update Inertia data here
            return updatedItems;
        });


        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    const removePhysicalinventoryItem = (index) => {
        setModalState({
            isOpen: true,
            message: 'Are you sure you want to remove this item?',
            isAlert: false,
            itemToRemoveIndex: index,
        });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = physicalinventoryItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setPhysicalinventoryItems(updatedItems);
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
        // Validate store_id
        if (data.store_id !== null && !Number.isInteger(Number(data.store_id))) {
            setStoreIDError('Store ID must be an integer.');
            return; // Stop form submission
        } else {
            setStoreIDError(null);
        }

        //Check for validation
        const hasEmptyFields = physicalinventoryItems.some((item) => {
            const itemName = item.item_name;
            const itemID = item.item_id;
            const parsedCountedQty = parseFloat(item.countedqty);
            const parsedExpectedQty = parseFloat(item.expectedqty);
            const parsedPrice = parseFloat(item.price);

            return !itemName ||
                !itemID ||
                isNaN(parsedCountedQty) || (parsedCountedQty < 0) ||  // Check for valid countedqty
                isNaN(parsedExpectedQty) || (parsedExpectedQty < 0) ||// Check for valid expectedqty
                isNaN(parsedPrice) || parsedPrice < 0;
        });

        if (hasEmptyFields) {
            showAlert('Please ensure all physicalinventory items have valid item names, counted quantities, expected quantities, prices, and item IDs.');
            return;
        }

        setIsSaving(true);

        put(route('inventory3.physical-inventory.update', physicalinventory.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false)
                showAlert('An error occurred while saving the physicalinventory. Please check the console for details.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setPhysicalinventoryItems([]);
        showAlert('Physicalinventory updated successfully!');
    };

    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };

    // Handle Store search input change
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
        setStoreSearchQuery(selectedStore.name);
        setStoreSearchResults([]);
        setShowStoreDropdown(false);
    };



    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Physical Inventory</h2>}
        >
            <Head title="Edit Physical Inventory" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Store Name and Description */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={storeDropdownRef}>
                                    <div className="flex items-center  h-6">
                                        <label htmlFor="store_name" className="block text-sm font-medium text-gray-700">
                                            Store
                                        </label>
                                    </div>
                                    {/* Added autocomplete attribute here */}
                                    <input
                                        type="text"
                                        value={storeSearchQuery}
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

                                {/* Description Input */}
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

                            {/* Physicalinventory Summary and Stage*/}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
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

                            {/* Physicalinventory Items Section */}
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
                                        autoComplete="off"
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

                            {/* Physicalinventory Items Table */}
                            <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Counted Qty</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Qty</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {physicalinventoryItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item_name || (item.item ? item.item.name : 'Unknown Item')}
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.item_id && <span className="text-xs text-gray-400">ID: {item.item_id}</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => removePhysicalinventoryItem(index)}
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
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save Inventory'}</span>
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