import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faPlus, faEdit, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export default function Index({ auth, chartofaccountsmapping, chartofaccounts, success }) {
    
    // Your controller sends a paginator object. We get the first item from its `data` array.
    const mapping = chartofaccountsmapping.data.length > 0 ? chartofaccountsmapping.data[0] : null;
    const hasMapping = !!mapping;

    // Helper to find the full account object from the `chartofaccounts` list by its ID
    const findAccount = (id) => {
        if (!id || !chartofaccounts) return { account_name: 'N/A', account_code: 'N/A' };
        return chartofaccounts.find(acc => acc.id.toString() === id.toString()) || { account_name: 'Not Found', account_code: 'N/A' };
    };

    const mappedAccounts = hasMapping ? [
        { label: 'Accounts Payable', account: findAccount(mapping.account_payable_id) },
        { label: 'Accounts Receivable', account: findAccount(mapping.account_receivable_id) },
    ] : [];

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Special Account Mappings</h2>}>
            <Head title="Account Mappings" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {success && <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">{success}</div>}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6">
                        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h3 className="text-lg font-medium text-gray-800">
                                Current Account Mappings
                            </h3>
                            <div className="flex items-center space-x-2">
                                {hasMapping ? (
                                    // Your controller's edit route doesn't take an ID
                                    <Link href={route("systemconfiguration3.chartofaccountmappings.edit")} className="flex items-center whitespace-nowrap rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-600">
                                        <FontAwesomeIcon icon={faEdit} className="mr-2" /> Edit
                                    </Link>
                                ) : (
                                    <Link href={route("systemconfiguration3.chartofaccountmappings.create")} className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
                                        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create Mappings
                                    </Link>
                                )}
                                <Link href={route("systemconfiguration3.index")} className="flex items-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                    <FontAwesomeIcon icon={faHome} className="mr-2" /> Home
                                </Link>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mapping Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Code</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {hasMapping ? (
                                        mappedAccounts.map(({ label, account }) => (
                                            <tr key={label} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{label}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{account.account_name}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{account.account_code}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="text-center py-10 text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500 text-2xl" />
                                                    <span>No account mappings have been defined.</span>
                                                    <span className="text-xs">Click "Create Mappings" to set them up.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}