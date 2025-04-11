import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '@/Components/CustomModal';

export default function Create({ accountTypeLabels }) { // Accept accountTypeLabels as a prop
    const { data, setData, post, errors, processing, reset } = useForm({
        account_name: '', // Changed from name to account_name
        account_code: '',
        account_type: '',
        description: '',
        is_active: true, // Default to active
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
        post(route('systemconfiguration3.chartofaccounts.store'), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (error) => {
                console.error(error);
                setIsSaving(false);
                showAlert('An error occurred while saving the chart of account.');
            },
        });
    };

    const resetForm = () => {
        reset();
        showAlert('Chart of account created successfully!');
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Account</h2>}
        >
            <Head title="New Account" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">  
                                
                                {/* Account Name Textbox */}
                                <div className="relative flex-1">
                                    <label htmlFor="account_name" className="block text-sm font-medium text-gray-700 mr-2">
                                        Account Name
                                    </label>
                                    <input
                                        id="account_name"
                                        type="text"
                                        placeholder="Enter account name..."
                                        value={data.account_name} // Updated to account_name
                                        onChange={(e) => setData('account_name', e.target.value)} // Updated to account_name
                                        className={`w-full border p-2 rounded text-sm ${errors.account_name ? 'border-red-500' : ''}`}
                                    />
                                    {errors.account_name && <p className="text-sm text-red-600 mt-1">{errors.account_name}</p>} {/* Updated to account_name */}
                                </div>

                                {/* Account Code Textbox */}
                                <div className="relative flex-1">
                                    <label htmlFor="account_code" className="block text-sm font-medium text-gray-700 mr-2">
                                        Account Code
                                    </label>
                                    <input
                                        id="account_code"
                                        type="text"
                                        placeholder="Enter account code..."
                                        value={data.account_code}
                                        onChange={(e) => setData('account_code', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.account_code ? 'border-red-500' : ''}`}
                                    />
                                    {errors.account_code && <p className="text-sm text-red-600 mt-1">{errors.account_code}</p>}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                {/* Account Type Dropdown */}
                                <div className="relative flex-1">
                                    <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mr-2">
                                        Account Type
                                    </label>
                                    <select
                                        id="account_type"
                                        value={data.account_type}
                                        onChange={(e) => setData('account_type', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.account_type ? 'border-red-500' : ''}`}
                                    >
                                        <option value="">Select account type...</option>
                                        {Object.entries(accountTypeLabels).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.account_type && <p className="text-sm text-red-600 mt-1">{errors.account_type}</p>}
                                </div>

                                {/* Description Textbox */}
                                <div className="relative flex-1">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mr-2">
                                        Description
                                    </label>
                                    <input
                                        id="description"
                                        type="text"
                                        placeholder="Enter description..."
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.description ? 'border-red-500' : ''}`}
                                    />
                                    {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                                </div>
                            </div>

                            {/* Active Checkbox */}
                            <div className="flex items-center space-x-2">
                                <input
                                    id="is_active"
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                    Active
                                </label>
                            </div>

                            <div className="flex justify-end space-x-4 mt-6">                                
                                <Link
                                    href={route('systemconfiguration3.chartofaccounts.index')}  // Using the route for navigation
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

            {/* Alert Modal */}
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

