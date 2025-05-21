import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faEye, faArrowLeft, faAward, faCheckCircle, faExclamationTriangle, faInfoCircle, faSpinner, faListUl, faFilePdf, faFileWord, faFileAlt } from '@fortawesome/free-solid-svg-icons';
// Removed axios as router.put is used for actions
import Modal from '../../Components/CustomModal.jsx';
import InputError from '@/Components/InputError';

// Stage label helper
const getStageLabel = (stage) => {
    const stageNumber = parseInt(stage, 10);
    if (stageNumber === 1) return 'Draft';
    if (stageNumber === 2) return 'Quotation';
    if (stageNumber === 3) return 'Evaluation';
    if (stageNumber === 4) return 'Awarded';
    if (stageNumber === 5) return 'Completed'; // Example, if you have it
    return 'Unknown';
};

// File icon helper
const getFileIcon = (filename) => {
    if (!filename) return faFileAlt;
    const extension = filename.split('.').pop().toLowerCase();
    if (extension === 'pdf') return faFilePdf;
    if (['doc', 'docx'].includes(extension)) return faFileWord;
    return faFileAlt;
};


export default function Evaluation({ auth, tender, flash, errors: pageErrors }) {
    const { data, setData, put, processing, errors, clearErrors } = useForm({
        // Fields for useForm are primarily those directly manipulated by this page's primary actions (Award/Return)
        remarks: '', // For Award or Return remarks
        // The following are part of the tender object, mostly for display or context
        // but will be included if the entire 'data' object is sent with `put`
        description: tender.description || '',
        facility_id: tender.facility_id || tender.facilityoption_id,
        stage: tender.stage, // Current stage of the tender
        // awarded_supplier_id, url, filename will be added to payload specifically for award action
    });

    // For displaying original tender items
    const [originalTenderItems] = useState(
        (tender.tenderitems || []).map(item => ({
            id: item.id,
            item_id: item.item_id || item.item?.id,
            item_name: item.item_name || item.item?.name || 'N/A',
            quantity: item.quantity || 'N/A',
        }))
    );

    // For displaying and selecting submitted quotations
    const [quotationEntries] = useState(() => {
        return (tender.tenderquotations || []).map((q, index) => {
            let supplierName = 'Unknown Supplier'; let supplierId = null;
            if (q.supplier) {
                supplierId = q.supplier.id || null;
                if (q.supplier.supplier_type === 'individual') {
                    const firstName = q.supplier.first_name || ''; const otherNames = q.supplier.other_names || ''; const surname = q.supplier.surname || '';
                    supplierName = `${firstName} ${otherNames} ${surname}`.replace(/\s+/g, ' ').trim();
                    if (!supplierName && supplierId) supplierName = `Individual (ID: ${supplierId})`;
                } else {
                    supplierName = q.supplier.company_name || (supplierId ? `Company (ID: ${supplierId})` : 'Unnamed Company');
                }
            } else if (q.supplier_id) {
                supplierId = q.supplier_id;
                if (q.supplier_name) supplierName = q.supplier_name; else supplierName = `Supplier (ID: ${supplierId})`;
            }
            if ((!supplierName || supplierName === 'Unknown Supplier') && supplierId) supplierName = `Details Missing (ID: ${supplierId})`;
            if (!supplierName.trim()) supplierName = 'Details Missing';
            return {
                id: q.id || null, // This is the PROTenderQuotation ID
                supplier_id: supplierId, // This is the Supplier's ID
                supplier_name: supplierName,
                filename: q.filename || '',
                file_url: q.file_url || q.url || '',
                // No need for file_object, file_error, type, size, description in Evaluation display
                // Those were for the Quotation upload page. Here we just display existing data.
                is_awarded: parseInt(tender.awarded_supplier_id, 10) === parseInt(supplierId, 10),
            };
        });
    });

    const [selectedQuotationIndex, setSelectedQuotationIndex] = useState(
        tender.awarded_supplier_id ? quotationEntries.findIndex(q => q.supplier_id === parseInt(tender.awarded_supplier_id, 10)) : -1
    );

    const [actionModal, setActionModal] = useState({ isOpen: false, title: '', message: '', type: 'info', actionType: null, isLoading: false, remarksError: '', targetQuotation: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    useEffect(() => {
        if (flash?.success) showAlert(flash.success, 'Success', 'success');
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);

    // Update selectedQuotationIndex if tender data (award status) changes from props
    useEffect(() => {
        setSelectedQuotationIndex(
            tender.awarded_supplier_id ? quotationEntries.findIndex(q => q.supplier_id === parseInt(tender.awarded_supplier_id, 10)) : -1
        );
        // Also update the form's stage if the tender prop's stage changes
        if (data.stage !== tender.stage) {
            setData('stage', tender.stage);
        }
    }, [tender.awarded_supplier_id, tender.stage, quotationEntries, setData]);


    const handleRadioChange = (index) => {
        if (isAwardedOrCompleted) return;
        setSelectedQuotationIndex(index);
        // No need to setData for selected_supplier_id here, it's handled in payload construction
    };

    const showAlert = (message, title = 'Alert', type = 'info') => setAlertModal({ isOpen: true, title, message, type });

    const openActionModal = (type) => {
        clearErrors(); setData('remarks', ''); // Reset for each new modal open
        if (type === 'award') {
            if (selectedQuotationIndex === -1) { showAlert('Please select a supplier quotation to award.', 'Selection Required', 'warning'); return; }
            const targetQuotation = quotationEntries[selectedQuotationIndex];
            setActionModal({ isOpen: true, title: 'Confirm Award', message: `Award this tender to "${targetQuotation.supplier_name}"? This action will finalize the quotation stage.`, type: 'warning', actionType: 'award', targetQuotation: targetQuotation, isLoading: false, remarksError: '' });
        } else if (type === 'return') {
            setActionModal({ isOpen: true, title: 'Return Tender', message: 'Return this tender to the Quotation stage? Please provide remarks.', type: 'warning', actionType: 'return', targetQuotation: null, isLoading: false, remarksError: '' });
        }
    };
    const closeActionModal = () => { setActionModal({ isOpen: false, title: '', message: '', type: 'info', actionType: null, targetQuotation: null, isLoading: false, remarksError: '' }); setData('remarks', ''); };

    const handleActionConfirm = () => {
        if (!data.remarks.trim()) { setActionModal(prev => ({ ...prev, remarksError: 'Remarks are required.' })); return; }
        setActionModal(prev => ({ ...prev, isLoading: true, remarksError: '' }));

        let payload = { // Base payload from useForm, includes _method, description, facility_id (if needed by backend)
            ...data, // Send current form data (which has remarks and current stage)
            remarks: data.remarks, // Explicitly ensure remarks is from the modal input
        };
        let routeName;

        if (actionModal.actionType === 'award' && actionModal.targetQuotation) {
            payload.awarded_supplier_id = actionModal.targetQuotation.supplier_id;
            payload.url = actionModal.targetQuotation.file_url || ''; // Send URL of awarded quotation's file
            payload.filename = actionModal.targetQuotation.filename || ''; // Send filename of awarded quotation's file
            // payload.awarded_quotation_id = actionModal.targetQuotation.id; // If backend needs the pro_tenderquotations.id
            payload.stage = 4; // Target "Awarded" stage
            routeName = route('procurements0.award', tender.id);
        } else if (actionModal.actionType === 'return') {
            payload.stage = 2; // Target "Quotation" stage (returning to)
            // For return, backend should clear award-related fields on the tender
            delete payload.awarded_supplier_id; // Ensure these are not sent if returning
            delete payload.url;
            delete payload.filename;
            routeName = route('procurements0.return', tender.id);
        } else {
            setActionModal(prev => ({ ...prev, isLoading: false }));
            showAlert('Invalid action specified.', 'Error', 'error');
            return;
        }
        
        // console.log("Submitting payload:", payload, "to route:", routeName);

        router.put(routeName, payload, { // Using router.put and Laravel handles _method
            preserveScroll: true,
            onSuccess: (page) => {
                closeActionModal();
                // Flash message should appear. Tender data on page might auto-update if backend returns it.
                // If not, a router.reload({ only: ['tender', 'flash'] }) might be needed,
                // but often Inertia's default redirect from controller takes care of this.
            },
            onError: (serverErrors) => {
                console.error(`${actionModal.actionType} error:`, serverErrors);
                setActionModal(prev => ({ ...prev, isLoading: false, remarksError: serverErrors.remarks || '' }));
                // Main form `errors` object (from useForm) will be populated by Inertia for other fields.
                if (!serverErrors.remarks) { // If error is not just remarks, show general alert
                    let generalErrorMessage = `Failed to ${actionModal.actionType} tender.`;
                    if (serverErrors.message) { generalErrorMessage = serverErrors.message; }
                    else if (Object.keys(serverErrors).length > 0) { generalErrorMessage = "Please check for errors and try again."; }
                    showAlert(generalErrorMessage, 'Action Failed', 'error');
                }
            }
        });
    };
    
    const isAwardedOrCompleted = parseInt(tender.stage, 10) === 4 || parseInt(tender.stage, 10) === 5;

    return (
        <AuthenticatedLayout user={auth.user} header={ <div className="flex justify-between items-center"> <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight"> Tender Evaluation <span className="text-sm text-gray-500 dark:text-gray-400">(ID: {tender.id})</span> </h2> <span className={`px-3 py-1 text-xs font-semibold rounded-full ${ parseInt(tender.stage,10) === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : parseInt(tender.stage,10) === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : parseInt(tender.stage,10) === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-100' : parseInt(tender.stage,10) === 4 ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : parseInt(tender.stage,10) === 5 ? 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' }`}> Stage: {getStageLabel(tender.stage)} </span> </div> } >
            <Head title={`Evaluation - Tender ${tender.id}`} />
            <div className="py-8">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <div className="p-6 space-y-8">

                            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Tender Details</h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300"> <span className="font-semibold">Description:</span> {tender.description /* Use tender.description directly for display */} </p>
                                {/* Display errors for top-level fields if backend returns them */}
                                <InputError message={errors.description} className="mt-1 text-xs" />
                                <InputError message={errors.facility_id} className="mt-1 text-xs" />
                            </div>

                            {originalTenderItems && originalTenderItems.length > 0 && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-3"> <FontAwesomeIcon icon={faListUl} className="mr-2" /> Requested Items </h3>
                                    <div className="overflow-x-auto shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Item Name</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Quantity</th></tr></thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                {originalTenderItems.map(item => ( <tr key={item.id || item.item_id}><td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">{item.item_name}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-300">{item.quantity}</td></tr> ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {isAwardedOrCompleted && tender.awarded_supplier_id && (
                                <div className="p-4 my-6 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-700 dark:text-green-100" role="alert">
                                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2"/>
                                    This tender has been awarded to: <span className="font-semibold">{quotationEntries.find(q => q.supplier_id === parseInt(tender.awarded_supplier_id,10))?.supplier_name || 'N/A'}</span>.
                                    {tender.award_remarks && <p className="mt-1 text-xs">Remarks: {tender.award_remarks}</p>}
                                </div>
                            )}
                            <InputError message={errors.awarded_supplier_id} className="mt-2 text-sm"/>
                            <InputError message={errors.url} className="mt-2 text-sm"/>
                            <InputError message={errors.filename} className="mt-2 text-sm"/>
                            <InputError message={errors.stage} className="mt-2 text-sm"/>


                            {quotationEntries.length > 0 ? (
                                <div className="flow-root border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Submitted Quotations</h3>
                                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <div className="overflow-hidden shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700"><tr> {!isAwardedOrCompleted && <th scope="col" className="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6 w-12">Select</th>} <th scope="col" className={`py-3.5 ${isAwardedOrCompleted ? 'pl-4 sm:pl-6' : 'px-3'} text-left text-sm font-semibold text-gray-900 dark:text-gray-100`}>Supplier</th> <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Quotation File</th></tr></thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        {quotationEntries.map((entry, index) => (
                                                            <tr key={entry.id || entry.supplier_id} className={`${selectedQuotationIndex === index && !isAwardedOrCompleted ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''} ${entry.is_awarded ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500 dark:ring-green-400' : ''}`}>
                                                                {!isAwardedOrCompleted && ( <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center sm:pl-6"> <input type="radio" name="selected_quotation" className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-indigo-600 dark:ring-offset-gray-800" checked={selectedQuotationIndex === index} onChange={() => handleRadioChange(index)} disabled={processing || actionModal.isLoading} /> </td> )}
                                                                <td className={`py-4 ${isAwardedOrCompleted ? 'pl-4 sm:pl-6' : 'px-3'} text-sm font-medium text-gray-900 dark:text-gray-100`}> {entry.supplier_name} <div className="text-xs text-gray-500 dark:text-gray-400">ID: {entry.supplier_id || 'N/A'}</div> {entry.is_awarded && <span className="ml-2 text-xs font-semibold text-green-600 dark:text-green-400">(Awarded)</span>} </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center"> {entry.file_url ? ( <a href={entry.file_url.startsWith('http') ? entry.file_url : `/storage/${entry.file_url.replace(/^public\//, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 group" title={`View ${entry.filename}`}> <FontAwesomeIcon icon={getFileIcon(entry.filename)} className="mr-2 h-5 w-5 group-hover:text-indigo-500" /> <span className="truncate max-w-[150px] group-hover:underline">{entry.filename || 'View File'}</span> </a> ) : ( <span className="text-gray-400 dark:text-gray-500">No file</span> )} </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : ( <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"> <FontAwesomeIcon icon={faInfoCircle} className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" /> <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Quotations Submitted</h3> <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No supplier quotations were found for this tender.</p> </div> )}

                            <div className="pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                                <Link href={route('procurements0.index')} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" as="button" disabled={processing || actionModal.isLoading}> <FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> Close </Link>
                                {!isAwardedOrCompleted && parseInt(tender.stage,10) === 3 && (
                                    <>
                                        <button type="button" onClick={() => openActionModal('return')} disabled={processing || actionModal.isLoading} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-50"> <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Return to Quotation </button>
                                        <button type="button" onClick={() => openActionModal('award')} disabled={processing || actionModal.isLoading || selectedQuotationIndex === -1} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"> <FontAwesomeIcon icon={faAward} className="mr-2" /> Award Tender </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal(p => ({...p, isOpen: false}))} title={alertModal.title} message={alertModal.message} type={alertModal.type} isAlert={true}/>
            <Modal isOpen={actionModal.isOpen} onClose={!actionModal.isLoading ? closeActionModal : () => {}} onConfirm={handleActionConfirm} title={actionModal.title} confirmButtonText={actionModal.isLoading ? 'Processing...' : (actionModal.actionType === 'award' ? 'Confirm Award' : 'Confirm Return')} closeButtonText={actionModal.isLoading ? null : "Cancel"} confirmButtonDisabled={actionModal.isLoading} type={actionModal.type} isDestructive={actionModal.actionType === 'return'} processing={actionModal.isLoading || processing } /* Also disable if main form is processing */ >
                <div> <p className="text-sm text-gray-700 dark:text-gray-300">{actionModal.message}</p> <div className="mt-4"> <label htmlFor="action_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {actionModal.actionType === 'award' ? 'Award' : 'Return'} Remarks <span className="text-red-500">*</span> </label> <textarea id="action_remarks" rows="3" className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${actionModal.remarksError || errors.remarks ? 'border-red-500' : ''}`} value={data.remarks} onChange={e => { setData('remarks', e.target.value); if (actionModal.remarksError) setActionModal(p => ({ ...p, remarksError: '' })); if(errors.remarks) clearErrors('remarks'); }} disabled={actionModal.isLoading || processing} /> {actionModal.remarksError && <p className="text-xs text-red-500 mt-1">{actionModal.remarksError}</p>} <InputError message={errors.remarks} className="mt-1"/> </div> </div>
            </Modal>
        </AuthenticatedLayout>
    );
}