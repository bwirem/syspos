import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
// import { Inertia } from '@inertiajs/inertia'; // Use router from @inertiajs/react
import Modal from '@/Components/CustomModal';
import TextInput from '@/Components/TextInput';         // Assuming this exists
import SelectInput from '@/Components/SelectInput';       // Assuming this exists
import PrimaryButton from '@/Components/PrimaryButton';   // Assuming this exists

// --- Mock Toast (replace with your actual toast implementation) ---
const showToast = (message, type = 'success') => {
    console.log(`TOAST (${type}): ${message}`);
    // Example with react-toastify:
    // if (type === 'success') toast.success(message);
    // else if (type === 'error') toast.error(message);
};
// --- End Mock Toast ---

// Define action options for clarity and reusability
const ACTION_OPTIONS = [
    { value: 'Add', label: 'Add' },
    { value: 'Deduct', label: 'Deduct' },
];

export default function Edit({ auth, adjustmentreason }) { // Added auth prop
    const { data, setData, put, errors, processing, reset, wasSuccessful, recentlySuccessful, clearErrors } = useForm({
        name: adjustmentreason.name || '', // Handle case where prop might be initially null/undefined
        action: adjustmentreason.action || '', // Add action field
    });

    const [errorModalState, setErrorModalState] = useState({
        isOpen: false,
        message: '',
    });

    const handleErrorModalClose = () => {
        setErrorModalState({ isOpen: false, message: '' });
    };

    const showSubmissionError = (message) => {
        setErrorModalState({
            isOpen: true,
            message,
        });
    };

    // Handle success notification and form reset
    // When wasSuccessful is true, Inertia has likely re-fetched the 'adjustmentreason' prop
    // so resetting the form will use the latest data.
    useEffect(() => {
        if (wasSuccessful || recentlySuccessful) {
            showToast('Adjustment reason updated successfully!');
            // reset(); // Resets to the initial 'adjustmentreason' prop values (which should be updated by Inertia)
                       // Or you might want to clear specific dirty states if you don't want a full prop-driven reset visually immediately.
                       // For simplicity, reset() is often fine as Inertia updates props.
            clearErrors(); // Clear any previous validation errors
            // Optional: Redirect after a short delay
            // setTimeout(() => router.get(route('systemconfiguration2.adjustmentreasons.index')), 1500);
        }
    }, [wasSuccessful, recentlySuccessful, reset, clearErrors]);

    // If the adjustmentreason prop changes from external navigation (e.g., live updates),
    // re-initialize the form data.
    useEffect(() => {
        setData({
            name: adjustmentreason.name || '',
            action: adjustmentreason.action || '',
        });
    }, [adjustmentreason, setData]); // Add setData to dependencies

    const handleSubmit = (e) => {
        e.preventDefault();
        if (processing) return;

        put(route('systemconfiguration2.adjustmentreasons.update', adjustmentreason.id), {
            preserveScroll: true,
            // onSuccess is handled by useEffect
            onError: (errorObject) => {
                console.error("Submission Error:", errorObject);
                if (!Object.keys(errorObject).length) {
                    showSubmissionError('An unexpected error occurred. Please try again.');
                }
            },
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user to AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Adjustment Reason</h2>}
        >
            <Head title={`Edit Reason - ${adjustmentreason.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <TextInput
                                    id="name"
                                    label="Reason Name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    placeholder="e.g., Stock Return, Damaged Goods"
                                    required
                                    autoFocus
                                    className="mt-1 block w-full"
                                />
                            </div>

                            <div>
                                <SelectInput
                                    id="action"
                                    label="Action Type"
                                    value={data.action}
                                    onChange={(e) => setData('action', e.target.value)}
                                    error={errors.action}
                                    required
                                    className="mt-1 block w-full"
                                >
                                    <option value="">Select an action...</option>
                                    {ACTION_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </SelectInput>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-4">
                                <Link
                                    href={route('systemconfiguration2.adjustmentreasons.index')}
                                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 shadow-sm transition duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                    Cancel
                                </Link>

                                <PrimaryButton type="submit" disabled={processing}>
                                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal
                show={errorModalState.isOpen}
                onClose={handleErrorModalClose}
            >
                <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900">Error</h3>
                    <p className="mt-2 text-sm text-gray-600">{errorModalState.message}</p>
                    <div className="mt-4 flex justify-end">
                        <PrimaryButton onClick={handleErrorModalClose}>
                            OK
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}