import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faMoneyBill, faEye } from '@fortawesome/free-solid-svg-icons';
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

export default function Edit({ purchase }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        supplier_name: purchase.supplier.name,
        supplier_id: purchase.supplier_id,
        facility_name: purchase.facilityoption.name,
        facility_id: purchase.facilityoption_id,
        total: purchase.total,
        stage: purchase.stage,
        purchaseitems: purchase.purchaseitems || [],
        remarks: purchase.remarks || '',
        url: purchase.url || '',
        filename: purchase.filename || '',
        file: null, // Add file state
    });

    const [purchaseItems, setPurchaseItems] = useState(data.purchaseitems);

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [supplierSearchQuery, setSupplierSearchQuery] = useState(data.supplier_name);
    const [supplierSearchResults, setSupplierSearchResults] = useState([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const supplierDropdownRef = useRef(null);
    const supplierSearchInputRef = useRef(null);

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

    const debouncedSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    const debouncedSupplierSearch = useMemo(() => debounce(fetchSuppliers, 300), [fetchSuppliers]);

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedSearch]);

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
        // This useEffect is designed to only run when data.purchaseitems changes in identity
        // not on every render, to prevent infinite loops.
        const newItemList = data.purchaseitems.map(item => ({
            item_name: item.item_name || item.item?.name || '',
            item_id: item.item_id || item.item?.id || null,
            quantity: item.quantity || 1,
            price: item.price || 0,
            item: item.item || null,
        }));

        // Use a simple equality check to prevent unnecessary state updates
        const areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

        if (!areEqual(purchaseItems, newItemList)) {
            setPurchaseItems(newItemList);
        }
    }, [data.purchaseitems]);

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
            let parsedValue = parseFloat(value);
            if (field === 'quantity') {
                parsedValue = parseInt(value, 10);
            }
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

        setPurchaseItems((prevItems) => {
            const updatedItems = [...prevItems, newItem];
            setData('purchaseitems', updatedItems); // Update Inertia data here
            return updatedItems;
        });

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
    
        const hasEmptyFields = purchaseItems.some((item) => {
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
            showAlert('Please ensure all purchase items have valid item names, quantities, prices, and item IDs.');
            return;
        }
    
        setIsSaving(true);
    
        const formData = new FormData();
        formData.append('supplier_name', data.supplier_name);
        formData.append('supplier_id', data.supplier_id);
        formData.append('facility_name', data.facility_name);
        formData.append('facility_id', data.facility_id);
        formData.append('total', data.total);
        formData.append('stage', data.stage);
        formData.append('remarks', data.remarks);
        formData.append('_method', 'PUT'); // Required for Inertia to recognize as PUT request
    
        if (data.file) {
            formData.append('file', data.file);
        }
    
        purchaseItems.forEach((item, index) => {
            formData.append(`purchaseitems[${index}][item_name]`, item.item_name);
            formData.append(`purchaseitems[${index}][item_id]`, item.item_id);
            formData.append(`purchaseitems[${index}][quantity]`, item.quantity);
            formData.append(`purchaseitems[${index}][price]`, item.price);
        });
    
        Inertia.post(route('procurements1.update', purchase.id), formData, {
            forceFormData: true,
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the purchase. Please check the console for details.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setPurchaseItems([]);
        showAlert('Purchase updated successfully!');
    };

    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };

    const handleSupplierSearchChange = (e) => {
        const query = e.target.value;
        setSupplierSearchQuery(query);
        setShowSupplierDropdown(!!query.trim());
        setData('supplier_name', query);
    };

    const handleClearItemSearch = () => {
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
        if (itemSearchInputRef.current) {
            itemSearchInputRef.current.focus();
        }
    };

    const handleClearSupplierSearch = () => {
        setSupplierSearchQuery('');
        setSupplierSearchResults([]);
        setShowSupplierDropdown(false);
        if (supplierSearchInputRef.current) {
            supplierSearchInputRef.current.focus();
        }
    };

    const selectSupplier = (selectedSupplier) => {
        setData('supplier_name', selectedSupplier.name);
        setData('supplier_id', selectedSupplier.id);
        setSupplierSearchQuery(selectedSupplier.name);
        setSupplierSearchResults([]);
        setShowSupplierDropdown(false);
    };

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setData('file', file);
            setData('filename', file.name); // Set filename
            setData('url', file.name);  //set url
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Purchase</h2>}
        >
            <Head title="Edit Purchase" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1" ref={supplierDropdownRef}>
                                    <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700">
                                        Supplier Name
                                    </label>
                                    <input
                                        type="text"
                                        value={supplierSearchQuery}
                                        onChange={handleSupplierSearchChange}
                                        onFocus={() => setShowSupplierDropdown(!!supplierSearchQuery.trim())}
                                        className="w-full border p-2 rounded text-sm pr-10"
                                        ref={supplierSearchInputRef}
                                        autoComplete="new-password"
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
                                                        onClick={() => selectSupplier(supplier)}
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

                                <div className="relative flex-1">

                                    <label htmlFor="facility_name" className="block text-sm font-medium text-gray-700">
                                        Facility Name
                                    </label>

                                    <div className="mt-1  text-left font-bold text-gray-800 bg-gray-100 p-2 rounded">
                                        {data.facility_name}
                                    </div>
                                </div>
                            </div>

                            {/* Remarks and File in the Same Row */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                {/* Remarks */}
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

                                {/* File Preview */}
                                <div className="flex-1">
                                    <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                                        File:
                                    </label>
                                    <div className="mt-1">
                                        {data.filename ? (
                                            <a
                                                href={data.url ? `/storage/${data.url}` : null}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                {data.filename}
                                                <FontAwesomeIcon icon={faEye} className="ml-2" />
                                            </a>
                                        ) : (
                                            <span>No file attached</span>
                                        )}
                                    </div>

                                    {/* File Upload Input */}
                                    <input
                                        type="file"
                                        id="file"
                                        onChange={handleFileSelect}
                                        className="mt-1 block w-full text-sm text-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
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
                                        <option value="2">Approved</option>
                                        <option value="3">Dispatched</option>
                                        <option value="4">Received</option>
                                    </select>
                                    {errors.stage && <p className="text-sm text-red-600 mt-1">{errors.stage}</p>}
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item ? item.item.name : 'Unknown Item'}
                                                </td>
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
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('procurements1.index'))}
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
                                    <span>{isSaving ? 'Saving...' : 'Save Purchase'}</span>
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