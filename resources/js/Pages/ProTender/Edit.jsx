import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm , Link} from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSave, faTimesCircle, faCheck } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
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

export default function Edit({ tender }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        description: tender.description,      
        facility_id: tender.facilityoption_id,
        stage: tender.stage,        
        tenderitems: tender.tenderitems || [],
        remarks: '',
    });

    const [tenderItems, setTenderItems] = useState(data.tenderitems);

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);   

    // Approve Modal state    
    const [approveModalOpen, setApproveModalOpen] = useState(false);   
    const [approveRemarks, setApproveRemarks] = useState('');
    const [remarksError, setRemarksError] = useState('');
    const [approveModalLoading, setApproveModalLoading] = useState(false);
    const [approveModalSuccess, setApproveModalSuccess] = useState(false);

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

    const debouncedSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);    

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedSearch]);

    

    useEffect(() => {
        setData('tenderitems', tenderItems);
    }, [tenderItems, setData]);

    useEffect(() => {
        const newItemList = data.tenderitems.map(item => ({
            item_name: item.item_name || item.item?.name || '',
            item_id: item.item_id || item.item?.id || null,
            quantity: item.quantity || 1,
            item: item.item || null,
        }));

        const areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

        if (!areEqual(tenderItems, newItemList)) {
            setTenderItems(newItemList);
        }
    }, [data.tenderitems]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);    

    const handleTenderItemChange = (index, field, value) => {
        const updatedItems = [...tenderItems];
        if (field === 'quantity') {
            const parsedValue = parseInt(value, 10);
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setTenderItems(updatedItems);
    };

    const addTenderItem = (selectedItem = null) => {
        const newItem = selectedItem
            ? {
                item_name: selectedItem.name,
                item_id: selectedItem.id,
                quantity: 1,
                item: selectedItem
            }
            : {
                item_name: '',
                item_id: null,
                quantity: 1,
                item: null
            };

        setTenderItems((prevItems) => {
            const updatedItems = [...prevItems, newItem];
            setData('tenderitems', updatedItems);
            return updatedItems;
        });

        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    const removeTenderItem = (index) => {
        setModalState({
            isOpen: true,
            message: 'Are you sure you want to remove this item?',
            isAlert: false,
            itemToRemoveIndex: index,
        });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = tenderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setTenderItems(updatedItems);
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

        const hasEmptyFields = tenderItems.some((item) => {
            const itemName = item.item_name;
            const itemID = item.item_id;
            const parsedQuantity = parseFloat(item.quantity);

            return !itemName || !itemID || isNaN(parsedQuantity) || (parsedQuantity <= 0);
        });

        if (hasEmptyFields) {
            showAlert('Please ensure all tender items have valid item names, quantities, and item IDs.');
            return;
        }

        setIsSaving(true);

        put(route('procurements0.update', tender.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the tender. Please check the console for details.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setTenderItems([]);
        showAlert('Tender updated successfully!');
    };

    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };    

    const handleClearItemSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };  

  
    const handleApproveClick = (sale) => {  

        setData('stage', 2);
        setData('remarks', ''); // Reset remarks field in the form data

        setApproveModalOpen(true);
        setApproveRemarks('');
        setRemarksError('');
        setApproveModalLoading(false); // Reset loading state
        setApproveModalSuccess(false); // Reset success state
    };

    
    const handleApproveModalClose = () => {
        
        setData('stage', 1);
        setData('remarks', ''); // Reset remarks field in the form data

        setApproveModalOpen(false);
        setApproveRemarks('');
        setRemarksError('');
        setApproveModalLoading(false); // Reset loading state
        setApproveModalSuccess(false); // Reset success state
    };

    const handleApproveModalConfirm = () => {
        if (!data.remarks.trim()) {
            setRemarksError('Please enter Approve remarks.');
            return;
        }
    
        const formData = new FormData();
        formData.append('remarks', data.remarks);
    
        setApproveModalLoading(true); // Set loading state
    
        put(route('procurements0.update', tender.id), formData, {
            forceFormData: true, // OK to keep
            onSuccess: () => {
                console.log('Sale approveed successfully!');
                setApproveModalLoading(false);
                setApproveModalSuccess(true);
                handleApproveModalClose();
            },
            onError: (errors) => {
                setApproveModalLoading(false);
                console.error('Submission errors:', errors);
            },
        });
        
        
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Tender</h2>}
        >
            <Head title="Edit Tender" />
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
                                                        onClick={() => addTenderItem(item)}
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
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {tenderItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item ? item.item.name : 'Unknown Item'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`quantity_${index}`}
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleTenderItemChange(index, 'quantity', e.target.value)}
                                                        error={errors.tenderitems && errors.tenderitems[index]?.quantity}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.item_id && <span className="text-xs text-gray-400">ID: {item.item_id}</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTenderItem(index)}
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
                                <Link
                                    href={route('procurements0.index')}  // Using the route for navigation
                                    method="get"  // Optional, if you want to define the HTTP method (GET is default)
                                    preserveState={true}  // Keep the page state (similar to `preserveState: true` in the button)
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Close</span>
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing || isSaving}
                                    className="bg-blue-600 text-white rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleApproveClick}
                                    className="bg-green-500 text-white rounded p-2 flex items-center space-x-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                >
                                    <FontAwesomeIcon icon={faCheck} />
                                    <span>Approve</span>
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

             {/* Approve Confirmation Modal */}
             <Modal
                isOpen={approveModalOpen}
                onClose={handleApproveModalClose}
                onConfirm={handleApproveModalConfirm}
                title="Approve Confirmation"
                confirmButtonText={approveModalLoading ? 'Loading...' : (approveModalSuccess ? "Success" : 'Approve')}
                confirmButtonDisabled={approveModalLoading || approveModalSuccess}
            >
                <div>
                    <p>
                        Are you sure you want to approve this Tender ? This action can not be undone.  
                    </p>

                    <label htmlFor="Approve_remarks" className="block text-sm font-medium text-gray-700 mt-4">
                        Approve Remarks:
                    </label>
                    <textarea
                        id="Approve_remarks"
                        rows="3"
                        className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={data.remarks}
                        onChange={(e) => setData('remarks', e.target.value)}
                    />
                    {remarksError && <p className="text-red-500 text-sm mt-1">{remarksError}</p>}
                </div>
            </Modal>

        </AuthenticatedLayout>
    );
}
