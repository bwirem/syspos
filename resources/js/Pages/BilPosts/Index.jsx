import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faPlus,
    faEdit,
    faTrash,
    faEye, // For the "Preview" action
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css"; // Keep if not globally configured

import Modal from '@/Components/CustomModal.jsx'; // Using @ alias

// Define constants outside the component
const ORDER_STAGE_LABELS = {
    3: 'Pending',
    4: 'Profoma', // Typo? Should it be 'Proforma'? I'll keep as is from your code.
};

const DEBOUNCE_DELAY = 300; // milliseconds for search debounce

export default function Index({ auth, orders, filters,success }) {
    const { data, setData, errors, processing } = useForm({ // Added processing
        search: filters.search || "",
        stage: filters.stage || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        orderToDeleteId: null,
    });

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        if (success) {
            setShowSuccessModal(true);
        }
    }, [success]); 

    // Ref for debouncing
    const searchTimeoutRef = useRef(null);

    // Effect to fetch data when filters change (debounced for search)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("billing1.index"), {
                search: data.search,
                stage: data.stage,
            }, {
                preserveState: true,
                replace: true, // Avoids polluting browser history with filter changes
            });
        }, data.search ? DEBOUNCE_DELAY : 0); // Debounce if search is active, otherwise immediate for stage change

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [data.search, data.stage]);

    const handleSearchChange = useCallback((e) => {
        setData("search", e.target.value);
    }, [setData]);

    const handleStageChange = useCallback((stage) => {
        setData("stage", stage);
    }, [setData]);

    const handleDelete = useCallback((id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this item?", // Generic "item"
            isAlert: false,
            orderToDeleteId: id,
        });
    }, []);

    const handleModalClose = useCallback(() => {
        // If it was just an alert, reset fully.
        if (modalState.isAlert && !modalState.orderToDeleteId) {
             setModalState({ isOpen: false, message: '', isAlert: false, orderToDeleteId: null });
        } else {
            // For confirmation modals, just close, allow onConfirm to handle full reset
            setModalState(prev => ({ ...prev, isOpen: false }));
        }
    }, [modalState.isAlert, modalState.orderToDeleteId]);


    const showAlert = useCallback((message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            orderToDeleteId: null, // No deletion ID for alerts
        });
    }, []);

    const handleModalConfirm = useCallback(async () => {
        if (!modalState.orderToDeleteId) return;

        router.delete(route("billing1.destroy", modalState.orderToDeleteId), {
            onSuccess: () => {
                // Modal will be closed by onFinish, success message is good via flash or a toast
                // For now, we can show an alert then ensure modal is closed.
                // If using Inertia flash messages, this might be redundant.
                // showAlert("Item deleted successfully."); // This would reopen the modal as an alert.
                setModalState({ isOpen: false, message: '', isAlert: false, orderToDeleteId: null });
            },
            onError: (errorResponse) => {
                console.error("Failed to delete item:", errorResponse);
                showAlert( (errorResponse && errorResponse.message) || "There was an error deleting the item. Please try again.");
            },
            // onFinish will run regardless of success or error.
            // If onError showed an alert, we want that alert to persist.
            // If success, we want the modal to close.
            // The logic for closing is now split between onSuccess and the close button/ESC.
        });
    }, [modalState.orderToDeleteId, showAlert]);


    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user prop
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Post List</h2>}
        >
            <Head title="Post List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            {/* Header Actions */}
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex items-center space-x-2">
                                    <div className="relative flex items-center">
                                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                                        <input
                                            type="text"
                                            name="search"
                                            placeholder="Search by customer name"
                                            value={data.search}
                                            onChange={handleSearchChange}
                                            className={`w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64 ${errors.search ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    <Link
                                        href={route("billing1.create")}
                                        className="flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" /> Create
                                    </Link>
                                </div>

                                <ul className="flex flex-wrap items-center gap-2">
                                    <li
                                        className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium flex items-center ${data.stage === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                        onClick={() => handleStageChange("")}
                                    >
                                        All
                                    </li>
                                    {Object.entries(ORDER_STAGE_LABELS).map(([key, label]) => (
                                        <li
                                            key={key}
                                            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium flex items-center ${data.stage === key ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                            onClick={() => handleStageChange(key)}
                                        >
                                            {label}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Orders Table */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Total</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Stage</th>
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {orders.data.length > 0 ? (
                                            orders.data.map((order) => {
                                                const isEditStage = order.stage === 3; // Edit if stage is 'Pending'
                                                const actionButtonText = isEditStage ? "Edit" : "Preview";
                                                const actionButtonTitle = isEditStage ? "Edit Item" : "Preview Item";
                                                const actionButtonIcon = isEditStage ? faEdit : faEye;
                                                const actionButtonBgColor = isEditStage
                                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                                    : "bg-sky-500 hover:bg-sky-600"; // Sky blue for Preview

                                                return (
                                                    <tr key={order.id} className="hover:bg-gray-50">
                                                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                            {order.customer.customer_type === 'individual' ? (
                                                                `${order.customer.first_name} ${order.customer.other_names ? order.customer.other_names + ' ' : ''}${order.customer.surname}`.trim()
                                                            ) : (
                                                                order.customer.company_name
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                            {parseFloat(order.total).toLocaleString(undefined, {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2,
                                                            })}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                            {ORDER_STAGE_LABELS[order.stage] || 'Unknown Stage'}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                            <div className="flex items-center justify-center space-x-2">
                                                                <Link
                                                                    href={route("billing1.edit", order.id)}
                                                                    className={`flex items-center rounded px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm ${actionButtonBgColor}`}
                                                                    title={actionButtonTitle}
                                                                >
                                                                    <FontAwesomeIcon icon={actionButtonIcon} className="mr-1.5 h-3 w-3" />
                                                                    {actionButtonText}
                                                                </Link>
                                                                <button
                                                                    onClick={() => handleDelete(order.id)}
                                                                    className="flex items-center rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                                                                    disabled={processing} // Disable if a form is processing (e.g., delete)
                                                                    title="Delete Item"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} className="mr-1.5 h-3 w-3" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">
                                                    No items found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* TODO: Add Pagination Links if orders.links exists and is needed */}
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                onConfirm={() => setShowSuccessModal(false)}
                title="Success"
                isAlert={true}
                confirmButtonText="OK"
            >
                <p className="text-sm text-gray-600 dark:text-gray-300">{success}</p>
            </Modal>

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={modalState.isAlert ? null : handleModalConfirm} // Confirm only if not an alert
                title={modalState.isAlert ? "Alert" : "Confirm Deletion"}
                message={modalState.message}
                isAlert={modalState.isAlert}
                confirmButtonText={modalState.isAlert ? "OK" : "Confirm Delete"}
                isProcessing={processing && modalState.orderToDeleteId !== null} // Processing only for delete confirmation
            />
        </AuthenticatedLayout>
    );
}