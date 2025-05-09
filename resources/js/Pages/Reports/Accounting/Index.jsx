
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBook,             // General Ledger / Journal
    faSitemap,          // Chart of Accounts (structure)
    faBalanceScale,     // Trial Balance / Balance Sheet / Reconciliation
    faFileInvoiceDollar,// Financial Statements / Invoices (AR/AP)
    faUniversity,       // Banking / Bank Reconciliation (or faLandmark)
    faCalculator,       // Calculations / Financial Analysis
    faListOl,           // Detailed Listings / Ledgers
    faCalendarDay,      // Fiscal Periods / Closing
    faPlusSquare,       // New Journal Entry
    faTasks,            // Pending Actions / Approvals
    faHistory,          // Audit Trails / Transaction History
    faCoins,            // Cash Flow
    faArrowRight,
    faFilter,
    faArchive,          // For closing periods / archiving data
    faPercentage,       // For tax management
    faFileContract,     // For contracts or agreements
    faFileSignature,    // For audit trails or signatures
} from '@fortawesome/free-solid-svg-icons';

// Reusable Card Component (ActionOrReportCard from previous examples)
function ActionOrReportCard({ title, value, description, icon, iconBgColor, linkHref, linkRoute, linkText }) {
    const { ziggy } = usePage().props;

    let href = linkHref || '#';
    if (linkRoute && typeof route === 'function' && ziggy?.routes?.[linkRoute]) {
        try { href = route(linkRoute, undefined, undefined, ziggy); }
        catch (e) {
            console.warn(`Route '${linkRoute}' not found for Card.`);
            href = linkHref || '#';
        }
    } else if (linkRoute) {
        console.warn(`Route function or Ziggy not available, or route '${linkRoute}' missing. Falling back to direct link prop.`);
        href = linkHref || '#';
    }

    const textColorClass = iconBgColor ? iconBgColor.replace('bg-', 'text-') : 'text-indigo-600';

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col">
            <Link href={href} className="block group flex-grow flex flex-col">
                <div className="flex items-start mb-auto">
                    <div className={`p-3.5 ${iconBgColor || 'bg-indigo-500'} rounded-lg shadow-md flex-shrink-0`}>
                        <FontAwesomeIcon icon={icon} className="text-white h-6 w-6" aria-label={title} />
                    </div>
                    <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                        {value && (
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</h3>
                        )}
                        {description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                        )}
                    </div>
                </div>
                <div className="mt-3 text-sm font-medium">
                    <span className={`${textColorClass} group-hover:underline flex items-center`}>
                        {linkText}
                        <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                </div>
            </Link>
        </div>
    );
}


