import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faTrash,
    faSave,
    faTimesCircle,
    faSearch,
    faSpinner,
    // faUpload, // Not directly used if faPaperclip is for the label
    faPaperclip,
    faInfoCircle,
    faBuilding, // Was in your original code, keeping if used elsewhere or for consistency
    faTimes         // <<<< ---- CORRECTED IMPORT ----
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';
import InputError from '@/Components/InputError';

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_PURCHASE_FILE_TYPES = [
    'application/pdf', 'image/jpeg', 'image/png',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const ALLOWED_PURCHASE_FILE_EXT_MSG = "PDF, JPG, PNG, DOC(X), XLS(X)";


export default function Create({ auth, facilityoption, flash, errors: pageErrors }) {
    const { data, setData, post, errors, processing, reset, recentlySuccessful, clearErrors } = useForm({
        supplier_name: '',
        supplier_id: null,
        facility_id: facilityoption?.id || null,
        total: 0,
        stage: 1,
        purchaseitems: [],
        remarks: '',
        file: null,
    });

    const [purchaseItems, setPurchaseItems] = useState(data.purchaseitems);
    const [currentFilename, setCurrentFilename] = useState('');

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isSearchingItems, setIsSearchingItems] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [supplierSearchResults, setSupplierSearchResults] = useState([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false);
    const supplierDropdownRef = useRef(null);
    const supplierSearchInputRef = useRef(null);
    const [selectedSupplierDetails, setSelectedSupplierDetails] = useState(null);

    const [newSupplierModal, setNewSupplierModal] = useState({
        isOpen: false, loading: false, success: false,
        data: { supplier_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' },
        errors: {}
    });

    const [removeItemModal, setRemoveItemModal] = useState({ isOpen: false, message: '', itemToRemoveIndex: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    useEffect(() => {
        setData(prevData => ({
            ...prevData,
            purchaseitems: purchaseItems.map(item => ({
                item_id: item.item_id,
                item_name: item.item_name,
                quantity: item.quantity,
                price: item.price,
            })),
            total: purchaseItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0)
        }));
    }, [purchaseItems, setData]);

    useEffect(() => {
        if (flash?.success) {
            showAlert(flash.success, 'Success', 'success');
            resetFormState();
        }
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);

    const fetchItems = useCallback((query) => {
        if (!query.trim()) { setItemSearchResults([]); setShowItemDropdown(false); return; }
        setIsSearchingItems(true);
        axios.get(route('systemconfiguration2.products.search'), { params: { query } })
            .then(res => { setItemSearchResults(res.data.products.slice(0, 10)); setShowItemDropdown(true); })
            .catch(err => { console.error('Error fetching products:', err); showAlert('Failed to fetch products.', 'Error', 'error'); })
            .finally(() => setIsSearchingItems(false));
    }, []);
    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    useEffect(() => { debouncedItemSearch(itemSearchQuery); }, [itemSearchQuery, debouncedItemSearch]);
    useEffect(() => {
        const handleClick = e => { if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target) && itemSearchInputRef.current && !itemSearchInputRef.current.contains(e.target)) setShowItemDropdown(false); };
        document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const fetchSuppliers = useCallback((query) => {
        if (!query.trim()) { setSupplierSearchResults([]); setShowSupplierDropdown(false); return; }
        setIsSearchingSuppliers(true);
        axios.get(route('systemconfiguration2.suppliers.search'), { params: { query } })
            .then(res => { setSupplierSearchResults(res.data.suppliers.slice(0, 10)); setShowSupplierDropdown(true); })
            .catch(err => { console.error('Error fetching suppliers:', err); showAlert('Failed to fetch suppliers.', 'Error', 'error'); })
            .finally(() => setIsSearchingSuppliers(false));
    }, []);
    const debouncedSupplierSearch = useMemo(() => debounce(fetchSuppliers, 300), [fetchSuppliers]);
    useEffect(() => { debouncedSupplierSearch(supplierSearchQuery); }, [supplierSearchQuery, debouncedSupplierSearch]);
    useEffect(() => {
        const handleClick = e => { if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target) && supplierSearchInputRef.current && !supplierSearchInputRef.current.contains(e.target)) setShowSupplierDropdown(false); };
        document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handlePurchaseItemChange = (index, field, value) => {
        const updated = [...purchaseItems];
        if (field === 'quantity' || field === 'price') {
            const parsed = parseFloat(value);
            updated[index][field] = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        } else { updated[index][field] = value; }
        setPurchaseItems(updated);
        if(errors[`purchaseitems.${index}.${field}`]) clearErrors(`purchaseitems.${index}.${field}`);
    };

    const addPurchaseItem = (selectedItem) => {
        if (purchaseItems.some(item => item.item_id === selectedItem.id)) {
            showAlert(`${selectedItem.name} is already in the list.`, 'Item Exists', 'warning');
            setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
            if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
            return;
        }
        setPurchaseItems(prev => [...prev, {
            item_name: selectedItem.name, item_id: selectedItem.id,
            quantity: 1, price: parseFloat(selectedItem.price || 0).toFixed(2)
        }]);
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
        if(errors.purchaseitems) clearErrors('purchaseitems');
    };

    const confirmRemovePurchaseItem = (index) => setRemoveItemModal({ isOpen: true, message: `Remove "${purchaseItems[index]?.item_name}"?`, itemToRemoveIndex: index });
    const handleRemoveItemConfirm = () => {
        if (removeItemModal.itemToRemoveIndex !== null) setPurchaseItems(prev => prev.filter((_, idx) => idx !== removeItemModal.itemToRemoveIndex));
        setRemoveItemModal({ isOpen: false, message: '', itemToRemoveIndex: null });
    };
    const showAlert = (message, title = 'Alert', type = 'info') => setAlertModal({ isOpen: true, title, message, type });

    const handleFormSubmit = (e) => {
        e.preventDefault();
        clearErrors();
        if (!data.supplier_id) {
            showAlert('Please select or create a supplier.', 'Supplier Required', 'error');
            if (supplierSearchInputRef.current) supplierSearchInputRef.current.focus();
            return;
        }
        if (purchaseItems.length === 0) {
            showAlert('Please add at least one item to the purchase order.', 'Items Required', 'error');
            if (itemSearchInputRef.current) itemSearchInputRef.current.focus();
            return;
        }
        const hasInvalidItems = purchaseItems.some(item => !item.item_id || (item.quantity || 0) <= 0 || (item.price || 0) < 0);
        if (hasInvalidItems) {
            showAlert('Ensure all items have a selected product, quantity > 0, and price >= 0.', 'Invalid Items', 'error');
            return;
        }
        post(route('procurements1.store'), {
            onError: (serverErrors) => {
                console.error("PO Creation Error:", serverErrors);
                if (serverErrors.message) showAlert(serverErrors.message, 'Submission Error', 'error');
                else if (Object.keys(serverErrors).length > 0 && !errors.supplier_id && !errors.purchaseitems && !errors.remarks && !errors.file ) {
                    showAlert('An error occurred. Please review the form.', 'Submission Error', 'error');
                }
            }
        });
    };

    const resetFormState = () => {
        reset(); 
        setPurchaseItems([]);
        setCurrentFilename('');
        setSupplierSearchQuery('');
        setSelectedSupplierDetails(null);
        setItemSearchQuery('');
    };

    const handleItemSearchChange = e => { setItemSearchQuery(e.target.value); if (e.target.value.trim()) setShowItemDropdown(true); else setShowItemDropdown(false); };
    const handleClearItemSearch = () => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); if (itemSearchInputRef.current) itemSearchInputRef.current.focus(); };

    const handleSupplierSearchInputChange = e => {
        const query = e.target.value;
        setSupplierSearchQuery(query);
        if (!query.trim()) setShowSupplierDropdown(false);
        else setShowSupplierDropdown(true);
    };
    const handleClearSupplierSearch = () => {
        setSupplierSearchQuery(''); setSupplierSearchResults([]); setShowSupplierDropdown(false);
        setData(prev => ({ ...prev, supplier_id: null, supplier_name: '' }));
        setSelectedSupplierDetails(null);
        if (supplierSearchInputRef.current) supplierSearchInputRef.current.focus();
        if(errors.supplier_id) clearErrors('supplier_id');
    };

    const selectSupplier = (supplier) => {
        const name = supplier.supplier_type === 'individual'
            ? `${supplier.first_name || ''} ${supplier.other_names || ''} ${supplier.surname || ''}`.replace(/\s+/g, ' ').trim()
            : supplier.company_name;
        setData(prev => ({ ...prev, supplier_id: supplier.id, supplier_name: name || `Supplier ID: ${supplier.id}` }));
        setSelectedSupplierDetails(supplier);
        setSupplierSearchQuery(name || `Supplier ID: ${supplier.id}`);
        setShowSupplierDropdown(false);
        if(errors.supplier_id) clearErrors('supplier_id');
    };

    const openNewSupplierModal = () => setNewSupplierModal({ isOpen: true, loading: false, success: false, data: { supplier_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' }, errors: {} });
    const closeNewSupplierModal = () => setNewSupplierModal(prev => ({ ...prev, isOpen: false, success: false }));
    const handleNewSupplierInputChange = e => { const { id, value } = e.target; setNewSupplierModal(prev => ({ ...prev, data: { ...prev.data, [id]: value }, errors: { ...prev.errors, [id]: null } })); };
    const handleConfirmNewSupplier = () => {
        setNewSupplierModal(prev => ({ ...prev, loading: true, errors: {} }));
        axios.post(route('systemconfiguration2.suppliers.directstore'), newSupplierModal.data)
            .then(response => {
                setNewSupplierModal(prev => ({ ...prev, loading: false, success: true }));
                const createdSupplier = response.data.supplier || response.data;
                if (createdSupplier && createdSupplier.id) selectSupplier(createdSupplier);
                else { console.error("New supplier response format error:", response.data); showAlert("Supplier created, but selection failed.", "Data Issue", "warning"); }
                setTimeout(closeNewSupplierModal, 1500);
            })
            .catch(error => {
                console.error("Full Axios error (New Supplier):", error); let errMsg = "Unexpected error."; let modalErrs = {};
                if(error.response){ if(error.response.data){ if(error.response.data.errors){ modalErrs = error.response.data.errors; errMsg = error.response.data.message || "Validation failed."; } else if (error.response.data.message) errMsg = error.response.data.message; } else if (error.response.statusText) errMsg = `Server Error: ${error.response.status}`; }
                else if(error.request) errMsg = "No server response."; else errMsg = error.message;
                setNewSupplierModal(prev => ({ ...prev, loading: false, errors: modalErrs })); showAlert(errMsg, "Creation Failed", "error");
            });
    };
      
    const handleFileSelectChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = null;
        if (file) {
            if (file.size > MAX_FILE_SIZE_BYTES) { showAlert(`File size exceeds ${MAX_FILE_SIZE_MB}MB.`, 'File Too Large', 'error'); setData('file', null); setCurrentFilename(''); return; }
            if (!ALLOWED_PURCHASE_FILE_TYPES.includes(file.type)) { showAlert(`Invalid file type. Allowed: ${ALLOWED_PURCHASE_FILE_EXT_MSG}.`, 'Invalid File Type', 'error'); setData('file', null); setCurrentFilename(''); return; }
            setData('file', file); setCurrentFilename(file.name);
            if(errors.file) clearErrors('file');
        } else { setData('file', null); setCurrentFilename(''); }
    };
    const handleClearSelectedFile = () => { setData('file', null); setCurrentFilename(''); };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight"> Create New Purchase Order </h2>} >
            <Head title="Create Purchase Order" />
            <div className="py-8">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-6"> {/* Changed space-y-6 to space-y-8 for more separation */}
                            
                            <section className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Supplier Information</h3>
                                    <button type="button" onClick={openNewSupplierModal} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500" disabled={processing} >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2 -ml-0.5" /> New Supplier
                                    </button>
                                </div>
                                <div className="relative" ref={supplierDropdownRef}>
                                    <label htmlFor="supplierSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Search Supplier <span className="text-red-500">*</span></label>
                                    <div className="relative mt-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> {isSearchingSuppliers ? <FontAwesomeIcon icon={faSpinner} className="animate-spin h-5 w-5 text-gray-400" /> : <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />} </div>
                                        <input type="text" id="supplierSearch" placeholder="Type supplier name..." value={supplierSearchQuery} onChange={handleSupplierSearchInputChange} onFocus={() => supplierSearchQuery.trim() && setShowSupplierDropdown(true)} className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 ${errors.supplier_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} ref={supplierSearchInputRef} autoComplete="off" />
                                        {supplierSearchQuery && !isSearchingSuppliers && ( <button type="button" onClick={handleClearSupplierSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Clear search"> <FontAwesomeIcon icon={faTimesCircle} /> </button> )}
                                    </div>
                                    <InputError message={errors.supplier_id} className="mt-2" />
                                    {showSupplierDropdown && ( <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"> {supplierSearchResults.length > 0 ? ( supplierSearchResults.map(s => ( <li key={s.id} onClick={() => selectSupplier(s)} className="group text-gray-900 dark:text-gray-100 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500"> {s.supplier_type === 'individual' ? `${s.first_name||''} ${s.other_names||''} ${s.surname||''}`.replace(/\s+/g,' ').trim() : s.company_name} <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 group-hover:text-white">({s.email||'No Email'})</span> </li> )) ) : ( <li className="text-gray-500 dark:text-gray-400 select-none py-2 px-3">{isSearchingSuppliers ? 'Searching...' : 'No results.'}</li> )} </ul> )}
                                </div>
                                {selectedSupplierDetails && (
                                    <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Selected Supplier:</h4>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">{selectedSupplierDetails.supplier_type === 'individual' ? `${selectedSupplierDetails.first_name||''} ${selectedSupplierDetails.other_names||''} ${selectedSupplierDetails.surname||''}`.replace(/\s+/g,' ').trim() : selectedSupplierDetails.company_name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Email: {selectedSupplierDetails.email || 'N/A'} | Phone: {selectedSupplierDetails.phone || 'N/A'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {selectedSupplierDetails.id}</p>
                                    </div>
                                )}
                            </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                                <div>
                                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Remarks</label>
                                    <textarea id="remarks" rows="3" value={data.remarks} onChange={(e) => setData('remarks', e.target.value)} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors.remarks ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    <InputError message={errors.remarks} className="mt-2" />
                                </div>
                                <div>
                                    <label htmlFor="purchase_file_upload_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Document (Optional)</label>
                                    <div className="mt-1 flex items-center">
                                        <label htmlFor="purchase_file_upload_input" className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${errors.file ? 'border-red-500':''}`}>
                                            <FontAwesomeIcon icon={faPaperclip} className="mr-2 -ml-1 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                            <span>{currentFilename || "Choose file"}</span>
                                        </label>
                                        <input id="purchase_file_upload_input" type="file" className="sr-only" onChange={handleFileSelectChange} accept={ALLOWED_PURCHASE_FILE_TYPES.join(',')} />
                                        {currentFilename && (
                                            <button type="button" onClick={handleClearSelectedFile} className="ml-3 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Clear file">
                                                <FontAwesomeIcon icon={faTimes} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Max file size: {MAX_FILE_SIZE_MB}MB. Types: {ALLOWED_PURCHASE_FILE_EXT_MSG}.</p>
                                    <InputError message={errors.file} className="mt-2" />
                                </div>
                            </section>

                            <section className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Purchase Items</h3>
                                <div className="relative" ref={itemDropdownRef}>
                                    <label htmlFor="itemSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Search Product/Service <span className="text-red-500">*</span></label>
                                    <div className="relative mt-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> {isSearchingItems ? <FontAwesomeIcon icon={faSpinner} className="animate-spin h-5 w-5 text-gray-400" /> : <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />} </div>
                                        <input type="text" id="itemSearch" placeholder="Type product/service name..." value={itemSearchQuery} onChange={handleItemSearchChange} onFocus={() => itemSearchQuery.trim() && setShowItemDropdown(true)} className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 ${errors.purchaseitems ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} ref={itemSearchInputRef} autoComplete="off" />
                                        {itemSearchQuery && !isSearchingItems && ( <button type="button" onClick={handleClearItemSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Clear search"> <FontAwesomeIcon icon={faTimesCircle} /> </button> )}
                                    </div>
                                    {showItemDropdown && ( <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"> {itemSearchResults.length > 0 ? ( itemSearchResults.map(item => ( <li key={item.id} onClick={() => addPurchaseItem(item)} className="group text-gray-900 dark:text-gray-100 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500"> {item.name} <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 group-hover:text-white">(Price: {parseFloat(item.price || 0).toFixed(2)})</span> </li> )) ) : ( <li className="text-gray-500 dark:text-gray-400 select-none py-2 px-3">{isSearchingItems ? 'Searching...' : 'No results.'}</li> )} </ul> )}
                                </div>
                                <InputError message={errors.purchaseitems} className="mt-2" />

                                {purchaseItems.length > 0 ? (
                                    <div className="mt-4 -my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <div className="overflow-hidden shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Item</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-28">Quantity</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-32">Unit Price</th><th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 w-32">Subtotal</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 w-16"><span className="sr-only">Remove</span></th></tr></thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        {purchaseItems.map((item, index) => (
                                                            <tr key={item.item_id || `new-${index}`}>
                                                                <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">{item.item_name}<div className="text-xs text-gray-500 dark:text-gray-400">ID: {item.item_id}</div></td>
                                                                <td className="px-3 py-4 text-sm"><input type="number" value={item.quantity} onChange={e => handlePurchaseItemChange(index, 'quantity', e.target.value)} min="1" className={`block w-full text-center rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors[`purchaseitems.${index}.quantity`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} /> <InputError message={errors[`purchaseitems.${index}.quantity`]} className="mt-1 text-xs" /></td>
                                                                <td className="px-3 py-4 text-sm"><input type="number" value={item.price} onChange={e => handlePurchaseItemChange(index, 'price', e.target.value)} min="0" step="0.01" className={`block w-full text-right rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors[`purchaseitems.${index}.price`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} /> <InputError message={errors[`purchaseitems.${index}.price`]} className="mt-1 text-xs" /></td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-700 dark:text-gray-300">{((item.quantity || 0) * (item.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6"><button type="button" onClick={() => confirmRemovePurchaseItem(index)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1" title="Remove item"><FontAwesomeIcon icon={faTrash} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-100 dark:bg-gray-700"><tr><td colSpan="3" className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Grand Total</td><td className="px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td></td></tr></tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : ( <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"> <FontAwesomeIcon icon={faInfoCircle} className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" /> <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Items Added</h3> <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Search for products/services above to add them.</p> </div> )}
                            </section>

                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
                                <Link href={route('procurements1.index')} className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={processing}> <FontAwesomeIcon icon={faTimesCircle} className="mr-2 -ml-1 h-5 w-5" /> Cancel </Link>
                                <button type="submit" disabled={processing || purchaseItems.length === 0} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" > {processing ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2 -ml-1 h-5 w-5" /> : <FontAwesomeIcon icon={faSave} className="mr-2 -ml-1 h-5 w-5" />} {processing ? 'Saving...' : 'Save Purchase Order'} </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal(p => ({...p, isOpen: false}))} title={alertModal.title} message={alertModal.message} type={alertModal.type} isAlert={true}/>
            <Modal isOpen={removeItemModal.isOpen} onClose={() => setRemoveItemModal(p => ({...p, isOpen:false}))} onConfirm={handleRemoveItemConfirm} title="Confirm Removal" message={removeItemModal.message} type="warning" confirmButtonText="Remove" isDestructive={true} />
            <Modal isOpen={newSupplierModal.isOpen} onClose={closeNewSupplierModal} onConfirm={handleConfirmNewSupplier} title="Create New Supplier" confirmButtonText={newSupplierModal.loading ? 'Saving...' : (newSupplierModal.success ? 'Saved!' : 'Create Supplier')} confirmButtonDisabled={newSupplierModal.loading || newSupplierModal.success} processing={newSupplierModal.loading}>
                <form className="space-y-4">
                    <div> <label htmlFor="supplier_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Type <span className="text-red-500">*</span></label> <select id="supplier_type" value={newSupplierModal.data.supplier_type} onChange={handleNewSupplierInputChange} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${newSupplierModal.errors?.supplier_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}> <option value="individual">Individual</option> <option value="company">Company</option> </select> <InputError message={newSupplierModal.errors?.supplier_type} className="mt-1" /> </div>
                    {newSupplierModal.data.supplier_type === 'individual' ? ( ['first_name', 'other_names', 'surname'].map(field => ( <div key={field}> <label htmlFor={field} className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} {field !== 'other_names' && <span className="text-red-500">*</span>} </label> <input type="text" id={field} value={newSupplierModal.data[field]} onChange={handleNewSupplierInputChange} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${newSupplierModal.errors?.[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} /> <InputError message={newSupplierModal.errors?.[field]} className="mt-1" /> </div> )) ) : ( <div> <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name <span className="text-red-500">*</span></label> <input type="text" id="company_name" value={newSupplierModal.data.company_name} onChange={handleNewSupplierInputChange} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${newSupplierModal.errors?.company_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} /> <InputError message={newSupplierModal.errors?.company_name} className="mt-1" /> </div> )}
                    {['email', 'phone'].map(field => ( <div key={field}> <label htmlFor={field} className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {field.replace(/\b\w/g, l => l.toUpperCase())} <span className="text-red-500">*</span> </label> <input type={field === 'email' ? 'email' : 'tel'} id={field} value={newSupplierModal.data[field]} onChange={handleNewSupplierInputChange} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${newSupplierModal.errors?.[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} /> <InputError message={newSupplierModal.errors?.[field]} className="mt-1" /> </div> ))}
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}