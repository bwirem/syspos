import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faTrash, faSave } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css'; // Corrected import
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

export default function Receive({ requistion }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        from_store_name: requistion.fromstore?.name || '',
        from_store_id: requistion.fromstore_id || null,
        to_store_name: requistion.tostore?.name || '',
        to_store_id: requistion.tostore_id || null,
        total: requistion.total,
        stage: requistion.stage,
        delivery_no:null,
        expiry_date : null,
        double_entry: true,
        requistionitems: requistion.requistionitems || [],
    });

    const [requistionItems, setRequistionItems] = useState(() => {
        return data.requistionitems.map(item => ({
            item_name: item.item_name || item.item?.name || '',
            item_id: item.item_id || item.item?.id || null,
            quantity: item.quantity || 1,
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

    // From Store Search State
    const [fromStoreSearchQuery, setFromStoreSearchQuery] = useState(data.from_store_name);
    const [fromStoreSearchResults, setFromStoreSearchResults] = useState([]);
    const [showFromStoreDropdown, setShowFromStoreDropdown] = useState(false);
    const fromStoreDropdownRef = useRef(null);
    const fromStoreSearchInputRef = useRef(null);

    // To Store Search State
    const [toStoreSearchQuery, setToStoreSearchQuery] = useState(data.to_store_name);
    const [toStoreSearchResults, setToStoreSearchResults] = useState([]);
    const [showToStoreDropdown, setShowToStoreDropdown] = useState(false);
    const toStoreDropdownRef = useRef(null);
    const toStoreSearchInputRef = useRef(null);

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

    // Fetch From Stores dynamically
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
                console.error('Error fetching from_stores:', error);
                showAlert('Failed to fetch From Stores. Please try again later.');
                setFromStoreSearchResults([]);
            });
    }, []);

    // Fetch To Stores dynamically
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
                console.error('Error fetching to_stores:', error);
                showAlert('Failed to fetch To Stores. Please try again later.');
                setToStoreSearchResults([]);
            });
    }, []);

    // Debounced search handler
    const debouncedSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    // Debounced fromStore search handler
    const debouncedFromStoreSearch = useMemo(() => debounce(fetchFromStores, 300), [fetchFromStores]);
    // Debounced toStore search handler
    const debouncedToStoreSearch = useMemo(() => debounce(fetchToStores, 300), [fetchToStores]);

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedSearch]);

    useEffect(() => {
        if (fromStoreSearchQuery.trim()) {
            debouncedFromStoreSearch(fromStoreSearchQuery);
        } else {
            setFromStoreSearchResults([]);
        }
    }, [fromStoreSearchQuery, debouncedFromStoreSearch]);

    useEffect(() => {
        if (toStoreSearchQuery.trim()) {
            debouncedToStoreSearch(toStoreSearchQuery);
        } else {
            setToStoreSearchResults([]);
        }
    }, [toStoreSearchQuery, debouncedToStoreSearch]);

    useEffect(() => {
        setData('requistionitems', requistionItems);
        const calculatedTotal = requistionItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
    }, [requistionItems, setData]);

    useEffect(() => {
    // This useEffect is designed to only run when data.requistionitems changes in identity
    // not on every render, to prevent infinite loops.
    const newItemList = data.requistionitems.map(item => ({
        item_name: item.item_name || item.item?.name || '',
        item_id: item.item_id || item.item?.id || null,
        quantity: item.quantity || 1,
        price: item.price || 0,
        item: item.item || null,
    }));

    // Use a simple equality check to prevent unnecessary state updates
    const areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    if (!areEqual(requistionItems, newItemList)) {
        setRequistionItems(newItemList);
    }
}, [data.requistionitems]);

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

    // Handle click outside fromStore dropdown
    useEffect(() => {
        const handleClickOutsideFromStore = (event) => {
            if (fromStoreDropdownRef.current && !fromStoreDropdownRef.current.contains(event.target)) {
                setShowFromStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideFromStore);
        return () => document.removeEventListener('mousedown', handleClickOutsideFromStore);
    }, []);

    // Handle click outside toStore dropdown
    useEffect(() => {
        const handleClickOutsideToStore = (event) => {
            if (toStoreDropdownRef.current && !toStoreDropdownRef.current.contains(event.target)) {
                setShowToStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideToStore);
        return () => document.removeEventListener('mousedown', handleClickOutsideToStore);
    }, []);

    const handleRequistionItemChange = (index, field, value) => {
        const updatedItems = [...requistionItems];
        if (field === 'quantity' || field === 'price') {
            let parsedValue = parseFloat(value);
            if (field === 'quantity') {
                parsedValue = parseInt(value, 10);
            }
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setRequistionItems(updatedItems);
    };

    const addRequistionItem = (selectedItem = null) => {
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

       setRequistionItems((prevItems) => {
            const updatedItems = [...prevItems, newItem];
            setData('requistionitems', updatedItems); // Update Inertia data here
            return updatedItems;
        });


        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    const removeRequistionItem = (index) => {
        setModalState({
            isOpen: true,
            message: 'Are you sure you want to remove this item?',
            isAlert: false,
            itemToRemoveIndex: index,
        });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = requistionItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setRequistionItems(updatedItems);
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

        const hasEmptyFields = requistionItems.some((item) => {
            const itemName = item.item_name;
            const itemID = item.item_id;
            const parsedQuantity = parseFloat(item.quantity);
            const parsedPrice = parseFloat(item.price);

            return !itemName ||
                !itemID ||
                isNaN(parsedQuantity) || (parsedQuantity <= 0) ||
                isNaN(parsedPrice) || parsedPrice < 0;
        });

        if (hasEmptyFields) {
            showAlert('Please ensure all requistion items have valid item names, quantities, prices, and item IDs.');
            return;
        }

        setIsSaving(true);

        put(route('inventory2.update', requistion.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false)
                showAlert('An error occurred while saving the requistion. Please check the console for details.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setRequistionItems([]);
        showAlert('Requistion updated successfully!');
    };

    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };

    const handleFromStoreSearchChange = (e) => {
        const query = e.target.value;
        setFromStoreSearchQuery(query);
        setShowFromStoreDropdown(!!query.trim());
        setData('from_store_name', query);
    };

    const handleToStoreSearchChange = (e) => {
        const query = e.target.value;
        setToStoreSearchQuery(query);
        setShowToStoreDropdown(!!query.trim());
        setData('to_store_name', query);
    };

    const handleClearItemSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };

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

    const selectFromStore = (selectedFromStore) => {
        setData('from_store_name', selectedFromStore.name);
        setData('from_store_id', selectedFromStore.id);
        setFromStoreSearchQuery(selectedFromStore.name);
        setFromStoreSearchResults([]);
        setShowFromStoreDropdown(false);
    };

    const selectToStore = (selectedToStore) => {
        setData('to_store_name', selectedToStore.name);
        setData('to_store_id', selectedToStore.id);
        setToStoreSearchQuery(selectedToStore.name);
        setToStoreSearchResults([]);
        setShowToStoreDropdown(false);
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Goods Issuance</h2>}
        >
            <Head title="Goods Issuance" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* From Store Name and To Store Name */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={fromStoreDropdownRef}>
                                    <label htmlFor="from_store_name" className="block text-sm font-medium text-gray-700">
                                        From Store
                                    </label>
                                    <input
                                        type="text"
                                        value={fromStoreSearchQuery}
                                        onChange={handleFromStoreSearchChange}
                                        onFocus={() => setShowFromStoreDropdown(!!fromStoreSearchQuery.trim())}
                                        className="w-full border p-2 rounded text-sm pr-10"
                                        ref={fromStoreSearchInputRef}
                                        autoComplete="new-password"
                                    />
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
                                    <label htmlFor="to_store_name" className="block text-sm font-medium text-gray-700">
                                        To Store
                                    </label>
                                    <input
                                        type="text"
                                        value={toStoreSearchQuery}
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

                            {/* Requistion Summary and Stage*/}
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
                                        <option value="2">Checked</option>  
                                        <option value="3">Issued</option>                                     
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item_name || (item.item ? item.item.name : 'Unknown Item')}
                                                </td>
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
                                    onClick={() => Inertia.get(route('inventory2.index'))}
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
                                    <span>{isSaving ? 'Receiving...' : 'Receive'}</span>
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