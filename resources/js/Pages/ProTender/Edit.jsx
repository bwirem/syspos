import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSave, faTimesCircle, faCheck, faSpinner, faSearch, faInfoCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';
import InputError from '@/Components/InputError'; // Standard Inertia error component

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const getStageLabel = (stage) => {
    const stageNumber = parseInt(stage, 10);
    if (stageNumber === 1) return 'Draft';
    if (stageNumber === 2) return 'Quotation';
    if (stageNumber === 3) return 'Evaluation';
    return 'Unknown';
};


export default function Edit({ auth, tender, flash, errors: serverErrors }) { // Added serverErrors for initial load
    const { data, setData, put, errors, processing, reset, recentlySuccessful, clearErrors } = useForm({
        description: tender.description || '',
        facility_id: tender.facility_id || tender.facilityoption_id || null,
        stage: tender.stage,
        tenderitems: tender.tenderitems?.map(item => ({
            id: item.id,
            item_id: item.item_id || item.item?.id,
            item_name: item.item_name || item.item?.name,
            quantity: item.quantity,
        })) || [],
        remarks: '', // For approval remarks
        _method: 'PUT', // Explicitly state method for clarity, though `put` implies it
    });

    // Local state for tender items being manipulated in the UI
    const [currentTenderItems, setCurrentTenderItems] = useState(data.tenderitems);

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isSearchingItems, setIsSearchingItems] = useState(false);

    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [removeConfirmationModal, setRemoveConfirmationModal] = useState({
        isOpen: false,
        message: '',
        itemToRemoveIndex: null,
    });

    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
    });

    const [approveModalState, setApproveModalState] = useState({
        isOpen: false,
        loading: false,
        success: false,
        remarksError: '', // Specific to remarks field in modal
    });

    // Sync local currentTenderItems state with useForm data for submission
    useEffect(() => {
        setData('tenderitems', currentTenderItems);
    }, [currentTenderItems, setData]);


    // Handle flash messages from server (e.g., after successful update)
    useEffect(() => {
        if (flash?.success) {
            showAlert(flash.success, 'Success', 'success');
            // The 'tender' prop should be updated by Inertia, re-rendering the component.
            // `reset()` might not be needed if the page re-initializes with new `tender` data.
        }
        if (flash?.error) {
            showAlert(flash.error, 'Error', 'error');
        }
    }, [flash]);

    useEffect(() => {
        // If there are server-side validation errors on initial load (e.g. from a redirect back with errors)
        // Inertia populates the `errors` prop of the page component.
        // We should merge these into the `useForm` errors state if not already handled.
        // However, `useForm` usually handles this automatically if `errors` prop is passed to it.
        // This is more of a note: `useForm`'s `errors` object IS the one populated by Inertia.
    }, [serverErrors]);


    const fetchItems = useCallback((query) => {
        if (!query.trim()) {
            setItemSearchResults([]);
            setShowItemDropdown(false);
            return;
        }
        setIsSearchingItems(true);
        axios.get(route('systemconfiguration2.products.search'), { params: { query } })
            .then((response) => {
                setItemSearchResults(response.data.products.slice(0, 10));
                setShowItemDropdown(true);
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
                showAlert('Failed to fetch products.', 'Error fetching items', 'error');
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
        const updatedItems = [...currentTenderItems];
        if (field === 'quantity') {
            const parsedValue = parseInt(value, 10);
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 1 ? 1 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setCurrentTenderItems(updatedItems);
        // Clear specific error for this item if it exists
        if (errors[`tenderitems.${index}.${field}`]) {
            clearErrors(`tenderitems.${index}.${field}`);
        }
    };

    const addTenderItem = (selectedItem) => {
        if (currentTenderItems.some(item => item.item_id === selectedItem.id)) {
            showAlert(`${selectedItem.name} is already in the tender list.`, 'Item Exists', 'warning');
            setItemSearchQuery('');
            setItemSearchResults([]);
            setShowItemDropdown(false);
            if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
            return;
        }
        const newItem = {
            item_id: selectedItem.id,
            item_name: selectedItem.name,
            quantity: 1,
        };
        setCurrentTenderItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
        if (errors.tenderitems) clearErrors('tenderitems'); // Clear general tenderitems error
    };

    const confirmRemoveTenderItem = (index) => {
        setRemoveConfirmationModal({
            isOpen: true,
            message: `Are you sure you want to remove "${currentTenderItems[index]?.item_name}"?`,
            itemToRemoveIndex: index,
        });
    };

    const handleRemoveConfirm = () => {
        if (removeConfirmationModal.itemToRemoveIndex !== null) {
            const updatedItems = currentTenderItems.filter((_, idx) => idx !== removeConfirmationModal.itemToRemoveIndex);
            setCurrentTenderItems(updatedItems);
        }
        setRemoveConfirmationModal({ isOpen: false, message: '', itemToRemoveIndex: null });
    };

    const showAlert = (message, title = 'Alert', type = 'info') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    const handleMainSubmit = (e) => {
        e.preventDefault();
        clearErrors(); // Clear previous errors before new submission

        if (currentTenderItems.length === 0 && !isReadOnly) { // Don't validate if read-only
            showAlert('Please add at least one item to the tender.', 'Validation Error', 'error');
            return;
        }
        const hasInvalidQuantity = currentTenderItems.some(item => !item.quantity || item.quantity < 1);
        if (hasInvalidQuantity && !isReadOnly) {
            showAlert('Please ensure all items have a quantity of at least 1.', 'Validation Error', 'error');
            return;
        }

        // Ensure remarks are cleared if not part of this specific save action's intent
        // For a simple save, we might not want to send 'remarks' unless it's explicitly managed.
        // However, since 'remarks' is in `useForm`, it will be sent.
        // Backend should handle ignoring 'remarks' if it's not an approval action.
        // Or, if 'remarks' should ONLY be for approval, manage it outside `data` for this submit.
        const payload = { ...data }; // Send all data from useForm
        // If 'remarks' should not be sent with a normal save, uncomment below:
        // delete payload.remarks; // Or set to null, depending on backend

        put(route('procurements0.update', tender.id), {
            // `data` from useForm is automatically sent by `put`
            // If you need to send a modified payload, pass it as the second argument:
            // put(route('procurements0.update', tender.id), payload, { ...options })
            preserveScroll: true,
            onSuccess: () => {
                // Success message will be handled by flash message from backend
                // showAlert('Tender updated successfully!', 'Success', 'success'); // Can be used too
            },
            onError: (serverValidationErrors) => {
                // `errors` object from `useForm` is automatically populated by Inertia.
                // `serverValidationErrors` is the raw error object from the server.
                console.error("Update error object from server:", serverValidationErrors);

                let generalErrorMessage = "An error occurred while saving. Please check the form for highlighted errors.";
                const errorKeys = Object.keys(serverValidationErrors);

                if (errorKeys.length === 1 && serverValidationErrors.message) {
                    // If backend sends a single 'message' field (non-validation error)
                    generalErrorMessage = serverValidationErrors.message;
                } else if (errorKeys.length > 0) {
                    // If specific validation errors are present, InputError components will show them.
                    // The general message above is usually sufficient.
                }
                showAlert(generalErrorMessage, 'Update Failed', 'error');
            }
        });
    };


    const handleItemSearchInputChange = (e) => {
        setItemSearchQuery(e.target.value);
    };

    const handleClearItemSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) itemSearchInputRef.current.focus();
    };

    // --- Approve Functionality ---
    const openApproveModal = () => {
        clearErrors(); // Clear main form errors
        setData('remarks', ''); // Clear previous remarks from form state for the modal
        setData('stage', '2', ''); 

        setApproveModalState({
            isOpen: true,
            loading: false,
            success: false,
            remarksError: '',
        });
    };

    const closeApproveModal = () => {
        setData('remarks', ''); // Clear previous remarks from form state for the modal
        setData('stage', '1', ''); 
        setApproveModalState({ isOpen: false, loading: false, success: false, remarksError: '' });
        // If approval changed stage, data.stage in useForm might be stale.
        // router.reload({ only: ['tender'] }) might be needed if not automatically handled by redirect.
    };

    const handleApproveConfirm = () => {
        if (!data.remarks.trim()) {
            setApproveModalState(prev => ({ ...prev, remarksError: 'Approval remarks are required.' }));
            return;
        }
        setApproveModalState(prev => ({ ...prev, loading: true, remarksError: '' }));       

        put(route('procurements0.update', tender.id), {
            preserveScroll: true,
            onSuccess: () => {
                setApproveModalState(prev => ({ ...prev, loading: false, success: true }));
                // Success message handled by flash. Modal shows its own success then closes.
                setTimeout(() => {
                    closeApproveModal();
                    // If redirect doesn't occur, or to ensure fresh data:
                    // router.visit(route('procurements0.edit', tender.id), { only: ['tender', 'flash'] });
                }, 2000);
            },
            onError: (errorObj) => {
                console.error("Approval error:", errorObj);
                let errorMessage = 'Failed to approve tender.';
                if (errorObj.remarks) {
                    setApproveModalState(prev => ({ ...prev, loading: false, remarksError: errorObj.remarks }));
                    return; // Handled remarks error in modal
                }
                if (typeof errorObj === 'string') errorMessage = errorObj;
                else if (errorObj.message) errorMessage = errorObj.message;
                else if (Object.keys(errorObj).length > 0) errorMessage = "Please check approval form for errors."

                showAlert(errorMessage, 'Approval Error', 'error');
                setApproveModalState(prev => ({ ...prev, loading: false, success: false }));
            }
        });
    };


    // Determine if editing should be disabled (e.g., if tender is beyond draft stage)
    const isReadOnly = parseInt(tender.stage, 10) !== 1;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                        Edit Tender <span className="text-sm text-gray-500 dark:text-gray-400">(ID: {tender.id})</span>
                    </h2>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        parseInt(tender.stage,10) === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                        parseInt(tender.stage,10) === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                        parseInt(tender.stage,10) === 3 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                    }`}>
                        Stage: {getStageLabel(tender.stage)}
                    </span>
                </div>
            }
        >
            <Head title={`Edit Tender - ${tender.id}`} />
            <div className="py-8">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleMainSubmit} className="p-6 space-y-6">
                            {isReadOnly && (
                                <div className="p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-200 dark:text-yellow-800" role="alert">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2"/>
                                    This tender is in stage "{getStageLabel(tender.stage)}" and can no longer be edited. Only approval actions may be available.
                                </div>
                            )}
                            {/* Hidden fields for facility_id and stage if not directly editable but required by backend */}
                            {/* These are already in `data` from useForm, so they will be submitted */}
                            <InputError message={errors.facility_id} className="mt-2" />
                            <InputError message={errors.stage} className="mt-2" />

                            {/* Tender Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tender Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors.description ? 'border-red-500' : ''}`}
                                    rows="3"
                                    required
                                    disabled={isReadOnly || processing}
                                />
                                <InputError message={errors.description} className="mt-2" />
                            </div>

                            {/* Item Search and Add Section */}
                            {!isReadOnly && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                                    Tender Items
                                </h3>
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
                                            placeholder="Type to search items to add..."
                                            value={itemSearchQuery}
                                            onChange={handleItemSearchInputChange}
                                            onFocus={() => itemSearchQuery.trim() && setShowItemDropdown(true)}
                                            className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            ref={itemSearchInputRef}
                                            autoComplete="off"
                                            disabled={processing}
                                        />
                                        {itemSearchQuery && !isSearchingItems && (
                                            <button
                                                type="button"
                                                onClick={handleClearItemSearch}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                aria-label="Clear search"
                                                disabled={processing}
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
                                <InputError message={errors.tenderitems} className="mt-2" /> {/* General error for tenderitems array */}
                            </div>
                            )}

                            {/* Tender Items Table */}
                            {currentTenderItems.length > 0 ? (
                                <div className={`mt-6 flow-root ${isReadOnly ? 'pt-6 border-t border-gray-200 dark:border-gray-700' : ''}`}>
                                     {!isReadOnly && <h3 className="sr-only">Current Tender Items</h3>}
                                     {isReadOnly && <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">Tender Items</h3>}
                                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <div className="overflow-hidden shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Item Name</th>
                                                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-32">Quantity</th>
                                                            {!isReadOnly && (
                                                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right w-20">
                                                                    <span className="sr-only">Actions</span>
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        {currentTenderItems.map((item, index) => (
                                                            <tr key={item.id || item.item_id || `new-${index}`}> {/* Use existing item ID if available */}
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">
                                                                    {item.item_name}                                                                    
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                                    <input
                                                                        type="number"
                                                                        value={item.quantity}
                                                                        onChange={(e) => handleTenderItemChange(index, 'quantity', e.target.value)}
                                                                        min="1"
                                                                        className={`block w-full text-center border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${errors[`tenderitems.${index}.quantity`] ? 'border-red-500' : ''}`}
                                                                        aria-label={`Quantity for ${item.item_name}`}
                                                                        disabled={isReadOnly || processing}
                                                                    />
                                                                    <InputError message={errors[`tenderitems.${index}.quantity`]} className="mt-1 text-xs" />
                                                                </td>
                                                                {!isReadOnly && (
                                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => confirmRemoveTenderItem(index)}
                                                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                                                            title={`Remove ${item.item_name}`}
                                                                            disabled={processing}
                                                                        >
                                                                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                                                                            <span className="sr-only">Remove</span>
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                !isReadOnly && ( // Only show this if editable and no items
                                    <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <FontAwesomeIcon icon={faInfoCircle} className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No items in this tender</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Search for items above to add them.</p>
                                    </div>
                                )
                            )}

                            {/* Form Actions */}
                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
                                <Link
                                    href={route('procurements0.index')}
                                    className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    as="button" // To allow disabling
                                    disabled={processing || approveModalState.loading}
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2 -ml-1 h-5 w-5" />
                                    Close
                                </Link>
                                {!isReadOnly && (
                                    <button
                                        type="submit" // Main save
                                        disabled={processing || approveModalState.loading || (currentTenderItems.length === 0 && !isReadOnly)}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing && !approveModalState.loading ? (
                                            <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2 -ml-1 h-5 w-5" />
                                        ) : (
                                            <FontAwesomeIcon icon={faSave} className="mr-2 -ml-1 h-5 w-5" />
                                        )}
                                        {processing && !approveModalState.loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                                {parseInt(tender.stage,10) === 1 && ( // Show Approve button only if in Draft stage
                                    <button
                                        type="button"
                                        onClick={openApproveModal}
                                        disabled={processing || approveModalState.loading}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                    >
                                        <FontAwesomeIcon icon={faCheck} className="mr-2 -ml-1 h-5 w-5" />
                                        Approve to Quotation
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Item Removal Confirmation Modal */}
            <Modal
                isOpen={removeConfirmationModal.isOpen}
                onClose={() => setRemoveConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleRemoveConfirm}
                title="Confirm Removal"
                message={removeConfirmationModal.message}
                isAlert={false}
                type="warning"
                confirmButtonText="Remove"
                isDestructive={true}
            />

            {/* General Alert Modal */}
            <Modal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title={alertModal.title}
                message={alertModal.message}
                isAlert={true}
                type={alertModal.type}
            />

            {/* Approve Confirmation Modal */}
            <Modal
                isOpen={approveModalState.isOpen}
                onClose={!approveModalState.loading && !approveModalState.success ? closeApproveModal : () => {}} // Prevent closing while loading or on auto-close success
                onConfirm={!approveModalState.success ? handleApproveConfirm : closeApproveModal}
                title={approveModalState.success ? "Approval Successful" : "Confirm Tender Approval"}
                confirmButtonText={
                    approveModalState.loading ? 'Processing...' :
                    approveModalState.success ? 'OK' : 'Approve & Send for Quotation'
                }
                closeButtonText={approveModalState.loading || approveModalState.success ? null : "Cancel"}
                confirmButtonDisabled={approveModalState.loading}
                type={approveModalState.success ? 'success' : 'info'} // Or 'warning' for the confirmation step
            >
                {approveModalState.success ? (
                    <div className="text-center">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500 h-12 w-12 mx-auto mb-4" />
                        <p>Tender has been successfully approved and moved to the Quotation stage.</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            You are about to approve this tender and move it to the "Quotation" stage.
                            Once approved, the tender details may not be editable.
                        </p>
                        <div className="mt-4">
                            <label htmlFor="approval_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Approval Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="approval_remarks"
                                rows="3"
                                className={`mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${approveModalState.remarksError ? 'border-red-500' : ''}`}
                                value={data.remarks} // Ensure this is data.remarks for two-way binding with useForm
                                onChange={(e) => {
                                    setData('remarks', e.target.value); // Update useForm's data
                                    if (approveModalState.remarksError) setApproveModalState(prev => ({ ...prev, remarksError: '' }));
                                }}
                                disabled={approveModalState.loading}
                            />
                            {approveModalState.remarksError && <p className="text-red-500 text-sm mt-1">{approveModalState.remarksError}</p>}
                            {/* Display general form errors related to approval here if needed, e.g. errors.stage */}
                            <InputError message={errors.remarks} className="mt-1" />
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}