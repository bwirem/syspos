import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';
import Modal from '@/Components/CustomModal';

export default function Edit({ street }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        name: street.name,
        price1: street.price1,
        price2: street.price2,
        price3: street.price3,
        price4: street.price4,
        defaultqty: street.defaultqty,
        addtocart: street.addtocart,
        streetgroup_id: street.streetgroup_id,
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [streetGroups, setStreetGroups] = useState([]);

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false });
    };

    const showAlert = (message) => {
        setModalState({ isOpen: true, message, isAlert: true });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        put(route('systemconfiguration3.streets.update', street.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the street.');
            },
        });
    };

    const resetForm = () => {
        reset();
        showAlert('Street updated successfully!');
    };

    useEffect(() => {
        const fetchStreetGroups = async () => {
            try {
                const response = await axios.get(route('systemconfiguration3.streetgroups.search'));
                setStreetGroups(response.data.groups);
            } catch (error) {
                console.error('Error fetching street groups:', error);
                showAlert('Failed to fetch street groups.');
            }
        };

        fetchStreetGroups();
    }, []);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Street</h2>}
        >
            <Head title="Edit Street" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                           
                            {/* Name and Street Group */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`} placeholder="Enter name..." />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Street Group</label>
                                    <select value={data.streetgroup_id} onChange={(e) => setData('streetgroup_id', e.target.value)} className="w-full border p-2 rounded text-sm">
                                        <option value="">Select Street Group</option>
                                        {streetGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                                    </select>
                                    {errors.streetgroup_id && <p className="text-sm text-red-600">{errors.streetgroup_id}</p>}
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
                                    onClick={() => Inertia.get(route('systemconfiguration3.streets.index'))}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex streets-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || isSaving}
                                    className="bg-blue-600 text-white rounded p-2 flex streets-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save Street'}</span>
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
