import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faRedo, faWarehouse, faSpinner, faExclamationTriangle, faThumbsDown } from '@fortawesome/free-solid-svg-icons';

// Helper for Tailwind classes (optional)
const thDefaultClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
const tdDefaultClass = "px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200";
const btnIndigoClass = "inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50";
const btnGrayClass = "inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-500";


export default function SlowMovingReport({ auth, slowMovingItems = [], stores = [], filters = {}, flash }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        store_id: filters.store_id || '',
        period_days: filters.period_days_applied || '90', // Match controller's default
        max_sales_qty: filters.max_sales_qty_applied || '5',   // Match controller's default
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.inventory.slow_moving'), { // Ensure this route name is correct
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        reset(); // Resets to initial values from useForm (which includes filters prop from controller)
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            // Ensure dateString is in a format that new Date() can parse correctly, or adjust
            const date = new Date(dateString);
            if (isNaN(date.getTime())) { // Check if date is valid
                return 'Invalid Date';
            }
            return date.toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString; // Fallback
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Slow Moving Stock Report</h2>}
        >
            <Head title="Slow Moving Stock" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-end">
                                <div>
                                    <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store</label>
                                    <select name="store_id" id="store_id" value={data.store_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Stores</option>
                                        {(stores || []).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="period_days" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sales Period (Last X Days)</label>
                                    <input
                                        type="number"
                                        name="period_days"
                                        id="period_days"
                                        value={data.period_days}
                                        onChange={handleInputChange}
                                        min="7"
                                        className="mt-1 block w-full form-input rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                        placeholder="e.g., 90"
                                    />
                                    {errors.period_days && <p className="text-xs text-red-500 mt-1">{errors.period_days}</p>}
                                </div>
                                <div>
                                    <label htmlFor="max_sales_qty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Sales Qty (Slow if ≤)</label>
                                    <input
                                        type="number"
                                        name="max_sales_qty"
                                        id="max_sales_qty"
                                        value={data.max_sales_qty}
                                        onChange={handleInputChange}
                                        min="0"
                                        className="mt-1 block w-full form-input rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                        placeholder="e.g., 5"
                                    />
                                    {errors.max_sales_qty && <p className="text-xs text-red-500 mt-1">{errors.max_sales_qty}</p>}
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

                        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            Showing items with current stock that sold <span className="font-semibold">{data.max_sales_qty} units or less</span> in the last <span className="font-semibold">{data.period_days} days</span>.
                        </div>


                        {processing && (
                             <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                                <p className="mt-2">Loading Slow Moving Stock Data...</p>
                            </div>
                        )}

                        {!processing && slowMovingItems && slowMovingItems.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                                <table className="min-w-full divide-y dark:divide-gray-600">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className={thDefaultClass}>Product Name</th>
                                            <th className={`${thDefaultClass} text-right`}>Current Stock</th>
                                            <th className={`${thDefaultClass} text-right`}>Qty Sold (Period)</th>
                                            <th className={`${thDefaultClass} text-center`}>Last Sale Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">
                                        {slowMovingItems.map((item) => (
                                            <tr key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className={tdDefaultClass}>{item.product_name}</td>
                                                <td className={`${tdDefaultClass} text-right`}>{item.current_stock}</td>
                                                <td className={`${tdDefaultClass} text-right`}>{item.quantity_sold_in_period}</td>
                                                <td className={`${tdDefaultClass} text-center`}>{formatDate(item.last_sale_date)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-8 py-10">No slow moving items found for the selected criteria.</p>
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