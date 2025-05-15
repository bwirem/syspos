import React from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMoneyBillWave,    // Currencies (slightly different icon for variety)
    faCreditCard,       // Payment Types
    faTags,             // Price Categories (plural version of faTag)
    faLayerGroup,       // Billing Item Group
    faListUl,           // Billing Items (alternative to faListAlt)
    faUsersCog,         // Customers (users with a cog, implying management)
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function BillingSetupIndex({
    auth,
    currencyCount = 0,
    paymentTypeCount = 0,
    priceCategoryCount = 0,
    itemGroupCount = 0,
    billingItemCount = 0,
    customerCount = 0
}) {
    const dashboardItemsRow1 = [
        { title: "Currencies", count: currencyCount, icon: faMoneyBillWave, routeName: 'systemconfiguration0.currencies.index', color: 'red', description: "Define and manage accepted currencies." },
        { title: "Payment Types", count: paymentTypeCount, icon: faCreditCard, routeName: 'systemconfiguration0.paymenttypes.index', color: 'green', description: "Configure available payment methods." },
        { title: "Price Categories", count: priceCategoryCount, icon: faTags, routeName: 'systemconfiguration0.pricecategories.index', color: 'orange', description: "Set up different pricing tiers or categories." },
        { title: "Billing Item Groups", count: itemGroupCount, icon: faLayerGroup, routeName: 'systemconfiguration0.itemgroups.index', color: 'purple', description: "Organize billing items into logical groups." },
    ];

    const dashboardItemsRow2 = [
        { title: "Billing Items", count: billingItemCount, icon: faListUl, routeName: 'systemconfiguration0.items.index', color: 'teal', description: "Manage individual services and products for billing." },
        { title: "Customers", count: customerCount, icon: faUsersCog, routeName: 'systemconfiguration0.customers.index', color: 'blue', description: "Administer customer accounts and information." },
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
                            {/* <p className="ml-2 text-sm font-medium text-gray-500">Items</p> */}
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
                    Billing Setup Dashboard
                </h2>
            }
        >
            <Head title="Billing Setup" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {dashboardItemsRow1.map(item => <Card key={item.title} {...item} />)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Adjusted to lg:grid-cols-3 for the second row of 2 items */}
                        {dashboardItemsRow2.map(item => <Card key={item.title} {...item} />)}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}