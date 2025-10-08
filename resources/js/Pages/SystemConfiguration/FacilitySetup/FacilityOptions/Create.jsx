import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Inertia } from '@inertiajs/inertia';
import Modal from '@/Components/CustomModal';
import '@fortawesome/fontawesome-svg-core/styles.css';

export default function Create({ chartOfAccounts, customers }) {
    const { data, setData, post, errors, processing, reset } = useForm({
        name: '',
        chart_of_account_id: '',
        affectstockatcashier: false,
        doubleentryissuing: false,
        allownegativestock: false,
        default_customer_id: '',
    });

    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
    const [isSaving, setIsSaving] = useState(false);

    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });
    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);

        post(route('systemconfiguration5.facilityoptions.store'), {
            onSuccess: () => {
                setIsSaving(false);
                reset();
                showAlert('Facility option created successfully!');
            },
            onError: () => {
                setIsSaving(false);
                showAlert('An error occurred while creating the facility option.');
            },
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Facility Options</h2>}>
            <Head title="New Facility Options" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Name */}
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`}
                                />
                                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                            </div>

                            {/* Chart of Account */}
                            <div>
                                <label htmlFor="chart_of_account_id" className="block text-sm font-medium text-gray-700">Chart of Account</label>
                                <select
                                    id="chart_of_account_id"
                                    value={data.chart_of_account_id}
                                    onChange={(e) => setData('chart_of_account_id', e.target.value)}
                                    className={`w-full border p-2 rounded text-sm ${errors.chart_of_account_id ? 'border-red-500' : ''}`}
                                >
                                    <option value="">-- Select Chart of Account --</option>
                                    {chartOfAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.account_name} ({account.account_code})
                                        </option>
                                    ))}
                                </select>
                                {errors.chart_of_account_id && <p className="text-sm text-red-600 mt-1">{errors.chart_of_account_id}</p>}
                            </div>

                            {/* Default Customer */}
                            <div>
                                <label htmlFor="default_customer_id" className="block text-sm font-medium text-gray-700">Default Customer</label>
                                <select
                                    id="default_customer_id"
                                    value={data.default_customer_id}
                                    onChange={(e) => setData('default_customer_id', e.target.value)}
                                    className={`w-full border p-2 rounded text-sm ${errors.default_customer_id ? 'border-red-500' : ''}`}
                                >
                                    <option value="">-- Select Customer --</option>
                                    {customers.map((customer) => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.display_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.default_customer_id && <p className="text-sm text-red-600 mt-1">{errors.default_customer_id}</p>}
                            </div>

                            {/* Booleans */}
                            <div className="flex flex-col space-y-2">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.affectstockatcashier}
                                        onChange={(e) => setData('affectstockatcashier', e.target.checked)}
                                        className="mr-2"
                                    />
                                    Affect Stock at Cashier
                                </label>

                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.doubleentryissuing}
                                        onChange={(e) => setData('doubleentryissuing', e.target.checked)}
                                        className="mr-2"
                                    />
                                    Double Entry Issuing
                                </label>

                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.allownegativestock}
                                        onChange={(e) => setData('allownegativestock', e.target.checked)}
                                        className="mr-2"
                                    />
                                    Allow Negative Stock
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('systemconfiguration5.facilityoptions.index'))}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Close</span>
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

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                title="Alert"
                message={modalState.message}
                isAlert
            />
        </AuthenticatedLayout>
    );
}
