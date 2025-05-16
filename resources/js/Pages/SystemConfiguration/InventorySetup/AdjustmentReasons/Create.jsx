import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react'; // Added router
import { useState, useEffect } from 'react'; // Added useEffect
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faPlus } from '@fortawesome/free-solid-svg-icons'; // Added faPlus
import '@fortawesome/fontawesome-svg-core/styles.css';
// import { Inertia } from '@inertiajs/inertia'; // Inertia global object is generally deprecated, use router
import Modal from '@/Components/CustomModal';
import TextInput from '@/Components/TextInput'; // Assuming you have/create this
import SelectInput from '@/Components/SelectInput'; // Assuming you have/create this
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

// --- Mock Toast (replace with your actual toast implementation) ---
// You would typically use a library like react-toastify or sonner
const showToast = (message, type = 'success') => {
    console.log(`TOAST (${type}): ${message}`); // Replace with actual toast call
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

export default function Create({ auth }) { // Assuming auth is passed for AuthenticatedLayout
    const { data, setData, post, errors, processing, reset, wasSuccessful, recentlySuccessful } = useForm({
        name: '',
        action: '', // Add or Deduct
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
    useEffect(() => {
        if (wasSuccessful || recentlySuccessful) { // recentlySuccessful for newer Inertia versions
            showToast('Adjustment reason created successfully!');
            reset(); // Reset form fields
            // Optional: Redirect after a short delay or provide a link
            // setTimeout(() => router.get(route('systemconfiguration2.adjustmentreasons.index')), 1500);
        }
    }, [wasSuccessful, recentlySuccessful, reset]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (processing) return;

        post(route('systemconfiguration2.adjustmentreasons.store'), {
            preserveScroll: true, // Keep scroll position on validation errors
            // onSuccess is handled by useEffect and wasSuccessful/recentlySuccessful
            onError: (errorObject) => {
                console.error("Submission Error:", errorObject);
                // Check for a general submission error message if your backend sends one
                // For now, using a generic message if specific field errors aren't enough
                if (!Object.keys(errorObject).length) { // If errorObject is empty but still an error
                    showSubmissionError('An unexpected error occurred. Please try again.');
                }
                // Field-specific errors are handled by `errors` prop from `useForm`
            },
            // onFinish: () => {} // Called regardless of success/error
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user to AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Create New Adjustment Reason</h2>}
        >
            <Head title="New Adjustment Reason" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8"> {/* Slightly narrower for better readability */}
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg"> {/* Use shadow-sm for consistency */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <TextInput
                                    id="name"
                                    label="Reason Name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    placeholder="e.g., Initial Stock, Stock Correction"
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
                                    {processing ? 'Saving...' : 'Save Reason'}
                                </PrimaryButton>
                            </div>
                            {/* Optional: "Save and Add Another" button */}
                            {/*
                            <div className="flex justify-end">
                                <SecondaryButton
                                    type="button"
                                    onClick={() => {
                                        post(route('systemconfiguration2.adjustmentreasons.store'), {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                showToast('Adjustment reason created successfully!');
                                                reset();
                                                document.getElementById('name')?.focus(); // Focus on the first field
                                            },
                                            onError: (err) => {
                                                if (!Object.keys(err).length) {
                                                   showSubmissionError('An unexpected error occurred.');
                                                }
                                            }
                                        });
                                    }}
                                    disabled={processing}
                                    className="ml-4"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    Save & Add Another
                                </SecondaryButton>
                            </div>
                            */}
                        </form>
                    </div>
                </div>
            </div>

            {/* Error Modal for critical submission errors (not field validation) */}
            <Modal
                show={errorModalState.isOpen} // Use `show` prop if your Modal uses it
                onClose={handleErrorModalClose}
                // title="Submission Error" // Title can be part of the modal or passed
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