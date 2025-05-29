import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react'; // Link might not be needed if no direct links from table
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faRedo, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';

// Helper for Tailwind classes (optional)
const thDefaultClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
const tdDefaultClass = "px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200";
const btnIndigoClass = "inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50";
const btnGrayClass = "inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-500";

export default function ReorderLevelReport({ auth, lowStockItems = [], stores = [], categories = [], filters = {}, flash }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        store_id: filters.store_id || '',
        category_id: filters.category_id || '',
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.inventory.reorder'), { // Ensure this route name is correct
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        reset();
        // Optionally refetch with empty filters:
        // get(route('reports.inventory.reorder'), {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Reorder Level Report</h2>}
        >
            <Head title="Reorder Level Report" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 items-end">
                                <div>
                                    <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store</label>
                                    <select name="store_id" id="store_id" value={data.store_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Stores</option>
                                        {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                    <select name="category_id" id="category_id" value={data.category_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Categories</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
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
                                <p className="mt-2">Loading Reorder Level Data...</p>
                            </div>
                        )}

                        {!processing && lowStockItems && lowStockItems.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                                <table className="min-w-full divide-y dark:divide-gray-600">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className={thDefaultClass}>Product Name</th>
                                            <th className={thDefaultClass}>Category</th>
                                            <th className={thDefaultClass}>Store</th>
                                            <th className={`${thDefaultClass} text-right`}>Current Quantity</th>
                                            <th className={`${thDefaultClass} text-right`}>Reorder Level</th>
                                            <th className={`${thDefaultClass} text-right`}>Shortfall / To Order</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">
                                        {lowStockItems.map((item) => {
                                            const shortfall = (item.reorder_level || 0) - (item.current_quantity || 0);
                                            return (
                                                <tr key={`${item.id}-${item.store_id}`} className={shortfall > 0 ? "bg-red-50 dark:bg-red-900/20" : ""}>
                                                    <td className={tdDefaultClass}>{item.product_name}</td>
                                                    <td className={tdDefaultClass}>{item.category_name || 'N/A'}</td>
                                                    <td className={tdDefaultClass}>{item.store_name || 'N/A'}</td> {/* Added from controller */}
                                                    <td className={`${tdDefaultClass} text-right`}>{item.current_quantity}</td>
                                                    <td className={`${tdDefaultClass} text-right`}>{item.reorder_level}</td>
                                                    <td className={`${tdDefaultClass} text-right font-medium ${shortfall > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                        {shortfall > 0 ? shortfall : 'OK'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-8 py-10">No items found at or below reorder level for the selected criteria.</p>
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