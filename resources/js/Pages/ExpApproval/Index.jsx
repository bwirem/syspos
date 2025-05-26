import React, { useEffect, useState, useCallback } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout"; // Adjust path if needed
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEdit, faTrash, faSpinner, faTimesCircle } from "@fortawesome/free-solid-svg-icons"; // faPlus removed
import "@fortawesome/fontawesome-svg-core/styles.css";
import { debounce } from 'lodash';

import Modal from '../../Components/CustomModal.jsx'; // Adjust path if needed

// Updated approvalStageConfig to reflect stages > 1
// Example: 2 might be 'Pending Approval', 3 'Approved', etc.
const approvalStageConfig = {
    2: { label: 'Pending Approval', className: 'bg-yellow-200 text-yellow-700 hover:bg-yellow-300' },
    3: { label: 'Approved', className: 'bg-green-200 text-green-700 hover:bg-green-300' },
    4: { label: 'Rejected', className: 'bg-red-200 text-red-700 hover:bg-red-300' },
    // Add other stages > 1 as needed
    // e.g., 5: { label: 'Queried', className: 'bg-blue-200 text-blue-700 hover:bg-blue-300' },
};
const defaultStageStyle = { label: 'Unknown Stage', className: 'bg-gray-300 text-gray-800' };


export default function Index({ auth, approvals, filters, flash }) {
    const { data, setData, get, errors, processing, reset } = useForm({
        search: filters.search || "",
        // 'stage' filter state removed
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        approvalToDeleteId: null,
        type: 'info',
    });

    const debouncedSearch = useCallback(
        debounce((searchValue) => {
            // Only 'search' parameter is sent
            get(route("expenses1.index", { search: searchValue }), {
                preserveState: true,
                preserveScroll: true,
            });
        }, 300),
        [get] // Added `get` to dependency array as it's used in the callback
    );

    useEffect(() => {
        // Call debounced search only when search changes
        debouncedSearch(data.search);
        return () => debouncedSearch.cancel();
    }, [data.search, debouncedSearch]); // Removed data.stage

    useEffect(() => {
        if (flash?.success) {
            showAlert(flash.success, 'success');
        }
        if (flash?.error) {
            showAlert(flash.error, 'error');
        }
    }, [flash]);

    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    // handleStageChange function removed

    const clearFilters = () => {
        reset('search'); // Only reset search
    };

    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this expense record? This action cannot be undone.",
            isAlert: false,
            approvalToDeleteId: id,
            type: 'confirmation',
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, approvalToDeleteId: null, type: 'info' });
    };

    const handleModalConfirm = async () => {
        if (modalState.approvalToDeleteId) {
            // Ensure this route name 'expenses1.destroy' is correct for deleting an EXPPost
            router.delete(route("expenses1.destroy", modalState.approvalToDeleteId), {
                onSuccess: () => {
                    // Flash message will be handled by useEffect
                },
                onError: (errorResponse) => {
                    console.error("Failed to delete approval item:", errorResponse);
                    const errorMessage = errorResponse?.message || "There was an error deleting the item. Please try again.";
                    showAlert(errorMessage, 'error');
                },
                onFinish: () => {
                     if (!modalState.isAlert) {
                        setModalState({ isOpen: false, message: '', isAlert: false, approvalToDeleteId: null, type: 'info' });
                    }
                }
            });
        }
    };

    const showAlert = (message, type = 'info') => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            approvalToDeleteId: null,
            type: type,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Expense Approval List
                </h2>
            }
        >
            <Head title="Expense Approvals" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        {/* Filter Section */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                                <div className="flex-grow">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Search by Description
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-grow">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                id="search"
                                                name="search"
                                                placeholder="Enter description..."
                                                value={data.search}
                                                onChange={handleSearchChange}
                                                className={`block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-900 dark:text-gray-300 ${errors.search ? "border-red-500" : ""}`}
                                            />
                                            {processing && data.search && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        {data.search && (
                                            <button
                                                onClick={clearFilters}
                                                type="button"
                                                className="px-3 py-2 text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 h-[38px] flex-shrink-0"
                                                title="Clear Search"
                                            >
                                                <FontAwesomeIcon icon={faTimesCircle} className="mr-1 md:mr-0" />
                                                <span className="hidden md:inline ml-1">Clear Search</span>
                                            </button>
                                        )}
                                    </div>
                                    {errors.search && <p className="mt-1 text-xs text-red-500">{errors.search}</p>}
                                </div>
                                {/* Stage filter UI removed */}
                                {/* "Create Expense" button removed from here and below */}
                            </div>
                        </div>

                        {/* Approvals Table */}
                        <div className="overflow-x-auto relative shadow-md sm:rounded-lg border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Description</th>
                                        <th scope="col" className="px-6 py-3 text-right">Total</th>
                                        <th scope="col" className="px-6 py-3 text-center">Stage</th>
                                        <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processing && approvals.data.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-10">
                                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-gray-400" />
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading items...</p>
                                            </td>
                                        </tr>
                                    )}
                                    {!processing && approvals.data.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No items found matching your criteria.
                                                {/* Link to create removed as per request */}
                                            </td>
                                        </tr>
                                    )}
                                    {approvals.data.map((approval) => {
                                        const stageInfo = approvalStageConfig[approval.stage] || defaultStageStyle;
                                        return (
                                            <tr key={approval.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                    {approval.description || <span className="italic text-gray-400">N/A</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {parseFloat(approval.total).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${stageInfo.className}`}>
                                                        {stageInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        {/* Assuming 'expenses1.edit' is the route to view/edit an approval item */}
                                                        <Link
                                                            href={route("expenses1.edit", approval.id)}
                                                            className="font-medium text-blue-600 dark:text-blue-500 hover:underline p-1"
                                                            title="View/Edit"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </Link>
                                                        {/* Optionally, add a condition for showing delete button, e.g., based on user role or item stage */}
                                                        {/* <button
                                                            onClick={() => handleDelete(approval.id)}
                                                            className="font-medium text-red-600 dark:text-red-500 hover:underline p-1"
                                                            title="Delete"
                                                            type="button"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button> */}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {approvals.links && approvals.links.length > 3 && (
                             <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
                                <div className="text-sm text-gray-700 dark:text-gray-400">
                                    Showing <span className="font-medium">{approvals.from || 0}</span> to <span className="font-medium">{approvals.to || 0}</span> of <span className="font-medium">{approvals.total || 0}</span> results
                                </div>
                                <div className="flex justify-end">
                                    {approvals.links.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            preserveScroll
                                            preserveState
                                            className={`
                                                relative inline-flex items-center px-4 py-2 text-sm font-medium
                                                ${link.active ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                            : 'text-gray-900 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-offset-0'}
                                                ${index === 0 ? 'rounded-l-md' : ''}
                                                ${index === approvals.links.length - 1 ? 'rounded-r-md' : ''}
                                                ${!link.url ? 'cursor-not-allowed opacity-50' : ''}
                                            `}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            as={!link.url ? 'span' : 'button'}
                                            disabled={!link.url}
                                        />
                                    ))}
                                </div>
                            </nav>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={modalState.isAlert ? handleModalClose : handleModalConfirm}
                title={modalState.isAlert ? (modalState.type === 'success' ? 'Success' : modalState.type === 'error' ? 'Error' : 'Alert') : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
                type={modalState.type}
            />
        </AuthenticatedLayout>
    );
}