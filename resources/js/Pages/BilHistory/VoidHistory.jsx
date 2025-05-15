import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router as inertiaRouter } from "@inertiajs/react"; // Correct router import
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

// Default props to prevent errors if props are not passed
const defaultVoidSales = { data: [], links: [], meta: {} };
const defaultFilters = {};

export default function Index({ auth, voidsales = defaultVoidSales, filters = defaultFilters }) {
    const {
        data: filterCriteria,
        setData: setFilterCriteria,
        errors: filterErrors,
        processing: formProcessing, // For delete action
        delete: destroyVoidSaleRecordAction,
    } = useForm({
        search: filters.search || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        voidSaleRecordToDeleteId: null,
    });

    const searchTimeoutRef = useRef(null);

    // Effect for fetching data (debounced search)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            inertiaRouter.get(
                route("billing5.voidsalehistory"),
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

    const handleDeleteVoidSaleRecordClick = useCallback((voidsale) => {
        const customerName = voidsale.customer?.customer_type === 'individual'
            ? `${voidsale.customer?.first_name || ''} ${voidsale.customer?.other_names || ''} ${voidsale.customer?.surname || ''}`.replace(/\s+/g, ' ').trim() || 'N/A'
            : voidsale.customer?.company_name || 'N/A';

        setModalState({
            isOpen: true,
            message: `Are you sure you want to delete the record of this voided sale for ${customerName} (Invoice: ${voidsale.invoice_number || 'N/A'})? This action cannot be undone.`,
            isAlert: false,
            voidSaleRecordToDeleteId: voidsale.id,
        });
    }, []);

    const handleModalClose = useCallback(() => {
        setModalState({ isOpen: false, message: '', isAlert: false, voidSaleRecordToDeleteId: null });
    }, []);

    const showAlert = useCallback((message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            voidSaleRecordToDeleteId: null,
        });
    }, []);

    const handleModalConfirm = useCallback(() => {
        if (modalState.voidSaleRecordToDeleteId) {
            destroyVoidSaleRecordAction(route("billing5.destroy", modalState.voidSaleRecordToDeleteId), {
                preserveScroll: true,
                onSuccess: () => {
                    handleModalClose();
                    // Optionally use Inertia flash messages for success
                },
                onError: (errorResponse) => {
                    console.error("Failed to delete voided sale record:", errorResponse);
                    const errorMessage = typeof errorResponse === 'string' ? errorResponse : (errorResponse?.message || Object.values(errorResponse).join(' ') || "An unknown error occurred.");
                    showAlert(`Failed to delete record: ${errorMessage}. Please try again.`);
                },
            });
        }
    }, [destroyVoidSaleRecordAction, modalState.voidSaleRecordToDeleteId, handleModalClose, showAlert]);

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
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Voided Sales History</h2>}
        >
            <Head title="Voided Sales History" />
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
                                            id="search-voidsales"
                                            placeholder="Search by customer or invoice #"
                                            value={filterCriteria.search}
                                            onChange={handleSearchChange}
                                            className={`block w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64 ${filterErrors.search ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                </div>
                                {/* No "Create" button for a voided sales history list */}
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Invoice #</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Original Total</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Void Remarks</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Voided On</th>
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {voidsales.data && voidsales.data.length > 0 ? (
                                            voidsales.data.map((voidsale) => (
                                                <tr key={voidsale.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {voidsale.customer?.customer_type === 'individual' ? (
                                                            `${voidsale.customer?.first_name || ''} ${voidsale.customer?.other_names || ''} ${voidsale.customer?.surname || ''}`.replace(/\s+/g, ' ').trim() || 'N/A'
                                                        ) : (
                                                            voidsale.customer?.company_name || 'N/A'
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                                                        {voidsale.invoice_number || 'N/A'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {formatCurrency(voidsale.total || voidsale.totaldue, voidsale.currency_code)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={voidsale.remarks}>
                                                        {voidsale.remarks || 'N/A'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                                                        {voidsale.voided_at ? new Date(voidsale.voided_at).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link
                                                                href={route("billing5.preview", voidsale.id)}
                                                                className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                                                                title="Preview Voided Sale Details"
                                                            >
                                                                <FontAwesomeIcon icon={faEye} className="mr-1.5 h-3 w-3" />
                                                                Preview
                                                            </Link>
                                                            {/* The ability to delete a voided sale record might depend on business rules */}
                                                            <button
                                                                onClick={() => handleDeleteVoidSaleRecordClick(voidsale)}
                                                                className="flex items-center rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                                                                disabled={formProcessing && modalState.voidSaleRecordToDeleteId === voidsale.id}
                                                                title="Delete This Void Record"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} className="mr-1.5 h-3 w-3" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">
                                                    No voided sales records found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* TODO: Add Pagination (e.g., <Pagination links={voidsales.links} />) */}
                        </div>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={modalState.isAlert ? null : handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Delete Record"}
                message={modalState.message}
                isAlert={modalState.isAlert}
                isProcessing={formProcessing && modalState.voidSaleRecordToDeleteId !== null}
                confirmButtonText={modalState.isAlert ? "OK" : (formProcessing ? "Deleting..." : "Confirm Delete")}
            />
        </AuthenticatedLayout>
    );
}