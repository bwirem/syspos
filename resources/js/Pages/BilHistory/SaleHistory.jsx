import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faEye, // Changed from faEdit for Preview
    faTrash, // For Void, as it's a destructive action
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal.jsx'; // Assuming @ alias

const DEBOUNCE_DELAY = 300;

export default function Index({ auth, sales, filters }) {
    const { data, setData, put, errors, processing, clearErrors, reset } = useForm({
        search: filters.search || "",
        remarks: '', // For the void sale modal
    });

    const [voidModalState, setVoidModalState] = useState({
        isOpen: false,
        saleToVoid: null,
        clientRemarksError: null, // For client-side "remarks empty" check
    });

    const searchTimeoutRef = useRef(null);

    // Effect for fetching data (debounced search)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("billing3.salehistory"), {
                search: data.search,
                // 'stage' was in the original dependency array but not in useForm for billing3
            }, {
                preserveState: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [data.search]);

    const handleSearchChange = useCallback((e) => {
        setData("search", e.target.value);
    }, [setData]);

    const handleVoidClick = useCallback((sale) => {
        clearErrors('remarks'); // Clear any previous server-side remarks errors
        setData('remarks', ''); // Reset remarks in the form
        setVoidModalState({
            isOpen: true,
            saleToVoid: sale,
            clientRemarksError: null,
        });
    }, [setData, clearErrors]);

    const handleVoidModalClose = useCallback(() => {
        setVoidModalState(prev => ({ ...prev, isOpen: false, clientRemarksError: null }));
        // Optionally reset saleToVoid after animation if modal has one
        setTimeout(() => {
            setVoidModalState(prev => ({ ...prev, saleToVoid: null }));
            if (!processing) { // Don't reset remarks if a submission is in progress
                setData('remarks', '');
                clearErrors('remarks');
            }
        }, 300); // Adjust delay to match modal close animation
    }, [setData, clearErrors, processing]);

    const handleVoidModalConfirm = useCallback(() => {
        if (!data.remarks.trim()) {
            setVoidModalState(prev => ({ ...prev, clientRemarksError: 'Void remarks are required.' }));
            return;
        }
        setVoidModalState(prev => ({ ...prev, clientRemarksError: null })); // Clear client error

        if (voidModalState.saleToVoid) {
            put(route('billing3.voidsale', voidModalState.saleToVoid.id), {
                // data.remarks is already part of the form data handled by `put`
                preserveScroll: true,
                onSuccess: () => {
                    handleVoidModalClose();
                    // Inertia will re-fetch data. Flash message for success is good.
                    // reset('remarks'); // Reset only remarks field after successful submission
                },
                onError: (serverErrors) => {
                    // `errors.remarks` will be populated automatically by useForm
                    console.error('Voiding errors:', serverErrors);
                },
            });
        }
    }, [data.remarks, put, voidModalState.saleToVoid, handleVoidModalClose, reset]);


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Sales History</h2>}
        >
            <Head title="Sales History" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex items-center space-x-2">
                                    <div className="relative flex items-center">
                                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                                        <input
                                            type="text"
                                            name="search"
                                            placeholder="Search by customer name or invoice"
                                            value={data.search}
                                            onChange={handleSearchChange}
                                            className={`w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64 ${errors.search ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                </div>
                                {/* No filter tabs or create button in this version */}
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Total Due</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Total Paid</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Balance</th>
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sales.data.length > 0 ? (
                                            sales.data.map((sale) => (
                                                <tr key={sale.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {sale.customer.customer_type === 'individual' ? (
                                                            `${sale.customer.first_name} ${sale.customer.other_names ? sale.customer.other_names + ' ' : ''}${sale.customer.surname}`.trim()
                                                        ) : (
                                                            sale.customer.company_name
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {parseFloat(sale.totaldue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {parseFloat(sale.totalpaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {parseFloat(sale.totaldue - sale.totalpaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link
                                                                href={route("billing3.preview", sale.id)}
                                                                className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                                                                title="Preview Sale"
                                                            >
                                                                <FontAwesomeIcon icon={faEye} className="mr-1.5 h-3 w-3" />
                                                                Preview
                                                            </Link>
                                                            <button
                                                                onClick={() => handleVoidClick(sale)}
                                                                className="flex items-center rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                                                                disabled={processing && voidModalState.saleToVoid?.id === sale.id} // Disable only for the item being processed
                                                                title="Void Sale"
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
                                                <td colSpan="5" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">
                                                    No sales found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* TODO: Pagination if sales.links exists */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Void Confirmation Modal */}
            {voidModalState.isOpen && voidModalState.saleToVoid && (
                <Modal
                    isOpen={voidModalState.isOpen}
                    onClose={handleVoidModalClose}
                    onConfirm={handleVoidModalConfirm}
                    title="Confirm Void Sale"
                    confirmButtonText={processing ? 'Voiding...' : 'Confirm Void'}
                    isProcessing={processing} // Use processing from useForm
                >
                    <div>
                        <p className="text-sm text-gray-600">
                            Are you sure you want to void the sale for invoice{' '}
                            <strong>{voidModalState.saleToVoid.invoice_number || 'N/A'}</strong> to customer{' '}
                            <strong>
                                {voidModalState.saleToVoid.customer.customer_type === 'individual'
                                    ? `${voidModalState.saleToVoid.customer.first_name} ${voidModalState.saleToVoid.customer.other_names || ''} ${voidModalState.saleToVoid.customer.surname}`.replace(/\s+/g, ' ').trim()
                                    : voidModalState.saleToVoid.customer.company_name}
                            </strong>
                            ? This action cannot be undone.
                        </p>

                        <label htmlFor="void_remarks" className="mt-4 block text-sm font-medium text-gray-700">
                            Void Remarks <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="void_remarks"
                            rows="3"
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${ (errors.remarks || voidModalState.clientRemarksError) ? 'border-red-500' : ''}`}
                            value={data.remarks}
                            onChange={(e) => setData('remarks', e.target.value)}
                            disabled={processing}
                        />
                        {voidModalState.clientRemarksError && (
                            <p className="mt-1 text-sm text-red-600">{voidModalState.clientRemarksError}</p>
                        )}
                        {errors.remarks && (
                            <p className="mt-1 text-sm text-red-600">{errors.remarks}</p>
                        )}
                    </div>
                </Modal>
            )}
        </AuthenticatedLayout>
    );
}