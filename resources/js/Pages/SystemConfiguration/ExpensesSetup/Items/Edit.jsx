import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';
import Modal from '@/Components/CustomModal';

export default function Edit({ item }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        name: item.name,
        itemgroup_id: item.itemgroup_id,
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [itemGroups, setItemGroups] = useState([]);

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false });
    };

    const showAlert = (message) => {
        setModalState({ isOpen: true, message, isAlert: true });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        put(route('systemconfiguration1.items.update', item.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the item.');
            },
        });
    };

    const resetForm = () => {
        reset();
        showAlert('Item updated successfully!');
    };

    useEffect(() => {
        const fetchItemGroups = async () => {
            try {
                const response = await axios.get(route('systemconfiguration1.itemgroups.search'));
                setItemGroups(response.data.groups);
            } catch (error) {
                console.error('Error fetching item groups:', error);
                showAlert('Failed to fetch item groups.');
            }
        };

        fetchItemGroups();
    }, []);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Expense</h2>}
        >
            <Head title="Edit Expense" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                           
                            {/* Name and Item Group */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`} placeholder="Enter name..." />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Item Group</label>
                                    <select value={data.itemgroup_id} onChange={(e) => setData('itemgroup_id', e.target.value)} className="w-full border p-2 rounded text-sm">
                                        <option value="">Select Item Group</option>
                                        {itemGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                                    </select>
                                    {errors.itemgroup_id && <p className="text-sm text-red-600">{errors.itemgroup_id}</p>}
                                </div>
                            </div>
                           

                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('systemconfiguration1.items.index'))}
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
                                    <span>{isSaving ? 'Saving...' : 'Save Item'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

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
