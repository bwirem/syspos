import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Sales
    faDollarSign, faFileInvoiceDollar, faHistory as faSalesHistory, faChartBar, faPlusSquare as faNewSale,
    // Procurement
    faShoppingCart, faTruck, faFileContract as faPOContract, faTasks ,
    // Inventory
    faBoxes, faWarehouse, faExchangeAlt, faEdit as faStockEdit, faBalanceScale, faExclamationTriangle,
    // Common
    faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

// Reusable Card Component (assuming it's defined elsewhere or copy it here)
function SummaryCard({ title, value, unit, description, linkHref, linkText, icon, iconBgColor, footerText, footerTextColor = "text-gray-500 dark:text-gray-400" }) {
    const valueTextColor = iconBgColor ? iconBgColor.replace('bg-', 'text-') : 'text-gray-800 dark:text-white';
    const linkColor = iconBgColor ? iconBgColor.replace('bg-', 'text-') : 'text-indigo-600 dark:text-indigo-400';

    // Ensure value is handled if it's 0 to display it
    const displayValue = (value !== undefined && value !== null) ? value : 'N/A';

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col justify-between">
            <div>
                <div className="flex items-start">
                    <div className={`p-3.5 ${iconBgColor || 'bg-gray-500'} rounded-lg shadow-md flex-shrink-0`}>
                        <FontAwesomeIcon icon={icon} className="text-white h-6 w-6" aria-label={title} />
                    </div>
                    <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                        <h3 className={`text-2xl sm:text-3xl font-bold ${valueTextColor} dark:text-gray-100 mt-1`}>
                            {displayValue}
                            {unit && displayValue !== 'N/A' && <small className="text-gray-500 dark:text-gray-400 text-sm ml-1">{unit}</small>}
                        </h3>
                        {description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-3">
                {linkHref ? (
                    <Link href={linkHref} className={`${linkColor} hover:underline text-sm font-medium flex items-center group`}>
                        {linkText || 'View Details'}
                        <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                ) : footerText ? (
                    <span className={`text-sm ${footerTextColor}`}>{footerText}</span>
                ) : <div className="h-[20px]"></div> /* Placeholder for consistent height if no link/footer */}
            </div>
        </div>
    );
}


export default function Dashboard({
    auth,
    salesTodayCount,
    salesTodayValue,
    pendingPOCount,
    activeSuppliersCount,
    lowStockItemCount,
    totalStockValue,
    // Add other summary props from controller as needed
}) {
    // Define URLs directly. Replace with your actual paths.
    // Using Ziggy's route() is recommended if available.
    const urls = {
        // Sales
        salesHub: '/sales-billing-hub', // Path to your SalesAndBillingDashboard.jsx
        newSale: '/sales/create', // Example path for creating a new sale
        dailySalesReport: '/reports/sales/daily',

        // Procurement
        procurementHub: '/procurement-hub', // Path to your ProcurementDashboard.jsx
        newPurchaseOrder: '/procurement/purchase-orders/create', // Example
        pendingPOs: '/procurement/purchase-orders/pending', // Example

        // Inventory
        inventoryHub: '/inventory-hub', // Path to your InventoryDashboard.jsx
        stockLevels: '/inventory/stock/levels', // Example
        lowStockAlerts: '/inventory/items/low-stock', // Example
    };

    const formatAmount = (amount, currency = 'TZS ') => {
        if (amount === undefined || amount === null) return 'N/A';
        return currency + parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Main Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-10">

                    {/* Sales Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Sales Overview</h3>
                            <Link href={urls.salesHub} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center group">
                                Go to Sales Hub <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="Today's Sales Value"
                                value={formatAmount(salesTodayValue)}
                                icon={faDollarSign}
                                iconBgColor="bg-green-500"
                                linkHref={urls.dailySalesReport} // Link to daily sales report
                                linkText="View Daily Report"
                            />
                            <SummaryCard
                                title="Today's Transactions"
                                value={salesTodayCount}
                                unit="Transactions"
                                icon={faFileInvoiceDollar}
                                iconBgColor="bg-blue-500"
                                linkHref={urls.dailySalesReport} // Can also link here or a general transactions page
                                linkText="Details"
                            />
                            <SummaryCard
                                title="New Sale / Invoice"
                                description="Start a new transaction."
                                icon={faNewSale}
                                iconBgColor="bg-sky-500"
                                linkHref={urls.newSale}
                                linkText="Create Sale"
                            />
                        </div>
                    </section>

                    {/* Procurement Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Procurement Overview</h3>
                            <Link href={urls.procurementHub} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center group">
                                Go to Procurement Hub <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="Pending Purchase Orders"
                                value={pendingPOCount}
                                unit="POs"
                                icon={faTasks}
                                iconBgColor="bg-orange-500"
                                linkHref={urls.pendingPOs}
                                linkText="View Pending POs"
                            />
                            <SummaryCard
                                title="Active Suppliers"
                                value={activeSuppliersCount}
                                unit="Suppliers"
                                icon={faTruck}
                                iconBgColor="bg-purple-500"
                                linkHref={urls.procurementHub} // Could link to a supplier list page
                                linkText="Manage Suppliers"
                            />
                            <SummaryCard
                                title="New Purchase Order"
                                description="Create a new PO for suppliers."
                                icon={faPOContract}
                                iconBgColor="bg-teal-500"
                                linkHref={urls.newPurchaseOrder}
                                linkText="Create PO"
                            />
                        </div>
                    </section>

                    {/* Inventory Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Inventory Overview</h3>
                            <Link href={urls.inventoryHub} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center group">
                                Go to Inventory Hub <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="Total Stock Value"
                                value={formatAmount(totalStockValue)}
                                icon={faBalanceScale}
                                iconBgColor="bg-cyan-500"
                                linkHref={urls.inventoryHub} // Or link to valuation report
                                linkText="View Valuation"
                            />
                            <SummaryCard
                                title="Low Stock Items"
                                value={lowStockItemCount}
                                unit="Items"
                                icon={faExclamationTriangle}
                                iconBgColor="bg-red-500"
                                linkHref={urls.lowStockAlerts}
                                linkText="View Alerts"
                            />
                            <SummaryCard
                                title="Current Stock Levels"
                                description="Check detailed stock quantities."
                                icon={faBoxes}
                                iconBgColor="bg-lime-500"
                                linkHref={urls.stockLevels}
                                linkText="Check Stock"
                            />
                        </div>
                    </section>

                    {/* You can add back chart sections here if needed, similar to your original Dashboard */}
                    {/*
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                       // Chart placeholders
                    </div>
                    */}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}