import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm,Link } from "@inertiajs/react";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import Modal from "@/Components/CustomModal";

export default function Create({ chartofaccounts }) {
    const { data, setData, post, errors, processing, reset } = useForm({
        account_payable_id: "",
        account_receivable_id: "",
        customer_deposit_code: "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: "",
        isAlert: false,
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: "", isAlert: false });
    };

    const showAlert = (message, isAlert = true) => {
        setModalState({
            isOpen: true,
            message,
            isAlert,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);

        post(route("systemconfiguration3.chartofaccountmappings.store"), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (error) => {
                console.error(error);
                setIsSaving(false);
                showAlert("An error occurred while saving the chart of account.");
            },
        });
    };

    const resetForm = () => {
        reset();
        showAlert("Chart of account created successfully!");
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Account</h2>}
        >
            <Head title="New Account" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Account Payable Dropdown (First Row) */}
                            <div className="flex-1">
                                <label htmlFor="account_payable_id" className="block text-sm font-medium text-gray-700">
                                   Account Payable
                                </label>
                                <select
                                    id="account_payable_id"
                                    value={data.account_payable_id}
                                    onChange={(e) => setData("account_payable_id", e.target.value)}
                                    className={`w-full border p-2 rounded text-sm ${errors.account_payable_id ? "border-red-500" : ""}`}
                                >
                                    <option value="">Select account...</option>
                                    {chartofaccounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.account_name} ({account.description + "-" + account.account_code})
                                        </option>
                                    ))}
                                </select>
                                {errors.account_payable_id && <p className="text-sm text-red-600 mt-1">{errors.account_payable_id}</p>}
                            </div>

                            {/* Account Receivable Account Dropdown (Second Row) */}
                            <div className="flex-1">
                                <label htmlFor="account_receivable_id" className="block text-sm font-medium text-gray-700">
                                    Account Receivable
                                </label>
                                <select
                                    id="account_receivable_id"
                                    value={data.account_receivable_id}
                                    onChange={(e) => setData("account_receivable_id", e.target.value)}
                                    className={`w-full border p-2 rounded text-sm ${errors.account_receivable_id ? "border-red-500" : ""}`}
                                >
                                    <option value="">Select account...</option>
                                    {chartofaccounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.account_name} ({account.description + "-" + account.account_code})
                                        </option>
                                    ))}
                                </select>
                                {errors.account_receivable_id && <p className="text-sm text-red-600 mt-1">{errors.account_receivable_id}</p>}
                            </div>

                           

                            {/* Form Buttons */}
                            <div className="flex justify-end space-x-4 mt-6">                               
                                <Link
                                    href={route('systemconfiguration3.chartofaccountmappings.index')}  // Using the route for navigation
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
                                    <span>{isSaving ? "Saving..." : "Save"}</span>
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
                onConfirm={handleModalClose}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}