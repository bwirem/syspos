import React, { useEffect, useState, useCallback } from "react";
import { Head, Link, useForm, router as inertiaRouter } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faEdit,
    faPlus,
    faTrash,
    faTimesCircle, // For clearing filters
    faEye, // For 'Preview' action
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { toast } from 'react-toastify'; 

import Modal from '@/Components/CustomModal.jsx';
// import Pagination from '@/Components/Pagination'; // Uncomment if you have this

// Define stage configurations for Inventory Receives
const receiveStageConfig = {
    "1": { label: "Pending", color: "bg-yellow-500", actionLabel: "Edit", actionIcon: faEdit },
    "2": { label: "Checked", color: "bg-green-500", actionLabel: "Receive", actionIcon: faEye },
    // Add other stages if needed
};
const defaultStageColor = "bg-gray-400";


export default function Index({ auth, receives = { data: [] }, filters = {}, tostoreList = [], flash }) {
    const {
        data, 
        setData,
        delete: deleteReceiveAction, // For delete operation
        processing, // For loading states on delete/actions
        clearErrors,
    } = useForm({
        search: filters.search || "", // For searching tostore name
        stage: filters.stage || "",   // For stage filter (1 or 2)
        selected_tostore_id: filters.tostore || "", // Local state for dropdown, maps to 'tostore' backend param
    });

    // Confirmation Modal State (Only for Delete Confirmation now)
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: 'Alert',
        message: '',
        receiveToDeleteId: null, 
        onConfirmAction: null,
    });

    // Effect for fetching data when filters change
    useEffect(() => {
        const params = {
            search: data.search,
            stage: data.stage,
            // Conditionally add 'tostore' if selected_tostore_id has a value
            ...(data.selected_tostore_id && { tostore: data.selected_tostore_id }),
        };

        // Remove empty params before making the request
        const cleanedParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        );

        inertiaRouter.get(route("inventory2.index"), cleanedParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true, // Avoids polluting browser history with filter changes
        });
    }, [data.search, data.stage, data.selected_tostore_id]);

    // Handle flash messages with Toastify
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (newStage) => {
        setData("stage", data.stage === newStage ? "" : newStage); // Toggle or set
    };

    const handleToStoreFilterChange = (e) => {
        setData("selected_tostore_id", e.target.value);
    };

    const resetFilters = () => {
        setData({
            search: "",
            stage: "",
            selected_tostore_id: ""
        });
        clearErrors(); 
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, title: 'Alert', message: '', receiveToDeleteId: null, onConfirmAction: null });
    };

    const handleDeleteClick = useCallback((id, toStoreName) => {
        setModalState({
            isOpen: true,
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete the receive for "${toStoreName || 'this store'}"? This action cannot be undone.`,
            receiveToDeleteId: id,
            onConfirmAction: () => confirmDelete(), 
        });
    }, []); 

    const confirmDelete = () => { 
        if (modalState.receiveToDeleteId) {
            deleteReceiveAction(route("inventory2.destroy", modalState.receiveToDeleteId), {
                preserveScroll: true,
                onSuccess: () => {
                    handleModalClose();
                    toast.success("Record deleted successfully.");
                },
                onError: (errorResponse) => {
                    console.error("Failed to delete receive:", errorResponse);
                    const messageFromServer = errorResponse?.message || (typeof errorResponse === 'object' ? Object.values(errorResponse).join(' ') : errorResponse) || 'Please try again.';
                    
                    handleModalClose(); // Close the modal
                    toast.error(`Failed to delete receive: ${messageFromServer}`); // Show error toast
                },
            });
        }
    };


    const getFromStoreName = (receive) => {
        if (!receive.fromstore) return "N/A";
        const fromstore = receive.fromstore;
        if (fromstore.supplier_type) {
            return fromstore.supplier_type === 'individual'
                ? `${fromstore.first_name || ''} ${fromstore.other_names || ''} ${fromstore.surname || ''}`.trim()
                : fromstore.company_name || 'N/A';
        }
        return fromstore.name || 'N/A';
    };


    const formatCurrency = (amount, currencyCodeParam = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return 'N/A';
        return parsedAmount.toLocaleString(undefined, {
            style: 'currency', currency: currencyCodeParam,
            minimumFractionDigits: 2, maximumFractionDigits: 2,
        });
    };

    const hasActiveFilters = data.search || data.stage || data.selected_tostore_id;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Receive List</h2>}
        >
            <Head title="Receive List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        {/* Filters Section */}
                        <div className="mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                                {/* To Store Filter */}
                                <div className="md:col-span-1">
                                    <label htmlFor="selected_tostore_id" className="block text-sm font-medium text-gray-700 mb-1">
                                        Filter by To Store
                                    </label>
                                    <select
                                        id="selected_tostore_id"
                                        name="selected_tostore_id"
                                        value={data.selected_tostore_id}
                                        onChange={handleToStoreFilterChange}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2"
                                    >
                                        <option value="">All To Stores</option>
                                        {(Array.isArray(tostoreList) ? tostoreList : []).map(store => (
                                            <option key={store.id} value={store.id}>{store.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Search by To Store Name */}
                                <div className="md:col-span-1">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                                        Search To Store Name
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            id="search"
                                            placeholder="Enter name..."
                                            value={data.search}
                                            onChange={handleSearchChange}
                                            className="block w-full rounded-md border-gray-300 py-2 pl-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Reset Filters Button (aligned with other inputs) */}
                                <div className="flex items-end">
                                    {hasActiveFilters && (
                                        <button
                                            onClick={resetFilters}
                                            className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 flex items-center"
                                            title="Reset all filters"
                                        >
                                            <FontAwesomeIcon icon={faTimesCircle} className="mr-1.5 h-4 w-4" />
                                            Reset Filters
                                        </button>
                                    )}
                                </div>
                                {/* Create Button */}
                                <div className="md:col-span-1 lg:col-span-1 flex justify-start md:justify-end items-end">
                                    <Link
                                        href={route("inventory2.create")}
                                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" /> Direct Receive
                                    </Link>
                                </div>
                            </div>

                            {/* Stage Filter Buttons */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Filter by Stage
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleStageChange("")} // "" for All Stages
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                            ${data.stage === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                    >
                                        All Stages
                                    </button>
                                    {Object.entries(receiveStageConfig).map(([key, { label }]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleStageChange(key)}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                                ${data.stage === key ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flow-root mt-6">
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">From Store</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">To Store</th>
                                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Total Value</th>
                                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Stage</th>
                                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {receives.data && receives.data.length > 0 ? (
                                                receives.data.map((receive) => {
                                                    const stageInfo = receiveStageConfig[receive.stage?.toString()] || { label: `Stage ${receive.stage}`, color: defaultStageColor, actionLabel: 'View', actionIcon: faEye };
                                                    return (
                                                        <tr key={receive.id} className="hover:bg-gray-50">
                                                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{new Date(receive.created_at).toLocaleDateString()}</td>                                                     
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-700 sm:pl-3">{getFromStoreName(receive)}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">{receive.tostore?.name || "N/A"}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-700">{formatCurrency(receive.total, receive.currency_code)}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${stageInfo.color}`}>
                                                                    {stageInfo.label}
                                                                </span>
                                                            </td>
                                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                                <div className="flex items-center justify-center space-x-2">
                                                                    <Link
                                                                        href={route("inventory2.edit", receive.id)}
                                                                        className="rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 flex items-center"
                                                                    >
                                                                        <FontAwesomeIcon icon={stageInfo.actionIcon} className="mr-1.5 h-3 w-3" />
                                                                        {stageInfo.actionLabel}
                                                                    </Link>
                                                                    {/* Delete button only for 'Pending' (stage 1) */}
                                                                    {receive.stage?.toString() === "1" && (
                                                                        <button
                                                                            onClick={() => handleDeleteClick(receive.id, receive.tostore?.name)}
                                                                            className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 flex items-center"
                                                                            disabled={processing && modalState.receiveToDeleteId === receive.id}
                                                                        >
                                                                            <FontAwesomeIcon icon={faTrash} className="mr-1.5 h-3 w-3" />
                                                                            Delete
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="whitespace-nowrap py-10 px-3 text-center text-sm text-gray-500">
                                                        No receives found matching your criteria.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        {/* Pagination: Uncomment and use your Pagination component if available */}
                        {/* {receives.links && receives.links.length > 3 && (
                            <div className="mt-6">
                                <Pagination links={receives.links} />
                            </div>
                        )} */}
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
                confirmButtonText={processing && modalState.receiveToDeleteId ? "Deleting..." : "Confirm"}
                isProcessing={processing && modalState.receiveToDeleteId !== null} 
            />
        </AuthenticatedLayout>
    );
}