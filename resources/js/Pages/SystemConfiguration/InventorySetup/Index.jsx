import React from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStoreAlt,         // Stores (alternative to faStore)
    faTags,             // Product Categories
    faBalanceScaleLeft, // Product Units (more abstract for units of measure)
    faBoxesStacked,     // Product Register (alternative to faBoxes)
    faFileSignature,    // Adjustment Reasons (more about documenting reasons)
    faTruckMoving,      // Suppliers (alternative to faTruck)
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function InventorySetupIndex({
    auth,
    storeCount = 0,
    productCategoryCount = 0,
    productUnitCount = 0,
    productRegisterCount = 0,
    adjustmentReasonCount = 0,
    supplierCount = 0
}) {
    const dashboardItemsRow1 = [
        { title: "Stores", count: storeCount, icon: faStoreAlt, routeName: 'systemconfiguration2.stores.index', color: 'red', description: "Manage your physical and virtual store locations." },
        { title: "Product Categories", count: productCategoryCount, icon: faTags, routeName: 'systemconfiguration2.categories.index', color: 'green', description: "Organize products into logical categories." },
        { title: "Product Units", count: productUnitCount, icon: faBalanceScaleLeft, routeName: 'systemconfiguration2.units.index', color: 'orange', description: "Define units of measure for your products." },
        { title: "Product Register", count: productRegisterCount, icon: faBoxesStacked, routeName: 'systemconfiguration2.products.index', color: 'purple', description: "Maintain a comprehensive list of all products." },
    ];

    const dashboardItemsRow2 = [
        { title: "Adjustment Reasons", count: adjustmentReasonCount, icon: faFileSignature, routeName: 'systemconfiguration2.adjustmentreasons.index', color: 'teal', description: "Configure reasons for stock adjustments." },
        { title: "Suppliers", count: supplierCount, icon: faTruckMoving, routeName: 'systemconfiguration2.suppliers.index', color: 'blue', description: "Manage your list of product suppliers." },
    ];

    const Card = ({ title, count, icon, routeName, color, description }) => (
        <Link
            href={route(routeName)}
            className={`block bg-white overflow-hidden shadow-sm sm:rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out group border-l-4 border-${color}-500`}
        >
            <div className="p-6">
                <div className="flex items-start">
                    <div className={`flex-shrink-0 bg-${color}-500 rounded-md p-3 shadow`}>
                        <FontAwesomeIcon icon={icon} className="h-8 w-8 text-white" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dt>
                            <p className={`text-lg font-semibold text-gray-800 group-hover:text-${color}-600 transition-colors duration-300`}>
                                {title}
                            </p>
                        </dt>
                        <dd className="flex items-baseline">
                            <p className={`text-3xl font-bold text-${color}-600`}>
                                {count}
                            </p>
                            {/* Optional: Add a unit like "Items" or "Categories" if useful */}
                        </dd>
                        {description && <p className="mt-3 text-sm text-gray-500">{description}</p>}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className={`flex items-center text-sm font-medium text-${color}-600 group-hover:text-${color}-700`}>
                        Manage {title}
                        <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                </div>
            </div>
        </Link>
    );

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Inventory Setup Dashboard
                </h2>
            }
        >
            <Head title="Inventory Setup" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {dashboardItemsRow1.map(item => <Card key={item.title} {...item} />)}
                    </div>
                    {/* Adjusted grid for the second row to be more balanced if it has 2 items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                        {dashboardItemsRow2.map(item => <Card key={item.title} {...item} />)}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}