import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/CustomModal';
import { Head,Link, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';

// Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

export default function Create({regions}) {
    // Form Handling
    const { data, setData, post, errors, processing, reset } = useForm({
        name: '',        
        region_id: '',
    });

    // State Management
    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
    const [isSaving, setIsSaving] = useState(false);

    // Handlers
    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });
    const resetForm = () => { reset(); showAlert('District created successfully!'); };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        post(route('systemconfiguration4.districts.store'), {
            onSuccess: () => { setIsSaving(false); resetForm(); },
            onError: () => { setIsSaving(false); showAlert('An error occurred while saving the district.'); },
        });
    };

    
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New District</h2>}>
            <Head title="New District" />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name and District Group */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Region</label>
                                    <select value={data.region_id} onChange={(e) => setData('region_id', e.target.value)} className="w-full border p-2 rounded text-sm">
                                        <option value="">Select Region</option>
                                        {regions.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                                    </select>
                                    {errors.region_id && <p className="text-sm text-red-600">{errors.region_id}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`} placeholder="Enter name..." />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                            </div>                           

                            
                            {/* Buttons */}
                            <div className="flex justify-end space-x-4">                               
                                <Link
                                    href={route('systemconfiguration4.districts.index')}  // Using the route for navigation
                                    method="get"  // Optional, if you want to define the HTTP method (GET is default)
                                    preserveState={true}  // Keep the page state (similar to `preserveState: true` in the button)
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </Link>
                                <button type="submit" disabled={processing || isSaving} className="bg-blue-600 text-white rounded p-2 flex districts-center space-x-2">
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
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
