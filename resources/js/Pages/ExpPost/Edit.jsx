import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';
import InputField from '../../Components/CustomInputField.jsx';

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export default function Edit({ post }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        description: post.description,
        facility_name: post.facilityoption.name,
        facility_id: post.facilityoption_id,
        stage: post.stage,
        total: post.total,
        postitems: post.postitems || [],
    });

    const [postItems, setPostItems] = useState(data.postitems);

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [facilitySearchQuery, setFacilitySearchQuery] = useState(data.facility_name);
    const [facilitySearchResults, setFacilitySearchResults] = useState([]);
    const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);
    const facilityDropdownRef = useRef(null);
    const facilitySearchInputRef = useRef(null);

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });

    const [isSaving, setIsSaving] = useState(false);

    const fetchItems = useCallback((query) => {
        if (!query.trim()) {
            setItemSearchResults([]);
            return;
        }

        axios.get(route('systemconfiguration1.items.search'), { params: { query } })
            .then((response) => {
                setItemSearchResults(response.data.items.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching items:', error);
                showAlert('Failed to fetch items. Please try again later.');
                setItemSearchResults([]);
            });
    }, []);

    const fetchFacilitys = useCallback((query) => {
        if (!query.trim()) {
            setFacilitySearchResults([]);
            return;
        }

        axios.get(route('systemconfiguration4.facilityoptions.search'), { params: { query } })
            .then((response) => {
                setFacilitySearchResults(response.data.facilityoptions.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching facilitys:', error);
                showAlert('Failed to fetch facilitys. Please try again later.');
                setFacilitySearchResults([]);
            });
    }, []);

    const debouncedSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    const debouncedFacilitySearch = useMemo(() => debounce(fetchFacilitys, 300), [fetchFacilitys]);

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedSearch]);

    useEffect(() => {
        if (facilitySearchQuery.trim()) {
            debouncedFacilitySearch(facilitySearchQuery);
        } else {
            setFacilitySearchResults([]);
        }
    }, [facilitySearchQuery, debouncedFacilitySearch]);

    useEffect(() => {
        setData('postitems', postItems);
        const calculatedTotal = postItems.reduce(
            (sum, item) => sum + (parseFloat(item.amount) || 0),
            0
        );
        setData('total', calculatedTotal);               

    }, [postItems, setData]);

    useEffect(() => {
        const newItemList = data.postitems.map(item => ({
            item_name: item.item_name || item.item?.name || '',
            item_id: item.item_id || item.item?.id || null,
            amount: item.amount || 0,
            remarks: item.remarks || null,
            item: item.item || null,
        }));

        const areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

        if (!areEqual(postItems, newItemList)) {
            setPostItems(newItemList);
        }
    }, [data.postitems]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutsideFacility = (event) => {
            if (facilityDropdownRef.current && !facilityDropdownRef.current.contains(event.target)) {
                setShowFacilityDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideFacility);
        return () => document.removeEventListener('mousedown', handleClickOutsideFacility);
    }, []);

    const handlePostItemChange = (index, field, value) => {
        const updatedItems = [...postItems];
        if (field === 'amount') {
            const parsedValue = parseInt(value, 10);
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setPostItems(updatedItems);
    };

    const addPostItem = (selectedItem = null) => {
        const newItem = selectedItem
            ? {
                item_name: selectedItem.name,
                item_id: selectedItem.id,
                amount: 0,
                remarks: '',
                item: selectedItem
            }
            : {
                item_name: '',
                item_id: null,
                amount: 0,
                remarks: '',
                item: null
            };

        setPostItems((prevItems) => {
            const updatedItems = [...prevItems, newItem];
            setData('postitems', updatedItems);
            return updatedItems;
        });

        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    const removePostItem = (index) => {
        setModalState({
            isOpen: true,
            message: 'Are you sure you want to remove this item?',
            isAlert: false,
            itemToRemoveIndex: index,
        });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = postItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setPostItems(updatedItems);
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

        const hasEmptyFields = postItems.some((item) => {
            const itemName = item.item_name;
            const itemID = item.item_id;
            const parsedAmount = parseFloat(item.amount);

            return !itemName || !itemID || isNaN(parsedAmount) || (parsedAmount <= 0);
        });

        if (hasEmptyFields) {
            showAlert('Please ensure all post items have valid item names, quantities, and item IDs.');
            return;
        }

        setIsSaving(true);

        put(route('expenses0.update', post.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the post. Please check the console for details.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setPostItems([]);
        showAlert('Post updated successfully!');
    };

    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };

    const handleFacilitySearchChange = (e) => {
        const query = e.target.value;
        setFacilitySearchQuery(query);
        setShowFacilityDropdown(!!query.trim());
        setData('facility_name', query);
    };

    const handleClearItemSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };

    const handleClearFacilitySearch = () => {
        setFacilitySearchQuery('');
        setFacilitySearchResults([]);
        setShowFacilityDropdown(false);
        if (facilitySearchInputRef.current) {
            facilitySearchInputRef.current.focus();
        }
    };

    const selectFacility = (selectedFacility) => {
        setData('facility_name', selectedFacility.name);
        setData('facility_id', selectedFacility.id);
        setFacilitySearchQuery(selectedFacility.name);
        setFacilitySearchResults([]);
        setShowFacilityDropdown(false);
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Expense</h2>}
        >
            <Head title="Edit Expense" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                {/* Description Textarea */}
                                <div className="relative flex-1">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        placeholder="Enter description..."
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.description ? 'border-red-500' : ''}`}
                                        rows="4" // Adjust the number of rows as needed
                                    />
                                    {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                                </div>

                                {/* Right Side Section */}
                                <div className="flex flex-col space-y-4">
                                    {/* Facility Name */}
                                    <div className="relative flex-1" ref={facilityDropdownRef}>
                                        <div className="flex items-center h-4">
                                            <label htmlFor="facility_name" className="block text-sm font-medium text-gray-700">
                                                Facility Name
                                            </label>    
                                        </div>                                        

                                        <input
                                            type="text"
                                            value={facilitySearchQuery}
                                            onChange={handleFacilitySearchChange}
                                            onFocus={() => setShowFacilityDropdown(!!facilitySearchQuery.trim())}
                                            className="w-full border p-2 rounded text-sm pr-10"
                                            ref={facilitySearchInputRef}
                                            autoComplete="new-password"
                                        />
                                        {facilitySearchQuery && (
                                            <button
                                                type="button"
                                                onClick={handleClearFacilitySearch}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                <FontAwesomeIcon icon={faTimesCircle} />
                                            </button>
                                        )}
                                        {showFacilityDropdown && (
                                            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                                {facilitySearchResults.length > 0 ? (
                                                    facilitySearchResults.map((facility) => (
                                                        <li
                                                            key={facility.id}
                                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => selectFacility(facility)}
                                                        >
                                                            {facility.name}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="p-2 text-gray-500">No facilitys found.</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Stage Dropdown */}
                                    <div className="flex-1">
                                        <div className="flex items-center h-2">
                                            <label htmlFor="stage" className="block text-sm font-medium text-gray-700">
                                                Stage
                                            </label>
                                        </div>

                                        <select
                                            id="stage"
                                            value={data.stage}
                                            onChange={(e) => setData('stage', e.target.value)}
                                            className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.stage ? 'border-red-500' : ''}`}
                                        >
                                           <option value="1">Draft</option>
                                            <option value="2">Approved</option>
                                            <option value="5">Cancelled</option>  
                                        </select>
                                        {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
                                    </div>
                                </div>
                            </div>

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
                                                        onClick={() => addPostItem(item)}
                                                    >
                                                        {item.name}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-gray-500">No items found.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {postItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item ? item.item.name : 'Unknown Item'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`amount_${index}`}
                                                        type="number"
                                                        value={item.amount}
                                                        onChange={(e) => handlePostItemChange(index, 'amount', e.target.value)}
                                                        error={errors.postitems && errors.postitems[index]?.amount}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`remarks_${index}`}
                                                        type="text"
                                                        value={item.remarks}
                                                        onChange={(e) => handlePostItemChange(index, 'remarks', e.target.value)}
                                                        error={errors.postitems && errors.postitems[index]?.remarks}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.item_id && <span className="text-xs text-gray-400">ID: {item.item_id}</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => removePostItem(index)}
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

                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('expenses0.index'))}
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
                                    <span>{isSaving ? 'Saving...' : 'Save Post'}</span>
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
