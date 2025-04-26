import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/CustomModal';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';

// Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

export default function Edit({ pricecategory }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        price1: pricecategory.price1,
        useprice1: pricecategory.useprice1,
        price2: pricecategory.price2,
        useprice2: pricecategory.useprice2,
        price3: pricecategory.price3,
        useprice3: pricecategory.useprice3,
        price4: pricecategory.price4,
        useprice4: pricecategory.useprice4,
    });

    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
    const [isSaving, setIsSaving] = useState(false);

    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });
    const resetForm = () => { reset(); showAlert('Item updated successfully!'); };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        put(route('systemconfiguration0.pricecategories.update', pricecategory.id), {
            onSuccess: () => { setIsSaving(false); resetForm(); },
            onError: () => { setIsSaving(false); showAlert('An error occurred while saving the item.'); },
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Price Category</h2>}>
            <Head title="Edit Price Category" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* Price 1 */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1">
                                    <input
                                        id="price1"
                                        type="text"
                                        placeholder="Enter price1..."
                                        value={data.price1}
                                        onChange={(e) => setData('price1', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.price1 ? 'border-red-500' : ''}`}
                                    />
                                    {errors.price1 && <p className="text-sm text-red-600 mt-1">{errors.price1}</p>}
                                </div>
                                <div className="relative flex items-center">
                                    <input
                                        id="useprice1"
                                        type="checkbox"
                                        checked={data.useprice1}
                                        onChange={(e) => setData('useprice1', e.target.checked)}
                                        className="h-5 w-5"
                                    />
                                </div>
                            </div>

                            {/* Price 2 */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1">
                                    <input
                                        id="price2"
                                        type="text"
                                        placeholder="Enter price2..."
                                        value={data.price2}
                                        onChange={(e) => setData('price2', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.price2 ? 'border-red-500' : ''}`}
                                    />
                                    {errors.price2 && <p className="text-sm text-red-600 mt-1">{errors.price2}</p>}
                                </div>
                                <div className="relative flex items-center">
                                    <input
                                        id="useprice2"
                                        type="checkbox"
                                        checked={data.useprice2}
                                        onChange={(e) => setData('useprice2', e.target.checked)}
                                        className="h-5 w-5"
                                    />
                                </div>
                            </div>

                            {/* Price 3 */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1">
                                    <input
                                        id="price3"
                                        type="text"
                                        placeholder="Enter price3..."
                                        value={data.price3}
                                        onChange={(e) => setData('price3', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.price3 ? 'border-red-500' : ''}`}
                                    />
                                    {errors.price3 && <p className="text-sm text-red-600 mt-1">{errors.price3}</p>}
                                </div>
                                <div className="relative flex items-center">
                                    <input
                                        id="useprice3"
                                        type="checkbox"
                                        checked={data.useprice3}
                                        onChange={(e) => setData('useprice3', e.target.checked)}
                                        className="h-5 w-5"
                                    />
                                </div>
                            </div>

                            {/* Price 4 */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1">
                                    <input
                                        id="price4"
                                        type="text"
                                        placeholder="Enter price4..."
                                        value={data.price4}
                                        onChange={(e) => setData('price4', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.price4 ? 'border-red-500' : ''}`}
                                    />
                                    {errors.price4 && <p className="text-sm text-red-600 mt-1">{errors.price4}</p>}
                                </div>
                                <div className="relative flex items-center">
                                    <input
                                        id="useprice4"
                                        type="checkbox"
                                        checked={data.useprice4}
                                        onChange={(e) => setData('useprice4', e.target.checked)}
                                        className="h-5 w-5"
                                    />
                                </div>
                            </div>

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
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}

