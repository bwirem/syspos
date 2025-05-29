import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react'; // Added Link for potential links
import React from 'react';
import Pagination from '@/Components/Pagination'; // Assuming you have a Pagination component
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faRedo, faHistory, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

// Helper for Tailwind classes (optional)
const thDefaultClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
const tdDefaultClass = "px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200";
const btnIndigoClass = "inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50";
const btnGrayClass = "inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-500";


export default function MovementHistoryReport({ auth, movements, productsList = [], transactionTypes = [], filters = {}, flash }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        product_id: filters.product_id || '',
        start_date: filters.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10), // Default to last month
        end_date: filters.end_date || new Date().toISOString().slice(0, 10), // Default to today
        transtype: filters.transtype || '',
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.inventory.movement_history'), { // Ensure this route name is correct
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        reset(); // Resets to initial values defined in useForm
        // To immediately refetch with empty/default filters (optional):
        // get(route('reports.inventory.movement_history'), { /* initial default params */ }, { preserveState: true, preserveScroll: true });
    };

    // Helper to determine quantity display based on qty_in/qty_out for different units
    // This is a simplified example; your BILProductTransactions might have more complex unit logic
    const getQuantityDisplay = (transaction) => {
        let display = [];
        if (transaction.qtyin_1 > 0) display.push(`In U1: ${transaction.qtyin_1}`);
        if (transaction.qtyout_1 > 0) display.push(`Out U1: ${transaction.qtyout_1}`);
        if (transaction.qtyin_2 > 0) display.push(`In U2: ${transaction.qtyin_2}`);
        if (transaction.qtyout_2 > 0) display.push(`Out U2: ${transaction.qtyout_2}`);
        // Add qty_3, qty_4 if they are used
        return display.length > 0 ? display.join(', ') : '0';
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Stock Movement History</h2>}
        >
            <Head title="Stock Movement History" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8"> {/* Wider for more columns */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-4 items-end"> {/* Increased to 5 cols */}
                                <div>
                                    <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product</label>
                                    <select name="product_id" id="product_id" value={data.product_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Products</option>
                                        {productsList.map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
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
                                <div>
                                    <label htmlFor="transtype" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Type</label>
                                    <select name="transtype" id="transtype" value={data.transtype} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Types</option>
                                        {(transactionTypes || []).map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end space-x-2 pt-5 md:pt-0">
                                    <button type="submit" disabled={processing} className={`w-full md:w-auto ${btnIndigoClass}`}>
                                        <FontAwesomeIcon icon={faFilter} className="mr-2 h-4 w-4" />
                                        {processing ? 'Filtering...' : 'Filter'}
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
                                <p className="mt-2">Loading Movement History...</p>
                            </div>
                        )}

                        {!processing && movements && movements.data && movements.data.length > 0 ? (
                            <>
                                <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                                    <table className="min-w-full divide-y dark:divide-gray-600">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className={thDefaultClass}>Date</th>
                                                <th className={thDefaultClass}>Product</th>
                                                <th className={thDefaultClass}>Type</th>
                                                <th className={thDefaultClass}>Description</th>
                                                <th className={thDefaultClass}>Reference</th>
                                                <th className={`${thDefaultClass} text-right`}>Price</th>
                                                <th className={thDefaultClass}>Quantity (In/Out)</th>
                                                {/* Add other relevant columns like User if available */}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">
                                            {movements.data.map((tx) => (
                                                <tr key={tx.id}>
                                                    <td className={tdDefaultClass}>{new Date(tx.transdate).toLocaleDateString()}</td>
                                                    <td className={tdDefaultClass}>{tx.product?.name || 'N/A'}</td>
                                                    <td className={tdDefaultClass}>{tx.transtype}</td>
                                                    <td className={`${tdDefaultClass} max-w-xs truncate`} title={tx.transdescription}>{tx.transdescription || tx.sourcedescription}</td>
                                                    <td className={tdDefaultClass}>{tx.reference}</td>
                                                    <td className={`${tdDefaultClass} text-right`}>{tx.transprice !== null ? parseFloat(tx.transprice).toFixed(2) : 'N/A'}</td>
                                                    <td className={tdDefaultClass}>{getQuantityDisplay(tx)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6">
                                    <Pagination links={movements.links} />
                                </div>
                            </>
                        ) : (
                            !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-8 py-10">No stock movements found for the selected criteria.</p>
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