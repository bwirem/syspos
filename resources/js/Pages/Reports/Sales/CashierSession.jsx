import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faStore, faCalendarAlt, faFilter, faPrint } from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount, currencyCode = 'TZS') => {
    // ... (same as your daily report)
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return `${currencyCode} 0.00`;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return parsedAmount.toLocaleString(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function CashierSessionReport({ auth, reportData, users, stores, filters }) {
    const { data, setData, get, processing } = useForm({
        user_id: filters.user_id || '',
        store_id: filters.store_id || '',
        start_date: filters.start_date || new Date().toISOString().slice(0, 10),
        end_date: filters.end_date || new Date().toISOString().slice(0, 10),
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.user_id) {
            alert('Please select a cashier.'); // Simple validation
            return;
        }
        get(route('reports.sales.cashiersession'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Cashier Session Report</h2>}
        >
            <Head title="Cashier Session Report" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div>
                                <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cashier <span className="text-red-500">*</span></label>
                                <select name="user_id" id="user_id" value={data.user_id} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" required>
                                    <option value="">Select Cashier...</option>
                                    {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store (Optional)</label>
                                <select name="store_id" id="store_id" value={data.store_id} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                    <option value="">All Assigned Stores</option>
                                    {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                <input type="date" name="start_date" id="start_date" value={data.start_date} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                <input type="date" name="end_date" id="end_date" value={data.end_date} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />
                            </div>
                            <button type="submit" disabled={processing || !data.user_id} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                                {processing ? 'Generating...' : 'Generate Report'}
                            </button>
                        </form>

                        {reportData && data.user_id && ( // Only show if reportData exists and a user is selected
                            <div className="space-y-8">
                                <div className="text-center p-4 border-b dark:border-gray-700">
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                        {reportData.report_title}
                                    </h3>
                                    <p className="text-md text-gray-600 dark:text-gray-400">
                                        Cashier: <span className="font-medium">{reportData.cashier_name}</span>
                                        {reportData.store_name && (<span> | Store: <span className="font-medium">{reportData.store_name}</span></span>)}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-500">
                                        Period: {reportData.start_date_formatted} to {reportData.end_date_formatted}
                                    </p>
                                </div>

                                {/* Overall Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                    {/* ... Summary Cards for Gross Sales, Discounts, Net Sales, Paid Amount, Transactions ... */}
                                    <SummaryCard title="Gross Sales" value={formatCurrency(reportData.total_gross_sales)} />
                                    <SummaryCard title="Discounts" value={formatCurrency(reportData.total_discounts)} />
                                    <SummaryCard title="Net Sales" value={formatCurrency(reportData.total_net_sales)} />
                                    <SummaryCard title="Total Paid" value={formatCurrency(reportData.total_paid_amount)} />
                                    <SummaryCard title="Transactions" value={reportData.number_of_transactions} />
                                </div>

                                {/* Payments by Type */}
                                {reportData.payments_by_type && reportData.payments_by_type.length > 0 && (
                                    <ReportSection title="Payments by Type">
                                        <ReportTable
                                            headers={["Payment Type", "Transaction Count", "Total Amount"]}
                                            rows={reportData.payments_by_type.map(p => [
                                                p.payment_type,
                                                p.transaction_count,
                                                formatCurrency(p.total_amount)
                                            ])}
                                            columnAlignments={['left', 'right', 'right']}
                                        />
                                    </ReportSection>
                                )}


                                {/* Aggregated Items Sold */}
                                {reportData.aggregated_items_sold && reportData.aggregated_items_sold.length > 0 && (
                                     <ReportSection title="Summary of Items Sold">
                                        <ReportTable
                                            headers={["Item Name", "Group", "Qty Sold", "Total Amount"]}
                                            rows={reportData.aggregated_items_sold.map(item => [
                                                item.item_name,
                                                item.item_group,
                                                item.total_quantity,
                                                formatCurrency(item.total_amount)
                                            ])}
                                            columnAlignments={['left', 'left', 'right', 'right']}
                                        />
                                    </ReportSection>
                                )}

                                {/* Detailed Transactions */}
                                {reportData.detailed_transactions && reportData.detailed_transactions.length > 0 && (
                                    <ReportSection title="Detailed Transactions">
                                        <ReportTable
                                            headers={["Time", "Receipt #", "Customer", "Items Qty", "Total Due", "Discount", "Total Paid"]}
                                            rows={reportData.detailed_transactions.map(tx => [
                                                tx.transdate, // Already formatted time
                                                tx.receipt_no,
                                                tx.customer_name,
                                                tx.items_count,
                                                formatCurrency(tx.total_due),
                                                formatCurrency(tx.discount),
                                                formatCurrency(tx.total_paid)
                                            ])}
                                            columnAlignments={['left', 'left', 'left', 'right', 'right', 'right', 'right']}
                                        />
                                    </ReportSection>
                                )}

                                {!reportData.detailed_transactions?.length && !processing && data.user_id &&
                                    <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No sales data found for this cashier in the selected period/store.</p>
                                }
                            </div>
                        )}
                        {!data.user_id && !processing && (
                            <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                Please select a cashier to generate the session report.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// Helper components for cleaner report structure (optional)
const ReportSection = ({ title, children }) => (
    <section className="pt-6 mt-6 border-t dark:border-gray-700">
        <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
        {children}
    </section>
);

const SummaryCard = ({ title, value }) => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-50">{value}</p>
    </div>
);

const ReportTable = ({ headers, rows, columnAlignments = [] }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-100 dark:bg-gray-700/50">
                <tr>
                    {headers.map((header, index) => (
                        <th key={index} className={`px-4 py-2 text-${columnAlignments[index] || 'left'} text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider`}>
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className={`px-4 py-2 whitespace-nowrap text-sm text-${columnAlignments[cellIndex] || 'left'} text-gray-700 dark:text-gray-200`}>
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);