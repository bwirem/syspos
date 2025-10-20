import React, { useEffect, useCallback, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEye } from "@fortawesome/free-solid-svg-icons"; // faTrash icon removed
import "@fortawesome/fontawesome-svg-core/styles.css";

const DEBOUNCE_DELAY = 300;

export default function Index({ auth, sales, filters }) {
    // Simplified useForm hook, void-related fields are removed.
    const { data, setData, errors } = useForm({
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
            router.get(route("billing3.salehistory"), {
                search: data.search,
                start_date: data.start_date,
                end_date: data.end_date,
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [data.search, data.start_date, data.end_date]);

    const handleFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setData(name, value);
    }, [setData]);

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
                            {/* Filter Section */}
                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex items-center space-x-2">
                                    <input type="date" name="start_date" value={data.start_date} onChange={handleFormChange} className={`rounded-md border-gray-300 py-2 px-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.start_date ? "border-red-500" : ""}`} />
                                    <span className="text-gray-500">to</span>
                                    <input type="date" name="end_date" value={data.end_date} onChange={handleFormChange} className={`rounded-md border-gray-300 py-2 px-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.end_date ? "border-red-500" : ""}`} />
                                </div>
                                <div className="relative flex items-center">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                                    <input type="text" name="search" placeholder="Search by customer or invoice" value={data.search} onChange={handleFormChange} className={`w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64 ${errors.search ? "border-red-500" : ""}`} />
                                </div>
                            </div>

                            {/* Sales Table */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
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
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{new Date(sale.created_at).toLocaleDateString()}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">{sale.customer.customer_type === 'individual' ? `${sale.customer.first_name} ${sale.customer.surname}`.trim() : sale.customer.company_name}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">{parseFloat(sale.totaldue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">{parseFloat(sale.totalpaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">{parseFloat(sale.totaldue - sale.totalpaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center">
                                                            <Link href={route("billing3.preview", sale.id)} className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600" title="Preview Sale">
                                                                <FontAwesomeIcon icon={faEye} className="mr-1.5 h-3 w-3" /> Preview
                                                            </Link>
                                                            {/* VOID BUTTON REMOVED FROM HERE */}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="6" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">No sales found matching your criteria.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* VOID MODAL REMOVED FROM HERE */}
        </AuthenticatedLayout>
    );
}

