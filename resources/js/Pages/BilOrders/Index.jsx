import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faPlus,
    faEdit,
    faTrash,
    faEye, // Added faEye for Preview
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal.jsx';

const ORDER_STAGE_LABELS = {
    1: 'Draft',
    2: 'Quotation',
};

const DEBOUNCE_DELAY = 300;

export default function Index({ auth, orders, filters }) {
    const { data, setData, errors, processing } = useForm({
        search: filters.search || "",
        stage: filters.stage || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        orderToDeleteId: null,
    });

    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("billing0.index"), {
                search: data.search,
                stage: data.stage,
            }, {
                preserveState: true,
                replace: true,
            });
        }, data.search ? DEBOUNCE_DELAY : 0);

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
            message: "Are you sure you want to delete this order?",
            isAlert: false,
            orderToDeleteId: id,
        });
    }, []);

    const handleModalClose = useCallback(() => {
        setModalState(prev => ({ ...prev, isOpen: false, orderToDeleteId: prev.isAlert ? null : prev.orderToDeleteId }));
         // If it was just an alert, reset fully. If it was a confirm, it might be handled by onConfirm.
        if (modalState.isAlert) {
            setTimeout(() => { // Ensure message is read for alerts
                 setModalState({ isOpen: false, message: '', isAlert: false, orderToDeleteId: null });
            }, 0);
        } else {
             setModalState({ isOpen: false, message: '', isAlert: false, orderToDeleteId: null });
        }
    }, [modalState.isAlert]);


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

        router.delete(route("billing0.destroy", modalState.orderToDeleteId), {
            onSuccess: () => {
                // The modal will be closed by onFinish, success message is good via flash or a toast
                // For now, we can show an alert then close.
                setModalState({ isOpen: false, message: '', isAlert: false, orderToDeleteId: null });
                // Optionally: Show a success toast/notification here if not using flash messages
                // showAlert("Order deleted successfully."); // This would reopen the modal as an alert
            },
            onError: (errorResponse) => {
                console.error("Failed to delete order:", errorResponse);
                // Keep the confirm modal open but show the error within it or convert to alert.
                // For simplicity, we'll convert to an alert modal.
                showAlert( (errorResponse && errorResponse.message) || "There was an error deleting the order. Please try again.");
            },
            onFinish: () => {
                // This runs regardless of success/error.
                // If onError showed an alert, we might not want to immediately close it.
                // The current setup with showAlert changing modalState means we need careful handling.
                // A simple approach: if not an alert that was just set by onError, close.
                if (!modalState.isAlert) { // if onError hasn't just set it to an alert
                    setModalState(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    }, [modalState.orderToDeleteId, showAlert]);


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Order List</h2>}
        >
            <Head title="Order List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
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
                                        href={route("billing0.create")}
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

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Total</th>
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {orders.data.length > 0 ? (
                                            orders.data.map((order) => {
                                                const isEditStage = order.stage === 1;
                                                const actionButtonText = isEditStage ? "Edit" : "Preview";
                                                const actionButtonTitle = isEditStage ? "Edit Order" : "Preview Order";
                                                const actionButtonIcon = isEditStage ? faEdit : faEye;
                                                const actionButtonBgColor = isEditStage
                                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                                    : "bg-sky-500 hover:bg-sky-600"; // Changed color for Preview

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
                                                        <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                            <div className="flex items-center justify-center space-x-2">
                                                                <Link
                                                                    href={route("billing0.edit", order.id)}
                                                                    className={`flex items-center rounded px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm ${actionButtonBgColor}`}
                                                                    title={actionButtonTitle}
                                                                >
                                                                    <FontAwesomeIcon icon={actionButtonIcon} className="mr-1.5 h-3 w-3" />
                                                                    {actionButtonText}
                                                                </Link>
                                                                <button
                                                                    onClick={() => handleDelete(order.id)}
                                                                    className="flex items-center rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                                                                    disabled={processing}
                                                                    title="Delete Order"
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
                                                <td colSpan="3" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">
                                                    No orders found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* TODO: Implement Pagination if orders.links exists and is needed */}
                            {/* Example: <Pagination links={orders.links} /> */}
                        </div>
                    </div>
                </div>
            </div>
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