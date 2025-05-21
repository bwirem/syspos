import React, { useState, useEffect } from 'react'; // Removed unused imports like useRef, useCallback, useMemo, axios
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react'; // router for navigation
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faEye, faTruck, faSpinner, faInfoCircle, faCheckCircle, faListUl } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
// No need to import Inertia directly, useForm and router handle it.

import Modal from '../../Components/CustomModal.jsx'; // Assuming styled well
import InputError from '@/Components/InputError'; // Standard Inertia error component

// Stage label helper (can be moved to a shared util)
const getPurchaseStageLabel = (stage) => {
    const stageNum = parseInt(stage, 10);
    if (stageNum === 1) return 'Pending';
    if (stageNum === 2) return 'Approved';
    if (stageNum === 3) return 'Dispatched';
    if (stageNum === 4) return 'Received'; // Example if you have this stage
    return 'Unknown';
};

// File icon helper
import { faFilePdf, faFileWord, faFileAlt } from '@fortawesome/free-solid-svg-icons';
const getFileIcon = (filename) => {
    if (!filename) return faFileAlt;
    const extension = filename.split('.').pop().toLowerCase();
    if (extension === 'pdf') return faFilePdf;
    if (['doc', 'docx'].includes(extension)) return faFileWord;
    return faFileAlt;
};

