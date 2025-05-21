import React, { useEffect, useState, useCallback } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash, faFilter, faTimes, faEye } from "@fortawesome/free-solid-svg-icons"; // Added faEye
import "@fortawesome/fontawesome-svg-core/styles.css";
import { debounce } from 'lodash';

import Modal from '../../Components/CustomModal.jsx'; // Assuming this is styled well

// Define outside component to prevent re-creation
const purchaseStageLabels = {
    1: 'Pending',
    2: 'Approved',
    3: 'Dispatched',
    // Add more stages if needed, e.g., 4: 'Received', 5: 'Completed'
};

// Helper to get action label based on stage
const getActionLabel = (stage) => {
    const stageNum = parseInt(stage, 10);
    if (stageNum === 1) return "Edit/Approve"; // Or just "Edit" if approval is separate
    if (stageNum === 2) return "Dispatch";
    if (stageNum === 3) return "Receive";
    // if (stageNum === 4) return "View Details"; // Example for a completed stage
    return "View/Edit"; // Default fallback
};

export default function Index({ auth, purchases, filters, flash }) { // Added flash for feedback
    const { data, setData, get, errors, processing, reset } = useForm({
        search: filters.search || "",
        stage: filters.stage || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        isAlert: false,
        type: 'info', // For styling modal: 'info', 'success', 'error', 'warning'
        purchaseToDeleteId: null,
    });

    const debouncedSearch = useCallback(
        debounce((newSearchTerm, currentStage) => {
            get(route("procurements1.index", { search: newSearchTerm, stage: currentStage }), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300),
        [get]
    );

    useEffect(() => {
        if (data.search !== filters.search) {
            debouncedSearch(data.search, data.stage);
        }
        // For stage changes, they are handled immediately by handleStageChange's get call
    }, [data.search, data.stage, debouncedSearch, filters.search, filters.stage]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (stageValue) => {
        const newStage = data.stage === String(stageValue) ? "" : String(stageValue); // Ensure stageValue is string for comparison
        setData("stage", newStage);
        get(route("procurements1.index", { search: data.search, stage: newStage }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        reset();
        get(route("procurements1.index"), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    const confirmDelete = (id) => {
        const purchaseToDelete = purchases.data.find(p => p.id === id);
        let supplierName = "this purchase";
        if (purchaseToDelete && purchaseToDelete.supplier) {
            supplierName = purchaseToDelete.supplier.supplier_type === 'individual'
                ? `${purchaseToDelete.supplier.first_name || ''} ${purchaseToDelete.supplier.other_names || ''} ${purchaseToDelete.supplier.surname || ''}`.replace(/\s+/g, ' ').trim()
                : purchaseToDelete.supplier.company_name;
            supplierName = `purchase for "${supplierName || 'N/A'}"`;
        }

        setModalState({
            isOpen: true,
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete ${supplierName}? This action cannot be undone.`,
            isAlert: false,
            type: 'warning',
            purchaseToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, title: '', message: '', isAlert: false, type: 'info', purchaseToDeleteId: null });
    };

    const handleDeleteConfirm = () => {
        if (modalState.purchaseToDeleteId) {
            router.delete(route("procurements1.destroy", modalState.purchaseToDeleteId), {
                preserveScroll: true,
                onSuccess: () => {
                    // Flash message should handle success feedback from backend
                    handleModalClose();
                },
                onError: (errorObj) => {
                    console.error("Failed to delete purchase:", errorObj);
                    const errorMsg = Object.values(errorObj).join(' ') || "There was an error deleting the purchase.";
                    showAlert(errorMsg, 'Deletion Failed', 'error');
                    // Don't close deletion confirmation on error, let user try again or close manually
                },
            });
        }
    };

    const showAlert = (message, title = "Alert", type = "info") => {
        setModalState({
            isOpen: true,
            title: title,
            message: message,
            isAlert: true,
            type: type,
            purchaseToDeleteId: null,
        });
    };

    useEffect(() => {
        if (flash?.success) showAlert(flash.success, 'Success', 'success');
        if (flash?.error) showAlert(flash.error, 'Error', 'error');
    }, [flash]);

    // Helper function to get supplier display name
    const getSupplierName = (supplier) => {
        if (!supplier) return "N/A";
        return supplier.supplier_type === 'individual'
            ? `${supplier.first_name || ''} ${supplier.other_names || ''} ${supplier.surname || ''}`.replace(/\s+/g, ' ').trim() || "N/A Individual"
            : supplier.company_name || "N/A Company";
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Purchase Order Management
                </h2>
            }
        >
            <Head title="Purchase Orders" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            {/* Header Actions & Filters */}
                            <div className="mb-6">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="relative w-full sm:w-auto">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            placeholder="Search by supplier or PO number..."
                                            value={data.search}
                                            onChange={handleSearchChange}
                                            className={`block w-full sm:w-72 pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${errors.search ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    <Link
                                        href={route("procurements1.create")}
                                        className="w-full sm:w-auto justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center transition ease-in-out duration-150"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create Purchase Order
                                    </Link>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-center mb-2">
                                        <FontAwesomeIcon icon={faFilter} className="text-gray-500 dark:text-gray-400 mr-2" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Stage:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${data.stage === "" ? "bg-indigo-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
                                            onClick={() => handleStageChange("")}
                                        > All </button>
                                        {Object.entries(purchaseStageLabels).map(([key, label]) => (
                                            <button
                                                key={key}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${data.stage === key ? "bg-indigo-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
                                                onClick={() => handleStageChange(key)}
                                            > {label} </button>
                                        ))}
                                        {(data.search || data.stage) && (
                                            <button onClick={clearFilters} className="px-3 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900 transition-colors flex items-center" title="Clear all filters">
                                                <FontAwesomeIcon icon={faTimes} className="mr-1" /> Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Purchases Table */}
                            <div className="overflow-x-auto shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PO # / Date</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Supplier</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stage</th>
                                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {purchases.data.length > 0 ? (
                                            purchases.data.map((purchase) => (
                                                <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                                            <Link href={route("procurements1.show", purchase.id)}>{purchase.purchase_order_number || `PO-${purchase.id}`}</Link>
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {new Date(purchase.created_at).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 dark:text-gray-100">{getSupplierName(purchase.supplier)}</div>
                                                        {purchase.supplier?.email && <div className="text-xs text-gray-500 dark:text-gray-400">{purchase.supplier.email}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                                                        {parseFloat(purchase.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            purchase.stage === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                                                            purchase.stage === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                                            purchase.stage === 3 ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                                        }`}>
                                                            {purchaseStageLabels[purchase.stage] || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link
                                                                href={route("procurements1.edit", purchase.id)}
                                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded-md hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors"
                                                                title={getActionLabel(purchase.stage)}
                                                            >
                                                                <FontAwesomeIcon icon={parseInt(purchase.stage,10) >= 4 ? faEye : faEdit} className="h-4 w-4 mr-1" /> {/* Show faEye if stage is e.g. Received/Completed */}
                                                                <span className="sr-only sm:not-sr-only">{getActionLabel(purchase.stage)}</span>
                                                            </Link>
                                                            {/* Show delete only for certain stages, e.g., Pending */}
                                                            {parseInt(purchase.stage, 10) === 1 && (
                                                                <button
                                                                    onClick={() => confirmDelete(purchase.id)}
                                                                    disabled={processing}
                                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-md hover:bg-red-100 dark:hover:bg-gray-700 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4 mr-1" />
                                                                    <span className="sr-only sm:not-sr-only">Delete</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center">
                                                    <div className="text-center">
                                                        <FontAwesomeIcon icon={faSearch} className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
                                                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No purchase orders found.</h3>
                                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                            {data.search || data.stage ? "Try adjusting your search or filters." : "Get started by creating a new purchase order."}
                                                        </p>
                                                        {!(data.search || data.stage) && (
                                                            <div className="mt-6">
                                                                <Link href={route("procurements1.create")} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                                                    <FontAwesomeIcon icon={faPlus} className="-ml-1 mr-2 h-5 w-5" /> New Purchase Order
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                             {/* Basic Pagination (if your backend `purchases` object includes pagination links) */}
                             {purchases.links && purchases.meta && purchases.meta.links.length > 3 && (
                                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-700 dark:text-gray-400">
                                    <div>Showing {purchases.from} to {purchases.to} of {purchases.total} results</div>
                                    <div className="flex flex-wrap gap-1 mt-2 sm:mt-0">
                                        {purchases.meta.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.url || '#'}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`px-3 py-1.5 border rounded-md transition-colors
                                                    ${link.active ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}
                                                    ${!link.url ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50' : ''}`}
                                                preserveScroll
                                                preserveState
                                                disabled={!link.url}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={!modalState.isAlert ? handleDeleteConfirm : handleModalClose}
                title={modalState.title}
                message={modalState.message}
                isAlert={modalState.isAlert}
                type={modalState.type}
                confirmButtonText={modalState.isAlert ? "OK" : "Delete"}
                isDestructive={!modalState.isAlert && modalState.type === 'warning'}
                processing={processing && modalState.purchaseToDeleteId !== null} // Pass processing if it's a delete action
            />
        </AuthenticatedLayout>
    );
}