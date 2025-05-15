import React from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLayerGroup, // Facility Option (renamed from Expense Item Group for context)
    faListAlt,    // Other Option (renamed from Expense Items for context)
    faArrowRight  // For call to action
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function FacilitySetupIndex({ 
    auth, 
    facilityOptionCount = 0, // Renamed prop
    otherOptionCount = 0     // Renamed prop
}) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Facility Setup Dashboard
                </h2>
            }
        >
            <Head title="Facility Setup" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Facility Option Card */}
                        <Link
                            href={route('systemconfiguration5.facilityoptions.index')}
                            className="block bg-white overflow-hidden shadow-sm sm:rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out group"
                        >
                            <div className="p-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 bg-purple-500 rounded-md p-3 shadow">
                                        <FontAwesomeIcon icon={faLayerGroup} className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dt>
                                            <p className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors duration-300">
                                                Facility Options
                                            </p>
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <p className="text-3xl font-bold text-purple-600">
                                                {facilityOptionCount}
                                            </p>
                                            <p className="ml-2 text-sm font-medium text-gray-500">
                                                Options
                                            </p>
                                        </dd>
                                        <p className="mt-3 text-sm text-gray-500">
                                            Manage and configure different options and settings related to facilities.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center text-sm font-medium text-purple-600 group-hover:text-purple-700">
                                        Manage Facility Options
                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Other Option Card */}
                        {/* If '/addorlistexpense/view' is an Inertia route, use Link. Otherwise, 'a' is fine. */}
                        {/* For consistency, I'll assume it could be an Inertia route and use Link with a placeholder name. */}
                        {/* If it's an external or non-Inertia link, revert to 'a' tag. */}
                        <Link
                            //href={route('')} // Placeholder route name, adjust as needed
                             href="/addorlistexpense/view" // Use this if it's not an Inertia named route
                            className="block bg-white overflow-hidden shadow-sm sm:rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out group"
                        >
                            <div className="p-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3 shadow">
                                        <FontAwesomeIcon icon={faListAlt} className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dt>
                                            <p className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors duration-300">
                                                Other Setup Options
                                            </p>
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <p className="text-3xl font-bold text-green-600">
                                                {otherOptionCount}
                                            </p>
                                            <p className="ml-2 text-sm font-medium text-gray-500">
                                                Items
                                            </p>
                                        </dd>
                                        <p className="mt-3 text-sm text-gray-500">
                                            Access and manage other miscellaneous setup configurations and lists.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center text-sm font-medium text-green-600 group-hover:text-green-700">
                                        Manage Other Options
                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                        
                        {/* You can add more cards here following the same pattern */}

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}