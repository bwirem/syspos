import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react'; // Link not used in this specific file for now
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faStore, faUser, faFilter, faPrint, faRedo, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount, currencyCode = 'TZS') => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || amount === null || amount === undefined) return `${currencyCode} 0.00`;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return parsedAmount.toLocaleString(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function EodSummaryReport({ auth, reportData, stores, users, filters, flash }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        report_date: filters.report_date || new Date().toISOString().slice(0, 10),
        store_id: filters.store_id || '',
        user_id: filters.user_id || '',
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // The 'get' method from useForm automatically sends the current 'data' object
        get(route('reports.eod.summary'), { // data is implicitly sent
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        setData({ // Reset to initial page load defaults
            report_date: new Date().toISOString().slice(0, 10),
            store_id: '',
            user_id: '',
        });
        // To immediately refetch with these defaults (optional):
        // get(route('reports.eod.summary'), { report_date: new Date().toISOString().slice(0, 10) }, { preserveState: true, preserveScroll: true });
    };

    // Check if reportData is not null and has some content to display
    const hasMeaningfulReportData = reportData && (
        reportData.number_of_transactions > 0 ||
        reportData.overall_total_collected > 0 ||
        (reportData.payment_method_summary && reportData.payment_method_summary.length > 0)
    );

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">End of Day (EOD) Report</h2>}
        >
            <Head title="EOD Report" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-end">
                                <div>
                                    <label htmlFor="report_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Report Date <span className="text-red-500">*</span></label>
                                    <input type="date" name="report_date" id="report_date" value={data.report_date} onChange={handleInputChange} className="mt-1 block w-full form-input rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" required />
                                    {errors.report_date && <p className="text-xs text-red-500 mt-1">{errors.report_date}</p>}
                                </div>
                                <div>
                                    <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store (Optional)</label>
                                    <select name="store_id" id="store_id" value={data.store_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Stores</option>
                                        {(stores || []).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cashier (Optional)</label>
                                    <select name="user_id" id="user_id" value={data.user_id} onChange={handleInputChange} className="mt-1 block w-full form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                        <option value="">All Cashiers</option>
                                        {(users || []).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end space-x-2 pt-5 md:pt-0">
                                    <button type="submit" disabled={processing} className="w-full md:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                                        <FontAwesomeIcon icon={faFilter} className="mr-2 h-4 w-4" />
                                        {processing ? 'Generating...' : 'Generate'}
                                    </button>
                                    <button type="button" onClick={resetFilters} className="w-full md:w-auto inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-500">
                                        <FontAwesomeIcon icon={faRedo} className="mr-2 h-4 w-4" /> Reset
                                    </button>
                                </div>
                            </div>
                        </form>

                        {flash?.success && (
                            <div className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                                {flash.error}
                            </div>
                        )}

                        {processing && (
                            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                                <p className="mt-2">Generating Report Data...</p>
                            </div>
                        )}

                        {!processing && reportData && (
                            <div className="space-y-6 printable-content">
                                <div className="text-center py-4 border-b dark:border-gray-700">
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{reportData.report_title}</h3>
                                    <p className="text-lg text-gray-600 dark:text-gray-300">{reportData.report_date_formatted}</p>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        <span>Store: {reportData.store_name}</span>
                                        <span className="mx-2">|</span>
                                        <span>Cashier: {reportData.cashier_name}</span>
                                    </div>
                                </div>

                                {hasMeaningfulReportData ? (
                                    <>
                                        <ReportSection title="Sales Summary">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <SummaryItem label="Gross Sales" value={formatCurrency(reportData.total_gross_sales)} />
                                                <SummaryItem label="Total Discounts" value={formatCurrency(reportData.total_discounts)} />
                                                <SummaryItem label="Net Sales" value={formatCurrency(reportData.total_net_sales)} className="font-semibold text-lg" />
                                                <SummaryItem label="Transactions" value={reportData.number_of_transactions} />
                                                <SummaryItem label="Total Paid (from Sales Rec)" value={formatCurrency(reportData.total_paid_from_sales)} />
                                                <SummaryItem label="Total Collected (by Pmt Types)" value={formatCurrency(reportData.overall_total_collected)} className="font-semibold text-lg" />
                                            </div>
                                        </ReportSection>

                                        {reportData.payment_method_summary && reportData.payment_method_summary.length > 0 && (
                                            <ReportSection title="Payments Received by Method">
                                                <div className="overflow-x-auto rounded-md border dark:border-gray-700">
                                                    <table className="min-w-full divide-y dark:divide-gray-700">
                                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment Method</th>
                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Transactions</th>
                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">
                                                            {reportData.payment_method_summary.map(pmt => (
                                                                <tr key={pmt.payment_type_id}>
                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{pmt.payment_type_name}</td>
                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">{pmt.transaction_count}</td>
                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">{formatCurrency(pmt.total_amount)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                                                            <tr>
                                                                <th colSpan="2" className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">Overall Total Collected</th>
                                                                <td className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(reportData.overall_total_collected)}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </ReportSection>
                                        )}

                                        <ReportSection title="Cash Reconciliation (Simplified)">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                <ReconItem label="Opening Float" value={formatCurrency(reportData.opening_float)} />
                                                <ReconItem label="Cash Sales Collected" value={formatCurrency(reportData.cash_collected_sales)} />
                                                <ReconItem label="Cash Payouts (-)" value={formatCurrency(reportData.cash_payouts)} />
                                                <ReconItem label="Expected Cash in Drawer" value={formatCurrency(reportData.expected_cash_in_drawer)} className="font-bold border-t pt-2 mt-2 dark:border-gray-600" />
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Note: Opening Float and Payouts are placeholders. Integrate with cash management for accuracy.</p>
                                        </ReportSection>

                                        <div className="mt-8 text-right">
                                            <button onClick={() => window.print()} className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600">
                                                <FontAwesomeIcon icon={faPrint} className="mr-2" /> Print Report
                                            </button>
                                        </div>
                                    </>
                                ) : ( // reportData exists, but no meaningful content (e.g., no transactions)
                                    <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                        No transactions found for {reportData.report_date_formatted} with the current filters.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* This condition handles the very initial load IF controller didn't send reportData or it was explicitly null & not processing */}
                        {!processing && !reportData && (
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                Please select a date and click "Generate" to view the EOD report.
                            </p>
                        )}

                        {/* Display Inertia form errors */}
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

// Helper components (ensure these are defined or imported if they are in separate files)
const ReportSection = ({ title, children }) => (
    <div className="pt-4 mt-4 border-t dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
        {children}
    </div>
);

const SummaryItem = ({ label, value, className = "" }) => (
    <div className={`p-3 rounded ${className}`}>
        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{label}</dt>
        <dd className={`mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100 ${className}`}>{value}</dd>
    </div>
);

const ReconItem = ({ label, value, className = "" }) => (
     <div className={`flex justify-between py-1 ${className}`}>
        <dt className="text-gray-600 dark:text-gray-400">{label}:</dt>
        <dd className="text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
);