import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
import Modal from '@/Components/CustomModal';

export default function Create() {
    const { data, setData, post, errors, processing, reset } = useForm({
        name: '',  
        preventoverpay: false,
        ischeque: false,
        allowrefund: false,
        visibilitysales: false,
        visibilitydebtorpayments: false,
        paymentreference: false,
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false });
    };

    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message,
            isAlert: true,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        setIsSaving(true);
        post(route('systemconfiguration0.paymenttypes.store'), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (error) => {
                console.error(error);
                setIsSaving(false);
                showAlert('An error occurred while saving the paymenttype.');
            },
        });
    };

    const resetForm = () => {
        reset();
        showAlert('Paymenttype created successfully!');
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Payment Type</h2>}
        >
            <Head title="New Payment Type" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">  
                                
                                {/* Name Textbox */}
                                <div className="relative flex-1">
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mr-2">
                                        Name
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        placeholder="Enter name..."
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`}
                                    />
                                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                                </div>                                                          

                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">                              
                                
                                <div className="relative flex-1 flex items-center">
                                    <input
                                        id="preventoverpay"
                                        type="checkbox"
                                        checked={data.preventoverpay}
                                        onChange={(e) => setData('preventoverpay', e.target.checked)}
                                    />
                                    <label htmlFor="preventoverpay" className="ml-2 text-sm font-medium text-gray-700">Prevent Overpay</label>
                                </div>

                                <div className="relative flex-1 flex items-center">
                                    <input
                                        id="ischeque"
                                        type="checkbox"
                                        checked={data.ischeque}
                                        onChange={(e) => setData('ischeque', e.target.checked)}
                                    />
                                    <label htmlFor="ischeque" className="ml-2 text-sm font-medium text-gray-700">Is Cheque</label>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">                              
                                
                                <div className="relative flex-1 flex items-center">
                                    <input
                                        id="allowrefund"
                                        type="checkbox"
                                        checked={data.allowrefund}
                                        onChange={(e) => setData('allowrefund', e.target.checked)}
                                    />
                                    <label htmlFor="allowrefund" className="ml-2 text-sm font-medium text-gray-700">Allow Refund</label>
                                </div>

                                <div className="relative flex-1 flex items-center">
                                    <input
                                        id="visibilitysales"
                                        type="checkbox"
                                        checked={data.visibilitysales}
                                        onChange={(e) => setData('visibilitysales', e.target.checked)}
                                    />
                                    <label htmlFor="visibilitysales" className="ml-2 text-sm font-medium text-gray-700">Visibility Sales</label>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">                              
                                
                                <div className="relative flex-1 flex items-center">
                                    <input
                                        id="visibilitydebtorpayments"
                                        type="checkbox"
                                        checked={data.visibilitydebtorpayments}
                                        onChange={(e) => setData('visibilitydebtorpayments', e.target.checked)}
                                    />
                                    <label htmlFor="visibilitydebtorpayments" className="ml-2 text-sm font-medium text-gray-700">Visibility Debtor Payments</label>
                                </div>

                                <div className="relative flex-1 flex items-center">
                                    <input
                                        id="paymentreference"
                                        type="checkbox"
                                        checked={data.paymentreference}
                                        onChange={(e) => setData('paymentreference', e.target.checked)}
                                    />
                                    <label htmlFor="paymentreference" className="ml-2 text-sm font-medium text-gray-700">Payment Reference</label>
                                </div>
                            </div>                                                    

                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('systemconfiguration0.paymenttypes.index'))}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || isSaving}
                                    className="bg-blue-600 text-white rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Alert Modal */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}
