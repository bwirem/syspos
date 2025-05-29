import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react'; // usePage removed
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShoppingCart,
    faTruck,
    faBoxes,
    faFileInvoiceDollar,
    faPlusSquare,
    faTasks,
    // faChartPie, // Not used in active cards, but available
    faHistory,
    faListAlt,
    faFileContract,
    faSearchDollar,
    faArrowRight,
    faFilter,
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css'; // Ensure this is imported

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
export default function ProcurementDashboard({
    auth,
    pendingPOCount,
    activeSuppliersCount,
    goodsReceiptPendingCount,
    // procurementUrls = {} // Optional: To pass URLs as props from controller
}) {

    // Define URLs directly or get them from props (procurementUrls)
    // Using direct paths here for simplicity.
    // You MUST replace these with your actual Laravel route paths.
    const urls = {
        // Quick Actions (if uncommented)
        // procurementPurchaseOrdersCreate: '/procurement/purchase-orders/create',
        // procurementPurchaseOrdersPending: '/procurement/purchase-orders/pending',
        // procurementSuppliersIndex: '/procurement/suppliers',
        // procurementGoodsReceiptCreate: '/procurement/goods-receipt/create',
        // procurementGoodsReceiptPending: '/procurement/goods-receipt/pending',
        // procurementInvoicesIndex: '/procurement/invoices',

        // Reports
        reportsProcurementPoHistory: '/reports/procurement/po-history',
        reportsProcurementSupplierPerformance: '/reports/procurement/supplier-performance',
        reportsProcurementItemHistory: '/reports/procurement/item-history',
        reportsProcurementSpendAnalysis: '/reports/procurement/spend-analysis',
        reportsProcurementGrnSummary: '/reports/procurement/grn-summary',
        reportsProcurementInvoicePayment: '/reports/procurement/invoice-payment',
        reportsProcurementCycleTime: '/reports/procurement/cycle-time',
        reportsProcurementCustom: '/reports/procurement/custom',
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Procurement Hub
                </h2>
            }
        >
            <Head title="Procurement" />

            <div className="py-8 md:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Core Actions / Overview - Keep this commented if not used */}
                    {/*
                    <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Quick Actions & Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="New Purchase Order"
                                description="Create and send a new PO to a supplier."
                                icon={faPlusSquare}
                                iconBgColor="bg-blue-600"
                                linkHref={urls.procurementPurchaseOrdersCreate}
                                linkText="Create PO"
                            />
                            <ActionOrReportCard
                                title="Pending POs"
                                value={pendingPOCount !== undefined ? pendingPOCount : 'N/A'}
                                description="Purchase orders awaiting approval or delivery."
                                icon={faShoppingCart}
                                iconBgColor="bg-orange-500"
                                linkHref={urls.procurementPurchaseOrdersPending}
                                linkText="View Pending"
                            />
                            <ActionOrReportCard
                                title="Manage Suppliers"
                                value={activeSuppliersCount !== undefined ? `${activeSuppliersCount} Active` : 'N/A'}
                                description="View, add, or update supplier information."
                                icon={faTruck}
                                iconBgColor="bg-purple-600"
                                linkHref={urls.procurementSuppliersIndex}
                                linkText="View Suppliers"
                            />
                             <ActionOrReportCard
                                title="Receive Goods"
                                description="Record incoming goods against purchase orders."
                                icon={faBoxes}
                                iconBgColor="bg-teal-500"
                                linkHref={urls.procurementGoodsReceiptCreate}
                                linkText="Record GRN"
                            />
                            <ActionOrReportCard
                                title="Pending Receipts"
                                value={goodsReceiptPendingCount !== undefined ? goodsReceiptPendingCount : 'N/A'}
                                description="POs awaiting goods receipt."
                                icon={faTasks}
                                iconBgColor="bg-yellow-500"
                                linkHref={urls.procurementGoodsReceiptPending}
                                linkText="View Pending GRNs"
                            />
                            <ActionOrReportCard
                                title="Process Supplier Invoices"
                                description="Match invoices to POs/GRNs and record payments."
                                icon={faFileInvoiceDollar}
                                iconBgColor="bg-rose-500"
                                linkHref={urls.procurementInvoicesIndex}
                                linkText="Manage Invoices"
                            />
                        </div>
                    </section>
                    */}

                    {/* Section 2: Reports Center */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Procurement Reports
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Purchase Order History"
                                description="Track all POs by status, supplier, or date range."
                                icon={faHistory}
                                iconBgColor="bg-sky-600"
                                linkHref={urls.reportsProcurementPoHistory}
                                linkText="View PO History"
                            />
                            <ActionOrReportCard
                                title="Supplier Performance"
                                description="Analyze delivery times, quality, and pricing by supplier."
                                icon={faTruck}
                                iconBgColor="bg-green-600"
                                linkHref={urls.reportsProcurementSupplierPerformance}
                                linkText="Analyze Suppliers"
                            />
                            <ActionOrReportCard
                                title="Item Purchase History"
                                description="View purchase history and costs for specific items."
                                icon={faListAlt}
                                iconBgColor="bg-indigo-600"
                                linkHref={urls.reportsProcurementItemHistory}
                                linkText="Track Item Purchases"
                            />
                            <ActionOrReportCard
                                title="Spend Analysis"
                                description="Breakdown of procurement spending by category, supplier, etc."
                                icon={faSearchDollar}
                                iconBgColor="bg-amber-600"
                                linkHref={urls.reportsProcurementSpendAnalysis}
                                linkText="View Spend Report"
                            />
                            <ActionOrReportCard
                                title="Goods Received Report"
                                description="Summary of all goods received within a period."
                                icon={faFileContract}
                                iconBgColor="bg-cyan-600"
                                linkHref={urls.reportsProcurementGrnSummary}
                                linkText="View GRN Report"
                            />
                             <ActionOrReportCard
                                title="Invoice & Payment Report"
                                description="Track supplier invoices and their payment statuses."
                                icon={faFileInvoiceDollar}
                                iconBgColor="bg-pink-600"
                                linkHref={urls.reportsProcurementInvoicePayment}
                                linkText="Track Invoices"
                            />
                            <ActionOrReportCard
                                title="Procurement Cycle Time"
                                description="Analyze time taken from PO creation to goods receipt."
                                icon={faTasks}
                                iconBgColor="bg-fuchsia-600"
                                linkHref={urls.reportsProcurementCycleTime}
                                linkText="Analyze Cycle Time"
                            />
                            <ActionOrReportCard
                                title="Custom Procurement Report"
                                description="Build reports with specific procurement data filters."
                                icon={faFilter}
                                iconBgColor="bg-gray-600"
                                linkHref={urls.reportsProcurementCustom}
                                linkText="Build Report"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
