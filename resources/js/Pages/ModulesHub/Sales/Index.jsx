
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react'; // usePage might not be needed if not using ziggy from props
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCashRegister,
    faFileInvoiceDollar,
    faPrint,
    faChartBar,
    faCalendarAlt,
    faUsers,
    faTags,
    faArrowRight,
    faFileContract,
    faFilter,
    faCreditCard,
    // faPlusSquare, // Not used in the active reports section
} from '@fortawesome/free-solid-svg-icons';

// ActionOrReportCard component (modified as shown above)
function ActionOrReportCard({ title, value, description, icon, iconBgColor, linkHref, linkText }) {
    const href = linkHref || '#';
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
export default function SalesAndBillingDashboard({
    auth,
    cashierBoxCount, // Example prop, remove if not passed
    dailyTransactionsCount, // Example prop, remove if not passed
    // You would pass report URLs as props from your controller or define them here
    reportUrls = {} // Example: { dailySales: '/reports/sales/daily', ... }
}) {
    // Define the URLs directly or get them from props
    // This is less maintainable than Ziggy if your routes change often.
    const urls = {
        dailySales: reportUrls.dailySales || '/reports/sales/daily',
        salesSummary: reportUrls.salesSummary || '/reports/sales/summary',
        cashierSession: reportUrls.cashierSession || '/reports/sales/cashiersession',
        salesByItem: reportUrls.salesByItem || '/reports/sales/by-item', // Adjusted key
        paymentMethods: reportUrls.paymentMethods || '/reports/payments/methods',
        customerHistory: reportUrls.customerHistory || '/reports/customer/history',
        eodSummary: reportUrls.eodSummary || '/reports/eod/summary',
        customBuilder: reportUrls.customBuilder || '/reports/custom/builder',
        // For quick actions if you uncomment them:
        // cashierBoxesIndex: reportUrls.cashierBoxesIndex || '/cashier/boxes',
        // transactionsDailyIndex: reportUrls.transactionsDailyIndex || '/transactions/daily',
        // salesCreate: reportUrls.salesCreate || '/sales/create',
    };

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
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Core Actions / Overview (Example if you re-enable) */}
                    
                    <section className="mb-10">
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
                                linkHref={urls.cashierBoxesIndex} // Use direct URL
                                linkText="Manage Boxes"
                            />
                            <ActionOrReportCard
                                title="Today's Transactions"
                                value={dailyTransactionsCount !== undefined ? dailyTransactionsCount : 'N/A'}
                                description="View all transactions recorded today."
                                icon={faFileInvoiceDollar}
                                iconBgColor="bg-green-600"
                                linkHref={urls.transactionsDailyIndex} // Use direct URL
                                linkText="View Transactions"
                            />
                            <ActionOrReportCard
                                title="New Sale / Invoice"
                                description="Create a new sales invoice or record a payment."
                                icon={faTags}
                                iconBgColor="bg-blue-600"
                                linkHref={urls.salesCreate} // Use direct URL
                                linkText="Start New Sale"
                            />
                        </div>
                    </section>                  

                </div>
            </div>
        </AuthenticatedLayout>
    );
}