import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react'; // Added Link
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faFilter, faTags, faLayerGroup, faRedo } from '@fortawesome/free-solid-svg-icons'; // Added faRedo for reset

const formatCurrency = (amount, currencyCode = 'TZS') => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return `${currencyCode} 0.00`;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return parsedAmount.toLocaleString(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SalesByItemReport({ auth, reportData, stores, items, itemGroups, filters }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        start_date: filters.start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), // Default to start of current month
        end_date: filters.end_date || new Date().toISOString().slice(0, 10), // Default to today
        group_by: filters.group_by || 'product',
        store_id: filters.store_id || '',
        item_id: filters.item_id || '',
        itemgroup_id: filters.itemgroup_id || '',
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setData(prevData => {
            const newData = {...prevData, [name]: value};
            // If group_by changes, reset item_id and itemgroup_id
            if (name === 'group_by') {
                newData.item_id = '';
                newData.itemgroup_id = '';
            }
            return newData;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // The 'get' method from useForm automatically sends the current 'data' object
        get(route('reports.sales.by_item'), { // Ensure this route name is correct
            preserveState: true, // Keep component state on navigation
            preserveScroll: true, // Keep scroll position
        });
    };

    const resetFilters = () => {
        reset(); // Resets form to initial values defined in useForm
        // Optionally, trigger a fetch with default/empty filters if needed immediately
        // get(route('reports.sales.by_item'), { start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), group_by: 'product'}, { preserveState: true, preserveScroll: true });
    };


    const isProductGrouping = data.group_by === 'product';

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Product/Service Sales Report</h2>}
        >
            <Head title="Sales by Item/Category" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 items-end">
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
                                    <label htmlFor="group_by" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group By</label>
                                    <select name="group_by" id="group_by" value={data.group_by} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="product">Product/Service</option>
                                        <option value="item_group">Item Category</option>
                                    </select>
                                    {errors.group_by && <p className="text-xs text-red-500 mt-1">{errors.group_by}</p>}
                                </div>
                                <div>
                                    <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store (Optional)</label>
                                    <select name="store_id" id="store_id" value={data.store_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Stores</option>
                                        {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                                    </select>
                                </div>
                                {isProductGrouping ? (
                                    <div>
                                        <label htmlFor="item_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Specific Product (Optional)</label>
                                        <select name="item_id" id="item_id" value={data.item_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                            <option value="">All Products</option>
                                            {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="itemgroup_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Specific Category (Optional)</label>
                                        <select name="itemgroup_id" id="itemgroup_id" value={data.itemgroup_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                            <option value="">All Categories</option>
                                            {itemGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="flex items-end space-x-2 pt-5 md:pt-0"> {/* Ensure buttons align well */}
                                    <button type="submit" disabled={processing} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                                        <FontAwesomeIcon icon={faFilter} className="mr-2 h-4 w-4" />
                                        {processing ? 'Generating...' : 'Generate Report'}
                                    </button>
                                    <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-500">
                                        <FontAwesomeIcon icon={faRedo} className="mr-2 h-4 w-4" /> Reset
                                    </button>
                                </div>
                            </div>
                        </form>

                        {reportData && Object.keys(reportData).length > 0 ? ( // Check if reportData is not null and has content
                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-100">
                                    {reportData.report_title} <br />
                                    <span className="text-base font-normal">({reportData.start_date_formatted} - {reportData.end_date_formatted})</span>
                                </h3>
                                {reportData.overall_total_sales_for_period !== undefined && (
                                    <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                                        Overall Total Sales (Filtered Period): {formatCurrency(reportData.overall_total_sales_for_period)}
                                    </p>
                                )}

                                {reportData.results && reportData.results.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                            <thead className="bg-gray-100 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        {isProductGrouping ? 'Product/Service' : 'Item Category'}
                                                    </th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Qty Sold</th>
                                                    {isProductGrouping && (
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg. Price</th>
                                                    )}
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Sales</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">% of Total Sales</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {reportData.results.map(row => (
                                                    <tr key={row.id}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{row.name}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{row.total_quantity_sold}</td>
                                                        {isProductGrouping && (
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{row.average_price !== null ? formatCurrency(row.average_price) : 'N/A'}</td>
                                                        )}
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.total_sales_amount)}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{row.percentage_of_total_sales}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No sales data found for the selected criteria.</p>
                                )}
                            </div>
                        ) : (
                             !processing && (filters.start_date || filters.group_by) && // Show if filters were applied from URL but no data
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No data to display for the current filters. Try adjusting your criteria.</p>
                        )}
                         {!reportData && !processing && !(filters.start_date || filters.group_by) && ( // Initial state prompt
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                Please select criteria and click "Generate Report".
                            </p>
                        )}
                         {/* Display Inertia form errors globally if any */}
                        {Object.keys(errors).length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                                <p className="font-semibold">Please correct the following errors:</p>
                                <ul className="list-disc list-inside mt-2">
                                    {Object.values(errors).map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}