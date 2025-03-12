import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faTimes, faEye, faAward } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import Modal from '../../Components/CustomModal.jsx';
import InputField from '../../Components/CustomInputField1.jsx';
import { Inertia } from '@inertiajs/inertia';

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export default function Quotation({ tender }) {
    const { errors } = usePage().props;

    const { data, setData, put, processing, reset } = useForm({
        description: tender.description || '',
        facility_name: tender.facilityoption?.name || '',
        facility_id: tender.facilityoption_id || null,
        stage: tender.stage || 1,
        tenderquotations: [],
    });

    const [selectedItems, setSelectedItems] = useState(new Array(data.tenderquotations.length).fill(false)); // Initialize all to false
    const [tenderQuotationsUI, setTenderQuotationsUI] = useState(
        (tender.tenderquotations || []).map(item => ({
            ...item,
            file: null,
            filename: item.filename || '',
            url: item.url || '',
            item_name: item.item?.name || item.item_name || '',
            item_id: item.item?.id || item.item_id || null,
        }))
    );

    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [supplierSearchResults, setSupplierSearchResults] = useState([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const supplierDropdownRef = useRef(null);
    const supplierSearchInputRef = useRef(null);

    const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierModalLoading, setNewSupplierModalLoading] = useState(false);
    const [newSupplierModalSuccess, setNewSupplierModalSuccess] = useState(false);

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [awardModalOpen, setAwardModalOpen] = useState(false);
    const [selectedSupplierForAward, setSelectedSupplierForAward] = useState(null);
    const [awardRemarks, setAwardRemarks] = useState(''); // State for the remarks
    const [remarksError, setRemarksError] = useState(''); // State to display remarks error


    const fetchSuppliers = useCallback((query) => {
        if (!query.trim()) {
            setSupplierSearchResults([]);
            setShowSupplierDropdown(false);
            return;
        }

        axios.get(route('systemconfiguration2.suppliers.search'), { params: { query } })
            .then((response) => {
                setSupplierSearchResults(response.data.suppliers.slice(0, 5));
                setShowSupplierDropdown(true);
            })
            .catch((error) => {
                console.error('Error fetching suppliers:', error);
                showAlert('Failed to fetch suppliers. Please try again later.');
                setSupplierSearchResults([]);
            });
    }, []);

    const debouncedSupplierSearch = useMemo(() => debounce(fetchSuppliers, 300), [fetchSuppliers]);

    useEffect(() => {
        debouncedSupplierSearch(supplierSearchQuery);
    }, [supplierSearchQuery, debouncedSupplierSearch]);

    useEffect(() => {
        const formSafeData = tenderQuotationsUI.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            filename: item.filename,
            url: item.url,
        }));

        setData('tenderquotations', formSafeData);
    }, [tenderQuotationsUI, setData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
                setShowSupplierDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileSelect = (index, event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const MAX_SIZE = 5 * 1024 * 1024;
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (file.size > MAX_SIZE) {
            showAlert('File size exceeds 5MB limit.');
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            showAlert('Invalid file type. Please upload a PDF or DOC/DOCX file.');
            return;
        }

        setTenderQuotationsUI(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                file,
                filename: file.name,
                url: file.name,
            };
            return updated;
        });
    };

    const handleClearFile = (index) => {
        setTenderQuotationsUI(prev => prev.map((item, idx) =>
            idx === index ? { ...item, file: null, url: '', filename: '' } : item
        ));
        setData(`files.${index}`, null);
    };

    const addTenderItem = (selectedSupplier = null) => {
        const newItem = selectedSupplier
            ? {
                item_id: selectedSupplier.id,
                item_name: selectedSupplier.name,
                filename: '',
                url: '',
                file: null,
            }
            : {
                item_id: null,
                item_name: '',
                filename: '',
                url: '',
                file: null,
            };

        setTenderQuotationsUI((prevItems) => [...prevItems, newItem]);
        setSupplierSearchQuery('');
        setSupplierSearchResults([]);
        setShowSupplierDropdown(false);
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
            setTenderQuotationsUI(prev => prev.filter((_, idx) => idx !== modalState.itemToRemoveIndex));
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

        // Safe CSRF token retrieval
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.content : '';

        const formData = new FormData();

        // Only add token if it exists
        if (csrfToken) {
            formData.append('_token', csrfToken);
        }

        formData.append('_method', 'PUT'); // Laravel recognizes this as a PUT request

        const hasEmptyFields = tenderQuotationsUI.some((item) => !item.item_name || !item.item_id);

        if (hasEmptyFields) {
            showAlert('Please ensure all tender items have valid item names and item IDs.');
            return;
        }

        setIsSaving(true);

        formData.append('description', data.description);
        formData.append('facility_name', data.facility_name);
        formData.append('facility_id', data.facility_id);
        formData.append('stage', data.stage);

        // Add tender quotations (metadata and files)
        tenderQuotationsUI.forEach((item, index) => {
            formData.append(`tenderquotations[${index}][item_id]`, item.item_id);
            formData.append(`tenderquotations[${index}][item_name]`, item.item_name);
            formData.append(`tenderquotations[${index}][filename]`, item.filename);
            formData.append(`tenderquotations[${index}][url]`, item.url);
            formData.append(`tenderquotations[${index}][type]`, item.file.type);
            formData.append(`tenderquotations[${index}][size]`, item.file.size);
            formData.append(`tenderquotations[${index}][description]`, item.filename);

            // Ensure file upload works properly
            if (item.file) {
                formData.append(`tenderquotations[${index}][file]`, item.file, item.filename);  // Use filename here
            }

        });

        // // Debugging: Check FormData entries
        // for (let pair of formData.entries()) {
        //     console.log(pair[0], pair[1]);
        // }

        // Send as POST with `_method=PUT`
        Inertia.post(route('procurements0.quotation', tender.id), formData, {
            forceFormData: true, // Ensures Inertia sends it properly
            onSuccess: () => {
                setIsSaving(false);
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the tender. Please check the console for details.');
            },
        });
    };

    const handleSupplierSearchChange = (e) => {
        const query = e.target.value;
        setSupplierSearchQuery(query);
        setShowSupplierDropdown(!!query.trim());
    };

    const handleClearSupplierSearch = () => {
        setSupplierSearchQuery('');
        setSupplierSearchResults([]);
        setShowSupplierDropdown(false);
        if (supplierSearchInputRef.current) {
            supplierSearchInputRef.current.focus();
        }
    };

    const handleNewSupplierClick = () => {
        setNewSupplierModalOpen(true);
        setNewSupplierModalSuccess(false);
    };

    const handleNewSupplierModalClose = () => {
        setNewSupplierModalOpen(false);
        setNewSupplierName('');
        setNewSupplierModalLoading(false);
        setNewSupplierModalSuccess(false);
    };

    const handleNewSupplierModalConfirm = async () => {
        setNewSupplierModalLoading(true);
        try {
            const response = await axios.post(route('systemconfiguration2.suppliers.directstore'), { name: newSupplierName });
            if (response.data && response.data.id) {
                addTenderItem(response.data);
                setNewSupplierModalSuccess(true);
            } else {
                showAlert('Error creating new supplier!');
            }
        } catch (error) {
            console.error("Error creating new supplier:", error);
            showAlert('Failed to create new supplier. Please try again.');
        } finally {
            setNewSupplierModalLoading(false);
            setTimeout(() => {
                setNewSupplierModalOpen(false);
                setNewSupplierName('');
                setNewSupplierModalSuccess(false);
            }, 1000);
        }
    };

   
    const handleCheckboxChange = (index) => {
        const updatedSelection = new Array(selectedItems.length).fill(false); // Reset all selections
        // If the clicked item is already selected, deselect it; otherwise, select it
        updatedSelection[index] = !selectedItems[index];
        setSelectedItems(updatedSelection);
    };

    const handleAwardClick = () => {
         if (selectedItems.every(item => item === false)) {
            showAlert('Please select a supplier to award.');
            return;
        }

        const selectedIndex = selectedItems.findIndex(item => item === true); // Find the index of the selected item
        if (selectedIndex === -1) {
            showAlert('Please select a supplier to award.');
            return;
        }

        setSelectedSupplierForAward(tenderQuotationsUI[selectedIndex]);
        setAwardModalOpen(true);
        setAwardRemarks(''); // Reset remarks when opening modal
        setRemarksError(''); // Clear any previous error
    };

    const handleAwardModalClose = () => {
        setAwardModalOpen(false);
        setSelectedSupplierForAward(null);
        setAwardRemarks(''); // Clear remarks when closing modal
        setRemarksError(''); // Clear any error
    };

    const handleAwardModalConfirm = () => {
        if (!selectedSupplierForAward) return;

        if (!awardRemarks.trim()) {
            setRemarksError('Please enter award remarks.');
            return;
        }

        const awardData = {
            supplier: selectedSupplierForAward, // Pass the whole supplier object
            url: selectedSupplierForAward.url,
            filename: selectedSupplierForAward.filename,
            remarks: awardRemarks,
        };

        console.log("Awarding Supplier with Data:", awardData);

        // *** Replace this with your actual API call ***
        axios.post(route('procurements0.award', tender.id), awardData) // Assuming you create a new route
            .then(response => {
                console.log("Award successful:", response);
                if (response.data && response.data.message) { // Check if message exists
                    showAlert(response.data.message); // Show message from backend
                }

                if (response.status === 200) { // Check the status code for success
                    Inertia.get(route('procurements0.index')); // Navigate to procurements0.index
                } else {
                  console.error("Award failed (non-200 status):", response);
                  showAlert('Award failed. Please check the console for details.');
                }
            })
            .catch(error => {
                console.error("Error awarding supplier:", error);

                let errorMessage = 'Failed to award supplier. Please try again.';
                if (error.response && error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;  // Use the backend error message, if available
                }
                showAlert(errorMessage); // Show more specific error

            });

        setAwardModalOpen(false);
        setSelectedSupplierForAward(null);
        setAwardRemarks(''); // Clear remarks after confirming
        setRemarksError(''); // Clear error after confirming (or failing)
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Quatation</h2>}
        >
            <Head title="Quatation" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
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
                                        rows="4"
                                    />
                                    {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                                </div>

                                {/* Right Side Section */}
                                <div className="flex flex-col space-y-4">
                                    {/* Facility Name */}
                                    <div className="relative flex-1">
                                        <div className="flex items-center h-4">
                                            <label htmlFor="facility_name" className="block text-sm font-medium text-gray-700">
                                                Facility Name
                                            </label>
                                        </div>

                                        <div className="mt-1  text-right font-bold text-gray-800 bg-gray-100 p-2 rounded">
                                            {data.facility_name}
                                        </div>
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
                                            <option value="3">Awarded</option>
                                            <option value="5">Cancelled</option>
                                        </select>
                                        {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 mb-2 py-1">
                                <div className="relative flex-1" ref={supplierDropdownRef}>
                                    <input
                                        type="text"
                                        placeholder="Search supplier..."
                                        value={supplierSearchQuery}
                                        onChange={handleSupplierSearchChange}
                                        onFocus={() => setShowSupplierDropdown(!!supplierSearchQuery.trim())}
                                        className="w-full border p-2 rounded text-sm pr-10"
                                        ref={supplierSearchInputRef}
                                        autoComplete="off"
                                    />
                                    {supplierSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearSupplierSearch}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            <FontAwesomeIcon icon={faTimesCircle} />
                                        </button>
                                    )}
                                    {showSupplierDropdown && (
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-48 overflow-y-auto">
                                            {supplierSearchResults.length > 0 ? (
                                                supplierSearchResults.map((supplier) => (
                                                    <li
                                                        key={supplier.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => addTenderItem(supplier)}
                                                    >
                                                        {supplier.name}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-gray-500">No suppliers found.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleNewSupplierClick}
                                    className="bg-green-500 text-white rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faPlus} />
                                </button>
                            </div>

                            {/* Table for Tender Quotations */}
                            <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Suppliers
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Quotations
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Preview
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {tenderQuotationsUI.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems[index]}
                                                        onChange={() => handleCheckboxChange(index)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <div className="flex items-center">
                                                        {/* Use the custom InputField for file selection */}
                                                        <InputField
                                                            id={`quotation-file-${index}`} // Unique ID for the HIDDEN input
                                                            type="file"
                                                            placeholder="Attach File"
                                                            value={item.filename} // Display filename in the LABEL (not url)
                                                            onChange={(e) => handleFileSelect(index, e)} // Handle file selection
                                                            htmlFor={`quotation-file-${index}`} // Associate label with input
                                                        />
                                                        {item.filename && ( // Display filename if it exists
                                                            <button
                                                                type="button"
                                                                onClick={() => handleClearFile(index)}
                                                                className="ml-2 text-red-600 hover:text-red-800"
                                                                title="Clear File"
                                                            >
                                                                <FontAwesomeIcon icon={faTimes} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    {item.url ? (
                                                        <a
                                                            href={`/storage/${item.url}`} // Adjust path based on your storage setup
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Preview File"
                                                        >
                                                            <FontAwesomeIcon icon={faEye} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">No file</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.item_id && <span className="text-xs text-gray-400">ID: {item.item_id}</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTenderItem(index)}
                                                        className="ml-2 text-red-600 hover:text-red-800"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Form submission buttons */}
                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('procurements0.index'))}
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
                                    <span>{isSaving ? 'Saving...' : 'Save Tender'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAwardClick}
                                    className="bg-green-500 text-white rounded p-2 flex items-center space-x-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                >
                                    <FontAwesomeIcon icon={faAward} />
                                    <span>Award</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* New Supplier Modal */}
            <Modal
                isOpen={newSupplierModalOpen}
                onClose={handleNewSupplierModalClose}
                onConfirm={handleNewSupplierModalConfirm}
                title="Create New Supplier"
                confirmButtonText={newSupplierModalLoading ? 'Loading...' : (newSupplierModalSuccess ? "Success" : 'Confirm')}
                confirmButtonDisabled={newSupplierModalLoading || newSupplierModalSuccess}
            >
                <div>
                    <label htmlFor="new_supplier_name" className="block text-sm font-medium text-gray-700">
                        Supplier Name
                    </label>
                    <input
                        type="text"
                        id="new_supplier_name"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        disabled={newSupplierModalLoading || newSupplierModalSuccess}
                    />
                </div>
            </Modal>

            {/*  Modal ... */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />

            {/* Award Confirmation Modal */}
            <Modal
                isOpen={awardModalOpen}
                onClose={handleAwardModalClose}
                onConfirm={handleAwardModalConfirm}
                title="Award Confirmation"
                confirmButtonText="Award"
            >
                <div>
                    <p>Are you sure you want to award the tender to {selectedSupplierForAward?.item_name}?</p>
                    <label htmlFor="award_remarks" className="block text-sm font-medium text-gray-700 mt-4">
                        Award Remarks:
                    </label>
                    <textarea
                        id="award_remarks"
                        rows="3"
                        className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={awardRemarks}
                        onChange={(e) => setAwardRemarks(e.target.value)}
                    />
                    {remarksError && <p className="text-red-500 text-sm mt-1">{remarksError}</p>}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}