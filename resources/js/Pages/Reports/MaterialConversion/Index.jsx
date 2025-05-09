
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCogs,             // General Manufacturing/Conversion
    faSitemap,          // Bill of Materials (BOM)
    faTools,            // Work Orders / Production Process
    faIndustry,         // Production Floor / Manufacturing
    faCheckDouble,      // Production Output / Completion
    faShareSquare,      // Material Issuance (issuing out)
    faRecycle,          // Scrap / Wastage
    faCalculator,       // Costing
    faTasks,            // Pending Tasks / Active Orders
    faChartLine,        // Production Efficiency / Analysis
    faHistory,          // Production History
    faPlusSquare,       // Create New
    faArrowRight,
    faFilter,
    faFlask,            // For process manufacturing or recipes
    faLayerGroup,       // For assemblies / multi-level BOMs
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
export default function MaterialConversionDashboard({
    auth,
    activeWorkOrdersCount,
    pendingMaterialIssuancesCount,
    itemsReadyForProductionCount, // Items that have BOMs and sufficient raw materials
    // Add other relevant counts from your controller
}) {
    // Props from controller:
    // return Inertia::render('MaterialConversion/Index', [
    // 'activeWorkOrdersCount' => WorkOrder::whereIn('status', ['active', 'in_progress'])->count(),
    // 'pendingMaterialIssuancesCount' => MaterialRequest::where('status', 'pending_issuance')->count(),
    // 'itemsReadyForProductionCount' => Product::whereHas('billOfMaterials')->/* add logic for stock availability */->count(),
    // ]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Material Conversion Hub
                </h2>
            }
        >
            <Head title="Material Conversion & Production" />

            <div className="py-8 md:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Core Actions / Overview */}
                    {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Quick Actions & Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Manage Bills of Materials (BOMs)"
                                description="Define product recipes and component lists."
                                icon={faSitemap}
                                iconBgColor="bg-blue-600"
                                linkRoute="material_conversion.boms.index"
                                linkText="View BOMs"
                            />
                            <ActionOrReportCard
                                title="Active Work Orders"
                                value={activeWorkOrdersCount !== undefined ? activeWorkOrdersCount : 'N/A'}
                                description="Production jobs currently in progress."
                                icon={faIndustry}
                                iconBgColor="bg-orange-500"
                                linkRoute="material_conversion.work_orders.active"
                                linkText="View Active WOs"
                            />
                            <ActionOrReportCard
                                title="Pending Material Issues"
                                value={pendingMaterialIssuancesCount !== undefined ? pendingMaterialIssuancesCount : 'N/A'}
                                description="Materials requested but not yet issued to production."
                                icon={faShareSquare}
                                iconBgColor="bg-yellow-500"
                                linkRoute="material_conversion.material_issues.pending"
                                linkText="View Requests"
                            />
                        </div>
                    </section> */}

                    {/* Section 2: Key Production Operations */}
                     {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Production Operations
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                             <ActionOrReportCard
                                title="Create Work Order"
                                description="Plan and initiate a new production run."
                                icon={faPlusSquare} // or faTools
                                iconBgColor="bg-green-600"
                                linkRoute="material_conversion.work_orders.create"
                                linkText="New Work Order"
                            />
                            <ActionOrReportCard
                                title="Issue Materials to WO"
                                description="Release raw materials/components to a work order."
                                icon={faShareSquare} // Consistent with pending issues
                                iconBgColor="bg-teal-500"
                                linkRoute="material_conversion.material_issues.create" // Page to select WO and issue
                                linkText="Issue Materials"
                            />
                            <ActionOrReportCard
                                title="Record Production Output"
                                description="Log finished goods and by-products from a WO."
                                icon={faCheckDouble}
                                iconBgColor="bg-sky-500"
                                linkRoute="material_conversion.production_output.create"
                                linkText="Record Output"
                            />
                            <ActionOrReportCard
                                title="Record Scrap/Wastage"
                                description="Document materials lost or damaged during production."
                                icon={faRecycle}
                                iconBgColor="bg-red-500"
                                linkRoute="material_conversion.scrap.create"
                                linkText="Record Scrap"
                            />
                            <ActionOrReportCard
                                title="Manage Production Lines/Areas"
                                description="Configure and monitor production areas or machinery."
                                icon={faCogs}
                                iconBgColor="bg-purple-600"
                                linkRoute="material_conversion.production_lines.index"
                                linkText="Manage Lines"
                            />
                            <ActionOrReportCard
                                title="View Producible Items"
                                value={itemsReadyForProductionCount !== undefined ? itemsReadyForProductionCount : 'N/A'}
                                description="Finished goods with defined BOMs."
                                icon={faFlask} // or faLayerGroup
                                iconBgColor="bg-indigo-500"
                                linkRoute="material_conversion.producible_items.index"
                                linkText="View Items"
                            />
                        </div>
                    </section> */}

                    {/* Section 3: Production & Conversion Reports */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Conversion & Production Reports
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Bill of Materials (BOM) Listing"
                                description="View all defined BOMs and their components."
                                icon={faSitemap} // Consistent
                                iconBgColor="bg-blue-600"
                                linkRoute="reports.conversion.bom_listing"
                                linkText="View BOMs"
                            />
                            <ActionOrReportCard
                                title="Work Order Status Report"
                                description="Track progress and status of all work orders."
                                icon={faTasks}
                                iconBgColor="bg-cyan-600"
                                linkRoute="reports.conversion.work_order_status"
                                linkText="Track WOs"
                            />
                            <ActionOrReportCard
                                title="Material Usage Report"
                                description="Analyze materials consumed in production vs. planned."
                                icon={faHistory} // or faChartBar
                                iconBgColor="bg-amber-600"
                                linkRoute="reports.conversion.material_usage"
                                linkText="Analyze Usage"
                            />
                            <ActionOrReportCard
                                title="Production Yield Report"
                                description="Compare actual output to expected output."
                                icon={faChartLine}
                                iconBgColor="bg-pink-600"
                                linkRoute="reports.conversion.yield"
                                linkText="Analyze Yield"
                            />
                            <ActionOrReportCard
                                title="Production Costing Report"
                                description="Calculate actual costs of produced goods."
                                icon={faCalculator}
                                iconBgColor="bg-lime-600"
                                linkRoute="reports.conversion.costing"
                                linkText="View Costs"
                            />
                            <ActionOrReportCard
                                title="Scrap & Wastage Report"
                                description="Analyze materials lost during production."
                                icon={faRecycle} // Consistent
                                iconBgColor="bg-red-600"
                                linkRoute="reports.conversion.scrap"
                                linkText="Analyze Scrap"
                            />
                             <ActionOrReportCard
                                title="Work In Progress (WIP) Report"
                                description="Value and status of items currently in production."
                                icon={faIndustry} // Consistent
                                iconBgColor="bg-orange-600"
                                linkRoute="reports.conversion.wip"
                                linkText="View WIP"
                            />
                            <ActionOrReportCard
                                title="Custom Production Report"
                                description="Build reports with specific conversion/production data filters."
                                icon={faFilter}
                                iconBgColor="bg-gray-600"
                                linkRoute="reports.conversion.custom"
                                linkText="Build Report"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}