export default function Dispatch({ auth, purchase, flash, errors: pageErrors }) { // Added auth, flash, pageErrors
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        // Data from `purchase` prop is for display.
        // Only fields needed for the dispatch action itself are in `useForm`
        remarks: purchase.remarks || '', // Existing PO remarks (display only here, or could be appended to dispatch remarks)
        dispatch_remarks: '', // New remarks specifically for this dispatch action
        recipient_name: '',
        recipient_contact: '',
        // We will send stage: 3 explicitly in the payload for dispatch
    });

    // Display-only states derived from `purchase` prop
    const [displayPurchaseItems] = useState(
        (purchase.purchaseitems || []).map(item => ({
            id: item.id,
            item_name: item.item_name || item.item?.name || 'N/A',
            quantity: parseFloat(item.quantity || 0),
            price: parseFloat(item.price || 0),
            subtotal: (parseFloat(item.quantity || 0) * parseFloat(item.price || 0)),
        }))
    );

    const [dispatchModal, setDispatchModal] = useState({
        isOpen: false,
        isLoading: false, // Replaces top-level isSaving
        // errors for modal fields specifically
        recipientNameError: '',
        recipientContactError: '',
        dispatchRemarksError: '',
    });
    
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    useEffect(() => {
        if (flash?.success) showAlert(flash.success, 'Success', 'success');
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);

    // Update form if purchase prop changes (e.g., after Inertia reload)
    useEffect(() => {
        setData('remarks', purchase.remarks || ''); // Update remarks if they change from props
    }, [purchase.remarks, setData]);


    const showAlert = (message, title = 'Alert', type = 'info') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    const openDispatchModal = (e) => {
        e.preventDefault(); // Prevent default form submission if this button is inside a form tag
        clearErrors(); // Clear main form errors from useForm
        // Reset modal-specific fields and errors
        setData(prev => ({
            ...prev,
            dispatch_remarks: '', // Use a separate field for dispatch remarks
            recipient_name: '',
            recipient_contact: '',
        }));
        setDispatchModal({
            isOpen: true,
            isLoading: false,
            recipientNameError: '',
            recipientContactError: '',
            dispatchRemarksError: '',
        });
    };

    const closeDispatchModal = () => {
        setDispatchModal(prev => ({ ...prev, isOpen: false }));
        // Don't reset data fields here, they are part of useForm
    };

    const handleDispatchConfirm = () => {
        let isValid = true;
        let newModalErrors = { recipientNameError: '', recipientContactError: '', dispatchRemarksError: '' };

        if (!data.recipient_name.trim()) {
            newModalErrors.recipientNameError = 'Recipient name is required.';
            isValid = false;
        }
        if (!data.recipient_contact.trim()) {
            newModalErrors.recipientContactError = 'Recipient contact is required.';
            isValid = false;
        }
        // Optional: if dispatch_remarks are mandatory
        // if (!data.dispatch_remarks.trim()) {
        //     newModalErrors.dispatchRemarksError = 'Dispatch remarks are required.';
        //     isValid = false;
        // }

        if (!isValid) {
            setDispatchModal(prev => ({ ...prev, ...newModalErrors }));
            return;
        }

        setDispatchModal(prev => ({ ...prev, isLoading: true, ...newModalErrors }));

        const payload = {
            // Include any necessary fields from `purchase` if backend needs them for context,
            // or if this action also updates parts of the main PO record.
            // For now, sending only dispatch-specific data + what backend needs for update.
             supplier_id: purchase.supplier_id, // If needed by backend for this action
             facility_id: purchase.facility_id || purchase.facilityoption_id, // If needed
             total: purchase.total, // If needed

            remarks: data.remarks, // Existing PO remarks (if backend wants to re-save them)
            dispatch_remarks: data.dispatch_remarks, // New dispatch remarks
            recipient_name: data.recipient_name,
            recipient_contact: data.recipient_contact,
            stage: 3, // Set stage to Dispatched

            url: purchase.url, // If needed for the file attachment
            filename: purchase.filename, // If needed for the file attachment

            _method: 'PUT', // To tell Laravel it's a PUT request
        };

        // Using router.post because it's simpler for one-off actions like this with custom payloads.
        // Inertia will still correctly handle _method: 'PUT'.
        router.post(route('procurements1.dispatch', purchase.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                // Flash message from backend will show success.
                // The page should ideally redirect or reload via Inertia to reflect new PO state.
                // reset(); // Resets useForm fields (recipient_name, recipient_contact, dispatch_remarks)
                closeDispatchModal();
                // router.visit(route('procurements1.index')); // Or redirect after success
            },
            onError: (serverErrors) => {
                console.error("Dispatch Error:", serverErrors);
                setDispatchModal(prev => ({
                    ...prev,
                    isLoading: false,
                    recipientNameError: serverErrors.recipient_name || '',
                    recipientContactError: serverErrors.recipient_contact || '',
                    dispatchRemarksError: serverErrors.dispatch_remarks || serverErrors.remarks || '',
                }));
                // If errors are not specific to modal fields, show a general alert
                if (!serverErrors.recipient_name && !serverErrors.recipient_contact && !serverErrors.dispatch_remarks && !serverErrors.remarks) {
                    showAlert(serverErrors.message || "Failed to dispatch purchase order.", "Dispatch Failed", "error");
                }
            },
        });
    };
    
    // Helper to get supplier display name
    const getSupplierDisplayName = (supplier) => {
        if (!supplier) return 'N/A';
        return supplier.supplier_type === 'individual'
            ? `${supplier.first_name || ''} ${supplier.other_names || ''} ${supplier.surname || ''}`.replace(/\s+/g, ' ').trim() || 'Individual Supplier (Name Missing)'
            : supplier.company_name || 'Company Supplier (Name Missing)';
    };

    const isDispatchedOrBeyond = parseInt(purchase.stage, 10) >= 3;


    return (
        <AuthenticatedLayout user={auth.user} header={ <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight"> Dispatch Purchase Order #{purchase.id} <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full ${ parseInt(purchase.stage,10) === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : parseInt(purchase.stage,10) === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : parseInt(purchase.stage,10) === 3 ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' }`}> {getPurchaseStageLabel(purchase.stage)} </span> </h2> } >
            <Head title={`Dispatch PO #${purchase.id}`} />
            <div className="py-8">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <div className="p-6 space-y-8"> {/* Changed form to div, actions are modal-driven */}
                            
                            {isDispatchedOrBeyond && (
                                <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-700 dark:text-green-100" role="alert">
                                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2"/>
                                    This Purchase Order has already been dispatched.
                                    {purchase.recipient_name && <p className="mt-1 text-xs">Recipient: {purchase.recipient_name} ({purchase.recipient_contact})</p>}
                                    {purchase.dispatch_remarks && <p className="mt-1 text-xs">Dispatch Remarks: {purchase.dispatch_remarks}</p>}
                                </div>
                            )}

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div><strong className="text-gray-600 dark:text-gray-400">Supplier:</strong> <span className="text-gray-800 dark:text-gray-200">{getSupplierDisplayName(purchase.supplier)}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">Facility:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.facilityoption?.name || 'N/A'}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">PO Date:</strong> <span className="text-gray-800 dark:text-gray-200">{new Date(purchase.created_at).toLocaleDateString()}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">PO Number:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.purchase_order_number || `PO-${purchase.id}`}</span></div>
                                    {purchase.remarks && <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Original Remarks:</strong> <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{purchase.remarks}</p></div>}
                                    {purchase.filename && (
                                        <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Attachment:</strong>
                                            <a href={purchase.url ? (purchase.url.startsWith('http') ? purchase.url : `/storage/${purchase.url.replace(/^public\//, '')}`) : '#'} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center">
                                                <FontAwesomeIcon icon={faEye} className="mr-1" /> {purchase.filename}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {displayPurchaseItems && displayPurchaseItems.length > 0 && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-3"> <FontAwesomeIcon icon={faListUl} className="mr-2" /> Items to Dispatch </h3>
                                    <div className="overflow-x-auto shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Item Name</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Quantity</th><th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Unit Price</th><th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pr-6">Subtotal</th></tr></thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                {displayPurchaseItems.map(item => ( <tr key={item.id || item.item_id}><td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">{item.item_name}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-300">{item.quantity.toLocaleString()}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500 dark:text-gray-300">{item.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td><td className="whitespace-nowrap py-4 pl-3 pr-4 text-sm text-right text-gray-700 dark:text-gray-300 sm:pr-6">{item.subtotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td></tr> ))}
                                            </tbody>
                                            <tfoot className="bg-gray-100 dark:bg-gray-700"><tr className="font-semibold"><td colSpan="3" className="px-6 py-3 text-right text-gray-900 dark:text-gray-100">Grand Total</td><td className="px-3 py-3 text-right text-gray-900 dark:text-gray-100 sm:pr-6">{parseFloat(purchase.total || 0).toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr></tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="pt-8 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
                                <Link href={route('procurements1.index')} className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={processing || dispatchModal.isLoading}> <FontAwesomeIcon icon={faTimesCircle} className="mr-2 -ml-1 h-5 w-5" /> Close </Link>
                                {!isDispatchedOrBeyond && parseInt(purchase.stage, 10) === 2 && ( // Only show if "Approved"
                                    <button type="button" onClick={openDispatchModal} disabled={processing || dispatchModal.isLoading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50" > <FontAwesomeIcon icon={faTruck} className="mr-2 -ml-1 h-5 w-5" /> Dispatch Order </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal(p => ({...p, isOpen: false}))} title={alertModal.title} message={alertModal.message} type={alertModal.type} isAlert={true}/>
            
            <Modal isOpen={dispatchModal.isOpen} onClose={!dispatchModal.isLoading ? closeDispatchModal : () => {}} onConfirm={handleDispatchConfirm} title="Confirm Dispatch Details" confirmButtonText={dispatchModal.isLoading ? 'Processing...' : 'Confirm & Dispatch'} confirmButtonDisabled={dispatchModal.isLoading} type="info" processing={dispatchModal.isLoading || processing} >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Please provide recipient details and any remarks for this dispatch.</p>
                    <div>
                        <label htmlFor="recipient_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipient Name <span className="text-red-500">*</span></label>
                        <input type="text" id="recipient_name" value={data.recipient_name} onChange={e => {setData('recipient_name', e.target.value); setDispatchModal(p=>({...p, recipientNameError:''}));}} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${dispatchModal.recipientNameError || errors.recipient_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={dispatchModal.isLoading || processing} />
                        {dispatchModal.recipientNameError && <p className="text-xs text-red-500 mt-1">{dispatchModal.recipientNameError}</p>}
                        <InputError message={errors.recipient_name} className="mt-1"/>
                    </div>
                    <div>
                        <label htmlFor="recipient_contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipient Contact (Phone/Email) <span className="text-red-500">*</span></label>
                        <input type="text" id="recipient_contact" value={data.recipient_contact} onChange={e => {setData('recipient_contact', e.target.value); setDispatchModal(p=>({...p, recipientContactError:''}));}} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${dispatchModal.recipientContactError || errors.recipient_contact ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={dispatchModal.isLoading || processing} />
                        {dispatchModal.recipientContactError && <p className="text-xs text-red-500 mt-1">{dispatchModal.recipientContactError}</p>}
                        <InputError message={errors.recipient_contact} className="mt-1"/>
                    </div>
                    <div>
                        <label htmlFor="dispatch_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dispatch Remarks</label>
                        <textarea id="dispatch_remarks" rows="3" value={data.dispatch_remarks} onChange={e => {setData('dispatch_remarks', e.target.value); setDispatchModal(p=>({...p, dispatchRemarksError:''}));}} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${dispatchModal.dispatchRemarksError || errors.dispatch_remarks ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={dispatchModal.isLoading || processing} />
                        {dispatchModal.dispatchRemarksError && <p className="text-xs text-red-500 mt-1">{dispatchModal.dispatchRemarksError}</p>}
                        <InputError message={errors.dispatch_remarks} className="mt-1"/>
                        <InputError message={errors.remarks} className="mt-1"/> {/* For general remarks error if backend sends it */}
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}

