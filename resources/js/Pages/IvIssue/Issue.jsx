import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm , Link} from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faArrowLeft, faCheck, faTrash} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css'; // Corrected import
import Modal from '../../Components/CustomModal.jsx';

export default function Issue({ requistion,fromstore,tostore }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        from_store_name: requistion.fromstore?.name || '',
        from_store_id: requistion.fromstore_id || null,
        to_store_name: requistion.tostore?.name || '',
        to_store_id: requistion.tostore_id || null,
        tostore_type: requistion.tostore_type || '',
        total: requistion.total,
        stage: requistion.stage,
        delivery_no:null,
        expiry_date : null,
        double_entry: true,
        remarks: '',        
        requistionitems: requistion.requistionitems || [],
    });

    const [requistionItems, setRequistionItems] = useState(() => {
        return data.requistionitems.map(item => ({
            item_name: item.item_name || item.item?.name || '',
            item_id: item.item_id || item.item?.id || null,
            quantity: item.quantity || 1,
            price: item.price || 0,
            item: item.item || null,
        }));
    });
   

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });

    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submitModalLoading, setSubmitModalLoading] = useState(false);
    const [submitModalSuccess, setSubmitModalSuccess] = useState(false);

    
    useEffect(() => {
        setData('requistionitems', requistionItems);
        const calculatedTotal = requistionItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
    }, [requistionItems, setData]);

    useEffect(() => {
        // This useEffect is designed to only run when data.requistionitems changes in identity
        // not on every render, to prevent infinite loops.
        const newItemList = data.requistionitems.map(item => ({
            item_name: item.item_name || item.item?.name || '',
            item_id: item.item_id || item.item?.id || null,
            quantity: item.quantity || 1,
            price: item.price || 0,
            item: item.item || null,
        }));

        // Use a simple equality check to prevent unnecessary state updates
        const areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

        if (!areEqual(requistionItems, newItemList)) {
            setRequistionItems(newItemList);
        }
    }, [data.requistionitems]);
     
    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = requistionItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex);
            setRequistionItems(updatedItems);
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

        const hasEmptyFields = requistionItems.some((item) => {
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
            showAlert('Please ensure all requistion items have valid item names, quantities, prices, and item IDs.');
            return;
        }

        setIsSaving(true);

        put(route('inventory1.update', requistion.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false)
                showAlert('An error occurred while saving the requistion. Please check the console for details.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setRequistionItems([]);
        showAlert('Requistion updated successfully!');
    };

   
    const handleSubmitClick = () => {
        if (data.requistionitems.length === 0) {
            showAlert('Please add at least one guarantor before submitting.');
            return;
        }       

        setSubmitModalOpen(true);       
        setSubmitModalLoading(false); // Reset loading state
        setSubmitModalSuccess(false); // Reset success state
    };

    
    const handleSubmitModalClose = () => {
        setSubmitModalOpen(false);        
        setSubmitModalLoading(false); // Reset loading state
        setSubmitModalSuccess(false); // Reset success state
    };

    const handleSubmitModalConfirm = () => {        
    
        const formData = new FormData();
        formData.append('remarks', data.remarks);
    
        setSubmitModalLoading(true); // Set loading state
    
        put(route('inventory1.update', requistion.id), formData, {
            forceFormData: true,
            onSuccess: () => {
                setSubmitModalLoading(false);
                reset(); // Reset form data
                setSubmitModalSuccess(true); // Set success state
                handleSubmitModalClose(); // Close the modal on success
            },
            onError: (errors) => {
                setSubmitModalLoading(false);
                console.error('Submission errors:', errors);
            },
        });
    };
   

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Goods Issuance</h2>}
        >
            <Head title="Goods Issuance" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* From Store Name and To Store Name */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1">
                                    <label htmlFor="from_store_name" className="block text-sm font-medium text-gray-700">
                                        From Store
                                    </label>
                                    
                                    <select
                                        id="from_store_id"
                                        value={data.from_store_id}
                                        onChange={(e) => setData("from_store_id", e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.from_store_id ? "border-red-500" : ""}`}
                                    >
                                        <option value="">Select From Store...</option>
                                        {fromstore.map(store => (
                                            <option key={store.id} value={store.id}>
                                                {store.name} 
                                            </option>
                                        ))}
                                    </select>
                                {errors.from_store_id && <p className="text-sm text-red-600 mt-1">{errors.from_store_id}</p>}

                                </div>

                                <div className="relative flex-1">
                                    <label htmlFor="to_store_name" className="block text-sm font-medium text-gray-700">
                                        To Store
                                    </label>

                                    <select
                                        id="to_store_id"
                                        value={data.to_store_id}
                                        onChange={(e) => setData("to_store_id", e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.to_store_id ? "border-red-500" : ""}`}
                                    >
                                        <option value="">Select To Store...</option>
                                        {tostore.map(store => (
                                            <option key={store.id} value={store.id}>
                                                {store.name} 
                                            </option>
                                        ))}
                                    </select>

                                    {errors.to_store_id && <p className="text-sm text-red-600 mt-1">{errors.to_store_id}</p>}
                                    
                                </div>
                            </div>

                            {/* Requistion Summary and Stage*/}
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
                                
                            </div>                           

                            {/* Requistion Items Table */}
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
                                        {requistionItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item_name || (item.item ? item.item.name : 'Unknown Item')}
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
                                    </tbody>
                                </table>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end space-x-4 mt-6">                                
                                <Link
                                    href={route('inventory1.index')}  // Using the route for navigation
                                    method="get"  // Optional, if you want to define the HTTP method (GET is default)
                                    preserveState={true}  // Keep the page state (similar to `preserveState: true` in the button)
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </Link>

                                <Link
                                    href={route('inventory1.return', requistion.id)}
                                    className="bg-blue-300 text-blue-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                    <span>Return</span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleSubmitClick}
                                    className="bg-green-500 text-white rounded p-2 flex items-center space-x-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                >
                                    <FontAwesomeIcon icon={faCheck} />
                                    <span>Issue</span>
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

             {/* Submit Confirmation Modal */}
             <Modal
                isOpen={submitModalOpen}
                onClose={handleSubmitModalClose}
                onConfirm={handleSubmitModalConfirm}
                title="Issuance Confirmation"
                confirmButtonText={submitModalLoading ? 'Loading...' : (submitModalSuccess ? "Success" : 'Submit')}
                confirmButtonDisabled={submitModalLoading || submitModalSuccess}
            >
                <div>
                    <p>
                        Are you sure you want to issue the goods to <strong>
                            {data.customer_type === 'individual' ? (
                                `${data.first_name} ${data.other_names ? data.other_names + ' ' : ''}${data.surname}`
                            ) : (
                                data.company_name
                            )}
                        </strong>?
                    </p>                    
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}