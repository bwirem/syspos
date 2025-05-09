
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBoxes,            // General Inventory / Stock
    faWarehouse,        // Stock Locations / Warehouses
    faExchangeAlt,      // Stock Transfers / Movements
    faEdit,             // Stock Adjustments (or faSlidersH)
    faClipboardList,    // Stock Taking / Cycle Count
    faListOl,           // Item Master / Product Catalog
    faExclamationTriangle, // Low Stock / Alerts
    faChartLine,        // Inventory Analysis / Valuation
    faHistory,          // Movement History
    faCalendarTimes,    // Expiring Items (or faHourglassEnd)
    faPlusSquare,       // Add New Item
    faArrowRight,
    faFilter,
    faTag,              // For item categories/tags
    faBalanceScale,     // For valuation/reconciliation
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
export default function InventoryDashboard({
    auth,
    totalStockValue,
    lowStockItemCount,
    itemCategoriesCount,
    stockLocationsCount
}) {
    // Props from controller:
    // return Inertia::render('Inventory/Index', [
    // 'totalStockValue' => Stock::sum(DB::raw('quantity * cost_price')),
    // 'lowStockItemCount' => Stock::whereColumn('quantity', '<=', 'reorder_level')->count(),
    // 'itemCategoriesCount' => ItemCategory::count(),
    // 'stockLocationsCount' => StockLocation::count(),
    // ]);

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
                                value={totalStockValue !== undefined ? `TZS ${totalStockValue}` : 'N/A'} // Format as currency
                                description="Current estimated value of all inventory."
                                icon={faBalanceScale}
                                iconBgColor="bg-green-600"
                                linkRoute="reports.inventory.valuation" // Link to valuation report
                                linkText="View Valuation"
                            />
                            <ActionOrReportCard
                                title="Low Stock Items"
                                value={lowStockItemCount !== undefined ? lowStockItemCount : 'N/A'}
                                description="Items at or below reorder level."
                                icon={faExclamationTriangle}
                                iconBgColor="bg-red-500"
                                linkRoute="inventory.items.low_stock"
                                linkText="View Alerts"
                            />
                            <ActionOrReportCard
                                title="Item Master"
                                // value={itemMasterCount !== undefined ? itemMasterCount : 'N/A'} // if you have total items count
                                description="Manage products, SKUs, and item details."
                                icon={faListOl}
                                iconBgColor="bg-blue-600"
                                linkRoute="inventory.items.index"
                                linkText="Manage Items"
                            />
                            <ActionOrReportCard
                                title="Stock Locations"
                                value={stockLocationsCount !== undefined ? stockLocationsCount : 'N/A'}
                                description="Manage warehouses and storage bins."
                                icon={faWarehouse}
                                iconBgColor="bg-purple-600"
                                linkRoute="inventory.locations.index"
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
                                linkRoute="inventory.stock.levels"
                                linkText="Check Stock"
                            />
                            <ActionOrReportCard
                                title="Stock Adjustments"
                                description="Correct discrepancies (e.g., damages, loss)."
                                icon={faEdit}
                                iconBgColor="bg-orange-500"
                                linkRoute="inventory.adjustments.create"
                                linkText="Adjust Stock"
                            />
                            <ActionOrReportCard
                                title="Stock Transfers"
                                description="Move items between different locations."
                                icon={faExchangeAlt}
                                iconBgColor="bg-teal-500"
                                linkRoute="inventory.transfers.create"
                                linkText="Transfer Stock"
                            />
                            <ActionOrReportCard
                                title="Stock Taking / Cycle Count"
                                description="Perform physical inventory counts."
                                icon={faClipboardList}
                                iconBgColor="bg-indigo-500"
                                linkRoute="inventory.stock_take.create"
                                linkText="Start Count"
                            />
                             <ActionOrReportCard
                                title="Manage Item Categories"
                                value={itemCategoriesCount !== undefined ? itemCategoriesCount : 'N/A'}
                                description="Organize items into categories."
                                icon={faTag}
                                iconBgColor="bg-rose-500"
                                linkRoute="inventory.categories.index"
                                linkText="Manage Categories"
                            />
                            <ActionOrReportCard
                                title="Add New Item"
                                description="Add a new product or SKU to the inventory."
                                icon={faPlusSquare}
                                iconBgColor="bg-lime-500"
                                linkRoute="inventory.items.create"
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
                                linkRoute="reports.inventory.stock_on_hand"
                                linkText="View SOH"
                            />
                            <ActionOrReportCard
                                title="Inventory Valuation"
                                description="Calculate the total value of current stock (e.g., FIFO, Weighted Avg)."
                                icon={faBalanceScale}
                                iconBgColor="bg-green-600" // Same as overview for consistency
                                linkRoute="reports.inventory.valuation"
                                linkText="View Valuation"
                            />
                            <ActionOrReportCard
                                title="Stock Movement History"
                                description="Audit trail of all inventory transactions."
                                icon={faHistory}
                                iconBgColor="bg-amber-600"
                                linkRoute="reports.inventory.movement_history"
                                linkText="Track Movements"
                            />
                            <ActionOrReportCard
                                title="Inventory Ageing Report"
                                description="Analyze how long stock has been held."
                                icon={faChartLine} // or faHourglassHalf
                                iconBgColor="bg-pink-600"
                                linkRoute="reports.inventory.ageing"
                                linkText="Analyze Ageing"
                            />
                            <ActionOrReportCard
                                title="Reorder Level Report"
                                description="Identify items needing replenishment."
                                icon={faExclamationTriangle} // Same as overview
                                iconBgColor="bg-red-600"
                                linkRoute="reports.inventory.reorder"
                                linkText="View Reorder List"
                            />
                            <ActionOrReportCard
                                title="Expiring Items Report"
                                description="Track items nearing their expiry dates (if applicable)."
                                icon={faCalendarTimes}
                                iconBgColor="bg-yellow-600"
                                linkRoute="reports.inventory.expiring_items"
                                linkText="Track Expiry"
                            />
                            <ActionOrReportCard
                                title="Slow Moving Stock"
                                description="Identify items with low sales or movement."
                                icon={faWarehouse} // Could also be faThumbsDown
                                iconBgColor="bg-slate-500"
                                linkRoute="reports.inventory.slow_moving"
                                linkText="Identify Slow Stock"
                            />
                            <ActionOrReportCard
                                title="Custom Inventory Report"
                                description="Build reports with specific inventory data filters."
                                icon={faFilter}
                                iconBgColor="bg-gray-600"
                                linkRoute="reports.inventory.custom"
                                linkText="Build Report"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}