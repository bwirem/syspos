import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm , Link} from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faMoneyBill, faEye, faTruck } from '@fortawesome/free-solid-svg-icons';
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

export default function Dispatch({ purchase }) {
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
    });

    const [purchaseItems, setPurchaseItems] = useState(data.purchaseitems);

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });

    const [isSaving, setIsSaving] = useState(false);

    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [recipientName, setRecipientName] = useState('');
    const [recipientContact, setRecipientContact] = useState('');

    useEffect(() => {
        setData('purchaseitems', purchaseItems);
        const calculatedTotal = purchaseItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
    }, [purchaseItems, setData]);

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
        setDispatchModalOpen(true);
    };

    const resetForm = () => {
        reset();
        setPurchaseItems([]);
        showAlert('Purchase dispatched successfully!');
    };

    const handleDispatchModalClose = () => {
        setDispatchModalOpen(false);
        setRecipientName('');
        setRecipientContact('');
    };

    const handleDispatchModalConfirm = () => {
        setIsSaving(true);

        put(route('procurements1.dispatch', purchase.id), {
            ...data,
            recipient_name: recipientName, // Pass recipient data
            recipient_contact: recipientContact, // Pass recipient data
            stage: 3, // Set stage to Dispatched
        }, {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
                setDispatchModalOpen(false);
                setRecipientName('');
                setRecipientContact('');
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while dispatching the purchase. Please check the console for details.');
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Dispatch</h2>}
        >
            <Head title="Dispatch" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1">
                                    <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700">
                                        Supplier Name
                                    </label>
                                    <div className="mt-1  text-left font-bold text-gray-800 bg-gray-100 p-2 rounded">
                                        {data.supplier_name}
                                    </div>
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
                                        readOnly
                                        className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                    />
                                </div>

                                {/* File Preview */}
                                <div className="flex-1">
                                    <label htmlFor="filename" className="block text-sm font-medium text-gray-700">
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
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {purchaseItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item ? item.item.name : 'Unknown Item'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {parseFloat(item.quantity).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {parseFloat(item.price).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {parseFloat(item.quantity * item.price).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
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
                                    <FontAwesomeIcon icon={faTruck} />
                                    <span>{isSaving ? 'Dispatching...' : 'Dispatch'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Dispatch Confirmation Modal */}
            <Modal
                isOpen={dispatchModalOpen}
                onClose={handleDispatchModalClose}
                onConfirm={handleDispatchModalConfirm}
                title="Dispatch Confirmation"
                confirmButtonText={isSaving ? 'Dispatching...' : 'Confirm Dispatch'}
                confirmButtonDisabled={isSaving}
            >
                <div>
                    <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700">
                        Recipient Name
                    </label>
                    <input
                        type="text"
                        id="recipientName"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="mt-4">
                    <label htmlFor="recipientContact" className="block text-sm font-medium text-gray-700">
                        Recipient Contact
                    </label>
                    <input
                        type="text"
                        id="recipientContact"
                        value={recipientContact}
                        onChange={(e) => setRecipientContact(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
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

