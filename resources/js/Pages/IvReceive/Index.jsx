import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router as inertiaRouter } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"; // Correct import
import {
    faSearch,
    faPlus,
    faEdit,
    faTrash,
    faFilter, // Optional: if you plan to use it for more complex filter UIs
} from "@fortawesome/free-solid-svg-icons"; // Icons used
import "@fortawesome/fontawesome-svg-core/styles.css"; // Font Awesome CSS

import Modal from '@/Components/CustomModal.jsx'; // Assuming @ alias for your components directory

const DEBOUNCE_DELAY = 300; // milliseconds for debounce

export default function Index({ auth, receives = { data: [] }, filters = {}, tostoreList = [] }) {
    const {
        data: filterData,
        setData: setFilterData,
        // 'get' from useForm is not directly used for filter fetching in this approach
        delete: deleteReceiveAction, // Renamed for clarity
        processing, // For loading states on delete
        // errors: formErrors, // Not typically populated by GET filters from useForm
    } = useForm({
        search: filters.search || "",
        tostore: filters.tostore || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        receiveToDeleteId: null,
    });

    const filterTimeoutRef = useRef(null);

    // Effect for fetching data when filters change (debounced)
    useEffect(() => {
        if (filterTimeoutRef.current) {
            clearTimeout(filterTimeoutRef.current);
        }
        filterTimeoutRef.current = setTimeout(() => {
            inertiaRouter.get(
                route("inventory2.index"),
                { // Data to send with the GET request
                    search: filterData.search,
                    tostore: filterData.tostore,
                },
                { // Options
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, DEBOUNCE_DELAY);

        return () => {
            if (filterTimeoutRef.current) {
                clearTimeout(filterTimeoutRef.current);
            }
        };
    }, [filterData.search, filterData.tostore]);

    const handleSearchChange = useCallback((e) => {
        setFilterData("search", e.target.value);
    }, [setFilterData]);

    const handleTostoreChange = useCallback((e) => {
        setFilterData("tostore", e.target.value);
    }, [setFilterData]);

    const handleDeleteClick = useCallback((id, toStoreName) => {
        setModalState({
            isOpen: true,
            message: `Are you sure you want to delete the receive for "${toStoreName || 'this store'}"? This action cannot be undone.`,
            isAlert: false,
            receiveToDeleteId: id,
        });
    }, []);

    const handleModalClose = useCallback(() => {
        setModalState({ isOpen: false, message: '', isAlert: false, receiveToDeleteId: null });
    }, []);

    const showAlert = useCallback((message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            receiveToDeleteId: null,
        });
    }, []);

    const handleModalConfirm = useCallback(() => {
        if (modalState.receiveToDeleteId) {
            deleteReceiveAction(route("inventory2.destroy", modalState.receiveToDeleteId), {
                preserveScroll: true,
                onSuccess: () => {
                    handleModalClose();
                    // Optionally use Inertia flash messages for success notification
                    // showAlert("Receive deleted successfully."); // This would show a modal
                },
                onError: (errorResponse) => {
                    console.error("Failed to delete receive:", errorResponse);
                    // Try to get a specific error message if backend provides one
                    const messageFromServer = errorResponse?.message || (typeof errorResponse === 'object' ? Object.values(errorResponse).join(' ') : errorResponse);
                    showAlert(`Failed to delete receive: ${messageFromServer || 'Please try again.'}`);
                },
            });
        }
    }, [deleteReceiveAction, modalState.receiveToDeleteId, handleModalClose, showAlert]);

    const formatCurrency = (amount, currencyCodeParam = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
            return 'N/A'; // Or some other placeholder for invalid numbers
        }
        return parsedAmount.toLocaleString(undefined, { // Use user's locale for number part
            style: 'currency',
            currency: currencyCodeParam, // Actual currency code (e.g., TZS, USD)
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Receive List</h2>}
        >
            <Head title="Receive List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div>
                                        <label htmlFor="tostore-filter" className="sr-only">Filter by From Store</label>
                                        <select
                                            id="tostore-filter"
                                            name="tostore"
                                            value={filterData.tostore}
                                            onChange={handleTostoreChange}
                                            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:w-auto"
                                        >
                                            <option value="">All To Stores</option>
                                            {tostoreList.map((store) => (
                                                <option key={store.id} value={store.id}>{store.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <label htmlFor="search-filter" className="sr-only">Search by To Store</label>
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                        </div>
                                        <input
                                            id="search-filter"
                                            type="text"
                                            name="search"
                                            placeholder="Search by to-store name"
                                            value={filterData.search}
                                            onChange={handleSearchChange}
                                            className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-64"
                                        />
                                    </div>
                                </div>

                                <Link
                                    href={route("inventory2.create")}
                                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" /> Direct Receive
                                </Link>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">From Store</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">To Store</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Total Value</th>
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Status</th>
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {receives.data && receives.data.length > 0 ? (
                                            receives.data.map((receive) => (
                                                <tr key={receive.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {receive.fromstore?.name || "N/A"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {receive.tostore?.name || "N/A"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {formatCurrency(receive.total, receive.currency_code)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-gray-700">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            receive.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            receive.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            receive.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {receive.status ? receive.status.charAt(0).toUpperCase() + receive.status.slice(1) : 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link
                                                                href={route("inventory2.edit", receive.id)}
                                                                className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                                                                title={receive.status === 'pending' ? "Edit Receive" : "Preview Receive"}
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} className="mr-1.5 h-3 w-3" />
                                                                {receive.status === 'pending' ? 'Edit' : 'Preview'}
                                                            </Link>
                                                            {/* Show Delete button only if status allows (e.g., 'pending') */}
                                                            {receive.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleDeleteClick(receive.id, receive.tostore?.name)}
                                                                    className="flex items-center rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                                                                    disabled={processing && modalState.receiveToDeleteId === receive.id}
                                                                    title="Delete Receive"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} className="mr-1.5 h-3 w-3" />
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">
                                                    No receives found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* TODO: Add Pagination if receives.links exists (e.g., <Pagination links={receives.links} />) */}
                        </div>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={modalState.isAlert ? null : handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Deletion"}
                message={modalState.message}
                isAlert={modalState.isAlert}
                isProcessing={processing && modalState.receiveToDeleteId !== null}
                confirmButtonText={modalState.isAlert ? "OK" : (processing ? "Deleting..." : "Confirm Delete")}
            />
        </AuthenticatedLayout>
    );
}