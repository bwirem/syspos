import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faTimes, faEye, faCheck, faSpinner, faSearch, faInfoCircle, faUpload, faFilePdf, faFileWord, faFileAlt, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
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

const getFileIcon = (filename) => {
    if (!filename) return faFileAlt;
    const extension = filename.split('.').pop().toLowerCase();
    if (extension === 'pdf') return faFilePdf;
    if (['doc', 'docx'].includes(extension)) return faFileWord;
    return faFileAlt;
};

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const ALLOWED_FILE_EXTENSIONS_MSG = "PDF, DOC, DOCX";

const getStageLabel = (stage) => {
    const stageNumber = parseInt(stage, 10);
    if (stageNumber === 1) return 'Draft';
    if (stageNumber === 2) return 'Quotation';
    if (stageNumber === 3) return 'Evaluation';
    return 'Unknown';
};

export default function Quotation({ auth, tender, flash, errors: pageErrors }) {
    const { data, setData, post, processing, errors, clearErrors, transform } = useForm({
        description: tender.description || '',
        facility_id: tender.facility_id || tender.facilityoption_id,
        stage: tender.stage || 2,
        tenderitems: tender.tenderitems || [],
        tenderquotations: [],
        remarks: '',
        _method: 'PUT',
    });

    const [quotationEntries, setQuotationEntries] = useState(() => {
        // console.log("Raw tender.tenderquotations for QuotationEntries init:", JSON.stringify(tender.tenderquotations, null, 2));
        return (tender.tenderquotations || []).map((q, index) => {
            let supplierName = 'Unknown Supplier';
            let supplierId = null;
            if (q.supplier) {
                supplierId = q.supplier.id || null;
                if (q.supplier.supplier_type === 'individual') {
                    const firstName = q.supplier.first_name || '';
                    const otherNames = q.supplier.other_names || '';
                    const surname = q.supplier.surname || '';
                    supplierName = `${firstName} ${otherNames} ${surname}`.replace(/\s+/g, ' ').trim();
                    if (!supplierName && supplierId) supplierName = `Individual (ID: ${supplierId})`;
                } else {
                    supplierName = q.supplier.company_name || (supplierId ? `Company (ID: ${supplierId})` : 'Unnamed Company');
                }
            } else if (q.supplier_id) {
                supplierId = q.supplier_id;
                if (q.supplier_name) supplierName = q.supplier_name;
                else supplierName = `Supplier (ID: ${supplierId})`;
            } else {
                console.warn(`Quotation entry (index ${index}) from backend missing supplier info. Q:`, q);
            }
            if ((!supplierName || supplierName === 'Unknown Supplier') && supplierId) {
                 supplierName = `Details Missing (ID: ${supplierId})`;
            }
            if (!supplierName.trim()) supplierName = 'Details Missing';
            return {
                id: q.id || null, supplier_id: supplierId, supplier_name: supplierName,
                filename: q.filename || '', file_url: q.file_url || q.url || '',
                file_object: null, file_error: null, type: q.type || '',
                size: q.size || 0, description: q.description || (q.filename || ''),
            };
        });
    });

    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [supplierSearchResults, setSupplierSearchResults] = useState([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false);
    const supplierDropdownRef = useRef(null);
    const supplierSearchInputRef = useRef(null);

    const [newSupplierModal, setNewSupplierModal] = useState({
        isOpen: false, loading: false, success: false,
        data: { supplier_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' },
        errors: {}
    });

    const [removeQuotationModal, setRemoveQuotationModal] = useState({ isOpen: false, message: '', indexToRemove: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [submitToEvaluationModal, setSubmitToEvaluationModal] = useState({ isOpen: false, loading: false, success: false, remarksError: '' });

    useEffect(() => {
        transform((formDataInternal) => ({
            ...formDataInternal,
            tenderquotations: quotationEntries.map(entry => ({
                id: entry.id, supplier_id: entry.supplier_id, supplier_name: entry.supplier_name,
                filename: entry.filename, url: entry.file_url, type: entry.type,
                size: entry.size, description: entry.description,
            })),
        }));
    }, [quotationEntries, transform]);

    useEffect(() => {
        if (flash?.success) showAlert(flash.success, 'Success', 'success');
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);

    const fetchSuppliers = useCallback((query) => {
        if (!query.trim()) { setSupplierSearchResults([]); setShowSupplierDropdown(false); return; }
        setIsSearchingSuppliers(true);
        axios.get(route('systemconfiguration2.suppliers.search'), { params: { query } })
            .then(response => { setSupplierSearchResults(response.data.suppliers.slice(0, 10)); setShowSupplierDropdown(true); })
            .catch(error => { console.error('Error fetching suppliers:', error); showAlert('Failed to fetch suppliers.', 'Error', 'error'); })
            .finally(() => setIsSearchingSuppliers(false));
    }, []);
    const debouncedSupplierSearch = useMemo(() => debounce(fetchSuppliers, 300), [fetchSuppliers]);
    useEffect(() => { debouncedSupplierSearch(supplierSearchQuery); }, [supplierSearchQuery, debouncedSupplierSearch]);
    useEffect(() => {
        const handleClickOutside = (event) => { if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) setShowSupplierDropdown(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileSelect = (index, event) => {
        const fileInput = event.target; const file = fileInput.files?.[0];
        if (!file) { if (fileInput) fileInput.value = null; return; }
        let error = null;
        if (file.size > MAX_FILE_SIZE_BYTES) error = `File size exceeds ${MAX_FILE_SIZE_MB}MB.`;
        else if (!ALLOWED_FILE_TYPES.includes(file.type)) error = `Invalid type. Allowed: ${ALLOWED_FILE_EXTENSIONS_MSG}.`;
        setQuotationEntries(prev => prev.map((entry, idx) => idx === index ? {
            ...entry, file_object: error ? null : file, filename: error ? entry.filename : (file.name || ''),
            file_url: '', file_error: error, type: error ? entry.type : (file.type || ''),
            size: error ? entry.size : (file.size || 0), description: error ? entry.description : (file.name || '')
        } : entry));
        setTimeout(() => { if (fileInput) fileInput.value = null; }, 0);
        const errorKey = `tenderquotations.${index}.file`; if(errors[errorKey]) clearErrors(errorKey);
    };

    const handleClearFile = (index) => setQuotationEntries(prev => prev.map((item, idx) => idx === index ? { ...item, file_object: null, filename: '', file_url: '', file_error: null, type: '', size: 0, description: '' } : item));

    const addQuotationEntry = (selectedSupplier) => {
        if (!selectedSupplier || !selectedSupplier.id) {
            console.error("addQuotationEntry called with invalid supplier object:", selectedSupplier);
            showAlert("Could not add supplier: invalid data received.", "Internal Error", "error");
            return;
        }
        const supplierName = selectedSupplier.supplier_type === 'individual'
            ? `${selectedSupplier.first_name || ''} ${selectedSupplier.other_names || ''} ${selectedSupplier.surname || ''}`.replace(/\s+/g, ' ').trim()
            : selectedSupplier.company_name;
        const finalSupplierName = supplierName || `Supplier (ID: ${selectedSupplier.id})`;
        if (quotationEntries.some(entry => entry.supplier_id === selectedSupplier.id)) {
            showAlert(`${finalSupplierName} is already added.`, 'Supplier Exists', 'warning');
            setSupplierSearchQuery(''); setShowSupplierDropdown(false); if(supplierSearchInputRef.current) supplierSearchInputRef.current.focus(); return;
        }
        setQuotationEntries(prev => [...prev, {
            id: null, supplier_id: selectedSupplier.id, supplier_name: finalSupplierName,
            filename: '', file_url: '', file_object: null, file_error: null,
            type: '', size: 0, description: ''
        }]);
        setSupplierSearchQuery(''); setSupplierSearchResults([]); setShowSupplierDropdown(false); if(supplierSearchInputRef.current) supplierSearchInputRef.current.focus();
        if(errors.tenderquotations) clearErrors('tenderquotations');
    };

    const confirmRemoveQuotationEntry = (index) => setRemoveQuotationModal({ isOpen: true, message: `Remove quotation from "${quotationEntries[index]?.supplier_name}"?`, indexToRemove: index });
    const handleRemoveQuotationConfirm = () => { if (removeQuotationModal.indexToRemove !== null) setQuotationEntries(prev => prev.filter((_, idx) => idx !== removeQuotationModal.indexToRemove)); setRemoveQuotationModal({ isOpen: false, message: '', indexToRemove: null }); };
    const showAlert = (message, title = 'Alert', type = 'info') => setAlertModal({ isOpen: true, title, message, type });

    const buildQuotationFormData = (formData) => {
        quotationEntries.forEach((entry, index) => {
            formData.append(`tenderquotations[${index}][id]`, entry.id || '');
            formData.append(`tenderquotations[${index}][item_id]`, entry.supplier_id || '');
            formData.append(`tenderquotations[${index}][item_name]`, entry.supplier_name || '');
            formData.append(`tenderquotations[${index}][filename]`, entry.filename || '');
            formData.append(`tenderquotations[${index}][url]`, entry.file_url || '');
            let fileType = entry.type || ''; let fileSize = entry.size || 0; let fileDescription = entry.description || entry.filename || '';
            if (entry.file_object) {
                fileType = entry.file_object.type || ''; fileSize = entry.file_object.size || 0;
                if (!entry.description || entry.description === entry.filename) fileDescription = entry.file_object.name || '';
                formData.append(`tenderquotations[${index}][file]`, entry.file_object, entry.filename);
            } else if (entry.id && !entry.file_url && !entry.file_object && (entry.filename === '' || !entry.filename)) {
                 formData.append(`tenderquotations[${index}][remove_file]`, 'true');
            }
            formData.append(`tenderquotations[${index}][type]`, fileType);
            formData.append(`tenderquotations[${index}][size]`, fileSize.toString());
            formData.append(`tenderquotations[${index}][description]`, fileDescription);
        });
    }

    const handleSaveQuotations = (e) => {
        e.preventDefault(); clearErrors(); const formData = new FormData();
        formData.append('_method', 'PUT'); formData.append('description', data.description || '');
        formData.append('facility_id', data.facility_id || ''); formData.append('stage', data.stage || '');
        let hasFileErrors = quotationEntries.some(entry => entry.file_error);
        let hasMissingSupplierInfo = quotationEntries.some(entry => !entry.supplier_id);
        if (parseInt(tender.stage, 10) === 2 && quotationEntries.length === 0) { showAlert('Please add at least one supplier quotation before saving.', 'No Quotations', 'warning'); return; }
        buildQuotationFormData(formData);
        if (hasFileErrors) { showAlert('Some files have errors. Please review.', 'File Errors', 'error'); return; }
        if (hasMissingSupplierInfo) { showAlert('Supplier information missing for some entries.', 'Data Error', 'error'); return; }
        router.post(route('procurements0.quotation', tender.id), formData, { // Changed route to .save
            preserveScroll: true,
            onSuccess: (page) => {
                showAlert('Quotations saved successfully!', 'Saved', 'success');
                if (page.props.tender && page.props.tender.tenderquotations) {
                     setQuotationEntries(page.props.tender.tenderquotations.map(q => {
                        let sName = 'Unknown Supplier';
                        if(q.supplier){sName = q.supplier.supplier_type === 'individual' ? `${q.supplier.first_name||''} ${q.supplier.other_names||''} ${q.supplier.surname||''}`.replace(/\s+/g,' ').trim() : q.supplier.company_name; if(!sName && q.supplier.id) sName = q.supplier.supplier_type === 'individual' ? `Individual (ID: ${q.supplier.id})` : `Company (ID: ${q.supplier.id})`;}
                        else if(q.supplier_name) sName = q.supplier_name; else if (q.supplier_id) sName = `Supplier (ID: ${q.supplier_id})`;
                        if(!sName.trim()) sName = 'Details Missing';
                        return { id:q.id, supplier_id:q.supplier_id||q.supplier?.id, supplier_name:sName, filename:q.filename||'', file_url:q.file_url||q.url||'', file_object:null, file_error:null, type:q.type||'', size:q.size||0, description:q.description||(q.filename||''), };
                    }));
                }
            },
            onError: (serverValidationErrors) => {
                console.error("Save Quotations error details:", serverValidationErrors);
                const newQuotationEntries = quotationEntries.map((entry, index) => {
                    let newFileError = entry.file_error; Object.keys(serverValidationErrors).forEach(key => { if (key.startsWith(`tenderquotations.${index}.`)) newFileError = (newFileError ? newFileError + "\n" : "") + serverValidationErrors[key]; });
                    return {...entry, file_error: newFileError || null };
                });
                setQuotationEntries(newQuotationEntries);
                showAlert(serverValidationErrors.message || "Failed to save. Please check form errors.", "Save Error", "error");
            }
        });
    };

    const handleSupplierSearchChange = (e) => setSupplierSearchQuery(e.target.value);
    const handleClearSupplierSearch = () => { setSupplierSearchQuery(''); setSupplierSearchResults([]); setShowSupplierDropdown(false); if (supplierSearchInputRef.current) supplierSearchInputRef.current.focus(); };
    const openNewSupplierModal = () => setNewSupplierModal({ isOpen: true, loading: false, success: false, data: { supplier_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' }, errors: {} });
    const closeNewSupplierModal = () => setNewSupplierModal(prev => ({ ...prev, isOpen: false, success: false }));
    const handleNewSupplierInputChange = (e) => { const { id, value } = e.target; setNewSupplierModal(prev => ({ ...prev, data: { ...prev.data, [id]: value }, errors: { ...prev.errors, [id]: null } })); };
    
    const handleConfirmNewSupplier = () => {
        setNewSupplierModal(prev => ({ ...prev, loading: true, errors: {} }));
        axios.post(route('systemconfiguration2.suppliers.directstore'), newSupplierModal.data)
            .then(response => {
                setNewSupplierModal(prev => ({ ...prev, loading: false, success: true }));
                const createdSupplier = response.data.supplier || response.data;
                if (createdSupplier && createdSupplier.id) {
                    addQuotationEntry(createdSupplier);
                } else {
                    console.error("New supplier response data format error:", response.data);
                    showAlert("Supplier created, but failed to add to list. Refresh or search.", "Data Issue", "warning");
                }
                setTimeout(closeNewSupplierModal, 1500);
            })
            .catch(error => {
                console.error("Full Axios error (New Supplier):", error);
                let errorMessage = "Unexpected error creating supplier."; let modalErrors = {};
                if(error.response){ if(error.response.data){ if(error.response.data.errors){ modalErrors = error.response.data.errors; errorMessage = error.response.data.message || "Validation failed."; } else if (error.response.data.message) errorMessage = error.response.data.message; else if (typeof error.response.data === 'string') errorMessage = error.response.data; } else if (error.response.statusText) errorMessage = `Server Error: ${error.response.status} ${error.response.statusText}`; }
                else if(error.request) errorMessage = "No server response. Check network."; else errorMessage = error.message || "Request setup error.";
                setNewSupplierModal(prev => ({ ...prev, loading: false, success: false, errors: modalErrors }));
                showAlert(errorMessage, "Supplier Creation Failed", "error");
            });
    };

    const openSubmitToEvaluationModal = () => {
        clearErrors();
        const noFileErrors = quotationEntries.every(q => !q.file_error);
        const allFilesPresent = quotationEntries.every(q => q.file_url || q.file_object);
        if (!noFileErrors) { showAlert('Some files have errors. Correct them before submitting.', 'File Errors', 'error'); return; }
        if (!allFilesPresent) { showAlert('All supplier entries must have a quotation file uploaded.', 'Missing Files', 'error'); return; }
        if (quotationEntries.length === 0) { showAlert('Add at least one quotation.', 'No Quotations', 'warning'); return; }
        setData('remarks', '');
        setSubmitToEvaluationModal({ isOpen: true, loading: false, success: false, remarksError: '' });
    };
    const closeSubmitToEvaluationModal = () => setSubmitToEvaluationModal({ isOpen: false, loading: false, success: false, remarksError: '' });
    const handleSubmitToEvaluation = () => {
        if (!data.remarks.trim()) { setSubmitToEvaluationModal(prev => ({ ...prev, remarksError: 'Remarks are required.' })); return; }
        setSubmitToEvaluationModal(prev => ({ ...prev, loading: true, remarksError: '' }));
        const formData = new FormData();
        formData.append('_method', 'PUT'); formData.append('stage', 3);
        formData.append('remarks', data.remarks); formData.append('description', data.description || '');
        formData.append('facility_id', data.facility_id || '');
        buildQuotationFormData(formData);
        router.post(route('procurements0.quotation', tender.id), formData, { // Changed route to .submit
            preserveScroll: true,
            onSuccess: () => { setSubmitToEvaluationModal(prev => ({ ...prev, loading: false, success: true }));
             setTimeout(() => { 
                closeSubmitToEvaluationModal(); 
                //router.visit(route('procurements0.index')); 
            }, 2000); },
            onError: (serverValidationErrors) => { console.error("Submit to Evaluation error:", serverValidationErrors); setSubmitToEvaluationModal(prev => ({ ...prev, loading: false, remarksError: serverValidationErrors.remarks || '' })); showAlert(serverValidationErrors.message || "Failed to submit. Check errors.", "Submission Error", "error"); }
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={ <div className="flex justify-between items-center"> <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight"> Tender Quotations <span className="text-sm text-gray-500 dark:text-gray-400">(ID: {tender.id})</span> </h2> <span className={`px-3 py-1 text-xs font-semibold rounded-full ${ parseInt(tender.stage,10) === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : parseInt(tender.stage,10) === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : parseInt(tender.stage,10) === 3 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' }`}> Stage: {getStageLabel(tender.stage)} </span> </div> } >
            <Head title={`Quotation - Tender ${tender.id}`} />
            <div className="py-8">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleSaveQuotations} className="p-6 space-y-8">
                            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Tender Details</h3>
                                <div className="space-y-1"> <p className="text-sm text-gray-700 dark:text-gray-300"> <span className="font-semibold">Description:</span> {data.description} </p> <InputError message={errors.description} /> <InputError message={errors.facility_id} /> <InputError message={errors.stage} /> </div>
                                {data.tenderitems && data.tenderitems.length > 0 && ( <div className="mt-4"> <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-1">Requested Items:</h4> <ul className="list-disc list-inside pl-1 text-sm text-gray-600 dark:text-gray-400 space-y-1"> {data.tenderitems.map(item => ( <li key={item.id || item.item_id}> {(item.item?.name || item.item_name || "N/A Item Name")} - Quantity: {item.quantity} </li> ))} </ul> </div> )}
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <div className="flex justify-between items-center mb-4"> <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100"> Add Supplier Quotations </h3> <button type="button" onClick={openNewSupplierModal} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500" disabled={processing} > <FontAwesomeIcon icon={faPlus} className="mr-2 -ml-1" /> New Supplier </button> </div>
                                <div className="relative" ref={supplierDropdownRef}>
                                    <div className="relative"> <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> {isSearchingSuppliers ? <FontAwesomeIcon icon={faSpinner} className="animate-spin h-5 w-5 text-gray-400" /> : <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />} </div> <input type="text" placeholder="Search existing suppliers to add..." value={supplierSearchQuery} onChange={handleSupplierSearchChange} onFocus={() => supplierSearchQuery.trim() && setShowSupplierDropdown(true)} className="block w-full pl-10 pr-10 py-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" ref={supplierSearchInputRef} autoComplete="off" disabled={processing} /> {supplierSearchQuery && !isSearchingSuppliers && ( <button type="button" onClick={handleClearSupplierSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Clear search" disabled={processing}> <FontAwesomeIcon icon={faTimesCircle} /> </button> )} </div>
                                    {showSupplierDropdown && ( <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"> {supplierSearchResults.length > 0 ? ( supplierSearchResults.map(supplier => ( <li key={supplier.id} onClick={() => addQuotationEntry(supplier)} className="group text-gray-900 dark:text-gray-100 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500"> {supplier.supplier_type === 'individual' ? `${supplier.first_name || ''} ${supplier.other_names || ''} ${supplier.surname || ''}`.replace(/\s+/g, ' ').trim() : supplier.company_name} <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 group-hover:text-white">({supplier.email || 'No Email'})</span> </li> )) ) : ( <li className="text-gray-500 dark:text-gray-400 select-none py-2 px-3">{isSearchingSuppliers ? 'Searching...' : 'No suppliers found.'}</li> )} </ul> )}
                                </div>
                            </div>
                            {quotationEntries.length > 0 ? (
                                <div className="flow-root">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Quotation Submissions</h3>
                                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <div className="overflow-hidden shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Supplier</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 w-64">Quotation File</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right w-20"><span className="sr-only">Actions</span></th></tr></thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        {quotationEntries.map((entry, index) => (
                                                            <tr key={entry.id || entry.supplier_id || `new-${index}`}>
                                                                <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6"> {entry.supplier_name} <div className="text-xs text-gray-500 dark:text-gray-400">Supplier ID: {entry.supplier_id || 'N/A'}</div> {entry.id && <div className="text-xs text-gray-400 dark:text-gray-500">Quotation ID: {entry.id}</div>} <InputError message={errors[`tenderquotations.${index}.item_id`]} className="mt-1 text-xs"/><InputError message={errors[`tenderquotations.${index}.item_name`]} className="mt-1 text-xs"/> </td>
                                                                {/* THIS IS THE TD YOU PROVIDED */}
                                                                <td className="px-3 py-4 text-sm">
                                                                    <div className="flex items-center space-x-2">
                                                                        <label htmlFor={`file-upload-${index}`} className={`cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${entry.file_error || errors[`tenderquotations.${index}.file`] || errors[`tenderquotations.${index}.filename`] || errors[`tenderquotations.${index}.url`] || errors[`tenderquotations.${index}.type`] || errors[`tenderquotations.${index}.size`] || errors[`tenderquotations.${index}.description`] ? 'border-red-500' : ''}`}> <FontAwesomeIcon icon={faUpload} className="mr-2"/> <span>{entry.filename || 'Choose File'}</span> </label>
                                                                        <input
                                                                            id={`file-upload-${index}`}
                                                                            type="file"
                                                                            onChange={e => handleFileSelect(index, e)}
                                                                            accept={ALLOWED_FILE_TYPES.join(',')}
                                                                            className="opacity-0 w-0 h-0 absolute -z-10" // Make it take no space and be invisible but still functional
                                                                        />
                                                                        {entry.filename && ( <> {entry.file_url ? ( <a href={entry.file_url.startsWith('http') ? entry.file_url : `/storage/${entry.file_url.replace(/^public\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300" title="Preview existing file"> <FontAwesomeIcon icon={faEye} /> </a> ) : entry.file_object ? ( <FontAwesomeIcon icon={getFileIcon(entry.filename)} className="text-gray-500" title={entry.filename} /> ) : null} <button type="button" onClick={() => handleClearFile(index)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove file"><FontAwesomeIcon icon={faTimes} /></button> </> )}
                                                                    </div>
                                                                    {entry.file_error && <p className="text-xs text-red-500 mt-1">{entry.file_error}</p>}
                                                                    <InputError message={errors[`tenderquotations.${index}.file`]} className="mt-1 text-xs"/>
                                                                    <InputError message={errors[`tenderquotations.${index}.filename`]} className="mt-1 text-xs"/>
                                                                    <InputError message={errors[`tenderquotations.${index}.url`]} className="mt-1 text-xs"/>
                                                                    <InputError message={errors[`tenderquotations.${index}.type`]} className="mt-1 text-xs"/>
                                                                    <InputError message={errors[`tenderquotations.${index}.size`]} className="mt-1 text-xs"/>
                                                                    <InputError message={errors[`tenderquotations.${index}.description`]} className="mt-1 text-xs"/>
                                                                </td>
                                                                {/* END OF YOUR PROVIDED TD */}
                                                                <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"> <button type="button" onClick={() => confirmRemoveQuotationEntry(index)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-gray-700" title="Remove this supplier entry"> <FontAwesomeIcon icon={faTrash} className="h-4 w-4"/> </button> </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <InputError message={errors.tenderquotations} className="mt-2"/>
                                </div>
                            ) : ( <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"> <FontAwesomeIcon icon={faInfoCircle} className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" /> <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Supplier Quotations Added</h3> <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Search for suppliers above or create a new one.</p> </div> )}
                            <div className="pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                                <Link href={route('procurements0.index')} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600" as="button" disabled={processing || submitToEvaluationModal.loading}> <FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> Close </Link>
                                <button type="submit" disabled={processing || submitToEvaluationModal.loading || (parseInt(tender.stage, 10) === 2 && quotationEntries.length === 0)} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50" > {processing && !submitToEvaluationModal.loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> : <FontAwesomeIcon icon={faSave} className="mr-2" />} {processing && !submitToEvaluationModal.loading ? 'Saving...' : 'Save Draft Quotations'} </button>
                                <button type="button" onClick={openSubmitToEvaluationModal} disabled={processing || submitToEvaluationModal.loading || quotationEntries.length === 0} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50" > <FontAwesomeIcon icon={faCheck} className="mr-2" /> Submit to Evaluation </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal(p => ({...p, isOpen: false}))} title={alertModal.title} message={alertModal.message} type={alertModal.type} isAlert={true}/>
            <Modal isOpen={removeQuotationModal.isOpen} onClose={() => setRemoveQuotationModal(p => ({...p, isOpen: false}))} onConfirm={handleRemoveQuotationConfirm} title="Confirm Removal" message={removeQuotationModal.message} type="warning" confirmButtonText="Remove" isDestructive={true}/>
            <Modal isOpen={newSupplierModal.isOpen} onClose={closeNewSupplierModal} onConfirm={handleConfirmNewSupplier} title="Create New Supplier" confirmButtonText={newSupplierModal.loading ? 'Saving...' : (newSupplierModal.success ? 'Saved!' : 'Create Supplier')} confirmButtonDisabled={newSupplierModal.loading || newSupplierModal.success} processing={newSupplierModal.loading}>
                <form className="space-y-4">
                    <div> <label htmlFor="supplier_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Type <span className="text-red-500">*</span></label> <select id="supplier_type" value={newSupplierModal.data.supplier_type} onChange={handleNewSupplierInputChange} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${newSupplierModal.errors?.supplier_type ? 'border-red-500' : ''}`}> <option value="individual">Individual</option> <option value="company">Company</option> </select> <InputError message={newSupplierModal.errors?.supplier_type} className="mt-1" /> </div>
                    {newSupplierModal.data.supplier_type === 'individual' ? ( ['first_name', 'other_names', 'surname'].map(field => ( <div key={field}> <label htmlFor={field} className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} {field !== 'other_names' && <span className="text-red-500">*</span>} </label> <input type="text" id={field} value={newSupplierModal.data[field]} onChange={handleNewSupplierInputChange} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${newSupplierModal.errors?.[field] ? 'border-red-500' : ''}`} /> <InputError message={newSupplierModal.errors?.[field]} className="mt-1" /> </div> )) ) : ( <div> <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name <span className="text-red-500">*</span></label> <input type="text" id="company_name" value={newSupplierModal.data.company_name} onChange={handleNewSupplierInputChange} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${newSupplierModal.errors?.company_name ? 'border-red-500' : ''}`} /> <InputError message={newSupplierModal.errors?.company_name} className="mt-1" /> </div> )}
                    {['email', 'phone'].map(field => ( <div key={field}> <label htmlFor={field} className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {field.replace(/\b\w/g, l => l.toUpperCase())} <span className="text-red-500">*</span> </label> <input type={field === 'email' ? 'email' : 'tel'} id={field} value={newSupplierModal.data[field]} onChange={handleNewSupplierInputChange} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${newSupplierModal.errors?.[field] ? 'border-red-500' : ''}`} /> <InputError message={newSupplierModal.errors?.[field]} className="mt-1" /> </div> ))}
                </form>
            </Modal>
            <Modal isOpen={submitToEvaluationModal.isOpen} onClose={!submitToEvaluationModal.loading && !submitToEvaluationModal.success ? closeSubmitToEvaluationModal : () => {}} onConfirm={!submitToEvaluationModal.success ? handleSubmitToEvaluation : closeSubmitToEvaluationModal} title={submitToEvaluationModal.success ? "Submission Successful" : "Confirm Submission to Evaluation"} confirmButtonText={submitToEvaluationModal.loading ? 'Submitting...' : (submitToEvaluationModal.success ? 'OK' : 'Submit Now')} closeButtonText={submitToEvaluationModal.loading || submitToEvaluationModal.success ? null : "Cancel"} confirmButtonDisabled={submitToEvaluationModal.loading} type={submitToEvaluationModal.success ? 'success' : 'warning'} isDestructive={!submitToEvaluationModal.success}>
                {submitToEvaluationModal.success ? ( <div className="text-center"><FontAwesomeIcon icon={faCheck} className="text-green-500 h-12 w-12 mx-auto mb-4" /><p>Tender successfully submitted for evaluation.</p></div> ) : ( <div> <p className="text-sm text-gray-700 dark:text-gray-300">You are about to finalize quotations and submit this tender for evaluation. This action may not be reversible.</p> <div className="mt-4"> <label htmlFor="submission_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Submission Remarks <span className="text-red-500">*</span></label> <textarea id="submission_remarks" rows="3" value={data.remarks} onChange={e => { setData('remarks', e.target.value); if (submitToEvaluationModal.remarksError) setSubmitToEvaluationModal(p => ({...p, remarksError: ''})); }} className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${submitToEvaluationModal.remarksError ? 'border-red-500' : ''}`} disabled={submitToEvaluationModal.loading} /> {submitToEvaluationModal.remarksError && <p className="text-xs text-red-500 mt-1">{submitToEvaluationModal.remarksError}</p>} <InputError message={errors.remarks} className="mt-1"/> </div> </div> )}
            </Modal>
        </AuthenticatedLayout>
    );
}