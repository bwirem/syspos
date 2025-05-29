import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
import Pagination from '@/Components/Pagination'; // Assuming you have a Pagination component
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faRedo, faListAlt, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount, currencyCode = 'TZS') => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || amount === null || amount === undefined) return `${currencyCode} 0.00`;
    return parsedAmount.toLocaleString(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper for Tailwind classes
const thDefaultClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
const tdDefaultClass = "px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200";
const btnIndigoClass = "inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50";
const btnGrayClass = "inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-500";


export default function ItemPurchaseHistoryReport({ auth, itemHistory, products, suppliers, filters = {}, flash }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        start_date: filters.start_date || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0, 10), // Default to last 3 months
        end_date: filters.end_date || new Date().toISOString().slice(0, 10), // Default to today
        product_id: filters.product_id || '',
        supplier_id: filters.supplier_id || '',
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.procurement.item_history'), { // Ensure this route name is correct
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        reset();
    };

    const getSupplierName = (supplier) => {
        if (!supplier) return 'N/A';
        return supplier.company_name || `${supplier.first_name || ''} ${supplier.surname || ''}`.trim() || 'Unknown Supplier';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Item Purchase History</h2>}
        >
            <Head title="Item Purchase History" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-4 items-end"> {/* 5 columns for filters + buttons */}
                                <div>
                                    <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product</label>
                                    <select name="product_id" id="product_id" value={data.product_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Products</option>
                                        {(products || []).map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                                    <select name="supplier_id" id="supplier_id" value={data.supplier_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Suppliers</option>
                                        {(suppliers || []).map(s => <option key={s.id} value={s.id}>{getSupplierName(s)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                    <input type="date" name="start_date" id="start_date" value={data.start_date} onChange={handleInputChange} className="mt-1 block w-full form-input rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />
                                    {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
                                </div>
                                <div>
                                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                    <input type="date" name="end_date" id="end_date" value={data.end_date} onChange={handleInputChange} className="mt-1 block w-full form-input rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />
                                    {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
                                </div>
                                <div className="flex items-end space-x-2 pt-5 md:pt-0">
                                    <button type="submit" disabled={processing} className={`w-full md:w-auto ${btnIndigoClass}`}>
                                        <FontAwesomeIcon icon={faFilter} className="mr-2 h-4 w-4" />
                                        {processing ? 'Filtering...' : 'Apply Filters'}
                                    </button>
                                     <button type="button" onClick={resetFilters} className={`w-full md:w-auto ${btnGrayClass}`}>
                                        <FontAwesomeIcon icon={faRedo} className="mr-2 h-4 w-4" /> Reset
                                    </button>
                                </div>
                            </div>
                        </form>

                        {flash?.success && (
                            <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                                {flash.error}
                            </div>
                        )}

                        {processing && (
                             <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                                <p className="mt-2">Loading Item Purchase History...</p>
                            </div>
                        )}

                        {!processing && itemHistory && itemHistory.data && itemHistory.data.length > 0 ? (
                            <>
                                <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                                    <table className="min-w-full divide-y dark:divide-gray-600">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className={thDefaultClass}>Purchase Date</th>
                                                <th className={thDefaultClass}>PO ID</th> {/* From purchase relation */}
                                                <th className={thDefaultClass}>Supplier</th> {/* From purchase relation */}
                                                <th className={thDefaultClass}>Product Name</th>
                                                <th className={`${thDefaultClass} text-right`}>Quantity</th>
                                                <th className={`${thDefaultClass} text-right`}>Unit Price</th>
                                                <th className={`${thDefaultClass} text-right`}>Total Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">
                                            {itemHistory.data.map((entry) => (
                                                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className={tdDefaultClass}>{formatDate(entry.purchase?.transdate)}</td>
                                                    <td className={tdDefaultClass}>
                                                        <Link href={entry.purchase ? route('procurements1.edit', entry.purchase.id) : '#'} className="text-indigo-600 hover:underline dark:text-indigo-400">
                                                            {entry.purchase?.id || 'N/A'}
                                                        </Link>
                                                    </td>
                                                    <td className={tdDefaultClass}>{getSupplierName(entry.purchase?.supplier)}</td>
                                                    <td className={tdDefaultClass}>{entry.item?.name || 'N/A'}</td>
                                                    <td className={`${tdDefaultClass} text-right`}>{entry.quantity}</td>
                                                    <td className={`${tdDefaultClass} text-right`}>{formatCurrency(entry.price)}</td>
                                                    <td className={`${tdDefaultClass} text-right`}>{formatCurrency(entry.quantity * entry.price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6">
                                    <Pagination links={itemHistory.links} />
                                </div>
                            </>
                        ) : (
                            !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-8 py-10">No item purchase history found for the selected criteria.</p>
                        )}

                        {Object.keys(errors).length > 0 && (
                           <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-md dark:bg-red-900/30 dark:border-red-700">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-red-400 dark:text-red-300" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                            Please correct the following errors:
                                        </h3>
                                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                            <ul role="list" className="list-disc pl-5 space-y-1">
                                                {Object.entries(errors).map(([field, message]) => (
                                                    <li key={field}>{message}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}