import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSave, faTimesCircle,faSpinner,faInfoCircle, faSearch } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx'; // Assuming this is styled well
import InputError from '@/Components/InputError'; // Standard Inertia error component

// Debounce utility (can be moved to a utils file)
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export default function Create({ auth, facilityoption, flash }) { // Added auth and flash
    const { data, setData, post, errors, processing, reset, recentlySuccessful } = useForm({
        description: '',
        facility_id: facilityoption?.id || null, // Use optional chaining
        stage: 1, // Default stage
        tenderitems: [],
    });

    const [tenderItems, setTenderItems] = useState(data.tenderitems);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isSearchingItems, setIsSearchingItems] = useState(false);

    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
        type: 'info', // 'info', 'success', 'error', 'warning'
    });

    // Sync local tenderItems state with useForm data
    useEffect(() => {
        setData('tenderitems', tenderItems);
    }, [tenderItems, setData]);

    // Handle flash messages from server
    useEffect(() => {
        if (flash?.success) {
            showAlert(flash.success, 'Success', 'success');
            reset(); // Reset form on successful submission from backend
            setTenderItems([]); // Clear local items as well
        }
        if (flash?.error) {
            showAlert(flash.error, 'Error', 'error');
        }
    }, [flash, reset]);

    // Handle recentlySuccessful from useForm for client-side success indication
    useEffect(() => {
        if (recentlySuccessful) {
            // This can be used if you don't rely solely on flash messages
            // For example, to clear the form after a successful post without a full redirect
            // showAlert('Tender created successfully!', 'Success', 'success');
            // reset();
            // setTenderItems([]);
        }
    }, [recentlySuccessful, reset]);


    const fetchItems = useCallback((query) => {
        if (!query.trim()) {
            setItemSearchResults([]);
            setShowItemDropdown(false);
            return;
        }
        setIsSearchingItems(true);
        axios.get(route('systemconfiguration2.products.search'), { params: { query } })
            .then((response) => {
                setItemSearchResults(response.data.products.slice(0, 10)); // Show more results
                setShowItemDropdown(true);
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
                showAlert('Failed to fetch products. Please try again.', 'Error', 'error');
                setItemSearchResults([]);
                setShowItemDropdown(false);
            })
            .finally(() => {
                setIsSearchingItems(false);
            });
    }, []);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);

    useEffect(() => {
        debouncedItemSearch(itemSearchQuery);
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target) &&
                itemSearchInputRef.current && !itemSearchInputRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTenderItemChange = (index, field, value) => {
        const updatedItems = [...tenderItems];
        if (field === 'quantity') {
            const parsedValue = parseInt(value, 10); // Use parseInt for whole numbers
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 1 ? 1 : parsedValue; // Min quantity 1
        } else {
            updatedItems[index][field] = value;
        }
        setTenderItems(updatedItems);
    };

    const addTenderItem = (selectedItem) => {
        // Check if item already exists
        if (tenderItems.some(item => item.item_id === selectedItem.id)) {
            showAlert(`${selectedItem.name} is already in the tender list.`, 'Item Exists', 'warning');
            setItemSearchQuery('');
            setItemSearchResults([]);
            setShowItemDropdown(false);
            if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
            return;
        }

        const newItem = {
            item_name: selectedItem.name,
            item_id: selectedItem.id,
            quantity: 1,
            // You might want to add unit_price or other relevant fields from selectedItem if available
            // unit_price: selectedItem.price || 0,
        };
        setTenderItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
    };

    const confirmRemoveTenderItem = (index) => {
        setModalState({
            isOpen: true,
            title: 'Confirm Removal',
            message: `Are you sure you want to remove "${tenderItems[index]?.item_name}"?`,
            isAlert: false,
            itemToRemoveIndex: index,
            type: 'warning',
        });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = tenderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setTenderItems(updatedItems);
        }
        handleModalClose();
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, title: '', message: '', isAlert: false, itemToRemoveIndex: null, type: 'info' });
    };

    const showAlert = (message, title = 'Alert', type = 'info') => {
        setModalState({
            isOpen: true,
            title: title,
            message: message,
            isAlert: true,
            itemToRemoveIndex: null,
            type: type,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (tenderItems.length === 0) {
            showAlert('Please add at least one item to the tender.', 'Validation Error', 'error');
            return;
        }
        // Client-side validation for quantity (though backend should also validate)
        const hasInvalidQuantity = tenderItems.some(item => !item.quantity || item.quantity < 1);
        if (hasInvalidQuantity) {
            showAlert('Please ensure all items have a quantity of at least 1.', 'Validation Error', 'error');
            return;
        }

        // The `post` method automatically includes `data`
        post(route('procurements0.store'), {
            // onSuccess is handled by flash message or recentlySuccessful effect
            onError: (errorObj) => { // Inertia's post passes an error object
                console.error("Submission error:", errorObj);
                // If specific field errors are not handled by <InputError>, show a general message.
                // Errors from `useForm` (errors object) are automatically populated.
                // If there's a general error message from the backend not tied to a field:
                if (errorObj.message) { // Check if your backend sends a general 'message'
                    showAlert(errorObj.message, 'Submission Error', 'error');
                } else if (Object.keys(errorObj).length > 0 && !errors.description && !errors.tenderitems) {
                    // If errors object has content but not for known fields, show a generic one
                    showAlert('An error occurred while saving the tender. Please check the form for details.', 'Submission Error', 'error');
                }
            },
            // onFinish: () => {} // Use if needed, processing state is handled by useForm
        });
    };

    const handleSearchInputChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        // debouncedItemSearch will be called by useEffect
    };

    const handleClearSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };


    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user prop
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Create New Tender
                </h2>
            }
        >
            <Head title="Create Tender" />
            <div className="py-8">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Tender Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tender Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="description"
                                    placeholder="e.g., Quarterly office supplies, Construction project Phase 1"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.description ? 'border-red-500' : ''}`}
                                    rows="3"
                                    required
                                />
                                <InputError message={errors.description} className="mt-2" />
                            </div>

                            {/* Item Search and Add Section */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                                    Tender Items
                                </h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Search for products or services to add to this tender.
                                </p>
                                <div className="mt-4 relative" ref={itemDropdownRef}>
                                    <label htmlFor="itemSearch" className="sr-only">Search for items</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            {isSearchingItems ? (
                                                <FontAwesomeIcon icon={faSpinner} className="animate-spin h-5 w-5 text-gray-400" />
                                            ) : (
                                                <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            id="itemSearch"
                                            placeholder="Type to search items..."
                                            value={itemSearchQuery}
                                            onChange={handleSearchInputChange}
                                            onFocus={() => itemSearchQuery.trim() && setShowItemDropdown(true)}
                                            className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            ref={itemSearchInputRef}
                                            autoComplete="off"
                                        />
                                        {itemSearchQuery && !isSearchingItems && (
                                            <button
                                                type="button"
                                                onClick={handleClearSearch}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                aria-label="Clear search"
                                            >
                                                <FontAwesomeIcon icon={faTimesCircle} />
                                            </button>
                                        )}
                                    </div>

                                    {showItemDropdown && (
                                        <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            {itemSearchResults.length > 0 ? (
                                                itemSearchResults.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="text-gray-900 dark:text-gray-100 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500"
                                                        onClick={() => addTenderItem(item)}
                                                        role="option"
                                                        tabIndex={-1}
                                                    >
                                                        <span className="block truncate">{item.name}</span>
                                                        {/* Optional: Show if item is already added
                                                        {tenderItems.some(ti => ti.item_id === item.id) && (
                                                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 group-hover:text-white">
                                                                <FontAwesomeIcon icon={faCheck} className="h-5 w-5" />
                                                            </span>
                                                        )}
                                                        */}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-gray-500 dark:text-gray-400 cursor-default select-none relative py-2 px-3">
                                                    {isSearchingItems ? 'Searching...' : (itemSearchQuery.trim() ? 'No items found.' : 'Type to search.')}
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                <InputError message={errors.tenderitems} className="mt-2" />
                            </div>


                            {/* Tender Items Table */}
                            {tenderItems.length > 0 && (
                                <div className="mt-6 flow-root">
                                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Item Name</th>
                                                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-32">Quantity</th>
                                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right w-20">
                                                                <span className="sr-only">Actions</span>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        {tenderItems.map((item, index) => (
                                                            <tr key={item.item_id || `new-${index}`}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">
                                                                    {item.item_name}                                                                    
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                                    <input
                                                                        type="number"
                                                                        id={`quantity_${index}`}
                                                                        value={item.quantity}
                                                                        onChange={(e) => handleTenderItemChange(index, 'quantity', e.target.value)}
                                                                        min="1"
                                                                        className={`block w-full text-center border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors[`tenderitems.${index}.quantity`] ? 'border-red-500' : ''}`}
                                                                        aria-label={`Quantity for ${item.item_name}`}
                                                                    />
                                                                    <InputError message={errors[`tenderitems.${index}.quantity`]} className="mt-1 text-xs" />
                                                                </td>
                                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => confirmRemoveTenderItem(index)}
                                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-gray-700"
                                                                        title={`Remove ${item.item_name}`}
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                                                                        <span className="sr-only">Remove</span>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {tenderItems.length === 0 && !itemSearchQuery && (
                                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    <FontAwesomeIcon icon={faInfoCircle} className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No items added yet</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Search for items above to add them to the tender.</p>
                                </div>
                            )}


                            {/* Form Actions */}
                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
                                <Link
                                    href={route('procurements0.index')}
                                    className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    disabled={processing}
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2 -ml-1 h-5 w-5" />
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing || tenderItems.length === 0}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2 -ml-1 h-5 w-5" />
                                    ) : (
                                        <FontAwesomeIcon icon={faSave} className="mr-2 -ml-1 h-5 w-5" />
                                    )}
                                    {processing ? 'Saving...' : 'Save Tender'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={!modalState.isAlert ? handleModalConfirm : handleModalClose} // Confirm only if not an alert
                title={modalState.title}
                message={modalState.message}
                isAlert={modalState.isAlert}
                type={modalState.type} // 'info', 'success', 'error', 'warning'
                confirmButtonText={modalState.isAlert ? 'OK' : (modalState.type === 'warning' ? 'Remove' : 'Confirm')}
                isDestructive={!modalState.isAlert && modalState.type === 'warning'} // For remove confirmation
            />
        </AuthenticatedLayout>
    );
}