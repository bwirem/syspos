import React, { useState, useEffect } from 'react'; // Removed useCallback, useMemo as not strictly needed for this version
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimesCircle,
    faEye,
    faCheckCircle,
    faInfoCircle,
    // faSpinner, // Replaced by processing prop in button
    faListUl,
    faFilePdf,
    faFileWord,
    faFileAlt,
    faBoxOpen,
    faExclamationTriangle,
    faStore
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

import Modal from '../../Components/CustomModal.jsx'; // Ensure this path is correct
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

export default function Receive({ auth, purchase, stores, flash, errors: pageErrors }) {
    const { data, setData, processing, errors, clearErrors } = useForm({ // Removed post, reset, transform as we use router.post directly
        receive_remarks: '',
        grn_number: '',
        receiving_store_id: (stores && stores.length > 0) ? stores[0].id : '', // Default to first store
        stage: purchase.stage, // Will be overridden before submission
        _method: 'PUT',
    });

    const [receivedItemsUI, setReceivedItemsUI] = useState([]);

    const [receiveModal, setReceiveModal] = useState({
        isOpen: false, isLoading: false, // isLoading in modal can be tied to `processing` from useForm
        remarksError: '', grnNumberError: '', receivingStoreError: ''
    });
    const [alertModal, setAlertModal] = useState({
        isOpen: false, title: '', message: '', type: 'info'
    });

    // Initialize/Update receivedItemsUI when purchase or its items change
    useEffect(() => {
        setReceivedItemsUI(
            (purchase.purchaseitems || []).map(item => ({
                id: item.id, // purchase_item.id
                item_id: item.item_id || item.item?.id,
                item_name: item.item_name || item.item?.name || 'N/A',
                quantity_ordered: parseFloat(item.quantity || 0),
                quantity_previously_received: parseFloat(item.quantity_received_total || 0),
                quantity_to_receive: Math.max(0, (parseFloat(item.quantity || 0)) - (parseFloat(item.quantity_received_total || 0))),
                price: parseFloat(item.price || 0), // For display or calculation if needed
                item_receive_remarks: '', // Optional: remarks per item
                error: null, // For item-level client-side validation errors
            }))
        );
    }, [purchase]);

    // Handle flash messages
    useEffect(() => {
        if (flash?.success) showAlert(flash.success, 'Success', 'success');
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);

    // Sync form stage with purchase stage if purchase prop changes (e.g., after successful update)
     useEffect(() => {
        if (data.stage !== purchase.stage) {
            setData('stage', purchase.stage);
        }
    }, [purchase.stage, setData]);


    const showAlert = (message, title = 'Alert', type = 'info') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    const handleItemQuantityChange = (index, value) => {
        const newItems = [...receivedItemsUI];
        const item = newItems[index];
        const ordered = item.quantity_ordered;
        const previouslyReceived = item.quantity_previously_received;
        const maxReceivable = ordered - previouslyReceived;

        let qtyToReceiveInput = value.trim() === '' ? 0 : parseFloat(value);

        if (isNaN(qtyToReceiveInput) || qtyToReceiveInput < 0) {
            qtyToReceiveInput = 0;
        }

        let itemError = null;
        if (qtyToReceiveInput > maxReceivable) {
            itemError = `Max: ${maxReceivable.toLocaleString()}.`;
            qtyToReceiveInput = maxReceivable;
        }

        newItems[index].quantity_to_receive = qtyToReceiveInput;
        newItems[index].error = itemError;
        setReceivedItemsUI(newItems);

        // Clear backend validation error for this specific item if user corrects it
        const errorKey = `items_received.${index}.quantity_received`; // Match backend error key
        if(errors[errorKey]) clearErrors(errorKey);
    };

    const openReceiveModal = (e) => {
        e.preventDefault();
        clearErrors(); // Clear all Inertia form errors
        // Reset form fields for the modal. Keep existing quantities in receivedItemsUI
        setData(prev => ({
            ...prev, // Keep _method, stage (will be overridden)
            receive_remarks: '',
            grn_number: '',
            receiving_store_id: prev.receiving_store_id || ((stores && stores.length > 0) ? stores[0].id : ''),
        }));
        setReceiveModal({ isOpen: true, isLoading: false, remarksError: '', grnNumberError: '', receivingStoreError: '' });
    };

    const closeReceiveModal = () => {
        if (processing) return; // Don't close if form is submitting
        setReceiveModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleReceiveConfirm = () => {
        let isValid = true;
        let newModalErrors = { receiveRemarksError: '', grnNumberError: '', receivingStoreError: ''};
        clearErrors(); // Clear previous backend errors

        const itemsToSubmit = receivedItemsUI
            .filter(item => {
                const qty = parseFloat(item.quantity_to_receive);
                return !isNaN(qty) && qty > 0;
            })
            .map(item => ({
                purchase_item_id: item.id,
                item_id: item.item_id,
                quantity_received: parseFloat(item.quantity_to_receive),
                remarks: item.item_receive_remarks || '', // Ensure remarks is at least an empty string
            }));

        if (itemsToSubmit.length === 0) {
            showAlert("No items have a valid quantity greater than zero to receive.", "No Items to Receive", "warning");
            return;
        }

        const itemsWithClientErrors = receivedItemsUI.filter(item => item.error);
        if (itemsWithClientErrors.length > 0) {
            showAlert("Some items have quantity errors (e.g., exceeding order). Please review.", "Item Input Errors", "error");
            return;
        }

        if (stores && stores.length > 0 && !data.receiving_store_id) {
            newModalErrors.receivingStoreError = 'Please select a receiving store.';
            isValid = false;
        }

        if (!isValid) {
            setReceiveModal(prev => ({ ...prev, ...newModalErrors, isLoading: false }));
            return;
        }

        setReceiveModal(prev => ({ ...prev, isLoading: true, ...newModalErrors })); // Clear old modal errors if any

        const finalPayload = {
            ...data, // from useForm: receive_remarks, grn_number, receiving_store_id, _method
            stage: 4, // Explicitly set target stage for receiving
            items_received: itemsToSubmit,
            // Add other fields required by backend that are not in `data` from `useForm` state
            supplier_id: purchase.supplier_id,
            facility_id: purchase.facility_id || purchase.facilityoption_id,
            // Total is calculated on backend based on received items' PO price.
            // If backend requires original PO total for some reason, add it:
            // total: parseFloat(purchase.total || 0),
        };

        // console.log("Final payload being sent to backend:", JSON.stringify(finalPayload, null, 2));

        router.post(route('procurements1.receive', purchase.id), finalPayload, {
            preserveScroll: true,
            onSuccess: (page) => {
                // flash message from 'page.props.flash' handled by useEffect
                closeReceiveModal();
                // `purchase` prop will update, triggering useEffect to refresh UI state if needed.
            },
            onError: (serverErrors) => {
                console.error("Receive Error Details (from router.post):", serverErrors);
                // Update modal state to show errors & stop loading
                setReceiveModal(prev => ({
                    ...prev,
                    isLoading: false, // Stop modal's own loading indicator
                    receiveRemarksError: serverErrors.receive_remarks || serverErrors.remarks || '',
                    grnNumberError: serverErrors.grn_number || '',
                    receivingStoreError: serverErrors.receiving_store_id || '',
                }));

                // Update UI for item-specific errors from backend
                // This part needs careful mapping if backend error keys don't directly match UI array indices
                const updatedItemsUIWithErrors = receivedItemsUI.map((uiItem, index) => {
                    let backendItemError = null;
                    // Try to find the error for this item. Backend might index errors based on the submitted `items_received` array
                    // or based on some other logic. For now, let's assume it might use a generic index.
                    const errorKeyForQty = `items_received.${index}.quantity_received`;
                    // Add more keys if backend validates other item fields:
                    // const errorKeyForItem = `items_received.${index}.item_id`;
                    // const errorKeyForPOItem = `items_received.${index}.purchase_item_id`;

                    if (serverErrors[errorKeyForQty]) {
                        backendItemError = serverErrors[errorKeyForQty];
                    }
                    // Add more checks for other item fields if necessary
                    // else if (serverErrors[errorKeyForItem]) backendItemError = serverErrors[errorKeyForItem];
                    // else if (serverErrors[errorKeyForPOItem]) backendItemError = serverErrors[errorKeyForPOItem];


                    return { ...uiItem, error: backendItemError || uiItem.error }; // Prioritize backend error
                });
                setReceivedItemsUI(updatedItemsUIWithErrors);


                // Show a general alert if specific errors aren't caught by field messages
                if (serverErrors.items_received && typeof serverErrors.items_received === 'string') {
                     showAlert(serverErrors.items_received, "Submission Error", "error");
                } else if (
                    !serverErrors.receive_remarks && !serverErrors.remarks &&
                    !serverErrors.grn_number && !serverErrors.receiving_store_id &&
                    !Object.keys(serverErrors).some(k => k.startsWith('items_received.')) && // No item-specific errors displayed
                    (serverErrors.message || Object.keys(serverErrors).length > 0) // General message or other unhandled errors
                ) {
                    showAlert(serverErrors.message || "Failed to record goods receipt. Please review inputs.", "Receive Failed", "error");
                }
            },
            onFinish: () => {
                // This runs after success or error.
                // Modal isLoading is tied to form `processing` state, which Inertia handles.
                // If modal has its own isLoading, ensure it's reset.
                setReceiveModal(prev => ({ ...prev, isLoading: false }));
            }
        });
    };

    const isPOReceivedOrBeyond = parseInt(purchase.stage, 10) >= 4;
    const canReceiveGoods = !isPOReceivedOrBeyond && parseInt(purchase.stage, 10) === 3; // Only if "Dispatched"

    return (
        <AuthenticatedLayout user={auth.user} header={ <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight"> Receive Purchase Order #{purchase.purchase_order_number || purchase.id} <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full ${ parseInt(purchase.stage,10) === 3 ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : parseInt(purchase.stage,10) === 4 ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : parseInt(purchase.stage,10) === 5 ? 'bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' }`}> {getPurchaseStageLabel(purchase.stage)} </span> </h2> } >
            <Head title={`Receive PO #${purchase.purchase_order_number || purchase.id}`} />
            <div className="py-8">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <div className="p-6 space-y-8">

                            {isPOReceivedOrBeyond && (
                                <div className={`p-4 mb-4 text-sm rounded-lg ${parseInt(purchase.stage,10) >= 4 ? 'text-green-700 bg-green-100 dark:bg-green-700 dark:text-green-100' : ''}`} role="alert">
                                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2"/>
                                    This Purchase Order has been marked as '{getPurchaseStageLabel(purchase.stage)}'.
                                    {purchase.receiving_store?.name && <p className="mt-1 text-xs">Received at Store: {purchase.receiving_store.name}</p>}
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
                                                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-40">Quantity to Receive</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                {receivedItemsUI.map((item, index) => {
                                                    const remainingToReceive = Math.max(0, item.quantity_ordered - item.quantity_previously_received);
                                                    return (
                                                        <tr key={item.id || `item-${item.item_id}-${index}`}>
                                                            <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">
                                                                {item.item_name}                                                                
                                                            </td>
                                                            <td className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-300">{item.quantity_ordered.toLocaleString()}</td>
                                                            <td className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-300">{item.quantity_previously_received.toLocaleString()}</td>
                                                            <td className="px-3 py-4 text-sm">
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity_to_receive}
                                                                    onChange={e => handleItemQuantityChange(index, e.target.value)}
                                                                    min="0"
                                                                    max={remainingToReceive.toString()}
                                                                    className={`block w-full text-center rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${item.error || errors[`items_received.${index}.quantity_received`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                                    disabled={!canReceiveGoods || processing || remainingToReceive === 0}
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
                                <Link href={route('procurements1.index')} className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={processing}> <FontAwesomeIcon icon={faTimesCircle} className="mr-2 -ml-1 h-5 w-5" /> Close </Link>
                                {canReceiveGoods && (
                                    <button type="button" onClick={openReceiveModal} disabled={processing} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50" > <FontAwesomeIcon icon={faBoxOpen} className="mr-2 -ml-1 h-5 w-5" /> {processing ? 'Processing...' : 'Receive Goods'} </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal(p => ({...p, isOpen: false}))} title={alertModal.title} message={alertModal.message} type={alertModal.type} isAlert={true}/>

            <Modal
                isOpen={receiveModal.isOpen}
                onClose={closeReceiveModal} // Uses the new closeReceiveModal which checks `processing`
                onConfirm={handleReceiveConfirm}
                title="Confirm Goods Receipt"
                confirmButtonText={processing ? 'Processing...' : 'Confirm Receipt'} // Use `processing` from useForm
                confirmButtonDisabled={processing} // Use `processing` from useForm
                type="info"
                processing={processing} // Pass `processing` to Modal if it uses it internally
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Confirm quantities received and provide any relevant details for this receipt.</p>
                    <div className="max-h-40 overflow-y-auto border dark:border-gray-600 rounded-md p-3 my-2 space-y-1 bg-gray-50 dark:bg-gray-700/30">
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Summary of Items Being Received:</h4>
                        {receivedItemsUI.filter(item => { const q = parseFloat(item.quantity_to_receive); return !isNaN(q) && q > 0;}).length > 0 ?
                            receivedItemsUI.filter(item => { const q = parseFloat(item.quantity_to_receive); return !isNaN(q) && q > 0;}).map(item => (
                                <div key={`summary-${item.id || `item-${item.item_id}`}`} className="text-xs text-gray-800 dark:text-gray-200">
                                    - {item.item_name}: <span className="font-medium">{parseFloat(item.quantity_to_receive).toLocaleString()}</span>
                                </div>
                            )) : <p className="text-xs text-gray-500 dark:text-gray-400">No quantities currently entered to receive.</p>
                        }
                    </div>

                    {stores && stores.length > 0 && (
                        <div>
                            <label htmlFor="receiving_store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                <FontAwesomeIcon icon={faStore} className="mr-1" /> Receiving Store <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="receiving_store_id"
                                name="receiving_store_id"
                                value={data.receiving_store_id}
                                onChange={e => {
                                    setData('receiving_store_id', e.target.value);
                                    setReceiveModal(p => ({ ...p, receivingStoreError: '' })); // Clear local modal error
                                    if (errors.receiving_store_id) clearErrors('receiving_store_id'); // Clear Inertia error
                                }}
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${receiveModal.receivingStoreError || errors.receiving_store_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                disabled={processing} // Use `processing` from useForm
                            >
                                <option value="">-- Select a Store --</option>
                                {stores.map(store => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                            {/* Display local modal error first, then Inertia error */}
                            {receiveModal.receivingStoreError && <p className="text-xs text-red-500 mt-1">{receiveModal.receivingStoreError}</p>}
                            <InputError message={!receiveModal.receivingStoreError ? errors.receiving_store_id : ''} className="mt-1"/>
                        </div>
                    )}
                    {(!stores || stores.length === 0) && ( // Simplified condition
                        <div className="p-3 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-700 dark:text-yellow-100">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2"/>
                            No stores available. Please configure stores first.
                        </div>
                    )}


                    <div>
                        <label htmlFor="grn_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goods Received Note (GRN) # (Optional)</label>
                        <input type="text" id="grn_number" value={data.grn_number} onChange={e => {setData('grn_number', e.target.value); setReceiveModal(p=>({...p, grnNumberError:''})); if(errors.grn_number) clearErrors('grn_number'); }} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${receiveModal.grnNumberError || errors.grn_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={processing} />
                        {receiveModal.grnNumberError && <p className="text-xs text-red-500 mt-1">{receiveModal.grnNumberError}</p>}
                        <InputError message={!receiveModal.grnNumberError ? errors.grn_number : ''} className="mt-1"/>
                    </div>
                    <div>
                        <label htmlFor="receive_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receiving Remarks (Optional)</label>
                        <textarea id="receive_remarks" rows="3" value={data.receive_remarks} onChange={e => {setData('receive_remarks', e.target.value); setReceiveModal(p=>({...p, receiveRemarksError:''})); if(errors.receive_remarks || errors.remarks) clearErrors('receive_remarks', 'remarks');}} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${receiveModal.receiveRemarksError || errors.receive_remarks || errors.remarks ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={processing} />
                        {receiveModal.receiveRemarksError && <p className="text-xs text-red-500 mt-1">{receiveModal.receiveRemarksError}</p>}
                        <InputError message={!receiveModal.receiveRemarksError ? (errors.receive_remarks || errors.remarks) : ''} className="mt-1"/>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}