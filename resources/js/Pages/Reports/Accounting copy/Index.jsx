import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBuilding,         // General Fixed Assets / Buildings
    faCar,              // Vehicles
    faComputer,         // Equipment / IT Assets (or faDesktop, faLaptop)
    faTools,            // Machinery / Maintenance
    faPlusCircle,       // Add New Asset
    faDollarSign,       // Acquisition Cost / Value
    faArrowDown,        // Depreciation (value going down)
    faWrench,           // Maintenance
    faTrashAlt,         // Disposal / Retirement
    faList,             // Asset Register / Listing
    faCalendarCheck,    // Maintenance Schedule / Depreciation Run
    faChartArea,        // Asset Valuation / Analysis
    faHistory,          // Asset History / Movements
    faArrowRight,
    faFilter,
    faClipboardList,    // Asset Tagging / Inventory of Assets
    faTags,             // Asset Categories / Groups
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
export default function FixedAssetsDashboard({
    auth,
    totalNetBookValue,
    assetsDueForDepreciationCount,
    upcomingMaintenanceCount,
    assetCategoriesCount
    // Add other relevant counts/data from your controller
}) {
    // Props from controller:
    // return Inertia::render('FixedAssets/Index', [
    // 'totalNetBookValue' => FixedAsset::sum(DB::raw('cost - accumulated_depreciation')),
    // 'assetsDueForDepreciationCount' => FixedAsset::where('next_depreciation_date', '<=', now())->where('status', 'active')->count(),
    // 'upcomingMaintenanceCount' => AssetMaintenance::where('scheduled_date', '>=', now())->where('scheduled_date', '<=', now()->addMonth())->where('status', 'pending')->count(),
    // 'assetCategoriesCount' => AssetCategory::count(),
    // ]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Fixed Assets Hub
                </h2>
            }
        >
            <Head title="Fixed Asset Management" />

            <div className="py-8 md:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Core Actions / Overview */}
                    {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Quick Actions & Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Total Net Book Value"
                                value={totalNetBookValue !== undefined ? `TZS ${totalNetBookValue.toLocaleString()}` : 'N/A'}
                                description="Current value of all assets after depreciation."
                                icon={faDollarSign}
                                iconBgColor="bg-green-600"
                                linkRoute="reports.fixed_assets.valuation" // Link to valuation report
                                linkText="View Valuation"
                            />
                            <ActionOrReportCard
                                title="Add New Asset"
                                description="Record a newly acquired fixed asset."
                                icon={faPlusCircle}
                                iconBgColor="bg-blue-600"
                                linkRoute="fixed_assets.create"
                                linkText="Acquire Asset"
                            />
                            <ActionOrReportCard
                                title="Assets Due for Depreciation"
                                value={assetsDueForDepreciationCount !== undefined ? assetsDueForDepreciationCount : 'N/A'}
                                description="Number of assets ready for next depreciation run."
                                icon={faCalendarCheck}
                                iconBgColor="bg-sky-500"
                                linkRoute="fixed_assets.depreciation.run_process" // Link to run depreciation
                                linkText="Run Depreciation"
                            />
                             <ActionOrReportCard
                                title="Manage Asset Categories"
                                value={assetCategoriesCount !== undefined ? assetCategoriesCount : 'N/A'}
                                description="Classify assets into groups (e.g., buildings, vehicles)."
                                icon={faTags}
                                iconBgColor="bg-purple-600"
                                linkRoute="fixed_assets.categories.index"
                                linkText="View Categories"
                            />
                        </div>
                    </section> */}

                    {/* Section 2: Key Fixed Asset Operations */}
                     {/* <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Asset Operations
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                             <ActionOrReportCard
                                title="View Asset Register"
                                description="Complete list of all fixed assets."
                                icon={faList}
                                iconBgColor="bg-teal-500"
                                linkRoute="fixed_assets.register.index"
                                linkText="View Register"
                            />
                            <ActionOrReportCard
                                title="Run Depreciation"
                                description="Calculate and post periodic depreciation for assets."
                                icon={faArrowDown} // Consistent with due for depreciation
                                iconBgColor="bg-sky-600" // Consistent
                                linkRoute="fixed_assets.depreciation.run_process"
                                linkText="Process Depreciation"
                            />
                            <ActionOrReportCard
                                title="Record Asset Disposal"
                                description="Manage sale, retirement, or scrapping of assets."
                                icon={faTrashAlt}
                                iconBgColor="bg-red-500"
                                linkRoute="fixed_assets.disposals.create"
                                linkText="Dispose Asset"
                            />
                            <ActionOrReportCard
                                title="Manage Maintenance"
                                value={upcomingMaintenanceCount !== undefined ? `${upcomingMaintenanceCount} Upcoming` : 'N/A'}
                                description="Track asset maintenance schedules and history."
                                icon={faWrench}
                                iconBgColor="bg-orange-500"
                                linkRoute="fixed_assets.maintenance.index"
                                linkText="Track Maintenance"
                            />
                            <ActionOrReportCard
                                title="Asset Tagging / Audit"
                                description="Tools for physical verification and tagging of assets."
                                icon={faClipboardList}
                                iconBgColor="bg-indigo-500"
                                linkRoute="fixed_assets.audit.start" // Or index
                                linkText="Start Audit"
                            />
                             <ActionOrReportCard
                                title="Asset Revaluation"
                                description="Adjust asset values based on market changes (advanced)."
                                icon={faChartArea}
                                iconBgColor="bg-lime-500"
                                linkRoute="fixed_assets.revaluation.create"
                                linkText="Revalue Asset"
                            /> 
                        </div>
                    </section> */}

                    {/* Section 3: Fixed Asset Reports */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Fixed Asset Reports
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            <ActionOrReportCard
                                title="Fixed Asset Register"
                                description="Detailed listing of all assets with key information."
                                icon={faList} // Consistent
                                iconBgColor="bg-teal-600" // Consistent
                                linkRoute="reports.fixed_assets.register_detail"
                                linkText="View Full Register"
                            />
                            <ActionOrReportCard
                                title="Depreciation Schedule"
                                description="Projected and actual depreciation for assets over time."
                                icon={faCalendarCheck} // Consistent
                                iconBgColor="bg-sky-600" // Consistent
                                linkRoute="reports.fixed_assets.depreciation_schedule"
                                linkText="View Schedule"
                            />
                            <ActionOrReportCard
                                title="Asset Acquisition Report"
                                description="List of assets acquired within a specific period."
                                icon={faPlusCircle} // Consistent
                                iconBgColor="bg-blue-600"
                                linkRoute="reports.fixed_assets.acquisitions"
                                linkText="View Acquisitions"
                            />
                            <ActionOrReportCard
                                title="Asset Disposal Report"
                                description="Details of assets sold, retired, or scrapped."
                                icon={faTrashAlt} // Consistent
                                iconBgColor="bg-red-600"
                                linkRoute="reports.fixed_assets.disposals"
                                linkText="View Disposals"
                            />
                             <ActionOrReportCard
                                title="Asset Maintenance History"
                                description="Log of all maintenance activities and costs per asset."
                                icon={faHistory}
                                iconBgColor="bg-orange-600"
                                linkRoute="reports.fixed_assets.maintenance_history"
                                linkText="View Maintenance Log"
                            />
                            <ActionOrReportCard
                                title="Asset Valuation Report"
                                description="Summary of asset costs, accumulated depreciation, and NBV."
                                icon={faChartArea} // Consistent
                                iconBgColor="bg-green-600"
                                linkRoute="reports.fixed_assets.valuation" // Consistent
                                linkText="Asset Values"
                            />
                             <ActionOrReportCard
                                title="Assets by Location/Dept"
                                description="Fixed assets grouped by their physical location or department."
                                icon={faBuilding} // or faSitemap
                                iconBgColor="bg-purple-600"
                                linkRoute="reports.fixed_assets.by_location"
                                linkText="View by Location"
                            />
                            <ActionOrReportCard
                                title="Custom Fixed Asset Report"
                                description="Build reports with specific asset data filters."
                                icon={faFilter}
                                iconBgColor="bg-gray-600"
                                linkRoute="reports.fixed_assets.custom"
                                linkText="Build Report"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
