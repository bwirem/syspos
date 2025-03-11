import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';
import Modal from '@/Components/CustomModal';

export default function Edit({ user }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        name: user.name,
        price1: user.price1,
        price2: user.price2,
        price3: user.price3,
        price4: user.price4,
        defaultqty: user.defaultqty,
        addtocart: user.addtocart,
        usergroup_id: user.usergroup_id,
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [userGroups, setUserGroups] = useState([]);

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false });
    };

    const showAlert = (message) => {
        setModalState({ isOpen: true, message, isAlert: true });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        put(route('usermanagement.users.update', user.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the user.');
            },
        });
    };

    const resetForm = () => {
        reset();
        showAlert('User updated successfully!');
    };

    useEffect(() => {
        const fetchUserGroups = async () => {
            try {
                const response = await axios.get(route('usermanagement.usergroups.search'));
                setUserGroups(response.data.groups);
            } catch (error) {
                console.error('Error fetching user groups:', error);
                showAlert('Failed to fetch user groups.');
            }
        };

        fetchUserGroups();
    }, []);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit User</h2>}
        >
            <Head title="Edit User" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                           
                            {/* Name and User Group */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`} placeholder="Enter name..." />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">User Group</label>
                                    <select value={data.usergroup_id} onChange={(e) => setData('usergroup_id', e.target.value)} className="w-full border p-2 rounded text-sm">
                                        <option value="">Select User Group</option>
                                        {userGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                                    </select>
                                    {errors.usergroup_id && <p className="text-sm text-red-600">{errors.usergroup_id}</p>}
                                </div>
                            </div>

                             {/* Prices */}
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {["price1", "price2", "price3", "price4"].map((price, index) => (
                                    <div key={index}>
                                        <label className="block text-sm font-medium text-gray-700">Price {index + 1}</label>
                                        <input type="number" value={data[price]} onChange={(e) => setData(price, e.target.value)} className={`w-full border p-2 rounded text-sm ${errors[price] ? 'border-red-500' : ''}`} placeholder="Enter price..." />
                                        {errors[price] && <p className="text-sm text-red-600">{errors[price]}</p>}
                                    </div>
                                ))}                               
                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4"> 
                                <div className="relative flex-1">
                                    <label htmlFor="defaultqty" className="block text-sm font-medium text-gray-700">Default Quantity</label>
                                    <input
                                        id="defaultqty"
                                        type="number"
                                        placeholder="Enter quantity..."
                                        value={data.defaultqty}
                                        onChange={(e) => setData('defaultqty', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.defaultqty ? 'border-red-500' : ''}`}
                                    />
                                    {errors.defaultqty && <p className="text-sm text-red-600 mt-1">{errors.defaultqty}</p>}
                                </div>

                                <div className="relative flex-1">
                                    <label htmlFor="addtocart" className="block text-sm font-medium text-gray-700">Add to Cart</label>
                                    <input
                                        id="addtocart"
                                        type="checkbox"
                                        checked={data.addtocart}
                                        onChange={(e) => setData('addtocart', e.target.checked)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('usermanagement.users.index'))}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex users-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || isSaving}
                                    className="bg-blue-600 text-white rounded p-2 flex users-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save User'}</span>
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
