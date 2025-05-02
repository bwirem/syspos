import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faMoneyBill } from '@fortawesome/free-solid-svg-icons';
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

export default function Create({facilityoption}) {
    const { data, setData, post, errors, processing, reset } = useForm({
        supplier_name: '',
        supplier_id: null,       
        facility_id: facilityoption.id,
        total: 0,
        stage: 1,
        purchaseitems: [],
        remarks: '',
        file: null, // New state for the uploaded file
        url: '',
        filename: '',
    });

    const [purchaseItems, setPurchaseItems] = useState(data.purchaseitems);

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [supplierSearchResults, setSupplierSearchResults] = useState([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const supplierDropdownRef = useRef(null);
    const supplierSearchInputRef = useRef(null);
    const [supplierIDError, setSupplierIDError] = useState(null);

    // New Supplier Modal State
    const [newSupplierName, setNewSupplierName] = useState('');   
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

    const fetchSuppliers = useCallback((query) => {
        if (!query.trim()) {
            setSupplierSearchResults([]);
            return;
        }

        axios.get(route('systemconfiguration2.suppliers.search'), { params: { query } })
            .then((response) => {
                setSupplierSearchResults(response.data.suppliers.slice(0, 5));
            })
            .catch((error) => {
                console.error('Error fetching suppliers:', error);
                showAlert('Failed to fetch suppliers. Please try again later.');
                setSupplierSearchResults([]);
            });
    }, []);
   
    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    const debouncedSupplierSearch = useMemo(() => debounce(fetchSuppliers, 300), [fetchSuppliers]);   

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => {
        if (supplierSearchQuery.trim()) {
            debouncedSupplierSearch(supplierSearchQuery);
        } else {
            setSupplierSearchResults([]);
        }
    }, [supplierSearchQuery, debouncedSupplierSearch]);

    
    useEffect(() => {
        setData('purchaseitems', purchaseItems);
        const calculatedTotal = purchaseItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
       
    }, [purchaseItems, setData]);

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
        const handleClickOutsideSupplier = (event) => {
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
                setShowSupplierDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideSupplier);
        return () => document.removeEventListener('mousedown', handleClickOutsideSupplier);
    }, []);   

    const handlePurchaseItemChange = (index, field, value) => {
        const updatedItems = [...purchaseItems];
        if (field === 'quantity' || field === 'price') {
            const parsedValue = parseFloat(value);
            updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        } else {
            updatedItems[index][field] = value;
        }
        setPurchaseItems(updatedItems);
    };

    const addPurchaseItem = (selectedItem = null) => {
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
        setPurchaseItems((prevItems) => [...prevItems, newItem]);
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    const removePurchaseItem = (index) => {
        setModalState({
            isOpen: true,
            message: 'Are you sure you want to remove this item?',
            isAlert: false,
            itemToRemoveIndex: index,
        });
    };

    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = purchaseItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setPurchaseItems(updatedItems);
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
    
        if (data.supplier_id !== null && !Number.isInteger(Number(data.supplier_id))) {
            setSupplierIDError('Supplier ID must be an integer.');
            return;
        } else {
            setSupplierIDError(null);
        }
           
        const hasEmptyFields = purchaseItems.some(
            (item) => !item.item_name || !item.item_id || item.quantity <= 0 || item.price < 0
        );
    
        if (hasEmptyFields) {
            showAlert('Please ensure all purchase items have valid item names, quantities, prices, and item IDs.');
            return;
        }
    
        setIsSaving(true);
    
        // Create FormData object to send file
        const formData = new FormData();
        formData.append('supplier_name', data.supplier_name);
        formData.append('supplier_id', data.supplier_id);
        formData.append('facility_name', data.facility_name);
        formData.append('facility_id', data.facility_id);
        formData.append('total', data.total);
        formData.append('stage', data.stage);
        formData.append('remarks', data.remarks);
        
        // Append file if it exists
        if (data.file) {
            formData.append('file', data.file);
        }
    
        // Append purchase items
        purchaseItems.forEach((item, index) => {
            formData.append(`purchaseitems[${index}][item_name]`, item.item_name);
            formData.append(`purchaseitems[${index}][item_id]`, item.item_id);
            formData.append(`purchaseitems[${index}][quantity]`, item.quantity);
            formData.append(`purchaseitems[${index}][price]`, item.price);
        });
    
        // Post the data
        Inertia.post(route('procurements1.store'), formData, {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (error) => {
                console.error(error);
                setIsSaving(false);
                showAlert('An error occurred while saving the purchase.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setPurchaseItems([]);
        setSupplierIDError(null);     
        showAlert('Purchase created successfully!');
    };

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };    
   
    const handleClearSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };

     // Handle supplier search input change
     const handleSupplierSearchChange = (e) => {
        const query = e.target.value;
        setSupplierSearchQuery(query);
        setSupplierSearchResults([]); // Clear previous results
        setShowSupplierDropdown(!!query.trim());

        // Update appropriate fields based on supplier type
        setData((prevData) => ({
            ...prevData,
            first_name: '',
            other_names: '',
            surname: '',
            company_name: '',
            email: '',
            phone: '',
            supplier_id: null,
        }));
    };

    // Clear supplier search
    const handleClearSupplierSearch = () => {
        setSupplierSearchQuery('');
        setSupplierSearchResults([]);
        setShowSupplierDropdown(false);
        if (supplierSearchInputRef.current) {
            supplierSearchInputRef.current.focus();
        }

        setData((prevData) => ({
            ...prevData,
            first_name: '',
            other_names: '',
            surname: '',
            company_name: '',
            email: '',
            phone: '',
            supplier_id: null,
        }));
    };


    // Handle supplier selection
    const selectSupplier = (selectedSupplier) => {
        setData((prevData) => ({
            ...prevData,
            supplier_type: selectedSupplier.supplier_type,
            first_name: selectedSupplier.first_name || '',
            other_names: selectedSupplier.other_names || '',
            surname: selectedSupplier.surname || '',
            company_name: selectedSupplier.company_name || '',
            email: selectedSupplier.email,
            phone: selectedSupplier.phone || '',
            supplier_id: selectedSupplier.id,
        }));

        setSupplierSearchQuery('');
        setSupplierSearchResults([]);
        setShowSupplierDropdown(false);
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
                setData((prevData) => ({
                    ...prevData,
                    supplier_type: response.data.supplier_type,
                    first_name: response.data.first_name,
                    other_names: response.data.other_names,
                    surname: response.data.surname,
                    company_name: response.data.company_name,
                    email: response.data.email,
                    phone: response.data.phone,
                    supplier_id: response.data.id,
                }));

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
            }, 1000)

        }

    };

    const handleNewSupplierInputChange = (e) => {
        const { id, value } = e.target;
        setNewSupplier(prevState => ({
            ...prevState,
            [id]: value,
        }));
    };
      
    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setData('file', file);
            setData('filename', file.name); // Set filename
            setData('url', file.name);
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Purchase</h2>}
        >
            <Head title="Create Purchase" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6"  encType="multipart/form-data">

                            {/* Supplier Search and New Supplier Button */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={supplierDropdownRef}>
                                    <div className="flex items-center justify-between h-10">
                                        <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700 mr-2">
                                            Supplier Name
                                        </label>
                                        {/* New Supplier Button Added Here */}
                                        <button
                                            type="button"
                                            onClick={handleNewSupplierClick}
                                            className="bg-green-500 text-white rounded p-2 flex items-center space-x-2"
                                        >
                                            <FontAwesomeIcon icon={faPlus} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search supplier..."
                                        value={supplierSearchQuery}
                                        onChange={handleSupplierSearchChange}
                                        onFocus={() => setShowSupplierDropdown(!!supplierSearchQuery.trim())}
                                        className={`w-full border p-2 rounded text-sm pr-10 ${supplierIDError ? 'border-red-500' : ''}`}
                                        ref={supplierSearchInputRef}
                                        autoComplete="off"
                                    />
                                    {supplierIDError && <p className="text-sm text-red-600 mt-1">{supplierIDError}</p>}
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
                                                        onClick={() => selectSupplier(supplier)}
                                                    >
                                                        {supplier.supplier_type === 'company' ? supplier.company_name : `${supplier.first_name} ${supplier.surname}`}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-gray-500">No suppliers found.</li>
                                            )}
                                        </ul>
                                    )}
                                    {/* Display Supplier Details After Selection */}
                                    {data.supplier_id && (
                                        <section className="border-b border-gray-200 pb-4">                                      
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">                                              

                                                {data.supplier_type === 'individual' ? (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">First Name:</label>
                                                            <p className="mt-1 text-sm text-gray-500">{data.first_name || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Other Names:</label>
                                                            <p className="mt-1 text-sm text-gray-500">{data.other_names || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Surname:</label>
                                                            <p className="mt-1 text-sm text-gray-500">{data.surname || 'N/A'}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Company Name:</label>
                                                        <p className="mt-1 text-sm text-gray-500">{data.company_name || 'N/A'}</p>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Email:</label>
                                                    <p className="mt-1 text-sm text-gray-500">{data.email || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Phone:</label>
                                                    <p className="mt-1 text-sm text-gray-500">{data.phone || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </div>                       

                             <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">                               {/* Remarks */}
                                <div className="flex-1">
                                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">
                                        Remarks
                                    </label>
                                    <textarea
                                        id="remarks"
                                        rows="3"
                                        value={data.remarks}
                                        onChange={(e) => setData('remarks', e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                 {/* Right Side Section */}
                                 <div className="flex flex-col space-y-4">
                                    {/* File Upload */}
                                    <div className="flex-1">
                                        <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                                            File Upload
                                        </label>
                                        <input
                                            type="file"
                                            id="file"
                                            onChange={handleFileSelect}
                                            className="mt-1 block w-full text-sm text-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {data.filename && (
                                            <p className="mt-2 text-sm text-gray-500">
                                                Selected file: {data.filename}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                            </div>

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
                                                        onClick={() => addPurchaseItem(item)}
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
                                        {purchaseItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.item_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`quantity_${index}`}
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handlePurchaseItemChange(index, 'quantity', e.target.value)}
                                                        error={errors.purchaseitems && errors.purchaseitems[index]?.quantity}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    <InputField
                                                        id={`price_${index}`}
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => handlePurchaseItemChange(index, 'price', e.target.value)}
                                                        error={errors.purchaseitems && errors.purchaseitems[index]?.price}
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
                                                        onClick={() => removePurchaseItem(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Total Row */}
                                        <tr className="bg-gray-100 font-bold">
                                            <td colSpan="3" className="px-6 py-4 text-right text-gray-700">
                                                Total
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-800">
                                                {parseFloat(data.total).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-700"></td>

                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end space-x-4 mt-6">                                
                                <Link
                                    href={route('procurements1.index')}  // Using the route for navigation
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