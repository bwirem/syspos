import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router as inertiaRouter } from "@inertiajs/react"; // Import router and alias it
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faEye,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal.jsx'; // Assuming @ alias

const DEBOUNCE_DELAY = 300;

// Default props to prevent errors if props are not passed (though Inertia usually provides them)
const defaultRepayments = { data: [], links: [], meta: {} };
const defaultFilters = {};

export default function Index({ auth, repayments = defaultRepayments, filters = defaultFilters }) {
    const {
        data: filterCriteria,
        setData: setFilterCriteria,
        errors: filterErrors, // Errors related to filter form fields if any (rare for GET)
        processing: formProcessing, // General processing state from useForm
        delete: destroyRepaymentAction, // Aliased delete method
    } = useForm({
        search: filters.search || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        repaymentToVoidId: null,
    });

    const searchTimeoutRef = useRef(null);

    // Effect for fetching data (debounced search)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            inertiaRouter.get(
                route("billing4.repaymenthistory"),
                {
                    search: filterCriteria.search,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, DEBOUNCE_DELAY);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [filterCriteria.search]);

    const handleSearchChange = useCallback((e) => {
        setFilterCriteria("search", e.target.value);
    }, [setFilterCriteria]);

    const handleVoidClick = useCallback((repayment) => {
        const customerName = repayment.customer?.customer_type === 'individual'
            ? `${repayment.customer?.first_name || ''} ${repayment.customer?.other_names || ''} ${repayment.customer?.surname || ''}`.replace(/\s+/g, ' ').trim() || 'N/A'
            : repayment.customer?.company_name || 'N/A';

        setModalState({
            isOpen: true,
            message: `Are you sure you want to void this repayment for ${customerName}? This action cannot be undone.`,
            isAlert: false,
            repaymentToVoidId: repayment.id,
        });
    }, []);

    const handleModalClose = useCallback(() => {
        setModalState({ isOpen: false, message: '', isAlert: false, repaymentToVoidId: null });
    }, []);

    const showAlert = useCallback((message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            repaymentToVoidId: null,
        });
    }, []);

    const handleModalConfirm = useCallback(() => {
        if (modalState.repaymentToVoidId) {
            destroyRepaymentAction(route("billing4.destroy", modalState.repaymentToVoidId), {
                preserveScroll: true,
                onSuccess: () => {
                    handleModalClose();
                    // Consider using Inertia flash messages for success feedback
                },
                onError: (errorResponse) => {
                    console.error("Failed to void repayment:", errorResponse);
                    const errorMessage = typeof errorResponse === 'string' ? errorResponse : (errorResponse?.message || Object.values(errorResponse).join(' ') || "An unknown error occurred.");
                    showAlert(`Failed to void repayment: ${errorMessage}. Please try again.`);
                },
            });
        }
    }, [destroyRepaymentAction, modalState.repaymentToVoidId, handleModalClose, showAlert]);

    const formatCurrency = (amount, currencyCodeParam = 'TZS') => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return 'N/A';
        return parsedAmount.toLocaleString(undefined, {
            style: 'currency',
            currency: currencyCodeParam,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Repayments History</h2>}
        >
            <Head title="Repayments History" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex items-center space-x-2">
                                    <div className="relative flex items-center">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            id="search-repayments" // Added id for label association (optional)
                                            placeholder="Search by customer or invoice"
                                            value={filterCriteria.search}
                                            onChange={handleSearchChange}
                                            className={`block w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64 ${filterErrors.search ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                </div>
                                {/* Add "Create Repayment" button if applicable */}
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Invoice(s) Paid</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Amount Paid</th> 
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {repayments.data && repayments.data.length > 0 ? (
                                            repayments.data.map((repayment) => (
                                                <tr key={repayment.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                                                        {repayment.created_at ? new Date(repayment.created_at).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {repayment.customer?.customer_type === 'individual' ? (
                                                            `${repayment.customer?.first_name || ''} ${repayment.customer?.other_names || ''} ${repayment.customer?.surname || ''}`.replace(/\s+/g, ' ').trim() || 'N/A'
                                                        ) : (
                                                            repayment.customer?.company_name || 'N/A'
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                                                        {/* Assuming repayment.items is an array of paid invoice details */}
                                                        {repayment.items && repayment.items.length > 0
                                                            ? repayment.items.map(item => item.invoiceno).join(', ')
                                                            : 'N/A'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {formatCurrency(repayment.totalpaid, repayment.currency_code)}
                                                    </td> 
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link
                                                                href={route("billing4.preview", repayment.id)}
                                                                className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                                                                title="Preview Repayment"
                                                            >
                                                                <FontAwesomeIcon icon={faEye} className="mr-1.5 h-3 w-3" />
                                                                Preview
                                                            </Link>
                                                            {/* Conditionally show Void button based on repayment status or policy */}
                                                            <button
                                                                onClick={() => handleVoidClick(repayment)}
                                                                className="flex items-center rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                                                                disabled={formProcessing && modalState.repaymentToVoidId === repayment.id}
                                                                title="Void Repayment"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} className="mr-1.5 h-3 w-3" />
                                                                Void
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">
                                                    No repayments found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* TODO: Add Pagination (e.g., <Pagination links={repayments.links} />) */}
                        </div>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={modalState.isAlert ? null : handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Void Repayment"}
                message={modalState.message}
                isAlert={modalState.isAlert}
                isProcessing={formProcessing && modalState.repaymentToVoidId !== null}
                confirmButtonText={modalState.isAlert ? "OK" : (formProcessing ? "Voiding..." : "Confirm Void")}
            />
        </AuthenticatedLayout>
    );
}