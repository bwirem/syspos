// resources/js/Pages/SystemConfiguration/InventorySetup/AdjustmentReasons/Index.jsx

import React, { useEffect, useState, useCallback } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faSearch, faPlus, faEdit, faTrash, faTimes } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import _debounce from 'lodash/debounce';

// === REQUIRED HELPER COMPONENTS (Ensure these exist in your @/Components folder) ===
import Modal from '@/Components/CustomModal';         // YOUR Modal component
import TextInput from '@/Components/TextInput';
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import DangerButton from "@/Components/DangerButton"; // Not directly used by your modal, but good for consistency elsewhere
import Pagination from "@/Components/Pagination";
// =================================================================================

const showToast = (message, type = 'success') => {
    console.log(`TOAST (${type}): ${message}`);
};

export default function Index({ auth, adjustmentreasons, filters, flash }) {
    const { data, setData, processing: formProcessing } = useForm({ // Renamed processing to avoid clash with delete button
        search: filters.search || "",
    });

    // State for the delete confirmation modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [adjustmentReasonToDelete, setAdjustmentReasonToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false); // Specific processing state for delete action

    const debouncedSearch = useCallback(
        _debounce((searchValue) => {
            router.get(
                route("systemconfiguration2.adjustmentreasons.index"),
                { search: searchValue },
                { preserveState: true, replace: true }
            );
        }, 300),
        [router]
    );

    useEffect(() => {
        if (data.search !== (filters.search || "")) {
            debouncedSearch(data.search);
        }
    }, [data.search, filters.search, debouncedSearch]);

    useEffect(() => {
        if (flash?.success) showToast(flash.success, 'success');
        if (flash?.error) showToast(flash.error, 'error');
    }, [flash]);

    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const clearSearch = () => {
        setData("search", "");
        router.get(route("systemconfiguration2.adjustmentreasons.index"), {}, { preserveState: true, replace: true });
    };

    const openDeleteConfirmationModal = (reason) => {
        console.log("Opening delete modal for:", reason);
        setAdjustmentReasonToDelete(reason);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteConfirmationModal = () => {
        setIsDeleteModalOpen(false);
        // Delay reset to avoid content flicker if modal has exit animation
        setTimeout(() => setAdjustmentReasonToDelete(null), 300);
    };

    const handleDeleteConfirm = () => {
        if (!adjustmentReasonToDelete) return;
        setIsDeleting(true); // Set deleting state

        router.delete(route("systemconfiguration2.adjustmentreasons.destroy", adjustmentReasonToDelete.id), {
            onSuccess: () => {
                // Flash message from backend will be shown by useEffect
                closeDeleteConfirmationModal();
            },
            onError: (errors) => {
                console.error("Failed to delete adjustment reason:", errors);
                const errorMessage = errors?.message || errors?.error || "Error deleting. Please try again.";
                showToast(errorMessage, 'error');
                // Optionally keep modal open on error, or close it:
                // closeDeleteConfirmationModal();
            },
            onFinish: () => {
                setIsDeleting(false); // Reset deleting state regardless of outcome
            },
            preserveScroll: true,
        });
    };

    const getActionBadgeClass = (action) => {
        switch (action?.toLowerCase()) {
            case 'add': return 'bg-green-100 text-green-800';
            case 'deduct': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Adjustment Reasons</h2>}
        >
            <Head title="Adjustment Reasons" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="relative flex-grow md:flex-grow-0">
                                    <TextInput
                                        type="text" name="search" id="search" value={data.search}
                                        className="block w-full md:w-80 pl-10 pr-10"
                                        placeholder="Search by name..." onChange={handleSearchChange} autoComplete="off"
                                    />
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    {data.search && (
                                        <button type="button" onClick={clearSearch}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            aria-label="Clear search"
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Link href={route("systemconfiguration2.index")}>
                                        <SecondaryButton className="w-full justify-center sm:w-auto">
                                            <FontAwesomeIcon icon={faHome} className="mr-2" /> Config Home
                                        </SecondaryButton>
                                    </Link>
                                    <Link href={route("systemconfiguration2.adjustmentreasons.create")}>
                                        <PrimaryButton className="w-full justify-center sm:w-auto">
                                            <FontAwesomeIcon icon={faPlus} className="mr-2" /> New Reason
                                        </PrimaryButton>
                                    </Link>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {adjustmentreasons.data.length > 0 ? (
                                            adjustmentreasons.data.map((reason) => (
                                                <tr key={reason.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{reason.name || "N/A"}</td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeClass(reason.action)}`}>
                                                            {reason.action || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <Link
                                                                href={route("systemconfiguration2.adjustmentreasons.edit", reason.id)}
                                                                className="text-indigo-600 hover:text-indigo-900 transition-colors duration-150" title="Edit"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} aria-hidden="true" />
                                                                <span className="sr-only">Edit {reason.name}</span>
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() => openDeleteConfirmationModal(reason)} // Calls the correct function
                                                                className="text-red-600 hover:text-red-900 transition-colors duration-150" title="Delete"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                                                                <span className="sr-only">Delete {reason.name}</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center text-sm text-gray-500">
                                                    No adjustment reasons found.
                                                    {filters.search && ` for search term "${filters.search}"`}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {adjustmentreasons.data.length > 0 && adjustmentreasons.links && adjustmentreasons.links.length > 3 && (
                                <div className="mt-6">
                                    <Pagination links={adjustmentreasons.links} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal - Adjusted to your Modal's props */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteConfirmationModal}
                onConfirm={handleDeleteConfirm}
                title="Delete Adjustment Reason"
                message={
                    adjustmentReasonToDelete
                        ? `Are you sure you want to delete the reason "${adjustmentReasonToDelete.name}"? This action cannot be undone.`
                        : "Are you sure you want to delete this item? This action cannot be undone."
                }
                isAlert={false} // This is a confirmation, not a simple alert
                confirmButtonText={isDeleting ? "Deleting..." : "Delete"}
                confirmButtonDisabled={isDeleting}
            >
                {/* Optional: If you need more complex content than just title/message,
                    you could add it here as children. For this case, title/message is enough.
                    Example:
                    <div className="my-2 text-sm text-gray-600">
                        <p>Item ID: {adjustmentReasonToDelete?.id}</p>
                    </div>
                */}
            </Modal>
        </AuthenticatedLayout>
    );
}