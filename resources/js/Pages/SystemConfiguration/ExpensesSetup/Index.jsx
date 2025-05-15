import React from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react'; // Ensure Link is imported
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLayerGroup, // Expense Group
    faReceipt,    // Expense (more specific than faListAlt for expenses)
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function ExpensesSetupIndex({
    auth,
    expenseGroupCount = 0,
    expenseItemCount = 0
}) {
    const dashboardItems = [
        {
            title: "Expense Groups",
            count: expenseGroupCount,
            icon: faLayerGroup,
            routeName: 'systemconfiguration1.itemgroups.index', // Assuming this is the correct route name from your web.php
            color: 'purple',
            description: "Organize and categorize different types of expenses."
        },
        {
            title: "Expense Items",
            count: expenseItemCount,
            icon: faReceipt, // Using faReceipt for expenses
            routeName: 'systemconfiguration1.items.index', // Assuming this is the correct route name
            color: 'green',
            description: "Manage individual expense items and their details."
        },
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
                            {/* You can add a unit like "Groups" or "Items" if desired */}
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
            user={auth.user} // Pass user to AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Expenses Setup Dashboard
                </h2>
            }
        >
            <Head title="Expenses Setup" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {dashboardItems.map(item => <Card key={item.title} {...item} />)}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}