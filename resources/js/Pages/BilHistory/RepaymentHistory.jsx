import React, { useEffect, useCallback, useRef } from "react";
import { Head, Link, useForm, router as inertiaRouter } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEye } from "@fortawesome/free-solid-svg-icons"; // faTrash icon removed
import "@fortawesome/fontawesome-svg-core/styles.css";

const DEBOUNCE_DELAY = 300;

// Default props for safety
const defaultRepayments = { data: [], links: [], meta: {} };
const defaultFilters = { search: '', start_date: '', end_date: '' };

export default function Index({ auth, repayments = defaultRepayments, filters = defaultFilters }) {
    // Simplified useForm hook, as void-related logic has been removed.
    const {
        data: filterCriteria,
        setData: setFilterCriteria,
        errors: filterErrors,
    } = useForm({
        search: filters.search || "",
        start_date: filters.start_date, // Guaranteed by the updated controller
        end_date: filters.end_date,     // Guaranteed by the updated controller
    });

    const searchTimeoutRef = useRef(null);

    // Effect for handling debounced filtering
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            inertiaRouter.get(
                route("billing4.repaymenthistory"),
                filterCriteria,
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
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Repayments History</h2>}
        >
            <Head title="Repayments History" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            {/* Filter Section */}
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={filterCriteria.start_date}
                                        onChange={handleFilterChange}
                                        className={`rounded-md border-gray-300 py-2 px-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${filterErrors.start_date ? "border-red-500" : ""}`}
                                    />
                                    <span className="text-gray-500">to</span>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={filterCriteria.end_date}
                                        onChange={handleFilterChange}
                                        className={`rounded-md border-gray-300 py-2 px-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${filterErrors.end_date ? "border-red-500" : ""}`}
                                    />
                                </div>
                                <div className="relative flex items-center">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="search"
                                        id="search-repayments"
                                        placeholder="Search by customer or invoice"
                                        value={filterCriteria.search}
                                        onChange={handleFilterChange}
                                        className={`block w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64 ${filterErrors.search ? "border-red-500" : ""}`}
                                    />
                                </div>
                            </div>

                            {/* Repayments Table */}
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
                                                        {repayment.customer?.customer_type === 'individual' ?
                                                            `${repayment.customer?.first_name || ''} ${repayment.customer?.surname || ''}`.trim() :
                                                            repayment.customer?.company_name || 'N/A'
                                                        }
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                                                        {repayment.items?.map(item => item.invoiceno).join(', ') || 'N/A'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {formatCurrency(repayment.totalpaid, repayment.currency_code)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center">
                                                            <Link
                                                                href={route("billing4.preview", repayment.id)}
                                                                className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                                                                title="Preview Repayment"
                                                            >
                                                                <FontAwesomeIcon icon={faEye} className="mr-1.5 h-3 w-3" />
                                                                Preview
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">
                                                    No repayments found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Modal for voiding has been removed from this component */}
        </AuthenticatedLayout>
    );
}