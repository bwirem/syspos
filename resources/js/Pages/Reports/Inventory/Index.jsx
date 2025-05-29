import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react'; // usePage removed as ziggy not used directly here
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBoxes,
    faWarehouse,
    faExchangeAlt,
    faEdit,
    faClipboardList,
    faListOl,
    faExclamationTriangle,
    faChartLine,
    faHistory,
    faCalendarTimes,
    faPlusSquare,
    faArrowRight,
    faFilter,
    faTag,
    faBalanceScale,
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
export default function InventoryDashboard({
    auth,
    totalStockValue,
    lowStockItemCount,
    itemCategoriesCount,
    stockLocationsCount,
    // You could pass an object of URLs from your controller
    // inventoryUrls = {}
}) {

    // Define URLs directly or get them from props (inventoryUrls)
    // Using direct paths here for simplicity.
    // In a real app, consider passing these from the controller using Laravel's route() helper.
    const urls = {
        reportsInventoryValuation: '/reports/inventory/valuation',
        inventoryItemsLowStock: '/inventory/items/low-stock', // Example, adjust to your actual route
        inventoryItemsIndex: '/inventory/items',             // Example
        inventoryLocationsIndex: '/inventory/locations',       // Example
        inventoryStockLevels: '/inventory/stock/levels',       // Example
        inventoryAdjustmentsCreate: '/inventory/adjustments/create',// Example
        inventoryTransfersCreate: '/inventory/transfers/create', // Example
        inventoryStockTakeCreate: '/inventory/stock-take/create', // Example
        inventoryCategoriesIndex: '/inventory/categories',     // Example
        inventoryItemsCreate: '/inventory/items/create',       // Example
        reportsInventoryStockOnHand: '/reports/inventory/stock-on-hand',
        reportsInventoryMovementHistory: '/reports/inventory/movement-history',
        reportsInventoryAgeing: '/reports/inventory/ageing',
        reportsInventoryReorder: '/reports/inventory/reorder',
        reportsInventoryExpiringItems: '/reports/inventory/expiring-items',
        reportsInventorySlowMoving: '/reports/inventory/slow-moving',
        reportsInventoryCustom: '/reports/inventory/custom',
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Inventory Hub
                </h2>
            }
        >
            <Head title="Inventory Management" />

            <div className="py-8 md:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Core Actions / Overview */}
                    {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Quick Actions & Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Total Stock Value"
                                value={totalStockValue !== undefined ? `TZS ${parseFloat(totalStockValue).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}` : 'N/A'}
                                description="Current estimated value of all inventory."
                                icon={faBalanceScale}
                                iconBgColor="bg-green-600"
                                linkHref={urls.reportsInventoryValuation}
                                linkText="View Valuation"
                            />
                            <ActionOrReportCard
                                title="Low Stock Items"
                                value={lowStockItemCount !== undefined ? lowStockItemCount : 'N/A'}
                                description="Items at or below reorder level."
                                icon={faExclamationTriangle}
                                iconBgColor="bg-red-500"
                                linkHref={urls.inventoryItemsLowStock}
                                linkText="View Alerts"
                            />
                            <ActionOrReportCard
                                title="Item Master"
                                description="Manage products, SKUs, and item details."
                                icon={faListOl}
                                iconBgColor="bg-blue-600"
                                linkHref={urls.inventoryItemsIndex}
                                linkText="Manage Items"
                            />
                            <ActionOrReportCard
                                title="Stock Locations"
                                value={stockLocationsCount !== undefined ? stockLocationsCount : 'N/A'}
                                description="Manage warehouses and storage bins."
                                icon={faWarehouse}
                                iconBgColor="bg-purple-600"
                                linkHref={urls.inventoryLocationsIndex}
                                linkText="Manage Locations"
                            />
                        </div>
                    </section> */}

                    {/* Section 2: Key Inventory Operations */}
                     {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Inventory Operations
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                             <ActionOrReportCard
                                title="View Stock Levels"
                                description="Check current quantities for all items."
                                icon={faBoxes}
                                iconBgColor="bg-sky-500"
                                linkHref={urls.inventoryStockLevels}
                                linkText="Check Stock"
                            />
                            <ActionOrReportCard
                                title="Stock Adjustments"
                                description="Correct discrepancies (e.g., damages, loss)."
                                icon={faEdit}
                                iconBgColor="bg-orange-500"
                                linkHref={urls.inventoryAdjustmentsCreate}
                                linkText="Adjust Stock"
                            />
                            <ActionOrReportCard
                                title="Stock Transfers"
                                description="Move items between different locations."
                                icon={faExchangeAlt}
                                iconBgColor="bg-teal-500"
                                linkHref={urls.inventoryTransfersCreate}
                                linkText="Transfer Stock"
                            />
                            <ActionOrReportCard
                                title="Stock Taking / Cycle Count"
                                description="Perform physical inventory counts."
                                icon={faClipboardList}
                                iconBgColor="bg-indigo-500"
                                linkHref={urls.inventoryStockTakeCreate}
                                linkText="Start Count"
                            />
                             <ActionOrReportCard
                                title="Manage Item Categories"
                                value={itemCategoriesCount !== undefined ? itemCategoriesCount : 'N/A'}
                                description="Organize items into categories."
                                icon={faTag}
                                iconBgColor="bg-rose-500"
                                linkHref={urls.inventoryCategoriesIndex}
                                linkText="Manage Categories"
                            />
                            <ActionOrReportCard
                                title="Add New Item"
                                description="Add a new product or SKU to the inventory."
                                icon={faPlusSquare}
                                iconBgColor="bg-lime-500"
                                linkHref={urls.inventoryItemsCreate}
                                linkText="Add Item"
                            />
                        </div>
                    </section> */}

                    {/* Section 3: Inventory Reports */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Inventory Reports
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Stock on Hand Report"
                                description="Detailed list of current inventory levels by item/location."
                                icon={faBoxes}
                                iconBgColor="bg-cyan-600"
                                linkHref={urls.reportsInventoryStockOnHand}
                                linkText="View SOH"
                            />
                            <ActionOrReportCard
                                title="Inventory Valuation"
                                description="Calculate the total value of current stock (e.g., FIFO, Weighted Avg)."
                                icon={faBalanceScale}
                                iconBgColor="bg-green-600"
                                linkHref={urls.reportsInventoryValuation}
                                linkText="View Valuation"
                            />
                            <ActionOrReportCard
                                title="Stock Movement History"
                                description="Audit trail of all inventory transactions."
                                icon={faHistory}
                                iconBgColor="bg-amber-600"
                                linkHref={urls.reportsInventoryMovementHistory}
                                linkText="Track Movements"
                            />
                            <ActionOrReportCard
                                title="Inventory Ageing Report"
                                description="Analyze how long stock has been held."
                                icon={faChartLine}
                                iconBgColor="bg-pink-600"
                                linkHref={urls.reportsInventoryAgeing}
                                linkText="Analyze Ageing"
                            />
                            <ActionOrReportCard
                                title="Reorder Level Report"
                                description="Identify items needing replenishment."
                                icon={faExclamationTriangle}
                                iconBgColor="bg-red-600"
                                linkHref={urls.reportsInventoryReorder}
                                linkText="View Reorder List"
                            />
                            <ActionOrReportCard
                                title="Expiring Items Report"
                                description="Track items nearing their expiry dates (if applicable)."
                                icon={faCalendarTimes}
                                iconBgColor="bg-yellow-600"
                                linkHref={urls.reportsInventoryExpiringItems}
                                linkText="Track Expiry"
                            />
                            <ActionOrReportCard
                                title="Slow Moving Stock"
                                description="Identify items with low sales or movement."
                                icon={faWarehouse}
                                iconBgColor="bg-slate-500"
                                linkHref={urls.reportsInventorySlowMoving}
                                linkText="Identify Slow Stock"
                            />
                            <ActionOrReportCard
                                title="Custom Inventory Report"
                                description="Build reports with specific inventory data filters."
                                icon={faFilter}
                                iconBgColor="bg-gray-600"
                                linkHref={urls.reportsInventoryCustom}
                                linkText="Build Report"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
