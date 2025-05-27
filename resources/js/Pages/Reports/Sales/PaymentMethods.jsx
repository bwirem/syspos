import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faStore, faUser, faFilter, faRedo } from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount, currencyCode = 'TZS') => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return `${currencyCode} 0.00`;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return parsedAmount.toLocaleString(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PaymentMethodsReport({ auth, reportData, stores, users, filters }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        start_date: filters.start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        end_date: filters.end_date || new Date().toISOString().slice(0, 10),
        store_id: filters.store_id || '',
        user_id: filters.user_id || '',
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.payments.methods'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        reset();
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Payment Methods Report</h2>}
        >
            <Head title="Payment Methods Report" />

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
                                    <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store (Optional)</label>
                                    <select name="store_id" id="store_id" value={data.store_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Stores</option>
                                        {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cashier (Optional)</label>
                                    <select name="user_id" id="user_id" value={data.user_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Cashiers</option>
                                        {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end space-x-2 pt-5 md:pt-0 lg:col-span-2 justify-start md:justify-end">
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

                        {reportData && Object.keys(reportData).length > 0 && reportData.payment_summary ? (
                            <div className="space-y-6">
                                <div className="text-center p-4 border-b dark:border-gray-700">
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                        {reportData.report_title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Period: {reportData.start_date_formatted} - {reportData.end_date_formatted} <br />
                                        Store: {reportData.store_name} | Cashier: {reportData.cashier_name}
                                    </p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow text-center">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Total Collected</p>
                                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-50">{formatCurrency(reportData.overall_total_collected)}</p>
                                </div>

                                {reportData.payment_summary.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                            <thead className="bg-gray-100 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment Method</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Transaction Count</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount Collected</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {reportData.payment_summary.map(summary => (
                                                    <tr key={summary.payment_type_id}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{summary.payment_type_name}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{summary.transaction_count}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(summary.total_amount_collected)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No payment data found for the selected criteria.</p>
                                )}
                            </div>
                        ) : (
                             !processing && (filters.start_date) && // Show if filters were applied but no data
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No data to display for the current filters. Try adjusting your criteria.</p>
                        )}
                         {!reportData && !processing && !(filters.start_date) && ( // Initial state prompt
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                Please select criteria and click "Generate Report".
                            </p>
                        )}
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