import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react"; // router is already here
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faTimesCircle as faClose, faEdit, faTrash, faFilter, faTimesCircle } from "@fortawesome/free-solid-svg-icons"; // Renamed faTimes to faClose for clarity, added faFilter, faTimesCircle
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal.jsx'; // Assuming path is correct
// import Pagination from '@/Components/Pagination'; // Uncomment if you implement pagination

export default function IndexPhysicalInventory({ auth, physicalinventorys, filters }) { // Renamed component for clarity
    const { data, setData, errors, clearErrors } = useForm({ // Removed 'get' from useForm, will use router.get
        search: filters.search || "",
        stage: filters.stage || "1", // Default to 'Draft' as per original
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        physicalinventoryToDeleteId: null,
        title: 'Alert', // Default title
        confirmText: 'OK', // Default confirm text
        onConfirmAction: null,
    });

    useEffect(() => {
        const params = {
            search: data.search,
            stage: data.stage,
        };
        // Remove empty params
        Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

        router.get(route("inventory3.physical-inventory.index"), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, [data.search, data.stage]); // Removed 'get' from dependency array


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (newStage) => {
        setData("stage", data.stage === newStage ? "" : newStage); // Allow toggling to "All"
    };

    const confirmDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this physical inventory record? This action cannot be undone.",
            isAlert: false, // This is a confirmation, not just an alert
            physicalinventoryToDeleteId: id,
            title: "Confirm Deletion",
            confirmText: "Yes, Delete",
            onConfirmAction: handleDeleteConfirmed,
        });
    };

    const handleModalClose = () => {
        setModalState(prev => ({ ...prev, isOpen: false, physicalinventoryToDeleteId: null, onConfirmAction: null }));
    };

    const handleDeleteConfirmed = async () => {
        if (!modalState.physicalinventoryToDeleteId) return;
        try {
            // Corrected route name for deleting physical inventory
            await router.delete(route("inventory3.physical-inventory.destroy", modalState.physicalinventoryToDeleteId), {
                onSuccess: () => showAlert("Success", "Physical inventory record deleted successfully."),
                onError: (error) => {
                    console.error("Failed to delete physical inventory:", error);
                    showAlert("Delete Error", "There was an error deleting the record. Please try again.");
                }
            });
        } catch (error) { // Catch unexpected errors from router.delete itself
            console.error("Unexpected error during delete:", error);
            showAlert("Error", "An unexpected error occurred. Please try again.");
        }
        handleModalClose(); // Close modal regardless of outcome, success/error handled by showAlert
    };

    const showAlert = (title, message) => {
        setModalState({
            isOpen: true,
            title: title,
            message: message,
            isAlert: true,
            confirmText: "OK",
            onConfirmAction: handleModalClose, // Simple close for alerts
            physicalinventoryToDeleteId: null,
        });
    };
    
    const resetFilters = () => {
        setData({ search: "", stage: "1" }); // Reset to default stage or "" for All
        clearErrors();
    };

    const physicalInventoryStageInfo = {
        1: { label: 'Draft', color: 'bg-yellow-500' },
        2: { label: 'Checked', color: 'bg-blue-500' },
        // 3: { label: 'Approved', color: 'bg-green-500' }, // If applicable
        6: { label: 'Cancelled', color: 'bg-red-500' },
    };

    const formatCurrency = (amount) => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return '0.00';
        return parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Physical Inventory List</h2>}
        >
            <Head title="Physical Inventory List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        {/* Header and Filters */}
                        <div className="mb-6">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="relative flex-grow md:max-w-xs">
                                    <label htmlFor="search" className="sr-only">Search</label>
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="search"
                                        id="search"
                                        placeholder="Search by store name or ID..."
                                        value={data.search}
                                        onChange={handleSearchChange}
                                        className="block w-full rounded-md border-gray-300 py-2 pl-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={route("inventory3.physical-inventory.create")}
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
                                        New Count
                                    </Link>
                                     <button
                                        onClick={resetFilters}
                                        className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 flex items-center"
                                        title="Reset all filters"
                                    >
                                        <FontAwesomeIcon icon={faTimesCircle} className="mr-2 h-4 w-4" />
                                        Reset Filters
                                    </button>
                                    <Link
                                        href={route("inventory3.index")} // Or appropriate higher-level inventory page
                                        className="rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 flex items-center"
                                    >
                                        <FontAwesomeIcon icon={faClose} className="mr-2 h-4 w-4" />
                                        Close
                                    </Link>
                                </div>
                            </div>
                            {/* Stage Filter Tabs */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Filter by Stage
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleStageChange("")} // For "All"
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                            ${data.stage === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                    >
                                        All
                                    </button>
                                    {Object.entries(physicalInventoryStageInfo).map(([key, { label }]) => (
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

                        {/* Physical Inventories Table */}
                        <div className="flow-root">
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">ID</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Store</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Total Counted Value</th>
                                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Stage</th>
                                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-3 text-center">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {physicalinventorys.data.length > 0 ? (
                                                physicalinventorys.data.map((pi) => (
                                                    <tr key={pi.id}>
                                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{pi.id}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{pi.store?.name || 'N/A'}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 truncate max-w-xs" title={pi.description}>{pi.description || 'N/A'}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">{formatCurrency(pi.total_counted_value)}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${physicalInventoryStageInfo[pi.stage]?.color || 'bg-gray-400'}`}>
                                                                {physicalInventoryStageInfo[pi.stage]?.label || `Stage ${pi.stage}`}
                                                            </span>
                                                        </td>
                                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3 space-x-2">
                                                            <Link
                                                                href={route("inventory3.physical-inventory.edit", pi.id)}
                                                                className="rounded-md bg-yellow-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-yellow-400"
                                                                title="Edit"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </Link>
                                                            {/* Allow delete only for 'Draft' stage, for example */}
                                                            {pi.stage === 1 && (
                                                                <button
                                                                    onClick={() => confirmDelete(pi.id)}
                                                                    className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500"
                                                                    title="Delete"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="whitespace-nowrap py-4 px-3 text-center text-sm text-gray-500">
                                                        No physical inventory records found matching your filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        {/* Pagination */}
                        {/* {physicalinventorys.links && physicalinventorys.data.length > 0 && (
                            <div className="mt-6">
                                <Pagination links={physicalinventorys.links} />
                            </div>
                        )} */}
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={modalState.onConfirmAction || handleModalClose}
                title={modalState.title}
                message={modalState.message}
                isAlert={modalState.isAlert}
                confirmButtonText={modalState.confirmText}
            />
        </AuthenticatedLayout>
    );
}