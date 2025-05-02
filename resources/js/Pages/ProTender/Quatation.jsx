import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faTimes, faEye, faCheck } from '@fortawesome/free-solid-svg-icons';
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
        facility_id: tender.facilityoption_id,
        stage: tender.stage || 1,
        tenderitems: tender.tenderitems || [],
        tenderquotations: [],
        remarks: '',
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
   

    // New Supplier Modal State
    const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({
        supplier_type: 'individual',
        first_name: '',
        other_names: '',
        surname: '',
        company_name: '',
        email: '',
        phone: '',
    });
    const [newSupplierModalLoading, setNewSupplierModalLoading] = useState(false);
    const [newSupplierModalSuccess, setNewSupplierModalSuccess] = useState(false);

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);   
    const [submitRemarks, setSubmitRemarks] = useState(''); // State for the remarks
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
                item_name: selectedSupplier.supplier_type === 'individual' 
                    ? `${selectedSupplier.first_name} ${selectedSupplier.other_names ? selectedSupplier.other_names + ' ' : ''}${selectedSupplier.surname}`
                    : selectedSupplier.company_name,
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
            formData.append(`tenderquotations[${index}][type]`, item.type);
            formData.append(`tenderquotations[${index}][size]`, item.size);
            formData.append(`tenderquotations[${index}][description]`, item.filename); 
            

            // Ensure file upload works properly
            if (item.file) {
                formData.append(`tenderquotations[${index}][type]`, item.file.type);
                formData.append(`tenderquotations[${index}][size]`, item.file.size);                           
                formData.append(`tenderquotations[${index}][file]`, item.file, item.filename);  // Use filename here
            }

        });
        

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

   
     // Handle supplier search input change
     const handleSupplierSearchChange = (e) => {
        const query = e.target.value;
        setSupplierSearchQuery(query);
        setSupplierSearchResults([]); // Clear previous results
        setShowSupplierDropdown(!!query.trim());
        
    };

    // Clear supplier search
    const handleClearSupplierSearch = () => {
        setSupplierSearchQuery('');
        setSupplierSearchResults([]);
        setShowSupplierDropdown(false);
        if (supplierSearchInputRef.current) {
            supplierSearchInputRef.current.focus();
        }

       
    };
   
  
    // Function to handle new supplier button click (Open the modal)
    const handleNewSupplierClick = () => {
        setNewSupplierModalOpen(true);
        setNewSupplierModalSuccess(false); //reset state in case open again
        setNewSupplier({
            supplier_type: 'individual',
            first_name: '',
            other_names: '',
            surname: '',
            company_name: '',
            email: '',
            phone: '',
        });
    };
    // Function to close the modal
    const handleNewSupplierModalClose = () => {
        setNewSupplierModalOpen(false);
        setNewSupplierModalLoading(false);
        setNewSupplierModalSuccess(false);
    };

    // Function to confirm new supplier (you should implement saving logic here)
    const handleNewSupplierModalConfirm = async () => {
        setNewSupplierModalLoading(true);
        try {
            const response = await axios.post(route('systemconfiguration2.suppliers.directstore'), newSupplier);
    
            if (response.data && response.data.id) {
                // Create the new item based on the response
                const newSupplierItem = {
                    item_id: response.data.id,
                    item_name: response.data.supplier_type === 'individual' 
                        ? `${response.data.first_name} ${response.data.other_names ? response.data.other_names + ' ' : ''}${response.data.surname}`
                        : response.data.company_name,
                    filename: '',
                    url: '',
                    file: null
                };            
    
                // Update the tender quotations UI state
                setTenderQuotationsUI((prevItems) => [...prevItems, newSupplierItem]);
    
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
                setNewSupplierModalSuccess(false);
            }, 1000);
        }
    };
    
    const handleNewSupplierInputChange = (e) => {
        const { id, value } = e.target;
        setNewSupplier(prevState => ({
            ...prevState,
            [id]: value,
        }));
    };


    const handleSubmitClick = () => {

        if (data.tenderquotations.length === 0) {
            showAlert('Please add at least one supplier before submitting.');
            return;
        }       

        setData("stage", 3);
        setData('remarks', ''); // Reset remarks field in the form data

              
        setSubmitModalOpen(true);
        setSubmitRemarks(''); // Reset remarks when opening modal
        setRemarksError(''); // Clear any previous error
    };

    const handleSubmitModalClose = () => {

        setData("stage", 2);
        setData('remarks', ''); // Reset remarks field in the form data

        setSubmitModalOpen(false);       
        setSubmitRemarks(''); // Clear remarks when closing modal
        setRemarksError(''); // Clear any error
    };

    const handleSubmitModalConfirm = () => {  

        if (!data.remarks.trim()) {
            setRemarksError('Please enter Submit remarks.');
            return;
        }
    
        const formData = new FormData();
        formData.append('remarks', data.remarks);
    
        //setSubmitModalLoading(true); // Set loading state
    
        put(route('procurements0.update', tender.id), formData, {
            forceFormData: true, // OK to keep
            onSuccess: () => {
                console.log('Sale submited successfully!');
                // setSubmitModalLoading(false);
                // setSubmitModalSuccess(true);
                handleSubmitModalClose();
            },
            onError: (errors) => {
                //setSubmitModalLoading(false);
                console.error('Submission errors:', errors);
            },
        });

      
         
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
                              
                            </div>


                            {/* Table for Tender Items */}
                            <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>                                            
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {data.tenderitems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item ? item.item.name : 'Unknown Item'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                  {item.quantity}                                                   
                                                </td>                                                
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                                                        {supplier.supplier_type === 'individual' ? (
                                                            `${supplier.first_name} ${supplier.other_names ? supplier.other_names + ' ' : ''}${supplier.surname}`
                                                        ) : (
                                                            supplier.company_name
                                                        )}
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
                                    onClick={handleSubmitClick}
                                    className="bg-green-500 text-white rounded p-2 flex items-center space-x-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                >
                                    <FontAwesomeIcon icon={faCheck} />
                                    <span>Submit</span>
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
                <form className="space-y-4">
                    <div>
                        <label htmlFor="supplier_type" className="block text-sm font-medium text-gray-700">Supplier Type</label>
                        <select
                            id="supplier_type"
                            value={newSupplier.supplier_type}
                            onChange={handleNewSupplierInputChange}
                            className="w-full border p-2 rounded text-sm"
                            disabled={newSupplierModalLoading || newSupplierModalSuccess}
                        >
                            <option value="individual">Individual</option>
                            <option value="company">Company</option>
                        </select>
                    </div>

                    {newSupplier.supplier_type === 'individual' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    type="text"
                                    id="first_name"
                                    value={newSupplier.first_name}
                                    onChange={handleNewSupplierInputChange}
                                    className="w-full border p-2 rounded text-sm"
                                    disabled={newSupplierModalLoading || newSupplierModalSuccess}
                                />
                            </div>
                            <div>
                                <label htmlFor="other_names" className="block text-sm font-medium text-gray-700">Other Names</label>
                                <input
                                    type="text"
                                    id="other_names"
                                    value={newSupplier.other_names}
                                    onChange={handleNewSupplierInputChange}
                                    className="w-full border p-2 rounded text-sm"
                                    disabled={newSupplierModalLoading || newSupplierModalSuccess}
                                />
                            </div>
                            <div>
                                <label htmlFor="surname" className="block text-sm font-medium text-gray-700">Surname</label>
                                <input
                                    type="text"
                                    id="surname"
                                    value={newSupplier.surname}
                                    onChange={handleNewSupplierInputChange}
                                    className="w-full border p-2 rounded text-sm"
                                    disabled={newSupplierModalLoading || newSupplierModalSuccess}
                                />
                            </div>
                        </div>
                    )}

                    {newSupplier.supplier_type === 'company' && (
                        <div>
                            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">Company Name</label>
                            <input
                                type="text"
                                id="company_name"
                                value={newSupplier.company_name}
                                onChange={handleNewSupplierInputChange}
                                className="w-full border p-2 rounded text-sm"
                                disabled={newSupplierModalLoading || newSupplierModalSuccess}
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={newSupplier.email}
                            onChange={handleNewSupplierInputChange}
                            className="w-full border p-2 rounded text-sm"
                            disabled={newSupplierModalLoading || newSupplierModalSuccess}
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                            type="text"
                            id="phone"
                            value={newSupplier.phone}
                            onChange={handleNewSupplierInputChange}
                            className="w-full border p-2 rounded text-sm"
                            disabled={newSupplierModalLoading || newSupplierModalSuccess}
                        />
                    </div>
                </form>
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

            {/* Submit Confirmation Modal */}
            <Modal
                isOpen={submitModalOpen}
                onClose={handleSubmitModalClose}
                onConfirm={handleSubmitModalConfirm}
                title="Submit Confirmation"
                confirmButtonText="Submit"
            >
                <div>
                    <p>Are you sure you want to submit this tender ?</p>
                    <label htmlFor="submit_remarks" className="block text-sm font-medium text-gray-700 mt-4">
                        Submit Remarks:
                    </label>
                    <textarea
                        id="submit_remarks"
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