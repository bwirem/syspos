import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useCallback, useMemo if needed later, though not strictly for this version
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimesCircle, 
    faEye, 
    faCheckCircle, 
    faInfoCircle, 
    faSpinner,
    faListUl, 
    faFilePdf, 
    faFileWord, 
    faFileAlt,
    faBoxOpen, 
    faExclamationTriangle // Keep if used for other alerts
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

import Modal from '../../Components/CustomModal.jsx';
import InputError from '@/Components/InputError';

// Stage label helper
const getPurchaseStageLabel = (stage) => {
    const stageNum = parseInt(stage, 10);
    if (stageNum === 1) return 'Pending';
    if (stageNum === 2) return 'Approved';
    if (stageNum === 3) return 'Dispatched';
    if (stageNum === 4) return 'Received';
    if (stageNum === 5) return 'Paid';
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

// Supplier display name helper
const getSupplierDisplayName = (supplier) => {
    if (!supplier) return 'N/A';
    let name = supplier.supplier_type === 'individual'
        ? `${supplier.first_name || ''} ${supplier.other_names || ''} ${supplier.surname || ''}`.replace(/\s+/g, ' ').trim()
        : supplier.company_name;
    return name || 'Supplier Name Missing';
};

export default function Receive({ auth, purchase, flash, errors: pageErrors }) { // pageErrors for initial load validation errors
    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        receive_remarks: '',
        grn_number: '',
        // items_received will be built from receivedItemsUI for submission
        stage: purchase.stage, // Current stage from prop, will be updated by action
        _method: 'PUT', // For Inertia to handle as PUT via router.post
    });

    const [receivedItemsUI, setReceivedItemsUI] = useState(
        (purchase.purchaseitems || []).map(item => ({
            id: item.id, // This is the purchase_item.id from database
            item_id: item.item_id || item.item?.id,
            item_name: item.item_name || item.item?.name || 'N/A',
            quantity_ordered: parseFloat(item.quantity || 0),
            quantity_previously_received: parseFloat(item.quantity_received_total || 0), // Backend needs to provide this
            quantity_to_receive: Math.max(0, (parseFloat(item.quantity || 0)) - (parseFloat(item.quantity_received_total || 0))), // Default to remaining
            price: parseFloat(item.price || 0), // For display if needed
            item_receive_remarks: '', // Optional: remarks per item
            error: null, // For item-level client-side validation errors
        }))
    );

    const [receiveModal, setReceiveModal] = useState({ 
        isOpen: false, isLoading: false, 
        remarksError: '', grnNumberError: '' 
    });
    const [alertModal, setAlertModal] = useState({ 
        isOpen: false, title: '', message: '', type: 'info' 
    });

    // Transform data before Inertia submission
    useEffect(() => {
        transform((currentFormData) => ({
            ...currentFormData, // Includes receive_remarks, grn_number, stage, _method from useForm's data
            items_received: receivedItemsUI
                .filter(item => parseFloat(item.quantity_to_receive) > 0) // Only send items with a quantity to receive
                .map(item => ({
                    purchase_item_id: item.id,
                    item_id: item.item_id,
                    quantity_received: parseFloat(item.quantity_to_receive),
                    remarks: item.item_receive_remarks,
                })),
        }));
    }, [receivedItemsUI, transform]); // Rerun transform if receivedItemsUI changes

    useEffect(() => {
        if (flash?.success) showAlert(flash.success, 'Success', 'success');
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);

    useEffect(() => {
        if (data.stage !== purchase.stage) {
            setData('stage', purchase.stage);
        }
        // Re-initialize receivedItemsUI if purchase prop itself changes significantly (e.g., after a full page reload)
        // This ensures UI reflects the latest state if backend sends updated purchaseitems with quantity_received_total
        setReceivedItemsUI(
            (purchase.purchaseitems || []).map(item => ({
                id: item.id, item_id: item.item_id || item.item?.id,
                item_name: item.item_name || item.item?.name || 'N/A',
                quantity_ordered: parseFloat(item.quantity || 0),
                quantity_previously_received: parseFloat(item.quantity_received_total || 0),
                quantity_to_receive: Math.max(0, (parseFloat(item.quantity || 0)) - (parseFloat(item.quantity_received_total || 0))),
                price: parseFloat(item.price || 0),
                item_receive_remarks: '', error: null,
            }))
        );
    }, [purchase, setData]); // Added full purchase dependency

    const showAlert = (message, title = 'Alert', type = 'info') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    const handleItemQuantityChange = (index, value) => {
        const newItems = [...receivedItemsUI];
        const ordered = newItems[index].quantity_ordered;
        const previouslyReceived = newItems[index].quantity_previously_received;
        const maxReceivable = ordered - previouslyReceived;
        
        let qty = parseFloat(value);
        if (isNaN(qty) || qty < 0) {
            qty = 0;
        }
        
        let itemError = null;
        if (qty > maxReceivable) {
            itemError = `Max receivable: ${maxReceivable}.`;
            qty = maxReceivable;
        }
        
        newItems[index].quantity_to_receive = qty;
        newItems[index].error = itemError;
        setReceivedItemsUI(newItems);

        // Clear backend validation error for this specific item if user corrects it
        const errorKey = `items_received.${index}.quantity_received`;
        if(errors[errorKey]) clearErrors(errorKey);
    };
    
    // Optional: Item remarks change handler
    // const handleItemRemarksChange = (index, value) => {
    //     const newItems = [...receivedItemsUI];
    //     newItems[index].item_receive_remarks = value;
    //     setReceivedItemsUI(newItems);
    // };

    const openReceiveModal = (e) => {
        e.preventDefault(); 
        clearErrors(); 
        setData(prev => ({ ...prev, receive_remarks: '', grn_number: '' }));
        // Reset quantity_to_receive if modal is re-opened, or keep user's prior input?
        // For now, it retains what was in receivedItemsUI. If you want to reset:
        // setReceivedItemsUI(prevItems => prevItems.map(item => ({ ...item, quantity_to_receive: Math.max(0, item.quantity_ordered - item.quantity_previously_received), error: null })));
        setReceiveModal({ isOpen: true, isLoading: false, remarksError: '', grnNumberError: '' });
    };
    const closeReceiveModal = () => {
        setReceiveModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleReceiveConfirm = () => {
        let isValid = true;
        let newModalErrors = { receiveRemarksError: '', grnNumberError: ''};

        const totalQtyToReceive = receivedItemsUI.reduce((sum, item) => sum + (parseFloat(item.quantity_to_receive) || 0), 0);
        if (totalQtyToReceive <= 0) {
            showAlert("Please enter a quantity for at least one item to receive.", "No Quantity Entered", "warning");
            return; // Early exit
        }

        const itemsWithClientErrors = receivedItemsUI.filter(item => item.error);
        if (itemsWithClientErrors.length > 0) {
            showAlert("Some items have quantity errors (e.g., exceeding order). Please review.", "Item Input Errors", "error");
            isValid = false; // This flag might not be strictly needed if we return early
            return;
        }
        
        // Example validation for GRN or Remarks if they were mandatory in modal
        // if (!data.grn_number.trim() && IS_GRN_MANDATORY) { newModalErrors.grnNumberError = 'GRN # is required.'; isValid = false; }
        // if (!data.receive_remarks.trim() && ARE_RECEIVE_REMARKS_MANDATORY) { newModalErrors.receiveRemarksError = 'Remarks are required.'; isValid = false; }

        if (!isValid) {
            setReceiveModal(prev => ({ ...prev, ...newModalErrors }));
            return;
        }
        setReceiveModal(prev => ({ ...prev, isLoading: true, ...newModalErrors }));

        // `data` from useForm already includes receive_remarks, grn_number (if bound), and _method.
        // `transform` already prepared `items_received`.
        // We explicitly set the target stage in the payload.
        const payload = {
            ...data, // Contains receive_remarks, grn_number, and transformed items_received via transform
            stage: 4, // Target "Received" stage
            // Send these base PO details if your backend 'receive' route also validates/uses them
            supplier_id: purchase.supplier_id,
            facility_id: purchase.facility_id || purchase.facilityoption_id,
            total: parseFloat(purchase.total || 0), // Original total
        };
        
        router.post(route('procurements1.receive', purchase.id), payload, { // Using POST because payload includes items_received array
            preserveScroll: true,
            onSuccess: () => {
                // Flash message takes precedence for success.
                // `purchase` prop update will trigger useEffect to refresh local UI state.
                closeReceiveModal();
                // Optionally, redirect: router.visit(route('procurements1.index'));
            },
            onError: (serverErrors) => {
                console.error("Receive Error Details:", serverErrors);
                setReceiveModal(prev => ({
                    ...prev, isLoading: false,
                    receiveRemarksError: serverErrors.remarks || serverErrors.receive_remarks || '', // Backend might use 'remarks'
                    grnNumberError: serverErrors.grn_number || '',
                }));
                // Update UI for item-specific errors from backend
                const updatedItemsUI = receivedItemsUI.map((uiItem, index) => {
                    const itemErrorKey = `items_received.${index}.quantity_received`;
                    return { ...uiItem, error: serverErrors[itemErrorKey] || uiItem.error }; // Keep client error if no server error
                });
                setReceivedItemsUI(updatedItemsUI);

                if (!serverErrors.remarks && !serverErrors.receive_remarks && !serverErrors.grn_number && !Object.keys(serverErrors).some(k => k.startsWith('items_received'))) {
                    showAlert(serverErrors.message || "Failed to record goods receipt. Check for specific errors.", "Receive Failed", "error");
                }
            },
        });
    };
    
    const isReceivedOrBeyond = parseInt(purchase.stage, 10) >= 4;

    return (
        <AuthenticatedLayout user={auth.user} header={ <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight"> Receive Purchase Order #{purchase.purchase_order_number || purchase.id} <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full ${ parseInt(purchase.stage,10) === 3 ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : parseInt(purchase.stage,10) === 4 ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : parseInt(purchase.stage,10) === 5 ? 'bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' }`}> {getPurchaseStageLabel(purchase.stage)} </span> </h2> } >
            <Head title={`Receive PO #${purchase.purchase_order_number || purchase.id}`} />
            <div className="py-8">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8"> {/* Increased max-width */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <div className="p-6 space-y-8">
                            
                            {isReceivedOrBeyond && (
                                <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-700 dark:text-green-100" role="alert">
                                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2"/>
                                    This Purchase Order has been marked as '{getPurchaseStageLabel(purchase.stage)}'.
                                    {purchase.grn_number && <p className="mt-1 text-xs">GRN Number: {purchase.grn_number}</p>}
                                    {purchase.receive_remarks && <p className="mt-1 text-xs">Receiving Remarks: {purchase.receive_remarks}</p>}
                                </div>
                            )}

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30">
                                 <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div><strong className="text-gray-600 dark:text-gray-400">Supplier:</strong> <span className="text-gray-800 dark:text-gray-200">{getSupplierDisplayName(purchase.supplier)}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">Facility:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.facilityoption?.name || 'N/A'}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">PO Date:</strong> <span className="text-gray-800 dark:text-gray-200">{new Date(purchase.created_at).toLocaleDateString()}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">PO Number:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.purchase_order_number || `PO-${purchase.id}`}</span></div>
                                    {purchase.remarks && <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Original PO Remarks:</strong> <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{purchase.remarks}</p></div>}
                                    {purchase.dispatch_remarks && <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Dispatch Remarks:</strong> <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{purchase.dispatch_remarks}</p></div>}
                                    {purchase.recipient_name && <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Dispatched To:</strong> <p className="text-gray-800 dark:text-gray-200">{purchase.recipient_name} ({purchase.recipient_contact || 'N/A'})</p></div>}
                                    {purchase.filename && ( <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Attachment:</strong> <a href={purchase.url ? (purchase.url.startsWith('http') ? purchase.url : `/storage/${purchase.url.replace(/^public\//, '')}`) : '#'} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center"> <FontAwesomeIcon icon={faEye} className="mr-1" /> {purchase.filename} </a> </div> )}
                                </div>
                            </section>

                            {receivedItemsUI && receivedItemsUI.length > 0 ? (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-3"> <FontAwesomeIcon icon={faListUl} className="mr-2" /> Items to Receive </h3>
                                    <div className="overflow-x-auto shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Item Name</th>
                                                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Ordered</th>
                                                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Prev. Received</th>
                                                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-40">Quantity to Receive</th> {/* Wider for input */}
                                                    {/* <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Item Remarks</th> */}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                {receivedItemsUI.map((item, index) => {
                                                    const remainingToReceive = Math.max(0, item.quantity_ordered - item.quantity_previously_received);
                                                    return (
                                                        <tr key={item.id || item.item_id}>
                                                            <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">
                                                                {item.item_name}
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">Product ID: {item.item_id}</div>
                                                                {item.id && <div className="text-xs text-gray-400 dark:text-gray-500">PO Item ID: {item.id}</div>}
                                                            </td>
                                                            <td className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-300">{item.quantity_ordered.toLocaleString()}</td>
                                                            <td className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-300">{item.quantity_previously_received.toLocaleString()}</td>
                                                            <td className="px-3 py-4 text-sm">
                                                                <input 
                                                                    type="number"
                                                                    value={item.quantity_to_receive}
                                                                    onChange={e => handleItemQuantityChange(index, e.target.value)}
                                                                    min="0"
                                                                    max={remainingToReceive}
                                                                    className={`block w-full text-center rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${item.error || errors[`items_received.${index}.quantity_received`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                                    disabled={isReceivedOrBeyond || receiveModal.isLoading || processing || remainingToReceive === 0}
                                                                />
                                                                {item.error && <p className="text-xs text-red-500 mt-1">{item.error}</p>}
                                                                <InputError message={errors[`items_received.${index}.quantity_received`]} className="mt-1 text-xs"/>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : ( <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"> <FontAwesomeIcon icon={faInfoCircle} className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" /> <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Items in Purchase Order</h3> <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This PO has no items listed or they could not be loaded.</p> </div> )}

                            <div className="pt-8 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
                                <Link href={route('procurements1.index')} className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={processing || receiveModal.isLoading}> <FontAwesomeIcon icon={faTimesCircle} className="mr-2 -ml-1 h-5 w-5" /> Close </Link>
                                {!isReceivedOrBeyond && parseInt(purchase.stage, 10) === 3 && ( // Only show if "Dispatched"
                                    <button type="button" onClick={openReceiveModal} disabled={processing || receiveModal.isLoading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50" > <FontAwesomeIcon icon={faBoxOpen} className="mr-2 -ml-1 h-5 w-5" /> {processing && receiveModal.isLoading ? 'Processing...' : 'Receive Goods'} </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal(p => ({...p, isOpen: false}))} title={alertModal.title} message={alertModal.message} type={alertModal.type} isAlert={true}/>
            
            <Modal isOpen={receiveModal.isOpen} onClose={!receiveModal.isLoading ? closeReceiveModal : () => {}} onConfirm={handleReceiveConfirm} title="Confirm Goods Receipt" confirmButtonText={receiveModal.isLoading ? 'Processing...' : 'Confirm Receipt'} confirmButtonDisabled={receiveModal.isLoading || processing} type="info" processing={receiveModal.isLoading || processing} >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Confirm quantities received and provide any relevant details for this receipt.</p>
                    <div className="max-h-40 overflow-y-auto border dark:border-gray-600 rounded-md p-3 my-2 space-y-1 bg-gray-50 dark:bg-gray-700/30">
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Summary of Items Being Received:</h4>
                        {receivedItemsUI.filter(item => parseFloat(item.quantity_to_receive) > 0).length > 0 ?
                            receivedItemsUI.filter(item => parseFloat(item.quantity_to_receive) > 0).map(item => (
                                <div key={`summary-${item.id || item.item_id}`} className="text-xs text-gray-800 dark:text-gray-200">
                                    - {item.item_name}: <span className="font-medium">{item.quantity_to_receive}</span>
                                </div>
                            )) : <p className="text-xs text-gray-500 dark:text-gray-400">No quantities currently entered to receive.</p>
                        }
                    </div>
                    <div>
                        <label htmlFor="grn_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goods Received Note (GRN) # (Optional)</label>
                        <input type="text" id="grn_number" value={data.grn_number} onChange={e => {setData('grn_number', e.target.value); setReceiveModal(p=>({...p, grnNumberError:''})); if(errors.grn_number) clearErrors('grn_number'); }} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${receiveModal.grnNumberError || errors.grn_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={receiveModal.isLoading || processing} />
                        {receiveModal.grnNumberError && <p className="text-xs text-red-500 mt-1">{receiveModal.grnNumberError}</p>}
                        <InputError message={errors.grn_number} className="mt-1"/>
                    </div>
                    <div>
                        <label htmlFor="receive_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receiving Remarks</label>
                        <textarea id="receive_remarks" rows="3" value={data.receive_remarks} onChange={e => {setData('receive_remarks', e.target.value); setReceiveModal(p=>({...p, receiveRemarksError:''})); if(errors.receive_remarks || errors.remarks) clearErrors('receive_remarks', 'remarks');}} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${receiveModal.receiveRemarksError || errors.receive_remarks || errors.remarks ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={receiveModal.isLoading || processing} />
                        {receiveModal.receiveRemarksError && <p className="text-xs text-red-500 mt-1">{receiveModal.receiveRemarksError}</p>}
                        <InputError message={errors.receive_remarks || errors.remarks} className="mt-1"/>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}