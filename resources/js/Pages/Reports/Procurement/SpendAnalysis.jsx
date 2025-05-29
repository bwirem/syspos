import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
// To use charts, you'd import your chosen library e.g.:
// import { Pie } from 'react-chartjs-2';
// import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
// ChartJS.register(ArcElement, Tooltip, Legend);

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faRedo, faChartPie, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

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


export default function SpendAnalysisReport({ auth, spendAnalysis = [], suppliers = [], categories = [], filters = {}, flash }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        start_date: filters.start_date || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 10),
        end_date: filters.end_date || new Date().toISOString().slice(0, 10),
        supplier_id: filters.supplier_id || '',
        category_id: filters.category_id || '',
        group_by: filters.group_by || 'supplier',
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.procurement.spend_analysis'), {
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

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Spend Analysis Report</h2>}
        >
            <Head title="Spend Analysis" />

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
                                    <label htmlFor="group_by" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group Spend By</label>
                                    <select name="group_by" id="group_by" value={data.group_by} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="supplier">Supplier</option>
                                        <option value="category">Product Category</option>
                                        <option value="product">Product</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier (Optional)</label>
                                    <select name="supplier_id" id="supplier_id" value={data.supplier_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Suppliers</option>
                                        {(suppliers || []).map(s => <option key={s.id} value={s.id}>{getSupplierName(s)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category (Optional)</label>
                                    <select name="category_id" id="category_id" value={data.category_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Categories</option>
                                        {(categories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end space-x-2 pt-5 md:pt-0">
                                    <button type="submit" disabled={processing} className={`w-full md:w-auto ${btnIndigoClass}`}>
                                        <FontAwesomeIcon icon={faFilter} className="mr-2 h-4 w-4" />
                                        {processing ? 'Analyzing...' : 'Analyze Spend'}
                                    </button>
                                     <button type="button" onClick={resetFilters} className={`w-full md:w-auto ${btnGrayClass}`}>
                                        <FontAwesomeIcon icon={faRedo} className="mr-2 h-4 w-4" /> Reset
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Corrected Flash Message Display */}
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
                                <p className="mt-2">Analyzing Spend Data...</p>
                            </div>
                        )}

                        {!processing && spendAnalysis && spendAnalysis.length > 0 ? (
                            <div className="space-y-8">
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                        Spend Analysis by {data.group_by.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Period: {new Date(data.start_date + 'T00:00:00').toLocaleDateString()} - {new Date(data.end_date + 'T00:00:00').toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Placeholder for Chart */}
                                {/* ... chart JSX ... */}


                                <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                                    <table className="min-w-full divide-y dark:divide-gray-600">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className={thDefaultClass}>
                                                    {data.group_by.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Name
                                                </th>
                                                <th className={`${thDefaultClass} text-right`}>Total Spend</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">
                                            {spendAnalysis.map((item) => (
                                                <tr key={item.entity_id || item.entity_name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className={tdDefaultClass}>{item.entity_name}</td>
                                                    <td className={`${tdDefaultClass} text-right`}>{formatCurrency(item.total_spend)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-8 py-10">No spend data found for the selected criteria.</p>
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