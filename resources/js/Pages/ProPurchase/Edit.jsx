import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react'; // router for actions
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faEye, faCheck, faSpinner, faSearch, faPaperclip, faInfoCircle, faBuilding, faTimes} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
// No need to import Inertia directly, useForm and router handle it.
// import axios from 'axios'; // Only if making direct API calls not handled by Inertia

import Modal from '../../Components/CustomModal.jsx';
// Assuming CustomInputField.jsx is a styled input component.
// If it's just a basic input, replace with standard <input> and style directly.
// import InputField from '../../Components/CustomInputField.jsx';
import InputError from '@/Components/InputError'; // Standard Inertia error component

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

// Constants for file handling (can be moved to a shared util)
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_PURCHASE_FILE_TYPES = [
    'application/pdf', 'image/jpeg', 'image/png',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const ALLOWED_PURCHASE_FILE_EXT_MSG = "PDF, JPG, PNG, DOC(X), XLS(X)";

// Stage label helper
const getPurchaseStageLabel = (stage) => {
    const stageNum = parseInt(stage, 10);
    if (stageNum === 1) return 'Pending';
    if (stageNum === 2) return 'Approved';
    if (stageNum === 3) return 'Dispatched';
    // Add more stages like Received, Paid, etc.
    return 'Unknown';
};


export default function Edit({ auth, purchase, flash, errors: pageErrors }) { // Added auth, flash, pageErrors
    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        // Supplier details are mostly for display from `purchase.supplier`
        // If supplier can be changed on edit, this needs more complex state
        supplier_id: purchase.supplier_id,
        facility_id: purchase.facility_id || purchase.facilityoption_id, // Use correct key
        total: parseFloat(purchase.total || 0),
        stage: purchase.stage,
        purchaseitems: [], // Will be populated by transform for submission
        remarks: purchase.remarks || '',
        file: null, // For new file upload
        // Existing file info for display
        existing_filename: purchase.filename || '',
        existing_file_url: purchase.url || '',
        remove_existing_file: false, // Flag to tell backend to remove stored file
        _method: 'PUT', // For Inertia's PUT request
    });

    // Local UI state for purchase items
    const [purchaseItemsUI, setPurchaseItemsUI] = useState(
        (purchase.purchaseitems || []).map(item => ({
            id: item.id, // existing purchase_item_id for updates
            item_id: item.item_id || item.item?.id,
            item_name: item.item_name || item.item?.name || 'N/A',
            quantity: parseFloat(item.quantity || 1),
            price: parseFloat(item.price || 0).toFixed(2),
        }))
    );
    const [currentFilenameDisplay, setCurrentFilenameDisplay] = useState(data.existing_filename);


    // Item search state (if items can be added/changed on edit page)
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isSearchingItems, setIsSearchingItems] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // Action Modals (Approve, and general alerts/confirmations)
    const [actionModal, setActionModal] = useState({
        isOpen: false, title: '', message: '', type: 'info',
        actionType: null, // 'approve', 'deleteItem'
        isLoading: false, remarksError: '', itemIndexToRemove: null,
    });
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });


    // Sync local purchaseItemsUI with useForm's purchaseitems for submission
    useEffect(() => {
        transform((formData) => ({ // Use transform to prepare data for Inertia
            ...formData,
            purchaseitems: purchaseItemsUI.map(item => ({
                id: item.id, // Send existing purchase_item_id for updates
                item_id: item.item_id,
                // item_name: item.item_name, // Usually not needed if item_id is there
                quantity: item.quantity,
                price: item.price,
            })),
            total: purchaseItemsUI.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0)
        }));
    }, [purchaseItemsUI, transform]); // `setData` is implicitly covered by `transform`

    // Handle flash messages
    useEffect(() => {
        if (flash?.success) showAlert(flash.success, 'Success', 'success');
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);
     // Update form data if `purchase` prop changes (e.g., after successful update and Inertia reload)
     useEffect(() => {
        setData({
            supplier_id: purchase.supplier_id,
            facility_id: purchase.facility_id || purchase.facilityoption_id,
            total: parseFloat(purchase.total || 0),
            stage: purchase.stage,
            remarks: purchase.remarks || '',
            existing_filename: purchase.filename || '',
            existing_file_url: purchase.url || '',
            file: null, // Reset new file selection
            remove_existing_file: false,
            _method: 'PUT',
        });
        setPurchaseItemsUI((purchase.purchaseitems || []).map(item => ({
            id: item.id, item_id: item.item_id || item.item?.id,
            item_name: item.item_name || item.item?.name || 'N/A',
            quantity: parseFloat(item.quantity || 1), price: parseFloat(item.price || 0).toFixed(2),
        })));
        setCurrentFilenameDisplay(purchase.filename || '');
    }, [purchase]); // Depend on the purchase prop

    // Item Search
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


    const handlePurchaseItemChange = (index, field, value) => {
        const updated = [...purchaseItemsUI];
        if (field === 'quantity' || field === 'price') {
            const parsed = parseFloat(value);
            updated[index][field] = isNaN(parsed) || parsed < 0 ? 0 : parsed;
            if (field === 'price') updated[index][field] = parseFloat(updated[index][field]).toFixed(2);
        } else { updated[index][field] = value; }
        setPurchaseItemsUI(updated);
        if(errors[`purchaseitems.${index}.${field}`]) clearErrors(`purchaseitems.${index}.${field}`);
    };

    const addPurchaseItem = (selectedItem) => {
        if (isReadOnly) return;
        if (purchaseItemsUI.some(item => item.item_id === selectedItem.id)) {
            showAlert(`${selectedItem.name} is already in the list.`, 'Item Exists', 'warning');
            setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
            if(itemSearchInputRef.current) itemSearchInputRef.current.focus(); return;
        }
        setPurchaseItemsUI(prev => [...prev, {
            item_name: selectedItem.name, item_id: selectedItem.id,
            quantity: 1, price: parseFloat(selectedItem.price || 0).toFixed(2)
        }]);
        setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false);
        if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
        if(errors.purchaseitems) clearErrors('purchaseitems');
    };

    const confirmRemovePurchaseItem = (index) => {
        if (isReadOnly) return;
        setActionModal({ isOpen: true, title: 'Confirm Removal', message: `Remove "${purchaseItemsUI[index]?.item_name}"?`, type: 'warning', actionType: 'deleteItem', itemIndexToRemove: index, isLoading: false });
    };
    
    const showAlert = (message, title = 'Alert', type = 'info') => setAlertModal({ isOpen: true, title, message, type });

    const handleFormSubmit = (e) => { // This is for "Save Changes"
        e.preventDefault();
        if (isReadOnly) { showAlert("Cannot save, purchase is not in pending state.", "Save Denied", "warning"); return;}
        clearErrors();
        // Client-side validation (similar to Create page)
        if (purchaseItemsUI.length === 0) { showAlert('Add at least one item.', 'Items Required', 'error'); return; }
        const hasInvalidItems = purchaseItemsUI.some(item => !item.item_id || (item.quantity || 0) <= 0 || (item.price || 0) < 0);
        if (hasInvalidItems) { showAlert('Ensure items have product, quantity > 0, and price >= 0.', 'Invalid Items', 'error'); return; }

        // `data` from useForm already contains remarks, file, remove_existing_file, _method
        // `transform` has already prepared `purchaseitems` and `total` in `data`
        post(route('procurements1.update', purchase.id), { // Inertia's `post` with `_method: 'PUT'` handles FormData
            // onSuccess is handled by flash message effect & useEffect on `purchase` prop
            onError: (serverErrors) => {
                console.error("PO Update Error:", serverErrors);
                if (serverErrors.message) showAlert(serverErrors.message, 'Update Error', 'error');
                else if (Object.keys(serverErrors).length > 0) showAlert('An error occurred. Please review the form.', 'Update Error', 'error');
            }
        });
    };
    
    const resetLocalFormState = () => { // Resets non-useForm states tied to current interaction
        setCurrentFilenameDisplay(data.existing_filename); // Revert to original filename on display
        // No need to reset purchaseItemsUI if `useEffect` on `purchase` prop handles it
    };


    const handleItemSearchChange = e => { setItemSearchQuery(e.target.value); if (e.target.value.trim()) setShowItemDropdown(true); else setShowItemDropdown(false); };
    const handleClearItemSearch = () => { setItemSearchQuery(''); setItemSearchResults([]); setShowItemDropdown(false); if (itemSearchInputRef.current) itemSearchInputRef.current.focus(); };
      
    const handleFileSelectChange = (event) => {
        if (isReadOnly) return;
        const file = event.target.files?.[0];
        event.target.value = null;
        if (file) {
            if (file.size > MAX_FILE_SIZE_BYTES) { showAlert(`File size exceeds ${MAX_FILE_SIZE_MB}MB.`, 'File Too Large', 'error'); setData('file', null); setCurrentFilenameDisplay(data.existing_filename); return; }
            if (!ALLOWED_PURCHASE_FILE_TYPES.includes(file.type)) { showAlert(`Invalid file type. Allowed: ${ALLOWED_PURCHASE_FILE_EXT_MSG}.`, 'Invalid File Type', 'error'); setData('file', null); setCurrentFilenameDisplay(data.existing_filename); return; }
            setData('file', file); setCurrentFilenameDisplay(file.name); setData('remove_existing_file', false); // If new file, don't remove old one by flag yet
            if(errors.file) clearErrors('file');
        } else { setData('file', null); setCurrentFilenameDisplay(data.existing_filename); }
    };
    const handleClearSelectedFile = () => {
        if (isReadOnly) return;
        setData('file', null); setCurrentFilenameDisplay('');
        if (data.existing_filename) setData('remove_existing_file', true); // Flag to remove stored file
    };

    const openApproveModal = () => {
        clearErrors(); setData('remarks', purchase.remarks || ''); // Pre-fill with existing remarks if any
        setActionModal({ isOpen: true, title: 'Confirm Approval', message: 'Approve this Purchase Order? This may make it non-editable.', type: 'warning', actionType: 'approve', isLoading: false, remarksError: '' });
    };

    const handleActionModalConfirm = () => { // Unified handler for modal confirmations
        if (actionModal.actionType === 'deleteItem') {
            if (actionModal.itemIndexToRemove !== null) {
                setPurchaseItemsUI(prev => prev.filter((_, idx) => idx !== actionModal.itemIndexToRemove));
            }
        } else if (actionModal.actionType === 'approve') {
            if (!data.remarks.trim() && isApprovalRemarksRequired) { // Add a flag if remarks are strictly required for approval
                setActionModal(prev => ({ ...prev, remarksError: 'Approval remarks are required.' })); return;
            }
            setActionModal(prev => ({ ...prev, isLoading: true, remarksError: '' }));
            // Prepare payload for approval
            const approvalPayload = {
                ...data, // includes current form data like remarks, file, etc.
                stage: 2, // Target "Approved" stage
                _method: 'PUT',
            };
            // If file handling is complex here, you might need router.post with FormData like in Create
            // For now, assuming `put` with Inertia handles the file if `data.file` is set
            router.put(route('procurements1.approve', purchase.id), approvalPayload, { // Assuming a dedicated approve route
                preserveScroll: true,
                onSuccess: () => { 
                    // `purchase` prop will update via Inertia, triggering useEffect to refresh local state
                    // Flash message should show success
                },
                onError: (serverErrors) => {
                    console.error("Approval Error:", serverErrors);
                    setActionModal(prev => ({ ...prev, isLoading: false, remarksError: serverErrors.remarks || '' }));
                    if(!serverErrors.remarks) showAlert(serverErrors.message || "Failed to approve.", "Approval Failed", "error");
                },
                onFinish: () => { // This runs on success or error
                    setActionModal(prev => ({ ...prev, isLoading: false, isOpen: false }));
                }
            });
            return; // Return early as router.put handles the rest
        }
        // Close modal for deleteItem or if no specific action matched
        setActionModal({ isOpen: false, title:'', message:'', type:'info', actionType: null, itemIndexToRemove: null, isLoading:false, remarksError:''});
    };
    
    const isReadOnly = parseInt(purchase.stage, 10) !== 1; // Example: Only editable if "Pending"
    const isApprovalRemarksRequired = true; // Set to true if remarks MUST be entered for approval

    // Supplier display name helper
    const getSupplierDisplayName = (supplier) => {
        if (!supplier) return 'N/A';
        return supplier.supplier_type === 'individual'
            ? `${supplier.first_name || ''} ${supplier.other_names || ''} ${supplier.surname || ''}`.replace(/\s+/g, ' ').trim() || 'Individual Supplier'
            : supplier.company_name || 'Company Supplier';
    };

    return (
        <AuthenticatedLayout user={auth.user} header={ <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight"> Edit Purchase Order #{purchase.id} <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full ${ parseInt(purchase.stage,10) === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : parseInt(purchase.stage,10) === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : parseInt(purchase.stage,10) === 3 ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' }`}> {getPurchaseStageLabel(purchase.stage)} </span> </h2> } >
            <Head title={`Edit PO #${purchase.id}`} />
            <div className="py-8">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                            {isReadOnly && (
                                <div className="p-3 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-700 dark:text-yellow-100" role="alert">
                                    <FontAwesomeIcon icon={faInfoCircle} className="mr-2"/>
                                    This Purchase Order is in "{getPurchaseStageLabel(purchase.stage)}" stage and cannot be fully edited.
                                    {parseInt(purchase.stage, 10) === 2 && " You can proceed to Dispatch."}
                                    {parseInt(purchase.stage, 10) === 3 && " You can proceed to Receive."}
                                </div>
                            )}

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Supplier Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div><strong className="text-gray-600 dark:text-gray-400">Name:</strong> <span className="text-gray-800 dark:text-gray-200">{getSupplierDisplayName(purchase.supplier)}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">Email:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.supplier?.email || 'N/A'}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">Phone:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.supplier?.phone || 'N/A'}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">Facility:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.facilityoption?.name || 'N/A'}</span></div>
                                </div>
                                <InputError message={errors.supplier_id} className="mt-2" />
                            </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                                <div>
                                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Remarks</label>
                                    <textarea id="remarks" rows="3" value={data.remarks} onChange={(e) => setData('remarks', e.target.value)} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors.remarks ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={isReadOnly || processing} />
                                    <InputError message={errors.remarks} className="mt-2" />
                                </div>
                                <div>
                                    <label htmlFor="purchase_file_upload_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attached Document</label>
                                    {data.existing_filename ? (
                                        <div className="mt-1 p-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                                            <a href={data.existing_file_url ? (data.existing_file_url.startsWith('http') ? data.existing_file_url : `/storage/${data.existing_file_url.replace(/^public\//, '')}`) : '#'} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center">
                                                <FontAwesomeIcon icon={faEye} className="mr-2" /> {data.existing_filename}
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No document was attached.</p>
                                    )}
                                    {!isReadOnly && (
                                        <div className="mt-2">
                                            <label htmlFor="purchase_file_upload_input_new" className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${errors.file ? 'border-red-500':''}`}>
                                                <FontAwesomeIcon icon={faPaperclip} className="mr-2 -ml-1 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                <span>{currentFilenameDisplay || (data.existing_filename ? "Change file" : "Choose new file")}</span>
                                            </label>
                                            <input id="purchase_file_upload_input_new" type="file" className="sr-only" onChange={handleFileSelectChange} accept={ALLOWED_PURCHASE_FILE_TYPES.join(',')} disabled={processing} />
                                            {currentFilenameDisplay && currentFilenameDisplay !== data.existing_filename && (
                                                <button type="button" onClick={handleClearSelectedFile} className="ml-3 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Clear selection / Keep existing"> <FontAwesomeIcon icon={faTimes} /> </button>
                                            )}
                                             {data.existing_filename && !data.remove_existing_file && (
                                                <button type="button" onClick={() => {setData('remove_existing_file', true); setCurrentFilenameDisplay(''); setData('file', null);}} className="ml-3 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Remove existing file"> Remove Existing </button>
                                            )}
                                            {data.remove_existing_file && <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">(Existing file will be removed on save)</span>}
                                        </div>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Max file size: {MAX_FILE_SIZE_MB}MB. Types: {ALLOWED_PURCHASE_FILE_EXT_MSG}.</p>
                                    <InputError message={errors.file} className="mt-2" />
                                    <InputError message={errors.remove_existing_file} className="mt-2"/>
                                </div>
                            </section>

                            <section className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Purchase Items</h3>
                                {!isReadOnly && (
                                    <div className="relative" ref={itemDropdownRef}>
                                        <label htmlFor="itemSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Search Product/Service to Add</label>
                                        <div className="relative mt-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> {isSearchingItems ? <FontAwesomeIcon icon={faSpinner} className="animate-spin h-5 w-5 text-gray-400" /> : <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />} </div>
                                            <input type="text" id="itemSearch" placeholder="Type product/service name..." value={itemSearchQuery} onChange={handleItemSearchChange} onFocus={() => itemSearchQuery.trim() && setShowItemDropdown(true)} className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 ${errors.purchaseitems ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} ref={itemSearchInputRef} autoComplete="off" />
                                            {itemSearchQuery && !isSearchingItems && ( <button type="button" onClick={handleClearItemSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Clear search"> <FontAwesomeIcon icon={faTimesCircle} /> </button> )}
                                        </div>
                                        {showItemDropdown && ( <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"> {itemSearchResults.length > 0 ? ( itemSearchResults.map(item => ( <li key={item.id} onClick={() => addPurchaseItem(item)} className="group text-gray-900 dark:text-gray-100 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500"> {item.name} <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 group-hover:text-white">(Price: {parseFloat(item.price || 0).toFixed(2)})</span> </li> )) ) : ( <li className="text-gray-500 dark:text-gray-400 select-none py-2 px-3">{isSearchingItems ? 'Searching...' : 'No results.'}</li> )} </ul> )}
                                    </div>
                                )}
                                <InputError message={errors.purchaseitems} className="mt-2" />

                                {purchaseItemsUI.length > 0 ? (
                                    <div className="mt-4 -my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <div className="overflow-hidden shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Item</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-28">Quantity</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-32">Unit Price</th><th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 w-32">Subtotal</th> {!isReadOnly && <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 w-16"><span className="sr-only">Remove</span></th>}</tr></thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        {purchaseItemsUI.map((item, index) => (
                                                            <tr key={item.id || item.item_id || `new-${index}`}> {/* Use item.id for existing items */}
                                                                <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">{item.item_name}</td>
                                                                <td className="px-3 py-4 text-sm"><input type="number" value={item.quantity} onChange={e => handlePurchaseItemChange(index, 'quantity', e.target.value)} min="1" className={`block w-full text-center rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors[`purchaseitems.${index}.quantity`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={isReadOnly || processing} /> <InputError message={errors[`purchaseitems.${index}.quantity`]} className="mt-1 text-xs" /></td>
                                                                <td className="px-3 py-4 text-sm"><input type="number" value={item.price} onChange={e => handlePurchaseItemChange(index, 'price', e.target.value)} min="0" step="0.01" className={`block w-full text-right rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors[`purchaseitems.${index}.price`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={isReadOnly || processing} /> <InputError message={errors[`purchaseitems.${index}.price`]} className="mt-1 text-xs" /></td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-700 dark:text-gray-300">{((item.quantity || 0) * (item.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                {!isReadOnly && <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6"><button type="button" onClick={() => confirmRemovePurchaseItem(index)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1" title="Remove item" disabled={processing}><FontAwesomeIcon icon={faTrash} /></button></td>}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-100 dark:bg-gray-700"><tr><td colSpan={isReadOnly ? "3" : "4"} className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Grand Total</td><td className="px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>{!isReadOnly && <td></td>}</tr></tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : ( <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"> <FontAwesomeIcon icon={faInfoCircle} className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" /> <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Items in Purchase Order</h3> <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{!isReadOnly ? "Search for products/services above to add them." : "This purchase order has no items."}</p> </div> )}
                            </section>

                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
                                <Link href={route('procurements1.index')} className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={processing || actionModal.isLoading}> <FontAwesomeIcon icon={faTimesCircle} className="mr-2 -ml-1 h-5 w-5" /> Cancel </Link>
                                {!isReadOnly && ( <button type="submit" disabled={processing || actionModal.isLoading || purchaseItemsUI.length === 0} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" > {processing && !actionModal.isLoading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2 -ml-1 h-5 w-5" /> : <FontAwesomeIcon icon={faSave} className="mr-2 -ml-1 h-5 w-5" />} {processing && !actionModal.isLoading ? 'Saving...' : 'Save Changes'} </button> )}
                                {parseInt(purchase.stage, 10) === 1 && ( // Only show Approve if "Pending"
                                    <button type="button" onClick={openApproveModal} disabled={processing || actionModal.isLoading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50" > <FontAwesomeIcon icon={faCheck} className="mr-2 -ml-1 h-5 w-5" /> Approve PO </button>
                                )}
                                {/* Add Dispatch/Receive buttons here based on stage if needed */}
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal(p => ({...p, isOpen: false}))} title={alertModal.title} message={alertModal.message} type={alertModal.type} isAlert={true}/>
            <Modal isOpen={actionModal.isOpen} onClose={!actionModal.isLoading ? ()=>{setActionModal(p=>({...p,isOpen:false}))} : ()=>{}} onConfirm={handleActionModalConfirm} title={actionModal.title} confirmButtonText={actionModal.isLoading ? 'Processing...' : (actionModal.actionType === 'approve' ? 'Confirm Approve' : 'Confirm')} closeButtonText={actionModal.isLoading ? null : "Cancel"} confirmButtonDisabled={actionModal.isLoading} type={actionModal.type} isDestructive={false} processing={actionModal.isLoading || processing} >
                <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{actionModal.message}</p>
                    {actionModal.actionType === 'approve' && (
                        <div className="mt-4">
                            <label htmlFor="approve_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Approval Remarks {isApprovalRemarksRequired && <span className="text-red-500">*</span>}</label>
                            <textarea id="approve_remarks" rows="3" className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${actionModal.remarksError || errors.remarks ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} value={data.remarks} onChange={e => { setData('remarks', e.target.value); if (actionModal.remarksError) setActionModal(p => ({ ...p, remarksError: '' })); if(errors.remarks) clearErrors('remarks'); }} disabled={actionModal.isLoading || processing} />
                            {actionModal.remarksError && <p className="text-xs text-red-500 mt-1">{actionModal.remarksError}</p>}
                            <InputError message={errors.remarks} className="mt-1"/>
                        </div>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}