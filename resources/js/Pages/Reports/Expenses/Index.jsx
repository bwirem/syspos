
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faReceipt,          // General Expenses / Receipts
    faMoneyBillWave,    // Spending / Payments
    faCreditCard,       // Card Payments / Specific Payment Types
    faTags,             // Expense Categories
    faTasks,            // Pending Approvals / Claims
    faChartPie,         // Expense Breakdown by Category
    faListAlt,          // Detailed Expense Listing
    faCalendarCheck,    // Expenses for a Period
    faPlusSquare,       // Record New Expense
    faUserTag,          // Expenses by Employee/User (for claims)
    faBalanceScale,     // Budget vs Actual
    faArrowRight,
    faFilter,
    faFileInvoiceDollar,// For linking to vendor invoices if expenses are tied to them
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
export default function ExpensesDashboard({
    auth,
    totalExpensesThisMonth,
    pendingExpenseApprovalsCount,
    expenseCategoriesCount,
    // Add other relevant counts/data from your controller
}) {
    // Props from controller:
    // return Inertia::render('Expenses/Index', [
    // 'totalExpensesThisMonth' => Expense::whereMonth('expense_date', now()->month)->whereYear('expense_date', now()->year)->sum('amount'),
    // 'pendingExpenseApprovalsCount' => ExpenseClaim::where('status', 'pending_approval')->count(), // If using claims
    // 'expenseCategoriesCount' => ExpenseCategory::count(),
    // ]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Expenses Hub
                </h2>
            }
        >
            <Head title="Expense Management" />

            <div className="py-8 md:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Core Actions / Overview */}
                    {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Quick Actions & Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Record New Expense"
                                description="Quickly log a new business expense."
                                icon={faPlusSquare}
                                iconBgColor="bg-green-600"
                                linkRoute="expenses.create"
                                linkText="Add Expense"
                            />
                            <ActionOrReportCard
                                title="Total Expenses (This Month)"
                                value={totalExpensesThisMonth !== undefined ? `TZS ${totalExpensesThisMonth.toLocaleString()}` : 'N/A'}
                                description="Sum of all recorded expenses for the current month."
                                icon={faMoneyBillWave}
                                iconBgColor="bg-red-500" // Red often associated with expenses
                                linkRoute="reports.expenses.period" // Link to report filtered for this month
                                linkText="View Monthly Details"
                            />
                             <ActionOrReportCard
                                title="Manage Expense Categories"
                                value={expenseCategoriesCount !== undefined ? `${expenseCategoriesCount} Categories` : 'N/A'}
                                description="Define and organize types of expenses."
                                icon={faTags}
                                iconBgColor="bg-blue-600"
                                linkRoute="expenses.categories.index"
                                linkText="View Categories"
                            />
                           
                            {pendingExpenseApprovalsCount !== undefined && (
                                <ActionOrReportCard
                                    title="Pending Approvals"
                                    value={pendingExpenseApprovalsCount}
                                    description="Expense claims or entries awaiting approval."
                                    icon={faTasks}
                                    iconBgColor="bg-yellow-500"
                                    linkRoute="expenses.approvals.pending"
                                    linkText="Review Approvals"
                                />
                            )}
                        </div>
                    </section> */}

                    {/* Section 2: Expense Tracking & Management (if applicable, e.g., for claims) */}
                    {/* This section might be more relevant if you have expense claims by employees */}
                    {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Expense Claims
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Submit Expense Claim"
                                description="For employees to submit expenses for reimbursement."
                                icon={faUserTag}
                                iconBgColor="bg-purple-600"
                                linkRoute="expenses.claims.create"
                                linkText="New Claim"
                            />
                            <ActionOrReportCard
                                title="My Expense Claims"
                                description="Track the status of your submitted claims."
                                icon={faListAlt}
                                iconBgColor="bg-teal-500"
                                linkRoute="expenses.claims.my_claims"
                                linkText="View My Claims"
                            />
                        </div>
                    </section> */}


                    {/* Section 3: Expense Reports */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Expense Reports
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Detailed Expense List"
                                description="View all expenses with filters for date, category, etc."
                                icon={faListAlt} // Consistent
                                iconBgColor="bg-sky-600"
                                linkRoute="reports.expenses.detailed_list"
                                linkText="View All Expenses"
                            />
                            <ActionOrReportCard
                                title="Expenses by Category"
                                description="Breakdown of spending across different expense categories."
                                icon={faChartPie}
                                iconBgColor="bg-orange-600"
                                linkRoute="reports.expenses.by_category"
                                linkText="Analyze Categories"
                            />
                            <ActionOrReportCard
                                title="Expenses by Payee/Vendor"
                                description="Track spending for each vendor or payee."
                                icon={faFileInvoiceDollar} // or faAddressBook
                                iconBgColor="bg-indigo-600"
                                linkRoute="reports.expenses.by_payee"
                                linkText="Analyze Payees"
                            />
                            <ActionOrReportCard
                                title="Periodic Expense Summary"
                                description="Compare expenses across different periods (e.g., month-over-month)."
                                icon={faCalendarCheck}
                                iconBgColor="bg-cyan-600"
                                linkRoute="reports.expenses.period_summary"
                                linkText="View Trends"
                            />
                            <ActionOrReportCard
                                title="Budget vs. Actual Expenses"
                                description="Compare actual spending against budgeted amounts."
                                icon={faBalanceScale}
                                iconBgColor="bg-rose-500"
                                linkRoute="reports.expenses.budget_vs_actual"
                                linkText="Compare Budgets"
                            />
                             {/* Add this if you track expenses by project/department */}
                            {/* <ActionOrReportCard
                                title="Expenses by Project/Dept"
                                description="Track expenses allocated to specific projects or departments."
                                icon={faSitemap} // or faBuilding
                                iconBgColor="bg-lime-600"
                                linkRoute="reports.expenses.by_project"
                                linkText="Analyze by Project"
                            /> */}
                             <ActionOrReportCard
                                title="Receipts & Attachments"
                                description="Access stored receipts or documents linked to expenses."
                                icon={faReceipt}
                                iconBgColor="bg-pink-600"
                                linkRoute="expenses.receipts.index" // Page to search/view receipts
                                linkText="View Receipts"
                            />
                            <ActionOrReportCard
                                title="Custom Expense Report"
                                description="Build reports with specific expense data filters."
                                icon={faFilter}
                                iconBgColor="bg-gray-600"
                                linkRoute="reports.expenses.custom"
                                linkText="Build Report"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}