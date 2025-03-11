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

export default function Edit({ normaladjustment }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        store_name: normaladjustment.store?.name || '',      // Changed from_store_name to store_name
        store_id: normaladjustment.store_id || null,        // Changed from_store_id to store_id
        adjustment_reason_name: normaladjustment.adjustmentreason?.name || '', // Changed to_store_name to adjustment_reason_name
        adjustment_reason_id: normaladjustment.adjustmentreason_id || null,   // Changed to_store_id to adjustment_reason_id
        total: normaladjustment.total,
        stage: normaladjustment.stage,
        normaladjustmentitems: normaladjustment.normaladjustmentitems || [],
    });

    const [normaladjustmentItems, setNormaladjustmentItems] = useState(() => {
        return data.normaladjustmentitems.map(item => ({
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

    // Store Search State (Previously From Store)
    const [storeSearchQuery, setStoreSearchQuery] = useState(data.store_name); // Changed variable name
    const [storeSearchResults, setStoreSearchResults] = useState([]);         // Changed variable name
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);          // Changed variable name
    const storeDropdownRef = useRef(null);                                       // Changed variable name
    const storeSearchInputRef = useRef(null);                                    // Changed variable name
    const [storeIDError, setStoreIDError] = useState(null);                       //keep track of store id error

    // Adjustment Reason Search State (Previously To Store)
    const [adjustmentReasonSearchQuery, setAdjustmentReasonSearchQuery] = useState(data.adjustment_reason_name); // Changed variable name
    const [adjustmentReasonSearchResults, setAdjustmentReasonSearchResults] = useState([]);                 // Changed variable name
    const [showAdjustmentReasonDropdown, setShowAdjustmentReasonDropdown] = useState(false);                    // Changed variable name
    const adjustmentReasonDropdownRef = useRef(null);                                                       // Changed variable name
    const adjustmentReasonSearchInputRef = useRef(null);                                                        // Changed variable name
    const [adjustmentReasonIDError, setAdjustmentReasonIDError] = useState(null);                                //keep track of adjustment reason error

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

    // Fetch Stores dynamically (Previously From Stores)
    const fetchStores = useCallback((query) => { // Renamed function
        if (!query.trim()) {
            setStoreSearchResults([]); // Updated state variable
            return;
        }

        axios.get(route('systemconfiguration2.stores.search'), { params: { query } })
            .then((response) => {
                setStoreSearchResults(response.data.stores.slice(0, 5)); // Updated state variable
            })
            .catch((error) => {
                console.error('Error fetching stores:', error); //keep same error message
                showAlert('Failed to fetch Stores. Please try again later.');  //keep same error message
                setStoreSearchResults([]); // Updated state variable
            });
    }, []);

    // Fetch Adjustment Reasons dynamically (Previously To Stores)
    const fetchAdjustmentReasons = useCallback((query) => { // Renamed function
        if (!query.trim()) {
            setAdjustmentReasonSearchResults([]); // Updated state variable
            return;
        }

        axios.get(route('systemconfiguration2.adjustmentreasons.search'), { params: { query } })  //keep same route as previous
            .then((response) => {
                setAdjustmentReasonSearchResults(response.data.adjustmentreasons.slice(0, 5)); // Updated state variable
            })
            .catch((error) => {
                console.error('Error fetching adjustmentreasons:', error); // Keep error message
                showAlert('Failed to fetch Adjustment Reasons. Please try again later.');  //keep error message
                setAdjustmentReasonSearchResults([]); // Updated state variable
            });
    }, []);

    // Debounced search handler
    const debouncedSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    // Debounced store search handler (Previously fromStore)
    const debouncedStoreSearch = useMemo(() => debounce(fetchStores, 300), [fetchStores]); // Renamed variable
    // Debounced adjustmentReason search handler (Previously toStore)
    const debouncedAdjustmentReasonSearch = useMemo(() => debounce(fetchAdjustmentReasons, 300), [fetchAdjustmentReasons]); // Renamed variable

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedSearch]);

    useEffect(() => {
        if (storeSearchQuery.trim()) { // Updated state variable
            debouncedStoreSearch(storeSearchQuery); // Updated function call
        } else {
            setStoreSearchResults([]); // Updated state variable
        }
    }, [storeSearchQuery, debouncedStoreSearch]); // Updated dependencies

    useEffect(() => {
        if (adjustmentReasonSearchQuery.trim()) { // Updated state variable
            debouncedAdjustmentReasonSearch(adjustmentReasonSearchQuery); // Updated function call
        } else {
            setAdjustmentReasonSearchResults([]); // Updated state variable
        }
    }, [adjustmentReasonSearchQuery, debouncedAdjustmentReasonSearch]); // Updated dependencies


    useEffect(() => {
        setData('normaladjustmentitems', normaladjustmentItems);
        const calculatedTotal = normaladjustmentItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
    }, [normaladjustmentItems, setData]);

    useEffect(() => {
    // This useEffect is designed to only run when data.normaladjustmentitems changes in identity
    // not on every render, to prevent infinite loops.
    const newItemList = data.normaladjustmentitems.map(item => ({
        item_name: item.item_name || item.item?.name || '',
        item_id: item.item_id || item.item?.id || null,
        quantity: item.quantity || 1,
        price: item.price || 0,
        item: item.item || null,
    }));

    // Use a simple equality check to prevent unnecessary state updates
    const areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    if (!areEqual(normaladjustmentItems, newItemList)) {
        setNormaladjustmentItems(newItemList);
    }
}, [data.normaladjustmentitems]);

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

     // Handle click outside Store dropdown (Previously From Store)
     useEffect(() => {
        const handleClickOutsideStore = (event) => { // Renamed function
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target)) { // Updated ref
                setShowStoreDropdown(false); // Updated state variable
            }
        };
        document.addEventListener('mousedown', handleClickOutsideStore); // Updated event listener
        return () => document.removeEventListener('mousedown', handleClickOutsideStore); // Updated event listener
    }, []);

    // Handle click outside Adjustment Reason dropdown (Previously To Store)
    useEffect(() => {
        const handleClickOutsideAdjustmentReason = (event) => { // Renamed function
            if (adjustmentReasonDropdownRef.current && !adjustmentReasonDropdownRef.current.contains(event.target)) { // Updated ref
                setShowAdjustmentReasonDropdown(false); // Updated state variable
            }
        };
        document.addEventListener('mousedown', handleClickOutsideAdjustmentReason); // Updated event listener
        return () => document.removeEventListener('mousedown', handleClickOutsideAdjustmentReason); // Updated event listener
    }, []);

    const handleNormaladjustmentItemChange = (index, field, value) => {
        const updatedItems = [...normaladjustmentItems];
        if (field === 'quantity' || field === 'price') {
            let parsedValue = parseFloat(value);
            if (field === 'quantity') {
                parsedValue = parseInt(value, 10);
            }
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setNormaladjustmentItems(updatedItems);
    };

    const addNormaladjustmentItem = (selectedItem = null) => {
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

       setNormaladjustmentItems((prevItems) => {
            const updatedItems = [...prevItems, newItem];
            setData('normaladjustmentitems', updatedItems); // Update Inertia data here
            return updatedItems;
        });


        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    const removeNormaladjustmentItem = (index) => {
        setModalState({
            isOpen: true,
            message: 'Are you sure you want to remove this item?',
            isAlert: false,
            itemToRemoveIndex: index,
        });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = normaladjustmentItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setNormaladjustmentItems(updatedItems);
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
        }else{
             setStoreIDError(null);
        }

        // Validate adjustment_reason_id
        if (data.adjustment_reason_id !== null && !Number.isInteger(Number(data.adjustment_reason_id))) {
            setAdjustmentReasonIDError('Adjustment Reason ID must be an integer.');
            return; // Stop form submission
        }else{
            setAdjustmentReasonIDError(null);
        }

        const hasEmptyFields = normaladjustmentItems.some((item) => {
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
            showAlert('Please ensure all normaladjustment items have valid item names, quantities, prices, and item IDs.');
            return;
        }

        setIsSaving(true);

        put(route('inventory3.normal-adjustment.update', normaladjustment.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false)
                showAlert('An error occurred while saving the normaladjustment. Please check the console for details.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setNormaladjustmentItems([]);
        showAlert('Normaladjustment updated successfully!');
    };

    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };

     // Handle Store search input change (Previously From Store)
     const handleStoreSearchChange = (e) => { // Renamed function
        const query = e.target.value;
        setStoreSearchQuery(query); // Updated state variable
        setShowStoreDropdown(!!query.trim()); // Updated state variable
        setData('store_name', query); // Updated data field
    };

    // Handle Adjustment Reason search input change (Previously To Store)
    const handleAdjustmentReasonSearchChange = (e) => { // Renamed function
        const query = e.target.value;
        setAdjustmentReasonSearchQuery(query); // Updated state variable
        setShowAdjustmentReasonDropdown(!!query.trim()); // Updated state variable
        setData('adjustment_reason_name', query); // Updated data field
    };

    const handleClearItemSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };

    // Clear Store search (Previously From Store)
    const handleClearStoreSearch = () => { // Renamed function
        setStoreSearchQuery(''); // Updated state variable
        setStoreSearchResults([]); // Updated state variable
        setShowStoreDropdown(false); // Updated state variable
        if (storeSearchInputRef.current) { // Updated ref
            storeSearchInputRef.current.focus(); // Updated ref
        }
        setData('store_name', ''); // Updated data field
        setData('store_id', null); // Updated data field
    };

    // Clear Adjustment Reason search (Previously To Store)
    const handleClearAdjustmentReasonSearch = () => { // Renamed function
        setAdjustmentReasonSearchQuery(''); // Updated state variable
        setAdjustmentReasonSearchResults([]); // Updated state variable
        setShowAdjustmentReasonDropdown(false); // Updated state variable
        if (adjustmentReasonSearchInputRef.current) { // Updated ref
            adjustmentReasonSearchInputRef.current.focus(); // Updated ref
        }
        setData('adjustment_reason_name', ''); // Updated data field
        setData('adjustment_reason_id', null); // Updated data field
    };

     // Handle Store selection (Previously From Store)
     const selectStore = (selectedStore) => { // Renamed function
        setData('store_name', selectedStore.name); // Updated data field
        setData('store_id', selectedStore.id);   // Updated data field
        setStoreSearchQuery(selectedStore.name); // Updated state variable
        setStoreSearchResults([]); // Updated state variable
        setShowStoreDropdown(false); // Updated state variable
    };

    // Handle Adjustment Reason selection (Previously To Store)
    const selectAdjustmentReason = (selectedAdjustmentReason) => { // Renamed function
        setData('adjustment_reason_name', selectedAdjustmentReason.name); // Updated data field
        setData('adjustment_reason_id', selectedAdjustmentReason.id);   // Updated data field
        setAdjustmentReasonSearchQuery(selectedAdjustmentReason.name); // Updated state variable
        setAdjustmentReasonSearchResults([]); // Updated state variable
        setShowAdjustmentReasonDropdown(false); // Updated state variable
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Normaladjustment</h2>}
        >
            <Head title="Edit Normaladjustment" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Store Name and Adjustment Reason */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={storeDropdownRef}>
                                    <label htmlFor="store_name" className="block text-sm font-medium text-gray-700">
                                        Store
                                    </label>
                                     {/* Added autocomplete attribute here */}
                                    <input
                                        type="text"
                                        value={storeSearchQuery}          // Updated value
                                        onChange={handleStoreSearchChange} // Updated handler
                                        onFocus={() => setShowStoreDropdown(!!storeSearchQuery.trim())} // Updated state variable
                                        className={`w-full border p-2 rounded text-sm pr-10 ${storeIDError ? 'border-red-500' : ''}`}
                                        ref={storeSearchInputRef}          // Updated ref
                                         autoComplete="new-password"
                                    />
                                     {storeIDError && <p className="text-sm text-red-600 mt-1">{storeIDError}</p>}
                                    {storeSearchQuery && (   // Updated state variable
                                        <button
                                            type="button"
                                            onClick={handleClearStoreSearch}  // Updated handler
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            <FontAwesomeIcon icon={faTimesCircle} />
                                        </button>
                                    )}
                                    {showStoreDropdown && (   // Updated state variable
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                            {storeSearchResults.length > 0 ? (   // Updated state variable
                                                storeSearchResults.map((store) => (   // Updated variable
                                                    <li
                                                        key={store.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => selectStore(store)}  // Updated handler
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

                                <div className="relative flex-1" ref={adjustmentReasonDropdownRef}>
                                    <label htmlFor="adjustment_reason_name" className="block text-sm font-medium text-gray-700">
                                        Adjustment Reason
                                    </label>
                                     {/* Added autocomplete attribute here */}
                                    <input
                                        type="text"
                                        value={adjustmentReasonSearchQuery} // Updated value
                                        onChange={handleAdjustmentReasonSearchChange} // Updated handler
                                        onFocus={() => setShowAdjustmentReasonDropdown(!!adjustmentReasonSearchQuery.trim())} // Updated state variable
                                         className={`w-full border p-2 rounded text-sm pr-10 ${adjustmentReasonIDError ? 'border-red-500' : ''}`}
                                        ref={adjustmentReasonSearchInputRef} // Updated ref
                                        autoComplete="new-password"
                                    />
                                     {adjustmentReasonIDError && <p className="text-sm text-red-600 mt-1">{adjustmentReasonIDError}</p>}
                                    {adjustmentReasonSearchQuery && (  // Updated state variable
                                        <button
                                            type="button"
                                            onClick={handleClearAdjustmentReasonSearch} // Updated handler
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            <FontAwesomeIcon icon={faTimesCircle} />
                                        </button>
                                    )}
                                    {showAdjustmentReasonDropdown && (  // Updated state variable
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                            {adjustmentReasonSearchResults.length > 0 ? (  // Updated state variable
                                                adjustmentReasonSearchResults.map((adjustmentReason) => (  // Updated variable
                                                    <li
                                                        key={adjustmentReason.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => selectAdjustmentReason(adjustmentReason)} // Updated handler
                                                    >
                                                        {adjustmentReason.name}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-gray-500">No adjustment reasons found.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Normaladjustment Summary and Stage*/}
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

                            {/* Normaladjustment Items Section */}
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
                                                        onClick={() => addNormaladjustmentItem(item)}
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

                            {/* Normaladjustment Items Table */}
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
                                        {normaladjustmentItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item_name || (item.item ? item.item.name : 'Unknown Item')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`quantity_${index}`}
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleNormaladjustmentItemChange(index, 'quantity', e.target.value)}
                                                        error={errors.normaladjustmentitems && errors.normaladjustmentitems[index]?.quantity}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`price_${index}`}
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => handleNormaladjustmentItemChange(index, 'price', e.target.value)}
                                                        error={errors.normaladjustmentitems && errors.normaladjustmentitems[index]?.price}
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
                                                        onClick={() => removeNormaladjustmentItem(index)}
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
                                    onClick={() => Inertia.get(route('inventory3.normal-adjustment.index'))}
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
                                    <span>{isSaving ? 'Saving...' : 'Save Adjustment'}</span>
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