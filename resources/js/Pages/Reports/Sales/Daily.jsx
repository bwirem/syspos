import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState } from 'react'; // For date picker state
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faPrint, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount, currencyCode = 'TZS') => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return `${currencyCode} 0.00`;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return parsedAmount.toLocaleString(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function DailySalesReport({ auth, reportData, filters }) {
    const { data, setData, get, processing } = useForm({
        report_date: filters.report_date || new Date().toISOString().slice(0, 10),
    });

    const handleDateChange = (e) => {
        setData('report_date', e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.sales.daily'), { // 'get' from useForm for form submission to reload data
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Daily Sales Report</h2>}
        >
            <Head title={`Daily Sales - ${reportData?.report_date_formatted || ''}`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-4">
                            <div>
                                <label htmlFor="report_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Report Date
                                </label>
                                <input
                                    type="date"
                                    id="report_date"
                                    name="report_date"
                                    value={data.report_date}
                                    onChange={handleDateChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                                {processing ? 'Generating...' : 'Generate Report'}
                            </button>
                            {/* Add Print/Export buttons here if needed */}
                        </form>

                        {reportData && (
                            <div className="space-y-8">
                                <h3 className="text-2xl font-semibold text-center text-gray-800 dark:text-gray-100">
                                    Sales Report for: {reportData.report_date_formatted}
                                </h3>

                                {/* Overall Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales Amount</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{formatCurrency(reportData.total_sales_amount)}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Transactions</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{reportData.number_of_transactions}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Discount Given</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{formatCurrency(reportData.total_discount)}</p>
                                    </div>
                                </div>

                                {/* Sales by Item Group */}
                                {reportData.sales_by_item_group && reportData.sales_by_item_group.length > 0 && (
                                    <section>
                                        <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">Sales by Item Group</h4>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                                <thead className="bg-gray-100 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Group Name</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Quantity Sold</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {reportData.sales_by_item_group.map((group, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{group.name}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{group.total_quantity}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(group.total_amount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                )}


                                {/* Aggregated Items Sold */}
                                {reportData.aggregated_items && reportData.aggregated_items.length > 0 && (
                                    <section>
                                        <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">Summary of Items Sold</h4>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                                {/* ... table head ... */}
                                                <thead className="bg-gray-100 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item Name</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item Group</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Quantity Sold</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {reportData.aggregated_items.map(item => (
                                                    <tr key={item.item_id}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{item.item_name}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{item.item_group}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{item.total_quantity}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(item.total_amount)}</td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                )}

                                {/* Detailed Transactions List (Optional) */}
                                {/* You can add a table for reportData.detailed_sales here if needed */}

                            </div>
                        )}
                        {!reportData && !processing && (
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                Please select a date to generate the report.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}