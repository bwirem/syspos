import React, { useEffect, useState, useCallback } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash, faFilter, faTimes } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { debounce } from 'lodash'; // For debouncing search input

import Modal from '../../Components/CustomModal.jsx';

// Define outside component to prevent re-creation on every render
const tenderStageLabels = {
    1: 'Draft',
    2: 'Quotation',
    3: 'Evaluation',
};

export default function Index({ auth, tenders, filters, flash }) { // Added flash for feedback
    const { data, setData, get, errors, processing, reset } = useForm({ // Added processing, reset
        search: filters.search || "",
        stage: filters.stage || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        tenderToDeleteId: null,
    });

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((newSearchTerm, currentStage) => {
            get(route("procurements0.index", { search: newSearchTerm, stage: currentStage }), {
                preserveState: true,
                preserveScroll: true, // Keep scroll position
                replace: true, // Avoid polluting browser history
            });
        }, 300), // 300ms delay
        [get] // get is stable, so this effectively runs once
    );

    useEffect(() => {
        // Trigger debounced search when data.search changes
        // For stage, we want immediate update, so it's handled by handleStageChange
        if (data.search !== filters.search) { // Only call if search actually changed
            debouncedSearch(data.search, data.stage);
        }
    }, [data.search, debouncedSearch, filters.search, data.stage]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (stage) => {
        const newStage = data.stage === stage ? "" : stage; // Allow toggling off a stage
        setData("stage", newStage);
        // Fetch immediately on stage change
        get(route("procurements0.index", { search: data.search, stage: newStage }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        reset(); // Resets form data to initial values (empty strings)
        get(route("procurements0.index"), { // Fetch with cleared filters
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this tender?",
            isAlert: false,
            tenderToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, tenderToDeleteId: null });
    };

    const handleModalConfirm = () => { // Removed async as router.delete handles it
        if (modalState.tenderToDeleteId) {
            router.delete(route("procurements0.destroy", modalState.tenderToDeleteId), {
                onSuccess: () => {
                    // Inertia's flash messages can be used here if set up in HandleInertiaRequests middleware
                    // For now, let's assume it's handled or use a client-side alert as fallback.
                    // showAlert("Tender deleted successfully."); // Optional: if you want a success alert
                    handleModalClose();
                },
                onError: (errors) => {
                    console.error("Failed to delete tender:", errors);
                    const errorMsg = Object.values(errors).join(' ') || "There was an error deleting the tender. Please try again.";
                    showAlert(errorMsg);
                    // Don't close modal on error, let user see the error then close manually or retry
                },
                // onFinish: () => handleModalClose(), // Close modal regardless of success/error
            });
        }
    };

    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            tenderToDeleteId: null,
        });
    };

    // Show flash messages if available
    useEffect(() => {
        if (flash && flash.success) {
            showAlert(flash.success);
        }
        if (flash && flash.error) {
            showAlert(flash.error);
        }
    }, [flash]);

    const getActionLabel = (stage) => {
        switch (String(stage)) { // Ensure comparison with string keys if tender.stage is number
            case '2': return "Process";
            case '3': return "Award";
            default: return "Edit";
        }
    };


    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user prop
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Tender Management
                </h2>
            }
        >
            <Head title="Tenders" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            {/* Header Actions & Filters */}
                            <div className="mb-6">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    {/* Search Input */}
                                    <div className="relative w-full sm:w-auto">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            placeholder="Search tenders..."
                                            value={data.search}
                                            onChange={handleSearchChange}
                                            className={`block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${errors.search ? "border-red-500" : ""}`}
                                        />
                                    </div>

                                    {/* Create Button */}
                                    <Link
                                        href={route("procurements0.create")}
                                        className="w-full sm:w-auto justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center transition ease-in-out duration-150"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create Tender
                                    </Link>
                                </div>

                                {/* Stage Filters */}
                                <div className="mt-4">
                                    <div className="flex items-center mb-2">
                                        <FontAwesomeIcon icon={faFilter} className="text-gray-500 dark:text-gray-400 mr-2" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Stage:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${data.stage === ""
                                                    ? "bg-indigo-500 text-white"
                                                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                }`}
                                            onClick={() => handleStageChange("")}
                                        >
                                            All
                                        </button>
                                        {Object.entries(tenderStageLabels).map(([key, label]) => (
                                            <button
                                                key={key}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${data.stage === key
                                                        ? "bg-indigo-500 text-white"
                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                    }`}
                                                onClick={() => handleStageChange(key)}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                        {(data.search || data.stage) && (
                                            <button
                                                onClick={clearFilters}
                                                className="px-3 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900 transition-colors flex items-center"
                                                title="Clear all filters"
                                            >
                                                <FontAwesomeIcon icon={faTimes} className="mr-1" /> Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tenders Table */}
                            <div className="overflow-x-auto shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stage</th>
                                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {tenders.data.length > 0 ? (
                                            tenders.data.map((tender) => (
                                                <tr key={tender.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 dark:text-gray-100">{tender.description || "N/A"}</div>
                                                        {/* Optional: Add more details like ID or creation date if useful */}
                                                        {/* <div className="text-xs text-gray-500 dark:text-gray-400">ID: {tender.id}</div> */}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            tender.stage === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                                                            tender.stage === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                                            tender.stage === 3 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                                        }`}>
                                                            {tenderStageLabels[tender.stage] || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link
                                                                href={route("procurements0.edit", tender.id)}
                                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 px-3 py-1 rounded-md hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors flex items-center text-xs"
                                                                title={getActionLabel(tender.stage)}
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                                {getActionLabel(tender.stage)}
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(tender.id)}
                                                                disabled={processing} // Disable button while a delete is processing
                                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded-md hover:bg-red-100 dark:hover:bg-gray-700 transition-colors flex items-center text-xs"
                                                                title="Delete"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center">
                                                    <div className="text-center">
                                                        {/* Optional: Add an icon or illustration */}
                                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                        </svg>
                                                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No tenders found.</h3>
                                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                            {data.search || data.stage ? "Try adjusting your search or filters." : "Get started by creating a new tender."}
                                                        </p>
                                                        {!(data.search || data.stage) && (
                                                            <div className="mt-6">
                                                                <Link
                                                                    href={route("procurements0.create")}
                                                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                >
                                                                    <FontAwesomeIcon icon={faPlus} className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                                                    New Tender
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
                             {/* Pagination (if you add it server-side) */}
                             {/* 
                             {tenders.links && tenders.links.length > 3 && (
                                <div className="mt-4 flex justify-between items-center">
                                    <div className="text-sm text-gray-700 dark:text-gray-400">
                                        Showing {tenders.from} to {tenders.to} of {tenders.total} results
                                    </div>
                                    <div>
                                        {tenders.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.url}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`ml-1 px-3 py-1 border rounded text-sm ${link.active ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600' } ${!link.url ? 'text-gray-400 cursor-not-allowed' : ''}`}
                                                preserveScroll
                                                preserveState
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            */}
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Deletion"} // More specific title
                message={modalState.message}
                isAlert={modalState.isAlert}
                confirmButtonText={modalState.isAlert ? "OK" : "Delete"} // Dynamic confirm button text
                isDestructive={!modalState.isAlert} // Add prop to modal for styling destructive actions
                processing={processing} // Pass processing state to modal for confirm button
            />
        </AuthenticatedLayout>
    );
}