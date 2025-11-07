import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimesCircle,
    faEye,
    faCheckCircle,
    faInfoCircle,
    faListUl,
    faFilePdf,
    faFileWord,
    faFileAlt,
    faBoxOpen,
    faExclamationTriangle,
    faStore,
    faFileInvoice,
    faTruckLoading,
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
    const { data, setData, processing, errors, clearErrors } = useForm({
        receive_remarks: '',
        grn_number: '',
        receiving_store_id: (stores && stores.length > 0) ? stores[0].id : '',
        stage: purchase.stage,
        _method: 'PUT',
        delivery_note_file: null, // For delivery note upload
        invoice_file: null,       // For invoice upload
    });

    // Refs for file inputs to allow for programmatic clearing
    const deliveryNoteRef = useRef(null);
    const invoiceFileRef = useRef(null);

    const [receivedItemsUI, setReceivedItemsUI] = useState([]);
    const [receiveModal, setReceiveModal] = useState({
        isOpen: false, isLoading: false,
        remarksError: '', grnNumberError: '', receivingStoreError: ''
    });
    const [alertModal, setAlertModal] = useState({
        isOpen: false, title: '', message: '', type: 'info'
    });

    // Initialize/Update receivedItemsUI when purchase or its items change
    useEffect(() => {
        setReceivedItemsUI(
            (purchase.purchaseitems || []).map(item => ({
                id: item.id,
                item_id: item.item_id || item.item?.id,
                item_name: item.item_name || item.item?.name || 'N/A',
                quantity_ordered: parseFloat(item.quantity || 0),
                quantity_previously_received: parseFloat(item.quantity_received_total || 0),
                quantity_to_receive: Math.max(0, (parseFloat(item.quantity || 0)) - (parseFloat(item.quantity_received_total || 0))),
                price: parseFloat(item.price || 0),
                error: null,
            }))
        );
    }, [purchase]);

    // Handle flash messages
    useEffect(() => {
        if (flash?.success) showAlert(flash.success, 'Success', 'success');
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);

    // Sync form stage with purchase stage if purchase prop changes
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
        const maxReceivable = item.quantity_ordered - item.quantity_previously_received;

        let qtyToReceiveInput = value.trim() === '' ? 0 : parseFloat(value);
        if (isNaN(qtyToReceiveInput) || qtyToReceiveInput < 0) qtyToReceiveInput = 0;

        let itemError = null;
        if (qtyToReceiveInput > maxReceivable) {
            itemError = `Max: ${maxReceivable.toLocaleString()}.`;
            qtyToReceiveInput = maxReceivable;
        }

        newItems[index].quantity_to_receive = qtyToReceiveInput;
        newItems[index].error = itemError;
        setReceivedItemsUI(newItems);

        if(errors[`items_received.${index}.quantity_received`]) clearErrors(`items_received.${index}.quantity_received`);
    };

    const openReceiveModal = (e) => {
        e.preventDefault();
        clearErrors();
        setData(prev => ({
            ...prev,
            receive_remarks: '',
            grn_number: '',
            receiving_store_id: prev.receiving_store_id || ((stores && stores.length > 0) ? stores[0].id : ''),
            delivery_note_file: null,
            invoice_file: null,
        }));
        if(deliveryNoteRef.current) deliveryNoteRef.current.value = "";
        if(invoiceFileRef.current) invoiceFileRef.current.value = "";
        setReceiveModal({ isOpen: true, isLoading: false, remarksError: '', grnNumberError: '', receivingStoreError: '' });
    };

    const closeReceiveModal = () => {
        if (processing) return;
        setReceiveModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleReceiveConfirm = () => {
        const itemsToSubmit = receivedItemsUI
            .filter(item => parseFloat(item.quantity_to_receive) > 0)
            .map(item => ({
                purchase_item_id: item.id,
                quantity_received: parseFloat(item.quantity_to_receive),
            }));

        if (itemsToSubmit.length === 0) {
            showAlert("No items have a valid quantity greater than zero to receive.", "No Items to Receive", "warning");
            return;
        }

        if (stores && stores.length > 0 && !data.receiving_store_id) {
            setReceiveModal(prev => ({ ...prev, receivingStoreError: 'Please select a receiving store.' }));
            return;
        }

        const finalPayload = {
            ...data,
            stage: 4,
            items_received: itemsToSubmit,
        };

        router.post(route('procurements1.receive', purchase.id), finalPayload, {
            preserveScroll: true,
            onSuccess: () => closeReceiveModal(),
            onError: (serverErrors) => {
                setReceiveModal(prev => ({
                    ...prev,
                    isLoading: false,
                    remarksError: serverErrors.receive_remarks || '',
                    grnNumberError: serverErrors.grn_number || '',
                    receivingStoreError: serverErrors.receiving_store_id || '',
                }));
            },
            onFinish: () => setReceiveModal(prev => ({ ...prev, isLoading: false })),
        });
    };

    const isPOReceivedOrBeyond = parseInt(purchase.stage, 10) >= 4;
    const canReceiveGoods = !isPOReceivedOrBeyond && parseInt(purchase.stage, 10) === 3;

    return (
        <AuthenticatedLayout user={auth.user} header={ <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight"> Receive Purchase Order #{purchase.purchase_order_number || purchase.id} <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full ${ parseInt(purchase.stage,10) === 3 ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' : parseInt(purchase.stage,10) >= 4 ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' }`}> {getPurchaseStageLabel(purchase.stage)} </span> </h2> } >
            <Head title={`Receive PO #${purchase.purchase_order_number || purchase.id}`} />
            <div className="py-8">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <div className="p-6 space-y-8">

                            {isPOReceivedOrBeyond && (
                                <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-700 dark:text-green-100" role="alert">
                                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2"/>
                                    This Purchase Order has been marked as '{getPurchaseStageLabel(purchase.stage)}'.
                                </div>
                            )}

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div><strong className="text-gray-600 dark:text-gray-400">Supplier:</strong> <span className="text-gray-800 dark:text-gray-200">{getSupplierDisplayName(purchase.supplier)}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">Facility:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.facilityoption?.name || 'N/A'}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">PO Date:</strong> <span className="text-gray-800 dark:text-gray-200">{new Date(purchase.created_at).toLocaleDateString()}</span></div>
                                    <div><strong className="text-gray-600 dark:text-gray-400">PO Number:</strong> <span className="text-gray-800 dark:text-gray-200">{purchase.purchase_order_number || `PO-${purchase.id}`}</span></div>
                                    {purchase.recipient_name && <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Dispatched To:</strong> <p className="text-gray-800 dark:text-gray-200">{purchase.recipient_name} ({purchase.recipient_contact || 'N/A'})</p></div>}
                                    {purchase.filename && ( <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Attachment:</strong> <a href={`/storage/${purchase.url}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center"> <FontAwesomeIcon icon={getFileIcon(purchase.filename)} className="mr-1" /> {purchase.filename} </a> </div> )}
                                    {purchase.dispatch_document_filename && ( <div className="md:col-span-2"><strong className="text-gray-600 dark:text-gray-400">Dispatch Note:</strong> <a href={`/storage/${purchase.dispatch_document_url}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center"> <FontAwesomeIcon icon={getFileIcon(purchase.dispatch_document_filename)} className="mr-1" /> {purchase.dispatch_document_filename} </a> </div> )}
                                </div>
                            </section>

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3"> <FontAwesomeIcon icon={faListUl} className="mr-2" /> Items to Receive </h3>
                                <div className="overflow-x-auto shadow ring-1 ring-black dark:ring-gray-700 ring-opacity-5 sm:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Item Name</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Ordered</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Prev. Received</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 w-40">Quantity to Receive</th></tr></thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                            {receivedItemsUI.map((item, index) => {
                                                const remainingToReceive = item.quantity_ordered - item.quantity_previously_received;
                                                return (<tr key={item.id}><td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">{item.item_name}</td><td className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-300">{item.quantity_ordered.toLocaleString()}</td><td className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-300">{item.quantity_previously_received.toLocaleString()}</td><td className="px-3 py-4 text-sm"><input type="number" value={item.quantity_to_receive} onChange={e => handleItemQuantityChange(index, e.target.value)} min="0" max={remainingToReceive} className={`block w-full text-center rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${item.error || errors[`items_received.${index}.quantity_received`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={!canReceiveGoods || processing || remainingToReceive <= 0} /><InputError message={errors[`items_received.${index}.quantity_received`] || item.error} className="mt-1 text-xs"/></td></tr>);
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
                                <Link href={route('procurements1.index')} className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600" disabled={processing}> <FontAwesomeIcon icon={faTimesCircle} className="mr-2 -ml-1 h-5 w-5" /> Close </Link>
                                {canReceiveGoods && (
                                    <button type="button" onClick={openReceiveModal} disabled={processing} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"> <FontAwesomeIcon icon={faBoxOpen} className="mr-2 -ml-1 h-5 w-5" /> {processing ? 'Processing...' : 'Receive Goods'} </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal(p => ({...p, isOpen: false}))} title={alertModal.title} message={alertModal.message} type={alertModal.type} isAlert={true}/>

            <Modal isOpen={receiveModal.isOpen} onClose={closeReceiveModal} onConfirm={handleReceiveConfirm} title="Confirm Goods Receipt" confirmButtonText={processing ? 'Processing...' : 'Confirm Receipt'} confirmButtonDisabled={processing} type="info" processing={processing}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Confirm quantities and provide details for this receipt.</p>
                    
                    {stores?.length > 0 ? (
                        <div>
                            <label htmlFor="receiving_store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300"><FontAwesomeIcon icon={faStore} className="mr-1" /> Receiving Store <span className="text-red-500">*</span></label>
                            <select id="receiving_store_id" value={data.receiving_store_id} onChange={e => setData('receiving_store_id', e.target.value)} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors.receiving_store_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={processing}>
                                <option value="">-- Select a Store --</option>
                                {stores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}
                            </select>
                            <InputError message={receiveModal.receivingStoreError || errors.receiving_store_id} className="mt-1"/>
                        </div>
                    ) : ( <div className="p-3 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-700 dark:text-yellow-100"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-2"/>No stores found. Please configure stores first.</div> )}

                    <div>
                        <label htmlFor="grn_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goods Received Note (GRN) # (Optional)</label>
                        <input type="text" id="grn_number" value={data.grn_number} onChange={e => setData('grn_number', e.target.value)} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors.grn_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={processing} />
                        <InputError message={errors.grn_number} className="mt-1"/>
                    </div>
                    <div>
                        <label htmlFor="receive_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receiving Remarks (Optional)</label>
                        <textarea id="receive_remarks" rows="2" value={data.receive_remarks} onChange={e => setData('receive_remarks', e.target.value)} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 ${errors.receive_remarks ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} disabled={processing} />
                        <InputError message={errors.receive_remarks} className="mt-1"/>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                        <div>
                            <label htmlFor="delivery_note_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300"><FontAwesomeIcon icon={faTruckLoading} className="mr-1" /> Attach Delivery Note (Optional)</label>
                            <input type="file" ref={deliveryNoteRef} id="delivery_note_file" onChange={e => setData('delivery_note_file', e.target.files[0])} className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-gray-600" disabled={processing}/>
                            <InputError message={errors.delivery_note_file} className="mt-1" />
                        </div>
                        <div>
                            <label htmlFor="invoice_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300"><FontAwesomeIcon icon={faFileInvoice} className="mr-1" /> Attach Supplier Invoice (Optional)</label>
                            <input type="file" ref={invoiceFileRef} id="invoice_file" onChange={e => setData('invoice_file', e.target.files[0])} className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-gray-600" disabled={processing}/>
                            <InputError message={errors.invoice_file} className="mt-1" />
                        </div>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}