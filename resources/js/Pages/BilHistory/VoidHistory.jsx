import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router as inertiaRouter } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEye } from "@fortawesome/free-solid-svg-icons"; // faTrash removed
import "@fortawesome/fontawesome-svg-core/styles.css";

const DEBOUNCE_DELAY = 300;

// Default props for safety
const defaultVoidSales = { data: [], links: [], meta: {} };
const defaultFilters = { search: '', start_date: '', end_date: '' };

// A helper component for the status badges
const RefundStatusBadge = ({ voidsale }) => {
    const totalPaid = parseFloat(voidsale.totalpaid) || 0;
    const refundedAmount = parseFloat(voidsale.refunded_amount) || 0;

    if (totalPaid === 0) {
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">N/A</span>;
    }
    if (voidsale.is_refunded) {
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Fully Refunded</span>;
    }
    if (refundedAmount > 0) {
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Partially Refunded</span>;
    }
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Pending Refund</span>;
};


export default function Index({ auth, voidsales = defaultVoidSales, filters = defaultFilters }) {
    // Simplified useForm hook, removed delete action and processing state
    const {
        data: filterCriteria,
        setData: setFilterCriteria,
        errors: filterErrors,
    } = useForm({
        search: filters.search || "",
        start_date: filters.start_date,
        end_date: filters.end_date,
    });

    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            inertiaRouter.get(
                route("billing5.voidsalehistory"),
                filterCriteria,
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, DEBOUNCE_DELAY);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [filterCriteria]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterCriteria(name, value);
    }, [setFilterCriteria]);

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
                            {/* Filter Section */}
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex items-center space-x-2">
                                    <input type="date" name="start_date" value={filterCriteria.start_date} onChange={handleFilterChange} className={`rounded-md border-gray-300 py-2 px-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${filterErrors.start_date ? "border-red-500" : ""}`} />
                                    <span className="text-gray-500">to</span>
                                    <input type="date" name="end_date" value={filterCriteria.end_date} onChange={handleFilterChange} className={`rounded-md border-gray-300 py-2 px-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${filterErrors.end_date ? "border-red-500" : ""}`} />
                                </div>
                                <div className="relative flex items-center">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" /></div>
                                    <input type="text" name="search" id="search-voidsales" placeholder="Search by customer or ref #" value={filterCriteria.search} onChange={handleFilterChange} className={`block w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64 ${filterErrors.search ? "border-red-500" : ""}`} />
                                </div>
                            </div>

                            {/* Voided Sales Table */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Customer</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Reference #</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Amount Paid</th>
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Refund Status</th>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Voided On</th>
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {voidsales.data && voidsales.data.length > 0 ? (
                                            voidsales.data.map((voidsale) => (
                                                <tr key={voidsale.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {voidsale.customer?.customer_type === 'individual' ? `${voidsale.customer?.first_name || ''} ${voidsale.customer?.surname || ''}`.trim() : voidsale.customer?.company_name || 'N/A'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{voidsale.invoiceno || voidsale.receiptno || 'N/A'}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">{formatCurrency(voidsale.totalpaid, voidsale.currency_code)}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm"><RefundStatusBadge voidsale={voidsale} /></td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{voidsale.created_at ? new Date(voidsale.created_at).toLocaleDateString() : 'N/A'}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <Link href={route("billing5.preview", voidsale.id)} className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600" title="Preview Voided Sale Details">
                                                                <FontAwesomeIcon icon={faEye} className="mr-1.5 h-3 w-3" /> Preview
                                                            </Link>
                                                            {/* The Delete button has been removed from here */}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="6" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">No voided sales records found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* The Confirmation Modal has been removed */}

        </AuthenticatedLayout>
    );
}
