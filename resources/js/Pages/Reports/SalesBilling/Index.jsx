
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCashRegister,
    faFileInvoiceDollar,
    faPrint,            // For generic reports
    faChartBar,         // For analytical reports
    faCalendarAlt,      // For date-range based reports
    faUsers,            // For customer-related reports
    faTags,             // For product/service sales reports
    faArrowRight,
    faFileContract,     // For more formal/summary reports
    faFilter,           // For reports that need filtering
    faCreditCard,       // For payment method reports
    faPlusSquare,       // For creating new sales or invoices
} from '@fortawesome/free-solid-svg-icons';

// Reusable Card Component (can be used for actions and reports)
// Added an optional 'description' prop
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
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col"> {/* h-full and flex-col for consistent height */}
            <Link href={href} className="block group flex-grow flex flex-col"> {/* flex-grow for link to take space */}
                <div className="flex items-start mb-auto"> {/* mb-auto pushes link text to bottom */}
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
export default function SalesAndBillingDashboard({
    auth,
    cashierBoxCount,
    dailyTransactionsCount,
    // You might pass other counts or summary data relevant to reports
}) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Sales & Billing Hub
                </h2>
            }
        >
            <Head title="Sales & Billing" />

            <div className="py-8 md:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"> {/* Wider max-width for more cards */}

                    {/* Section 1: Core Actions / Overview */}
                    {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Quick Actions & Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Cashier Boxes"
                                value={cashierBoxCount !== undefined ? cashierBoxCount : 'N/A'}
                                description="Manage active and closed cashier sessions."
                                icon={faCashRegister}
                                iconBgColor="bg-purple-600"
                                linkRoute="cashier.boxes.index"
                                linkText="Manage Boxes"
                            />
                            <ActionOrReportCard
                                title="Today's Transactions"
                                value={dailyTransactionsCount !== undefined ? dailyTransactionsCount : 'N/A'}
                                description="View all transactions recorded today."
                                icon={faFileInvoiceDollar}
                                iconBgColor="bg-green-600"
                                linkRoute="transactions.daily.index"
                                linkText="View Transactions"
                            />
                            <ActionOrReportCard
                                title="New Sale / Invoice"
                                // No value needed, it's an action
                                description="Create a new sales invoice or record a payment."
                                icon={faTags} // or faPlusSquare
                                iconBgColor="bg-blue-600"
                                linkRoute="sales.create" // Example
                                linkText="Start New Sale"
                            />
                        </div>
                    </section> */}

                    {/* Section 2: Reports */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Reports Center
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Daily Sales Report"
                                description="Summary of sales for a selected day."
                                icon={faCalendarAlt}
                                iconBgColor="bg-sky-500"
                                linkRoute="reports.sales.daily"
                                linkText="View Report"
                            />
                            <ActionOrReportCard
                                title="Sales Summary Report"
                                description="Aggregated sales data over a period (e.g., weekly, monthly)."
                                icon={faChartBar}
                                iconBgColor="bg-teal-500"
                                linkRoute="reports.sales.summary"
                                linkText="View Report"
                            />
                            <ActionOrReportCard
                                title="Cashier Session Report"
                                description="Detailed breakdown of a specific cashier session."
                                icon={faFileContract}
                                iconBgColor="bg-orange-500"
                                linkRoute="reports.cashier.session"
                                linkText="View Report"
                            />
                            <ActionOrReportCard
                                title="Product/Service Sales"
                                description="Report on sales by item or category."
                                icon={faTags}
                                iconBgColor="bg-rose-500"
                                linkRoute="reports.sales.by_item"
                                linkText="View Report"
                            />
                            <ActionOrReportCard
                                title="Payment Methods Report"
                                description="Summary of payments by method (cash, card, etc.)."
                                icon={faCreditCard} // Assuming faCreditCard is imported
                                iconBgColor="bg-cyan-500"
                                linkRoute="reports.payments.methods"
                                linkText="View Report"
                            />
                            <ActionOrReportCard
                                title="Customer Sales History"
                                description="View sales history for specific customers."
                                icon={faUsers}
                                iconBgColor="bg-lime-500"
                                linkRoute="reports.customer.history"
                                linkText="View Report"
                            />
                             <ActionOrReportCard
                                title="End of Day (EOD) Report"
                                description="Consolidated report for end-of-day reconciliation."
                                icon={faPrint}
                                iconBgColor="bg-slate-500"
                                linkRoute="reports.eod.summary"
                                linkText="View EOD"
                            />
                             <ActionOrReportCard
                                title="Custom Report Builder"
                                description="Generate reports with specific filters and fields."
                                icon={faFilter}
                                iconBgColor="bg-gray-600"
                                linkRoute="reports.custom.builder"
                                linkText="Build Report"
                            />
                        </div>
                    </section>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}