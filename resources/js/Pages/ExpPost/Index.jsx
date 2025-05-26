import React, { useEffect, useState, useCallback } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout"; // Adjust path if needed
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash, faSpinner, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { debounce } from 'lodash';

import Modal from '../../Components/CustomModal.jsx'; // Adjust path if needed

export default function Index({ auth, posts, filters, flash }) {
    const { data, setData, get, errors, processing, reset } = useForm({
        search: filters.search || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        postToDeleteId: null,
        type: 'info',
    });

    const debouncedSearch = useCallback(
        debounce((searchValue) => {
            get(route("expenses0.index", { search: searchValue }), {
                preserveState: true,
                preserveScroll: true,
            });
        }, 300),
        [get]
    );

    useEffect(() => {
        debouncedSearch(data.search);
        return () => debouncedSearch.cancel();
    }, [data.search, debouncedSearch]);

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

    const clearFilters = () => {
        reset('search');
    };

    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this expense? This action cannot be undone.",
            isAlert: false,
            postToDeleteId: id,
            type: 'confirmation',
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, postToDeleteId: null, type: 'info' });
    };

    const handleModalConfirm = async () => {
        if (modalState.postToDeleteId) {
            router.delete(route("expenses0.destroy", modalState.postToDeleteId), {
                onSuccess: () => {
                    // Flash message handled by useEffect
                },
                onError: (errorResponse) => {
                    console.error("Failed to delete post:", errorResponse);
                    const errorMessage = errorResponse?.message || (errorResponse?.error || "There was an error deleting the expense. Please try again.");
                    showAlert(errorMessage, 'error');
                },
                onFinish: () => {
                    if (!modalState.isAlert) {
                        setModalState({ isOpen: false, message: '', isAlert: false, postToDeleteId: null, type: 'info' });
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
            postToDeleteId: null,
            type: type,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Expense List
                </h2>
            }
        >
            <Head title="Expense List" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">

                        {/* Filter Section & Create Button */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                                {/* Search Input and Clear Button Container */}
                                <div className="flex-grow"> {/* Takes available space */}
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Search by Description
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-grow"> {/* Input takes available space within this inner flex */}
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
                                                <span className="hidden md:inline ml-1">Clear</span>
                                            </button>
                                        )}
                                    </div>
                                    {errors.search && <p className="mt-1 text-xs text-red-500">{errors.search}</p>}
                                </div>

                                {/* Create Expense Button */}
                                <div className="flex-shrink-0 mt-4 md:mt-0">
                                    <Link
                                        href={route("expenses0.create")}
                                        className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 active:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150 h-[38px]"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create Expense
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Posts Table */}
                        <div className="overflow-x-auto relative shadow-md sm:rounded-lg border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Description</th>
                                        <th scope="col" className="px-6 py-3 text-right">Total</th>
                                        <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processing && (posts.data.length === 0 || data.search) && (
                                        <tr>
                                            <td colSpan="3" className="text-center py-10">
                                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-gray-400" />
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading expenses...</p>
                                            </td>
                                        </tr>
                                    )}
                                    {!processing && posts.data.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No expenses found. Try adjusting your search or 
                                                <Link href={route("expenses0.create")} className="text-indigo-600 hover:underline">create a new one</Link>.
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
                                                <div className="flex items-center justify-center space-x-2">
                                                    <Link
                                                        href={route("expenses0.edit", post.id)}
                                                        className="font-medium text-blue-600 dark:text-blue-500 hover:underline p-1"
                                                        title="Edit"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(post.id)}
                                                        className="font-medium text-red-600 dark:text-red-500 hover:underline p-1"
                                                        title="Delete"
                                                        type="button"
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

                        {/* Pagination */}
                        {posts.links && posts.links.length > 3 && (
                             <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
                                <div className="text-sm text-gray-700 dark:text-gray-400">
                                    Showing <span className="font-medium">{posts.from || 0}</span> to <span className="font-medium">{posts.to || 0}</span> of <span className="font-medium">{posts.total || 0}</span> results
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
                title={modalState.isAlert ? (modalState.type === 'success' ? 'Success' : modalState.type === 'error' ? 'Error' : 'Notice') : "Confirm Deletion"}
                message={modalState.message}
                isAlert={modalState.isAlert}
                type={modalState.type}
            />
        </AuthenticatedLayout>
    );
}