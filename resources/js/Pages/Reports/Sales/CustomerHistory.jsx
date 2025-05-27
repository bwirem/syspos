import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react'; // Removed useState as useForm handles state
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faCalendarAlt, faFilter, faRedo, faReceipt } from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount, currencyCode = 'TZS') => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return `${currencyCode} 0.00`;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return parsedAmount.toLocaleString(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function CustomerSalesReport({ auth, reportData, customers, filters }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        customer_id: filters.customer_id || '',
        start_date: filters.start_date || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10), // Default to 1 year ago
        end_date: filters.end_date || new Date().toISOString().slice(0, 10), // Default to today
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.customer_id) {
            // Optionally show an alert or set a form error
            setData('errors', { customer_id: 'Please select a customer.' });
            return;
        }
        setData('errors', {}); // Clear previous errors
        get(route('reports.customer.history'), { // Ensure route name is correct
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        reset(); // Resets form to initial values from useForm
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Customer Sales History</h2>}
        >
            <Head title="Customer Sales History" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-end">
                                <div className="lg:col-span-2">
                                    <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer <span className="text-red-500">*</span></label>
                                    <select name="customer_id" id="customer_id" value={data.customer_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" required>
                                        <option value="">Select Customer...</option>
                                        {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.display_name}</option>)}
                                    </select>
                                    {errors.customer_id && <p className="text-xs text-red-500 mt-1">{errors.customer_id}</p>}
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
                            </div>
                            <div className="flex items-center justify-start gap-x-3 mt-4">
                                <button type="submit" disabled={processing || !data.customer_id} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                                    <FontAwesomeIcon icon={faFilter} className="mr-2 h-4 w-4" />
                                    {processing ? 'Generating...' : 'Generate Report'}
                                </button>
                                <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-500">
                                    <FontAwesomeIcon icon={faRedo} className="mr-2 h-4 w-4" /> Reset
                                </button>
                            </div>
                        </form>

                        {reportData && reportData.customer_details ? (
                            <div className="space-y-6">
                                <div className="p-4 border-b dark:border-gray-700">
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                        {reportData.report_title}
                                    </h3>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        <p><strong>Period:</strong> {reportData.start_date_formatted} to {reportData.end_date_formatted}</p>
                                        <p><strong>Customer Type:</strong> {reportData.customer_details.type}</p>
                                        {reportData.customer_details.email && <p><strong>Email:</strong> {reportData.customer_details.email}</p>}
                                        {reportData.customer_details.phone && <p><strong>Phone:</strong> {reportData.customer_details.phone}</p>}
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <SummaryValueCard title="Total Amount Spent" value={formatCurrency(reportData.total_amount_spent)} />
                                    <SummaryValueCard title="Number of Transactions" value={reportData.number_of_transactions} />
                                    <SummaryValueCard title="Total Discount Received" value={formatCurrency(reportData.total_discount_received)} />
                                </div>

                                {/* Sales History Table */}
                                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Transaction History</h4>
                                {reportData.sales_history && reportData.sales_history.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                            <thead className="bg-gray-100 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Receipt #</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice #</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Items Qty</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Due</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Discount</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Paid</th>
                                                    {/* <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Items</th> */}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {reportData.sales_history.map(sale => (
                                                    <tr key={sale.id}>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{sale.transdate}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{sale.receipt_no}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{sale.invoice_no || '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{sale.items_count}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(sale.total_due)}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(sale.discount)}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(sale.total_paid)}</td>
                                                        {/* <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={sale.items_summary}>{sale.items_summary}</td> */}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-4">No sales transactions found for this customer in the selected period.</p>
                                )}
                            </div>
                        ) : (
                             !processing && data.customer_id && // Show if customer selected but no data yet (after submit)
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No data to display. Click "Generate Report" or adjust filters.</p>
                        )}
                         {!data.customer_id && !processing && ( // Initial state prompt
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                Please select a customer to generate their sales history.
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

// Simple Card component for summary values
const SummaryValueCard = ({ title, value }) => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">{value}</p>
    </div>
);