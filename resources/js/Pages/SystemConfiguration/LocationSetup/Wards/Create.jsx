import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/CustomModal';
import { Head, useForm } from '@inertiajs/react';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';
import { useState, useEffect } from 'react';

// Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

export default function Create() {
    // Form Handling
    const { data, setData, post, errors, processing, reset } = useForm({
        name: '',
        price1: '',
        price2: '',
        price3: '',
        price4: '',
        defaultqty: '',
        addtocart: false,
        wardgroup_id: '',
    });

    // State Management
    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
    const [isSaving, setIsSaving] = useState(false);
    const [wardGroups, setWardGroups] = useState([]);

    // Handlers
    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });
    const resetForm = () => { reset(); showAlert('Ward created successfully!'); };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        post(route('systemconfiguration3.wards.store'), {
            onSuccess: () => { setIsSaving(false); resetForm(); },
            onError: () => { setIsSaving(false); showAlert('An error occurred while saving the ward.'); },
        });
    };

    // Fetch ward groups
    useEffect(() => {
        axios.get(route('systemconfiguration3.wardgroups.search'))
            .then(response => setWardGroups(response.data.groups))
            .catch(() => showAlert('Failed to fetch ward groups.'));
    }, []);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Ward</h2>}>
            <Head title="New Ward" />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name and Ward Group */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`} placeholder="Enter name..." />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ward Group</label>
                                    <select value={data.wardgroup_id} onChange={(e) => setData('wardgroup_id', e.target.value)} className="w-full border p-2 rounded text-sm">
                                        <option value="">Select Ward Group</option>
                                        {wardGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                                    </select>
                                    {errors.wardgroup_id && <p className="text-sm text-red-600">{errors.wardgroup_id}</p>}
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
                                {/* Default Quantity and Add to Cart on the same row */}
                                <div className="relative flex-1">
                                    <label htmlFor="defaultqty" className="block text-sm font-medium text-gray-700 mr-2">Default Quantity</label>
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

                                <div className="relative flex-1 flex wards-center">
                                    <input
                                        id="addtocart"
                                        type="checkbox"
                                        checked={data.addtocart}
                                        onChange={(e) => setData('addtocart', e.target.checked)}
                                    />
                                    <label htmlFor="addtocart" className="ml-2 text-sm font-medium text-gray-700">Add to Cart</label>
                                </div>
                            </div>

                            
                            {/* Buttons */}
                            <div className="flex justify-end space-x-4">
                                <button type="button" onClick={() => Inertia.get(route('systemconfiguration3.wards.index'))} className="bg-gray-300 text-gray-700 rounded p-2 flex wards-center space-x-2">
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </button>
                                <button type="submit" disabled={processing || isSaving} className="bg-blue-600 text-white rounded p-2 flex wards-center space-x-2">
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save Ward'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Alert Modal */}
            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} title={modalState.isAlert ? "Alert" : "Confirm Action"} message={modalState.message} isAlert={modalState.isAlert} />
        </AuthenticatedLayout>
    );
}