// Main Page Component
export default function AccountingDashboard({
    auth,
    currentFiscalPeriod,
    unpostedJournalEntriesCount,
    accountsPayableTotal, // Example if AP is managed here
    accountsReceivableTotal, // Example if AR is managed here
    // Add other relevant counts/data from your controller
}) {
    // Props from controller:
    // return Inertia::render('Accounting/Index', [
    // 'currentFiscalPeriod' => FiscalPeriod::current()->name,
    // 'unpostedJournalEntriesCount' => JournalEntry::where('is_posted', false)->count(),
    // 'accountsPayableTotal' => VendorInvoice::where('status', 'unpaid')->sum('amount_due'),
    // 'accountsReceivableTotal' => CustomerInvoice::where('status', 'unpaid')->sum('amount_due'),
    // ]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Accounting Hub
                </h2>
            }
        >
            <Head title="Accounting & Financials" />

            <div className="py-8 md:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Core Actions / Overview */}
                    {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Quick Actions & Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Chart of Accounts"
                                description="Manage account structure and classifications."
                                icon={faSitemap}
                                iconBgColor="bg-blue-600"
                                linkRoute="accounting.chart_of_accounts.index"
                                linkText="View CoA"
                            />
                            <ActionOrReportCard
                                title="New Journal Entry"
                                description="Record manual accounting transactions."
                                icon={faPlusSquare}
                                iconBgColor="bg-green-600"
                                linkRoute="accounting.journal_entries.create"
                                linkText="Create J.E."
                            />
                             <ActionOrReportCard
                                title="Current Fiscal Period"
                                value={currentFiscalPeriod || 'N/A'}
                                description="Current accounting period for transactions."
                                icon={faCalendarDay}
                                iconBgColor="bg-sky-500"
                                linkRoute="accounting.fiscal_periods.index"
                                linkText="Manage Periods"
                            />
                            <ActionOrReportCard
                                title="Unposted Journals"
                                value={unpostedJournalEntriesCount !== undefined ? unpostedJournalEntriesCount : 'N/A'}
                                description="Journal entries awaiting review and posting."
                                icon={faTasks}
                                iconBgColor="bg-yellow-500"
                                linkRoute="accounting.journal_entries.unposted"
                                linkText="Review & Post"
                            />
                        </div>
                    </section> */}

                    {/* Section 2: Key Accounting Operations */}
                     {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Accounting Operations
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                             <ActionOrReportCard
                                title="General Journal"
                                description="View and manage all journal entries."
                                icon={faBook} // Consistent
                                iconBgColor="bg-teal-500"
                                linkRoute="accounting.journal_entries.index"
                                linkText="View Journal"
                            />
                            <ActionOrReportCard
                                title="General Ledger"
                                description="Detailed transaction history for each account."
                                icon={faListOl}
                                iconBgColor="bg-purple-600"
                                linkRoute="accounting.general_ledger.index" // A page to select account and view ledger
                                linkText="View G/L"
                            />
                            <ActionOrReportCard
                                title="Bank Reconciliation"
                                description="Match bank statements with recorded transactions."
                                icon={faUniversity}
                                iconBgColor="bg-orange-500"
                                linkRoute="accounting.bank_reconciliation.create" // Or index
                                linkText="Reconcile Bank"
                            />

                            
                            {accountsPayableTotal !== undefined && (
                                <ActionOrReportCard
                                    title="Accounts Payable"
                                    value={`TZS ${accountsPayableTotal.toLocaleString()}`}
                                    description="Manage vendor invoices and payments."
                                    icon={faFileInvoiceDollar}
                                    iconBgColor="bg-red-500"
                                    linkRoute="accounting.accounts_payable.index"
                                    linkText="Manage A/P"
                                />
                            )}
                            {accountsReceivableTotal !== undefined && (
                                <ActionOrReportCard
                                    title="Accounts Receivable"
                                    value={`TZS ${accountsReceivableTotal.toLocaleString()}`}
                                    description="Manage customer invoices and collections."
                                    icon={faFileInvoiceDollar}
                                    iconBgColor="bg-lime-500" // Different color for AR
                                    linkRoute="accounting.accounts_receivable.index"
                                    linkText="Manage A/R"
                                />
                            )}
                            <ActionOrReportCard
                                title="Manage Tax Codes"
                                description="Define and apply tax rates for transactions."
                                icon={faPercentage}
                                iconBgColor="bg-indigo-500"
                                linkRoute="accounting.tax_codes.index"
                                linkText="Manage Taxes"
                            />
                            <ActionOrReportCard
                                title="Period End Closing"
                                description="Procedures for closing fiscal periods/years."
                                icon={faArchive}
                                iconBgColor="bg-slate-500"
                                linkRoute="accounting.period_end.process"
                                linkText="Close Period"
                            />
                        </div>
                    </section> */}

                    {/* Section 3: Financial Statements & Reports */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Financial Statements & Reports
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Trial Balance"
                                description="Summary of all debit and credit account balances."
                                icon={faBalanceScale}
                                iconBgColor="bg-cyan-600"
                                linkRoute="reports.accounting.trial_balance"
                                linkText="View Trial Balance"
                            />
                            <ActionOrReportCard
                                title="Balance Sheet"
                                description="Statement of assets, liabilities, and equity."
                                icon={faBalanceScale} // Can be same or faFileContract
                                iconBgColor="bg-blue-600" // Consistent
                                linkRoute="reports.accounting.balance_sheet"
                                linkText="View Balance Sheet"
                            />
                            <ActionOrReportCard
                                title="Income Statement (P&L)"
                                description="Report of revenues, expenses, and profit/loss."
                                icon={faCalculator} // Or faChartLine
                                iconBgColor="bg-green-600"
                                linkRoute="reports.accounting.income_statement"
                                linkText="View P&L"
                            />
                            <ActionOrReportCard
                                title="Cash Flow Statement"
                                description="Tracks movement of cash in and out."
                                icon={faCoins}
                                iconBgColor="bg-amber-600"
                                linkRoute="reports.accounting.cash_flow_statement"
                                linkText="View Cash Flow"
                            />
                             <ActionOrReportCard
                                title="A/P Aging Report"
                                description="Outstanding payables by vendor and age."
                                icon={faHistory}
                                iconBgColor="bg-red-600"
                                linkRoute="reports.accounting.ap_aging"
                                linkText="A/P Aging"
                            />
                            <ActionOrReportCard
                                title="A/R Aging Report"
                                description="Outstanding receivables by customer and age."
                                icon={faHistory}
                                iconBgColor="bg-lime-600" // Consistent with AR color
                                linkRoute="reports.accounting.ar_aging"
                                linkText="A/R Aging"
                            />
                             <ActionOrReportCard
                                title="Audit Trail Report"
                                description="Log of all system transactions and changes."
                                icon={faFileSignature} // Or faHistory
                                iconBgColor="bg-pink-600"
                                linkRoute="reports.accounting.audit_trail"
                                linkText="View Audit Trail"
                            />
                            <ActionOrReportCard
                                title="Custom Financial Report"
                                description="Build reports with specific accounting data filters."
                                icon={faFilter}
                                iconBgColor="bg-gray-600"
                                linkRoute="reports.accounting.custom"
                                linkText="Build Report"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}