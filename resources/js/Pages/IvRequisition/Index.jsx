import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router as inertiaRouter } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faPlus,
    faEdit,
    faTrash,
    faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { toast } from 'react-toastify';

import Modal from '@/Components/CustomModal.jsx';

const DEBOUNCE_DELAY = 300;

export default function Index({ auth, requisitions = { data: [] }, filters = {}, fromstoreList = [], flash }) {
    const {
        data: filterData,
        setData: setFilterData,
        delete: deleteRequisitionAction,
        processing,
        clearErrors,
    } = useForm({
        search: filters.search || "",
        fromstore: filters.fromstore || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        title: 'Alert',
        message: '',
        requisitionToDeleteId: null,
        onConfirmAction: null,
    });

    const filterTimeoutRef = useRef(null);

    // Handle Flash Messages using Toast
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    // Effect for fetching data when filters change (debounced)
    useEffect(() => {
        if (filterTimeoutRef.current) {
            clearTimeout(filterTimeoutRef.current);
        }
        filterTimeoutRef.current = setTimeout(() => {
            inertiaRouter.get(
                route("inventory0.index"),
                { 
                    search: filterData.search,
                    fromstore: filterData.fromstore,
                },
                { 
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

    const resetFilters = () => {
        setFilterData({
            search: "",
            fromstore: "",
        });
        clearErrors();
    };

    const handleModalClose = useCallback(() => {
        setModalState({ isOpen: false, title: 'Alert', message: '', requisitionToDeleteId: null, onConfirmAction: null });
    }, []);

    const handleDeleteClick = useCallback((id, toStoreName) => {
        setModalState({
            isOpen: true,
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete the requisition for "${toStoreName || 'this store'}"? This action cannot be undone.`,
            requisitionToDeleteId: id,
            onConfirmAction: () => confirmDelete(),
        });
    }, []);

    const confirmDelete = () => {
        if (modalState.requisitionToDeleteId) {
            deleteRequisitionAction(route("inventory0.destroy", modalState.requisitionToDeleteId), {
                preserveScroll: true,
                onSuccess: () => {
                    handleModalClose();
                    toast.success("Requisition deleted successfully.");
                },
                onError: (errorResponse) => {
                    console.error("Failed to delete requisition:", errorResponse);
                    const messageFromServer = errorResponse?.message || (typeof errorResponse === 'object' ? Object.values(errorResponse).join(' ') : errorResponse) || 'Please try again.';
                    
                    handleModalClose();
                    toast.error(`Failed to delete requisition: ${messageFromServer}`);
                },
            });
        }
    };

    const formatCurrency = (amount, currencyCodeParam = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
            return 'N/A';
        }
        return parsedAmount.toLocaleString(undefined, {
            style: 'currency',
            currency: currencyCodeParam,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const hasActiveFilters = filterData.search || filterData.fromstore;

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
                            {/* Filters Section */}
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                                <div className="flex flex-wrap items-center gap-4">
                                    {/* From Store Filter */}
                                    <div className="w-full sm:w-auto">
                                        <label htmlFor="fromstore-filter" className="block text-sm font-medium text-gray-700 mb-1">
                                            Filter by From Store
                                        </label>
                                        <select
                                            id="fromstore-filter"
                                            name="fromstore"
                                            value={filterData.fromstore}
                                            onChange={handleFromStoreChange}
                                            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                        >
                                            <option value="">All From Stores</option>
                                            {fromstoreList.map((store) => (
                                                <option key={store.id} value={store.id}>{store.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Search Filter */}
                                    <div className="w-full sm:w-auto relative">
                                        <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 mb-1">
                                            Search To Store
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                            </div>
                                            <input
                                                id="search-filter"
                                                type="text"
                                                name="search"
                                                placeholder="Search by name..."
                                                value={filterData.search}
                                                onChange={handleSearchChange}
                                                className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-64"
                                            />
                                        </div>
                                    </div>

                                    {/* Reset Filters */}
                                    {hasActiveFilters && (
                                        <div className="flex items-end pb-1">
                                            <button
                                                onClick={resetFilters}
                                                className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 flex items-center"
                                                title="Reset all filters"
                                            >
                                                <FontAwesomeIcon icon={faTimesCircle} className="mr-1.5 h-4 w-4" />
                                                Reset
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Create Button */}
                                <Link
                                    href={route("inventory0.create")}
                                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" /> Create Requisition
                                </Link>
                            </div>

                            {/* Table Section */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
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
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                                                        {new Date(requisition.created_at).toLocaleDateString()}
                                                    </td>                                                   
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {requisition.fromstore?.name || "N/A"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {requisition.tostore?.name || 
                                                         (requisition.tostore?.customer_type === 'individual' 
                                                            ? `${requisition.tostore?.first_name || ''} ${requisition.tostore?.surname || ''}` 
                                                            : requisition.tostore?.company_name) || "N/A"}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {formatCurrency(requisition.total, requisition.currency_code)}
                                                    </td>                                                    
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link
                                                                href={route("inventory0.edit", requisition.id)}
                                                                className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                                                                title="Edit Requisition"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} className="mr-1.5 h-3 w-3" />
                                                                Edit
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDeleteClick(requisition.id, requisition.tostore?.name)}
                                                                className="flex items-center rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                                                                disabled={processing && modalState.requisitionToDeleteId === requisition.id}
                                                                title="Delete Requisition"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} className="mr-1.5 h-3 w-3" />
                                                                Delete
                                                            </button>
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
                            {/* Pagination would go here */}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Modal for Confirmation only */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={modalState.onConfirmAction}
                title={modalState.title}
                message={modalState.message}
                isProcessing={processing && modalState.requisitionToDeleteId !== null}
                confirmButtonText={processing ? "Deleting..." : "Confirm Delete"}
            />
        </AuthenticatedLayout>
    );
}