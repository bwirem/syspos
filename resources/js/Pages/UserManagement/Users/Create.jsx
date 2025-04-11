import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/CustomModal';
import { Head,Link, useForm } from '@inertiajs/react';
import { Inertia } from '@inertiajs/inertia';
import { useState } from 'react';

// Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

export default function Create({ userGroups, stores }) {
    // Form Handling
    const { data, setData, post, errors, processing, reset } = useForm({
        name: '',
        email: '',
        password: '',
        usergroup_id: '',
        store_id: '',
        selectedStores: [], // Track selected stores
    });

     // State Management
     const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
     const [isSaving, setIsSaving] = useState(false);

    // Handlers
    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });
    const handleModalConfirm = () => { setModalState({ isOpen: false, message: '', isAlert: false }); };
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });
    const resetForm = () => { reset(); showAlert('User created successfully!'); };

    
    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);

        // Include selectedStores in the post data
        post(route('usermanagement.users.store'), {
            ...data,
            selectedStores: data.selectedStores,
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: () => {
                setIsSaving(false);
                showAlert('An error occurred while saving the user.');
            },
        });
    };

    const handleStoreChange = (storeId) => {
        const updatedStores = [...data.selectedStores];
        if (updatedStores.includes(storeId)) {
            updatedStores.splice(updatedStores.indexOf(storeId), 1);
        } else {
            updatedStores.push(storeId);
        }
        setData('selectedStores', updatedStores);
    };


    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New User</h2>}>
            <Head title="New User" />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name and Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`}
                                        placeholder="Enter name..."
                                    />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>

                                {/* Email Input */}
                                <div className="relative flex-1">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Enter email..."
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.email ? 'border-red-500' : ''}`}
                                    />
                                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                                </div>
                            </div>

                            {/* Store and Role */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Store</label>
                                    <select
                                        value={data.store_id}
                                        onChange={(e) => setData('store_id', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.store_id ? 'border-red-500' : ''}`}
                                    >
                                        <option value="">Select Store</option>
                                        {Array.isArray(stores) && stores.map(store => (
                                            <option key={store.id} value={store.id}>{store.name}</option>
                                        ))}
                                    </select>
                                    {errors.store_id && <p className="text-sm text-red-600">{errors.store_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role</label>
                                    <select
                                        value={data.usergroup_id}
                                        onChange={(e) => setData('usergroup_id', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.usergroup_id ? 'border-red-500' : ''}`}
                                    >
                                        <option value="">Select Role</option>
                                        {Array.isArray(userGroups) && userGroups.map(group => (
                                            <option key={group.id} value={group.id}>{group.name}</option>
                                        ))}
                                    </select>
                                    {errors.usergroup_id && <p className="text-sm text-red-600">{errors.usergroup_id}</p>}
                                </div>
                            </div>

                            {/* Stores Table */}
                            <div className="flex-1 overflow-x-auto mt-6"> {/* Added margin top */}
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Stores</label> {/* Added label */}
                                <table className="min-w-full border border-gray-300 shadow-md rounded">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border-b p-3 text-center font-medium text-gray-700"></th>
                                            <th className="border-b p-3 text-center font-medium text-gray-700">Stores</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stores && stores.length > 0 ? (
                                            stores.map((store) => (
                                                <tr key={store.id} className={store.id % 2 === 0 ? 'bg-gray-50' : ''}>
                                                    <td className="border-b p-3 text-gray-700 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={data.selectedStores.includes(store.id)}
                                                            onChange={() => handleStoreChange(store.id)}
                                                        />
                                                    </td>
                                                    <td className="border-b p-3 text-gray-700">{store.name || "n/a"}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2" className="border-b p-3 text-center text-gray-700">No Store found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">

                                {/* Password Input */}
                                <div className="relative flex-1">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="Enter Password..."
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.password ? 'border-red-500' : ''}`}
                                    />
                                    {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end space-x-4">
                                <Link
                                    href={route('usermanagement.users.index')}  // Using the route for navigation
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
                onConfirm={handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}