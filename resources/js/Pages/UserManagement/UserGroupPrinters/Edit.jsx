import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '@/Components/CustomModal';

export default function Edit({ printer, usergroups }) {
    const { data, setData, put, errors, processing } = useForm({
        usergroup_id: printer.usergroup_id || '',
        machinename: printer.machinename || '',
        documenttypecode: printer.documenttypecode || '',
        printername: printer.printername || '',
        autoprint: Boolean(printer.autoprint),
        printtoscreen: Boolean(printer.printtoscreen),
        printedwhen: printer.printedwhen || 1,
    });

    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
    const [isSaving, setIsSaving] = useState(false);

    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        put(route('usermanagement.usergroupprinters.update', printer.id), {
            onSuccess: () => {
                setIsSaving(false);
                showAlert('Printer configuration updated successfully!');
            },
            onError: () => {
                setIsSaving(false);
                showAlert('An error occurred. Please check the fields.');
            },
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Edit Printer Config</h2>}>
            <Head title="Edit Printer Config" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* User Group */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">User Group</label>
                                    <select
                                        value={data.usergroup_id}
                                        onChange={e => setData('usergroup_id', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.usergroup_id ? 'border-red-500' : ''}`}
                                    >
                                        <option value="">Select Group...</option>
                                        {usergroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                    {errors.usergroup_id && <p className="text-sm text-red-600 mt-1">{errors.usergroup_id}</p>}
                                </div>

                                {/* Document Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Document Type</label>
                                    <select
                                        value={data.documenttypecode}
                                        onChange={e => setData('documenttypecode', e.target.value)}
                                        className="w-full border p-2 rounded text-sm"
                                    >
                                        <option value="invoice">Invoice</option>
                                        <option value="receipt">Receipt</option>
                                        <option value="order">Order</option>
                                    </select>
                                </div>

                                {/* Machine Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Machine Name (Hostname)</label>
                                    <input
                                        type="text"
                                        value={data.machinename}
                                        onChange={e => setData('machinename', e.target.value)}
                                        className="w-full border p-2 rounded text-sm"
                                    />
                                </div>

                                {/* Printer Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Windows Printer Name</label>
                                    <input
                                        type="text"
                                        value={data.printername}
                                        onChange={e => setData('printername', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.printername ? 'border-red-500' : ''}`}
                                    />
                                    {errors.printername && <p className="text-sm text-red-600 mt-1">{errors.printername}</p>}
                                </div>
                            </div>

                            <div className="flex space-x-6">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={data.autoprint}
                                        onChange={e => setData('autoprint', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 shadow-sm"
                                    />
                                    <span className="text-sm text-gray-700">Auto Print?</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={data.printtoscreen}
                                        onChange={e => setData('printtoscreen', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 shadow-sm"
                                    />
                                    <span className="text-sm text-gray-700">Print to Screen (Preview)?</span>
                                </label>
                            </div>

                            <div className="flex justify-end space-x-4 mt-6">
                                <Link href={route('usermanagement.usergroupprinters.index')} className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2">
                                    <FontAwesomeIcon icon={faTimesCircle} /> <span>Cancel</span>
                                </Link>
                                <button type="submit" disabled={processing || isSaving} className="bg-blue-600 text-white rounded p-2 flex items-center space-x-2">
                                    <FontAwesomeIcon icon={faSave} /> <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} title="Alert" message={modalState.message} isAlert={true} />
        </AuthenticatedLayout>
    );
}