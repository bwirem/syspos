import React, { useEffect, useState, useCallback } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash, faSpinner, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { debounce } from 'lodash'; // For debouncing search

import Modal from '../../Components/CustomModal.jsx';
// import { toast } from 'react-toastify'; // Example: if you were to use react-toastify
// import 'react-toastify/dist/ReactToastify.css';

// Map post stage numbers to labels and styles
const postStageConfig = {
    1: { label: 'Draft', className: 'bg-gray-200 text-gray-700 hover:bg-gray-300' },
    2: { label: 'Approved', className: 'bg-blue-200 text-blue-700 hover:bg-blue-300' },
    // 6: { label: 'Cancelled', className: 'bg-red-200 text-red-700 hover:bg-red-300' },
    "": { label: 'All', className: 'bg-indigo-200 text-indigo-700 hover:bg-indigo-300' }, // For the "All" filter
};

export default function Index({ auth, posts, filters, flash }) { // Added flash for success/error messages
    const { data, setData, get, errors, processing, reset } = useForm({
        search: filters.search || "",
        stage: filters.stage || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        postToDeleteId: null,
    });

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((searchValue, currentStage) => {
            get(route("expenses1.index", { search: searchValue, stage: currentStage }), {
                preserveState: true,
                preserveScroll: true, // Keep scroll position on filter change
            });
        }, 300), // 300ms delay
        [] // Empty dependency array: memoize the debounced function itself
    );

    useEffect(() => {
        // Call debounced search when search or stage changes
        debouncedSearch(data.search, data.stage);
        // Cleanup function to cancel any pending debounced calls if component unmounts
        return () => debouncedSearch.cancel();
    }, [data.search, data.stage, debouncedSearch]);

    // Handle flash messages from session
    useEffect(() => {
        if (flash?.success) {
            showAlert(flash.success, 'success'); // Or use toast.success(flash.success);
        }
        if (flash?.error) {
            showAlert(flash.error, 'error'); // Or use toast.error(flash.error);
        }
    }, [flash]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (stage) => {
        setData("stage", stage);
    };

    const clearFilters = () => {
        reset('search', 'stage'); // Reset search and stage to initial or empty
        setData('stage', '1'); // Or set to a default stage
    };

    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this expense? This action cannot be undone.",
            isAlert: false,
            postToDeleteId: id,
            type: 'confirmation', // Added type for styling modal
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, postToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        if (modalState.postToDeleteId) {
            router.delete(route("expenses1.destroy", modalState.postToDeleteId), {
                onSuccess: () => {
                    // Flash message will be handled by useEffect
                },
                onError: (errors) => {
                    console.error("Failed to delete post:", errors);
                    showAlert("There was an error deleting the expense. Please try again.", 'error');
                },
                onFinish: () => {
                    setModalState({ isOpen: false, message: '', isAlert: false, postToDeleteId: null });
                }
            });
        }
    };

    const showAlert = (message, type = 'info') => { // type can be 'info', 'success', 'error', 'warning'
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            postToDeleteId: null,
            type: type,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user prop
            header={
                // The "Create Expense" Link has been removed from here
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Expense List
                </h2>
            }
        >
            <Head title="Expense List" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        {/* Filter Section */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Search by Supplier
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            id="search"
                                            name="search"
                                            placeholder="Enter supplier name..."
                                            value={data.search}
                                            onChange={handleSearchChange}
                                            className={`block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-900 dark:text-gray-300 ${errors.search ? "border-red-500" : ""}`}
                                        />
                                        {processing && data.search && ( // Show spinner only if search has text
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    {errors.search && <p className="mt-1 text-xs text-red-500">{errors.search}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Filter by Stage
                                    </label>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {Object.entries(postStageConfig).map(([key, { label, className }]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                                    data.stage === key
                                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-700'
                                                        : `${className} dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500`
                                                }`}
                                                onClick={() => handleStageChange(key)}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                        {(data.search || data.stage !== "1") && ( // Show clear only if filters are active
                                            <button
                                                onClick={clearFilters}
                                                className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faTimesCircle} className="mr-1" />
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                             {/* You might want to add the Create button here if it's still needed on the page */}
                             <div className="mt-4 flex justify-end">
                                <Link
                                    href={route("expenses1.create")}
                                    className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 active:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create Expense
                                </Link>
                            </div>
                        </div>


                        {/* Posts Table */}
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
                                    {processing && posts.data.length === 0 && ( // Show full table loader only if it's initial load/full filter change
                                        <tr>
                                            <td colSpan="4" className="text-center py-10">
                                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-gray-400" />
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading expenses...</p>
                                            </td>
                                        </tr>
                                    )}
                                    {!processing && posts.data.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No expenses found. Try adjusting your filters or
                                                <Link href={route("expenses1.create")} className="text-indigo-600 hover:underline ml-1">create a new one</Link>.
                                            </td>
                                        </tr>
                                    )}
                                    {posts.data.map((post) => (
                                        <tr key={post.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                {post.description || <span className="italic text-gray-400">N/A</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {parseFloat(post.total).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                    postStageConfig[post.stage]?.className || postStageConfig[1].className // Default to draft if stage unknown
                                                }`}>
                                                    {postStageConfig[post.stage]?.label || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <Link
                                                        href={route("expenses1.edit", post.id)}
                                                        className="font-medium text-blue-600 dark:text-blue-500 hover:underline p-1"
                                                        title="Edit"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(post.id)}
                                                        className="font-medium text-red-600 dark:text-red-500 hover:underline p-1"
                                                        title="Delete"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination (Assuming Inertia handles this via props.links) */}
                        {posts.links && posts.links.length > 3 && (
                             <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
                                <div className="text-sm text-gray-700 dark:text-gray-400">
                                    Showing <span className="font-medium">{posts.from}</span> to <span className="font-medium">{posts.to}</span> of <span className="font-medium">{posts.total}</span> results
                                </div>
                                <div className="flex justify-end">
                                    {posts.links.map((link, index) => (
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
                                                ${index === posts.links.length - 1 ? 'rounded-r-md' : ''}
                                                ${!link.url ? 'cursor-not-allowed opacity-50' : ''}
                                            `}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            as={!link.url ? 'span' : 'a'} // Render as span if no URL
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
                onConfirm={modalState.isAlert ? handleModalClose : handleModalConfirm} // Only confirm action for non-alerts
                title={modalState.isAlert ? (modalState.type === 'success' ? 'Success' : modalState.type === 'error' ? 'Error' : 'Alert') : "Confirm Deletion"}
                message={modalState.message}
                isAlert={modalState.isAlert}
                type={modalState.type} // Pass type for conditional styling in Modal
            />
        </AuthenticatedLayout>
    );
}