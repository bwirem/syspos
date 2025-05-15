import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faTimesCircle as faClose, faEdit, faTrash, faFilter, faTimesCircle } from "@fortawesome/free-solid-svg-icons"; // Renamed faTimes, added faFilter, faTimesCircle
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal.jsx';
// import Pagination from '@/Components/Pagination'; // Uncomment for pagination

export default function IndexNormalAdjustment({ auth, normaladjustments, filters }) { // Renamed component
    const { data, setData, errors, clearErrors } = useForm({ // Removed 'get' from useForm
        search: filters.search || "",
        stage: filters.stage || "1", // Default to 'Draft'
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        normaladjustmentToDeleteId: null,
        title: 'Alert',
        confirmText: 'OK',
        onConfirmAction: null,
    });

    useEffect(() => {
        const params = { search: data.search, stage: data.stage };
        Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);
        router.get(route("inventory3.normal-adjustment.index"), params, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    }, [data.search, data.stage]);


    const handleSearchChange = (e) => setData("search", e.target.value);
    const handleStageChange = (newStage) => setData("stage", data.stage === newStage ? "" : newStage);

    const confirmDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this normal adjustment record? This action cannot be undone.",
            isAlert: false, normaladjustmentToDeleteId: id,
            title: "Confirm Deletion", confirmText: "Yes, Delete",
            onConfirmAction: handleDeleteConfirmed,
        });
    };

    const handleModalClose = () => {
        setModalState(prev => ({ ...prev, isOpen: false, normaladjustmentToDeleteId: null, onConfirmAction: null }));
    };

    const handleDeleteConfirmed = async () => {
        if (!modalState.normaladjustmentToDeleteId) return;
        try {
            await router.delete(route("inventory3.normal-adjustment.destroy", modalState.normaladjustmentToDeleteId), { // Corrected route
                onSuccess: () => showAlert("Success", "Normal adjustment record deleted successfully."),
                onError: () => showAlert("Delete Error", "Failed to delete record. Please try again."),
            });
        } catch (error) {
            console.error("Unexpected error during delete:", error);
            showAlert("Error", "An unexpected error occurred.");
        }
        handleModalClose();
    };

    const showAlert = (title, message) => {
        setModalState({
            isOpen: true, title: title, message: message, isAlert: true,
            confirmText: "OK", onConfirmAction: handleModalClose,
            normaladjustmentToDeleteId: null,
        });
    };

    const resetFilters = () => {
        setData({ search: "", stage: "1" });
        clearErrors();
    };

    const normalAdjustmentStageInfo = {
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
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Normal Stock Adjustments</h2>}
        >
            <Head title="Normal Adjustments List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        {/* Header and Filters */}
                        <div className="mb-6">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="relative flex-grow md:max-w-xs">
                                    <label htmlFor="search-adj" className="sr-only">Search</label>
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                    </div>
                                    <input type="text" name="search-adj" id="search-adj"
                                        placeholder="Search by store or reason..." value={data.search}
                                        onChange={handleSearchChange}
                                        className="block w-full rounded-md border-gray-300 py-2 pl-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={route("inventory3.normal-adjustment.create")}
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center">
                                        <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />New Adjustment
                                    </Link>
                                    <button onClick={resetFilters}
                                        className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 flex items-center" title="Reset filters">
                                        <FontAwesomeIcon icon={faTimesCircle} className="mr-2 h-4 w-4" />Reset Filters
                                    </button>
                                    <Link href={route("inventory3.index")} // Main dashboard or relevant inventory page
                                        className="rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 flex items-center">
                                        <FontAwesomeIcon icon={faClose} className="mr-2 h-4 w-4" />Close
                                    </Link>
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Stage</label>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => handleStageChange("")}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${data.stage === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                                        All
                                    </button>
                                    {Object.entries(normalAdjustmentStageInfo).map(([key, { label }]) => (
                                        <button key={key} type="button" onClick={() => handleStageChange(key)}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${data.stage === key ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Normal Adjustments Table */}
                        <div className="flow-root">
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">ID</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Store</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reason</th>
                                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Total Value</th>
                                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Stage</th>
                                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {normaladjustments.data.length > 0 ? (
                                                normaladjustments.data.map((adj) => (
                                                    <tr key={adj.id}>
                                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">{adj.id}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{adj.store?.name || 'N/A'}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{adj.adjustmentreason?.name || 'N/A'}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">{formatCurrency(adj.total)}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${normalAdjustmentStageInfo[adj.stage]?.color || 'bg-gray-400'}`}>
                                                                {normalAdjustmentStageInfo[adj.stage]?.label || `Stage ${adj.stage}`}
                                                            </span>
                                                        </td>
                                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3 space-x-2">
                                                            <Link href={route("inventory3.normal-adjustment.edit", adj.id)}
                                                                className="rounded-md bg-yellow-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-yellow-400" title="Edit">
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </Link>
                                                            {adj.stage === 1 && ( // Allow delete only for 'Draft' stage
                                                                <button onClick={() => confirmDelete(adj.id)}
                                                                    className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500" title="Delete">
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="whitespace-nowrap py-4 px-3 text-center text-sm text-gray-500">
                                                        No normal adjustments found matching your filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        {/* Pagination */}
                        {/* {normaladjustments.links && normaladjustments.data.length > 0 && (
                            <div className="mt-6"><Pagination links={normaladjustments.links} /></div>
                        )} */}
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={modalState.onConfirmAction || handleModalClose} // Default to close for simple alerts
                title={modalState.title}
                message={modalState.message}
                isAlert={modalState.isAlert}
                confirmButtonText={modalState.confirmText}
            />
        </AuthenticatedLayout>
    );
}