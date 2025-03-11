import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
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


export default function Create() {
    // Form state using Inertia's useForm hook
    const { data, setData, post, errors, processing, reset } = useForm({
        from_store_name: '',
        from_store_id: null,
        to_store_name: '',
        to_store_id: null,
        total: 0,
        stage: 1,
        requistionitems: [],
    });

    // Requistion items state
    const [requistionItems, setRequistionItems] = useState(data.requistionitems);

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);


    // From Store Search State
    const [fromStoreSearchQuery, setFromStoreSearchQuery] = useState('');
    const [fromStoreSearchResults, setFromStoreSearchResults] = useState([]);
    const [showFromStoreDropdown, setShowFromStoreDropdown] = useState(false);
    const fromStoreDropdownRef = useRef(null);
    const fromStoreSearchInputRef = useRef(null);
    const [fromStoreIDError, setFromStoreIDError] = useState(null);


    // To Store Search State
    const [toStoreSearchQuery, setToStoreSearchQuery] = useState('');
    const [toStoreSearchResults, setToStoreSearchResults] = useState([]);
    const [showToStoreDropdown, setShowToStoreDropdown] = useState(false);
    const toStoreDropdownRef = useRef(null);
    const toStoreSearchInputRef = useRef(null);
    const [toStoreIDError, setToStoreIDError] = useState(null);

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


    // Fetch From Stores dynamically (using Inertia)
    const fetchFromStores = useCallback((query) => {
        if (!query.trim()) {
            setFromStoreSearchResults([]);
            return;
        }

        axios.get(route('systemconfiguration2.stores.search'), { params: { query } })
            .then((response) => {
                setFromStoreSearchResults(response.data.stores.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching stores:', error);
                showAlert('Failed to fetch stores. Please try again later.');
                setFromStoreSearchResults([]);
            });
    }, []);


    // Fetch To Store dynamically (using Inertia)
    const fetchToStores = useCallback((query) => {
        if (!query.trim()) {
            setToStoreSearchResults([]);
            return;
        }

        axios.get(route('systemconfiguration2.stores.search'), { params: { query } })
            .then((response) => {
                setToStoreSearchResults(response.data.stores.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching stores:', error);
                showAlert('Failed to fetch stores. Please try again later.');
                setToStoreSearchResults([]);
            });
    }, []);

    // Debounced search handler
    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    // Debounced From Store search handler
    const debouncedFromStoreSearch = useMemo(() => debounce(fetchFromStores, 300), [fetchFromStores]);
    // Debounced To Store search handler
    const debouncedToStoreSearch = useMemo(() => debounce(fetchToStores, 300), [fetchToStores]);

    // Fetch items on search query change
    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedItemSearch]);

    // Fetch From Stores on search query change
    useEffect(() => {
        if (fromStoreSearchQuery.trim()) {
            debouncedFromStoreSearch(fromStoreSearchQuery);
        } else {
            setFromStoreSearchResults([]);
        }
    }, [fromStoreSearchQuery, debouncedFromStoreSearch]);

    // Fetch To Stores on search query change
    useEffect(() => {
        if (toStoreSearchQuery.trim()) {
            debouncedToStoreSearch(toStoreSearchQuery);
        } else {
            setToStoreSearchResults([]);
        }
    }, [toStoreSearchQuery, debouncedToStoreSearch]);


    // Update total on requistion item changes
    useEffect(() => {
        setData('requistionitems', requistionItems);
        const calculatedTotal = requistionItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
    }, [requistionItems, setData]);


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


    // Handle click outside From Store dropdown
    useEffect(() => {
        const handleClickOutsideFromStore = (event) => {
            if (fromStoreDropdownRef.current && !fromStoreDropdownRef.current.contains(event.target)) {
                setShowFromStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideFromStore);
        return () => document.removeEventListener('mousedown', handleClickOutsideFromStore);
    }, []);

    // Handle click outside To Store dropdown
    useEffect(() => {
        const handleClickOutsideToStore = (event) => {
            if (toStoreDropdownRef.current && !toStoreDropdownRef.current.contains(event.target)) {
                setShowToStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideToStore);
        return () => document.removeEventListener('mousedown', handleClickOutsideToStore);
    }, []);

    // Handle changes in requistion item fields
    const handleRequistionItemChange = (index, field, value) => {
        const updatedItems = [...requistionItems];
        if (field === 'quantity' || field === 'price') {
            const parsedValue = parseFloat(value);
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setRequistionItems(updatedItems);
    };


    // Add new requistion item
    const addRequistionItem = (selectedItem = null) => {
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
        setRequistionItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };


    // Remove requistion item
    const removeRequistionItem = (index) => {
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
            const updatedItems = requistionItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setRequistionItems(updatedItems);
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

        // Validate from_store_id
        if (data.from_store_id !== null && !Number.isInteger(Number(data.from_store_id))) {
            setFromStoreIDError('From Store ID must be an integer.');
            return; // Stop form submission
        } else {
            setFromStoreIDError(null); //clear the error when valid
        }

        // Validate to_store_id
        if (data.to_store_id !== null && !Number.isInteger(Number(data.to_store_id))) {
            setToStoreIDError('To Store ID must be an integer.');
            return; // Stop form submission
        } else {
            setToStoreIDError(null);//clear the error when valid
        }

        const hasEmptyFields = requistionItems.some(
            (item) => !item.item_name || !item.item_id || item.quantity <= 0 || item.price < 0
        );

        if (hasEmptyFields) {
            showAlert('Please ensure all requistion items have valid item names, quantities, prices, and item IDs.');
            return;
        }


        setIsSaving(true);
        post(route('inventory0.store'), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (error) => {
                console.error(error);
                setIsSaving(false);
                showAlert('An error occurred while saving the requistion.');
            },
        });
    };


    // Reset the form
    const resetForm = () => {
        reset();
        setRequistionItems([]);
        setFromStoreIDError(null);
        setToStoreIDError(null);
        showAlert('Requistion created successfully!');
    };


    // Handle item search input change
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };


    // Handle From Store search input change
    const handleFromStoreSearchChange = (e) => {
        const query = e.target.value;
        setFromStoreSearchQuery(query);
        setData('from_store_name', query); // Keep existing line
        setShowFromStoreDropdown(!!query.trim());
    };


    // Handle To Store search input change
    const handleToStoreSearchChange = (e) => {
        const query = e.target.value;
        setToStoreSearchQuery(query);
        setData('to_store_name', query); // Added this line
        setShowToStoreDropdown(!!query.trim());
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


    // Clear From Store search
    const handleClearFromStoreSearch = () => {
        setFromStoreSearchQuery('');
        setFromStoreSearchResults([]);
        setShowFromStoreDropdown(false);
        if (fromStoreSearchInputRef.current) {
            fromStoreSearchInputRef.current.focus();
        }
        setData('from_store_name', '');
        setData('from_store_id', null);
    };

    // Clear To Store search
    const handleClearToStoreSearch = () => {
        setToStoreSearchQuery('');
        setToStoreSearchResults([]);
        setShowToStoreDropdown(false);
        if (toStoreSearchInputRef.current) {
            toStoreSearchInputRef.current.focus();
        }
        setData('to_store_name', '');
        setData('to_store_id', null);
    };


    // Handle From Store selection
    const selectFromStore = (selectedFromStore) => {
        setData('from_store_name', selectedFromStore.name);
        setData('from_store_id', selectedFromStore.id);
        setFromStoreSearchQuery('');
        setFromStoreSearchResults([]);
        setShowFromStoreDropdown(false);
    };

    // Handle To Store selection
    const selectToStore = (selectedToStore) => {
        setData('to_store_name', selectedToStore.name); // Update to_store_name
        setData('to_store_id', selectedToStore.id);   // Update to_store_id
        setToStoreSearchQuery('');
        setToStoreSearchResults([]);
        setShowToStoreDropdown(false);
    };


    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Requistion</h2>}
        >
            <Head title="Create Requistion" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* From Store Name and To Store Name */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={fromStoreDropdownRef}>
                                    <div className="flex items-center  h-10">
                                        <label htmlFor="from_store_name" className="block text-sm font-medium text-gray-700 mr-2">
                                            From Store
                                        </label>
                                    </div>
                                    {/* Added autocomplete attribute here */}
                                    <input
                                        type="text"
                                        placeholder="Search From Store..."
                                        value={data.from_store_name} // Use the value to bind data
                                        onChange={handleFromStoreSearchChange}
                                        onFocus={() => setShowFromStoreDropdown(!!fromStoreSearchQuery.trim())}
                                        className={`w-full border p-2 rounded text-sm pr-10 ${fromStoreIDError ? 'border-red-500' : ''}`}
                                        ref={fromStoreSearchInputRef}
                                        autoComplete="new-password"
                                    />
                                    {fromStoreIDError && <p className="text-sm text-red-600 mt-1">{fromStoreIDError}</p>}
                                    {fromStoreSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearFromStoreSearch}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            <FontAwesomeIcon icon={faTimesCircle} />
                                        </button>
                                    )}
                                    {showFromStoreDropdown && (
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                            {fromStoreSearchResults.length > 0 ? (
                                                fromStoreSearchResults.map((fromStore) => (
                                                    <li
                                                        key={fromStore.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => selectFromStore(fromStore)}
                                                    >
                                                        {fromStore.name}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-gray-500">No stores found.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                <div className="relative flex-1" ref={toStoreDropdownRef}>
                                    <div className="flex items-center h-10">
                                        <label htmlFor="to_store_name" className="block text-sm font-medium text-gray-700 mr-2">
                                            To Store
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search To Store..."
                                        value={data.to_store_name}
                                        onChange={handleToStoreSearchChange}
                                        onFocus={() => setShowToStoreDropdown(!!toStoreSearchQuery.trim())}
                                        className="w-full border p-2 rounded text-sm pr-10"
                                        ref={toStoreSearchInputRef}
                                        autoComplete="new-password"
                                    />
                                    {toStoreSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearToStoreSearch}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            <FontAwesomeIcon icon={faTimesCircle} />
                                        </button>
                                    )}
                                    {showToStoreDropdown && (
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                            {toStoreSearchResults.length > 0 ? (
                                                toStoreSearchResults.map((toStore) => (
                                                    <li
                                                        key={toStore.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => selectToStore(toStore)}
                                                    >
                                                        {toStore.name}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-gray-500">No stores found.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Requistion Summary and Stage */}
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
                                        <option value="2">Checked</option>                                        
                                        <option value="6">Cancelled</option>
                                    </select>
                                    {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
                                </div>
                            </div>

                            {/* Requistion Items Section */}
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
                                                        onClick={() => addRequistionItem(item)}
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

                            {/* Requistion Items Table */}
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
                                        {requistionItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.item_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`quantity_${index}`}
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleRequistionItemChange(index, 'quantity', e.target.value)}
                                                        error={errors.requistionitems && errors.requistionitems[index]?.quantity}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`price_${index}`}
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => handleRequistionItemChange(index, 'price', e.target.value)}
                                                        error={errors.requistionitems && errors.requistionitems[index]?.price}
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
                                                        onClick={() => removeRequistionItem(index)}
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
                                    onClick={() => Inertia.get(route('inventory0.index'))}
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
                                    <span>{isSaving ? 'Saving...' : 'Save Requistion'}</span>
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