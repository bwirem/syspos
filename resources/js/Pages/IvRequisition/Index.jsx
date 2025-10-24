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

export default function Index({ auth, requisitions = { data: [] }, filters = {}, fromstoreList = [] }) {
    const {
        data: filterData,
        setData: setFilterData,
        // 'get' from useForm is not directly used for filter fetching in this approach
        delete: deleteRequisitionAction, // Renamed for clarity
        processing, // For loading states on delete
        // errors: formErrors, // Not typically populated by GET filters from useForm
    } = useForm({
        search: filters.search || "",
        fromstore: filters.fromstore || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        requisitionToDeleteId: null,
    });

    const filterTimeoutRef = useRef(null);

    // Effect for fetching data when filters change (debounced)
    useEffect(() => {
        if (filterTimeoutRef.current) {
            clearTimeout(filterTimeoutRef.current);
        }
        filterTimeoutRef.current = setTimeout(() => {
            inertiaRouter.get(
                route("inventory0.index"),
                { // Data to send with the GET request
                    search: filterData.search,
                    fromstore: filterData.fromstore,
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
    }, [filterData.search, filterData.fromstore]);

    const handleSearchChange = useCallback((e) => {
        setFilterData("search", e.target.value);
    }, [setFilterData]);

    const handleFromStoreChange = useCallback((e) => {
        setFilterData("fromstore", e.target.value);
    }, [setFilterData]);

    const handleDeleteClick = useCallback((id, toStoreName) => {
        setModalState({
            isOpen: true,
            message: `Are you sure you want to delete the requisition for "${toStoreName || 'this store'}"? This action cannot be undone.`,
            isAlert: false,
            requisitionToDeleteId: id,
        });
    }, []);

    const handleModalClose = useCallback(() => {
        setModalState({ isOpen: false, message: '', isAlert: false, requisitionToDeleteId: null });
    }, []);

    const showAlert = useCallback((message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            requisitionToDeleteId: null,
        });
    }, []);

    const handleModalConfirm = useCallback(() => {
        if (modalState.requisitionToDeleteId) {
            deleteRequisitionAction(route("inventory0.destroy", modalState.requisitionToDeleteId), {
                preserveScroll: true,
                onSuccess: () => {
                    handleModalClose();
                    // Optionally use Inertia flash messages for success notification
                    // showAlert("Requisition deleted successfully."); // This would show a modal
                },
                onError: (errorResponse) => {
                    console.error("Failed to delete requisition:", errorResponse);
                    // Try to get a specific error message if backend provides one
                    const messageFromServer = errorResponse?.message || (typeof errorResponse === 'object' ? Object.values(errorResponse).join(' ') : errorResponse);
                    showAlert(`Failed to delete requisition: ${messageFromServer || 'Please try again.'}`);
                },
            });
        }
    }, [deleteRequisitionAction, modalState.requisitionToDeleteId, handleModalClose, showAlert]);

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
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Requisition List</h2>}
        >
            <Head title="Requisition List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div>
                                        <label htmlFor="fromstore-filter" className="sr-only">Filter by From Store</label>
                                        <select
                                            id="fromstore-filter"
                                            name="fromstore"
                                            value={filterData.fromstore}
                                            onChange={handleFromStoreChange}
                                            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:w-auto"
                                        >
                                            <option value="">All From Stores</option>
                                            {fromstoreList.map((store) => (
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
                                    href={route("inventory0.create")}
                                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" /> Create Requisition
                                </Link>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">From Store</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">To Store</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Total Value</th>                                            
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {requisitions.data && requisitions.data.length > 0 ? (
                                            requisitions.data.map((requisition) => (
                                                <tr key={requisition.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {requisition.fromstore?.name || "N/A"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {requisition.tostore?.name || "N/A"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {formatCurrency(requisition.total, requisition.currency_code)}
                                                    </td>                                                    
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link
                                                                href={route("inventory0.edit", requisition.id)}
                                                                className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                                                                title={requisition.status === 'pending' ? "Edit Requisition" : "Preview Requisition"}
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} className="mr-1.5 h-3 w-3" />
                                                                {requisition.status === 'pending' ? 'Edit' : 'Preview'}
                                                            </Link>
                                                            {/* Show Delete button only if status allows (e.g., 'pending') */}
                                                            {requisition.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleDeleteClick(requisition.id, requisition.tostore?.name)}
                                                                    className="flex items-center rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                                                                    disabled={processing && modalState.requisitionToDeleteId === requisition.id}
                                                                    title="Delete Requisition"
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
                                                    No requisitions found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* TODO: Add Pagination if requisitions.links exists (e.g., <Pagination links={requisitions.links} />) */}
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
                isProcessing={processing && modalState.requisitionToDeleteId !== null}
                confirmButtonText={modalState.isAlert ? "OK" : (processing ? "Deleting..." : "Confirm Delete")}
            />
        </AuthenticatedLayout>
    );
}