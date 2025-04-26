import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/CustomModal';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';

// Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

export default function Create() {
    const { data, setData, post, errors, processing, reset } = useForm({
        price1: 'price1',
        useprice1: false,
        price2: 'price2',
        useprice2: false,
        price3: 'price3',
        useprice3: false,
        price4: 'price4',
        useprice4: false,
    });

    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
    const [isSaving, setIsSaving] = useState(false);

    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });
    const resetForm = () => { reset(); showAlert('Item created successfully!'); };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        post(route('systemconfiguration0.pricecategories.store'), {
            onSuccess: () => { setIsSaving(false); resetForm(); },
            onError: () => { setIsSaving(false); showAlert('An error occurred while saving the item.'); },
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Price Categories</h2>}>
            <Head title="New Item" />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {[1, 2, 3, 4].map((num) => (
                                <div key={num} className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                    <div className="relative flex-1">
                                        <input
                                            id={`price${num}`}
                                            type="text"
                                            placeholder={`Enter price${num}...`}
                                            value={data[`price${num}`]}
                                            onChange={(e) => setData(`price${num}`, e.target.value)}
                                            className={`w-full border p-2 rounded text-sm ${errors[`price${num}`] ? 'border-red-500' : ''}`}
                                        />
                                        {errors[`price${num}`] && (
                                            <p className="text-sm text-red-600 mt-1">{errors[`price${num}`]}</p>
                                        )}
                                    </div>
                                    <div className="relative flex items-center">
                                        <input
                                            id={`useprice${num}`}
                                            type="checkbox"
                                            checked={data[`useprice${num}`]}
                                            onChange={(e) => setData(`useprice${num}`, e.target.checked)}
                                            className="h-5 w-5"
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Buttons */}
                            <div className="flex justify-end space-x-4">
                                <Link
                                    href={route('systemconfiguration0.pricecategories.index')}
                                    method="get"
                                    preserveState={true}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Close</span>
                                </Link>
                                <button type="submit" disabled={processing || isSaving} className="bg-blue-600 text-white rounded p-2 flex items-center space-x-2">
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
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}
