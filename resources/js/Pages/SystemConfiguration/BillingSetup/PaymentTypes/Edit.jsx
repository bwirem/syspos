import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head,Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '@/Components/CustomModal';

export default function Edit({ paymenttype, chartofaccounts }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        name: paymenttype.name,        
        chart_of_account_id: paymenttype.chart_of_account_id,       
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
        setModalState({ isOpen: true, message, isAlert: true });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        setIsSaving(true);
        put(route('systemconfiguration0.paymenttypes.update', paymenttype.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the paymenttype.');
            },
        });
    };

    const resetForm = () => {
        reset();
        showAlert('Paymenttype updated successfully!');
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Payment Type</h2>}
        >
            <Head title="Edit Payment Type" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                {/* Name Input Box */}
                                <div className="relative flex-1">
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
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

                            {/* Account Dropdown (First Row) */}
                            <div className="flex-1">
                                <label htmlFor="chart_of_account_id" className="block text-sm font-medium text-gray-700">
                                  Account Name
                                </label>
                                <select
                                    id="chart_of_account_id"
                                    value={data.chart_of_account_id}
                                    onChange={(e) => setData("chart_of_account_id", e.target.value)}
                                    className={`w-full border p-2 rounded text-sm ${errors.chart_of_account_id ? "border-red-500" : ""}`}
                                >
                                    <option value="">Select account...</option>
                                    {chartofaccounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.account_name} ({account.description + "-" + account.account_code})
                                        </option>
                                    ))}
                                </select>
                                {errors.chart_of_account_id && <p className="text-sm text-red-600 mt-1">{errors.chart_of_account_id}</p>}
                            </div>     

                            <div className="flex justify-end space-x-4 mt-6">
                                <Link
                                    href={route('systemconfiguration0.paymenttypes.index')}  // Using the route for navigation
                                    method="get"  // Optional, if you want to define the HTTP method (GET is default)
                                    preserveState={true}  // Keep the page state (similar to `preserveState: true` in the button)
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </Link>
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

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalClose}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}
