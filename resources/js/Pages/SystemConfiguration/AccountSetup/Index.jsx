import React from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSitemap,    // More appropriate for Chart of Accounts (hierarchy)
    faLink,       // More appropriate for Account Mappings
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function AccountSetupIndex({ 
    auth, 
    chartOfAccountCount = 0, 
    accountMappingCount = 0 
}) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Account Setup Dashboard
                </h2>
            }
        >
            <Head title="Account Setup" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Chart Of Account Card */}
                        <Link
                            href={route('systemconfiguration3.chartofaccounts.index')}
                            className="block bg-white overflow-hidden shadow-sm sm:rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out group"
                        >
                            <div className="p-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 bg-purple-500 rounded-md p-3 shadow">
                                        <FontAwesomeIcon icon={faSitemap} className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dt>
                                            <p className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors duration-300">
                                                Chart of Accounts
                                            </p>
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <p className="text-3xl font-bold text-purple-600">
                                                {chartOfAccountCount}
                                            </p>
                                            <p className="ml-2 text-sm font-medium text-gray-500">
                                                Accounts
                                            </p>
                                        </dd>
                                        <p className="mt-3 text-sm text-gray-500">
                                            Define and manage your organization's financial account structure.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center text-sm font-medium text-purple-600 group-hover:text-purple-700">
                                        Manage Chart of Accounts
                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Accounts Mapping Card */}
                        <Link
                            href={route('systemconfiguration3.chartofaccountmappings.index')}
                            className="block bg-white overflow-hidden shadow-sm sm:rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out group"
                        >
                            <div className="p-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3 shadow">
                                        <FontAwesomeIcon icon={faLink} className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dt>
                                            <p className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors duration-300">
                                                Account Mappings
                                            </p>
                                        </dt>
                                        <dd className="flex items-baseline">
                                            <p className="text-3xl font-bold text-green-600">
                                                {accountMappingCount}
                                            </p>
                                            <p className="ml-2 text-sm font-medium text-gray-500">
                                                Mappings
                                            </p>
                                        </dd>
                                        <p className="mt-3 text-sm text-gray-500">
                                            Configure how different system modules map to your Chart of Accounts.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center text-sm font-medium text-green-600 group-hover:text-green-700">
                                        Manage Account Mappings
                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                        
                        {/* Add more cards here following the same pattern if needed */}

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}