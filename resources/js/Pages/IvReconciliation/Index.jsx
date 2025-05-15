
import React from "react"; // No need for useEffect, useState here if it's just a display page
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faWarehouse,
    faClipboardList,
    faArrowRight // Added for a "View Details" feel
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css"; // Ensure this is imported if not globally

// It's good practice to define the props this component expects
export default function InventoryReconciliationIndex({ 
    auth, // Assuming AuthenticatedLayout needs it
    normalAdjustmentCount = 0, // Default to 0 if not provided
    physicalInventoryCount = 0  // Default to 0 if not provided
}) {
    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user to AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Inventory Reconciliation Dashboard
                </h2>
            }
        >
            <Head title="Inventory Reconciliation" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Normal/Regular Adjustment Card */}
                        <Link 
                            href={route("inventory3.normal-adjustment.index")} // Using route helper
                            className="block bg-white overflow-hidden shadow-sm sm:rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out group"
                        >
                            <div className="p-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 bg-purple-500 rounded-md p-3 shadow">
                                        <FontAwesomeIcon icon={faWarehouse} className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dt>
                                            <p className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors duration-300">
                                                Stock Adjustments
                                            </p>
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <p className="text-3xl font-bold text-purple-600">
                                                {normalAdjustmentCount}
                                            </p>
                                            <p className="ml-2 text-sm font-medium text-gray-500">
                                                Records
                                            </p>
                                        </dd>
                                        <p className="mt-3 text-sm text-gray-500">
                                            Manage additions, removals, or corrections to stock levels for various reasons.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center text-sm font-medium text-purple-600 group-hover:text-purple-700">
                                        View Adjustments
                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Physical Inventory Card */}
                        <Link 
                            href={route("inventory3.physical-inventory.index")} // Using route helper
                            className="block bg-white overflow-hidden shadow-sm sm:rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out group"
                        >
                            <div className="p-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3 shadow">
                                        <FontAwesomeIcon icon={faClipboardList} className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dt>
                                            <p className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors duration-300">
                                                Physical Inventory Counts
                                            </p>
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <p className="text-3xl font-bold text-green-600">
                                                {physicalInventoryCount}
                                            </p>
                                            <p className="ml-2 text-sm font-medium text-gray-500">
                                                Counts
                                            </p>
                                        </dd>
                                        <p className="mt-3 text-sm text-gray-500">
                                            Record and manage physical stock counts to ensure inventory accuracy.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center text-sm font-medium text-green-600 group-hover:text-green-700">
                                        View Counts
                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}