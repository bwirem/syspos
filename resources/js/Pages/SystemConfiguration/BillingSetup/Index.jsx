import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head,Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCog,          // Settings
    faMoneyBill,    // Currencies
    faCreditCard,   // Payment Types
    faTag,          // Price Categories
    faLayerGroup,   // Billing Item Group
    faListAlt,      // Billing Items
    faUsers         // Customers
} from '@fortawesome/free-solid-svg-icons';

export default function Index() {
    // Placeholder counts (replace with actual values from props or data fetching)
    const currencyCount = 0;
    const paymentTypeCount = 0;
    const priceCategoryCount = 0;
    const itemGroupCount = 0;
    const billingItemCount = 0;
    const customerCount = 0;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Billing Setup Dashboard
                </h2>
            }
        >
            <Head title="Billing Setup Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">                

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Currencies */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-red-500 rounded-full">
                                    <FontAwesomeIcon icon={faMoneyBill} className="text-white" aria-label="Currencies" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Currencies</p>
                                    <h3 className="text-2xl font-bold">{currencyCount}</h3>
                                    <div className="mt-2">
                                        <Link href={route('systemconfiguration0.currencies.index')} className="text-red-500 hover:underline">Manage Currencies</Link>
                                    </div>                                    
                                </div>
                            </div>
                        </div>

                        {/* Payment Types */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-500 rounded-full">
                                    <FontAwesomeIcon icon={faCreditCard} className="text-white" aria-label="Payment Types" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Payment Types</p>
                                    <h3 className="text-2xl font-bold">{paymentTypeCount}</h3>
                                    <div className="mt-2">
                                        <Link href={route('systemconfiguration0.paymenttypes.index')} className="text-green-500 hover:underline">Manage Payment Types</Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price Categories */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-orange-500 rounded-full">
                                    <FontAwesomeIcon icon={faTag} className="text-white" aria-label="Price Categories" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Price Categories</p>
                                    <h3 className="text-2xl font-bold">{priceCategoryCount}</h3>
                                    <div className="mt-2">
                                        <Link href={route('systemconfiguration0.pricecategories.index')} className="text-orange-500 hover:underline">Manage Price Categories</Link>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>

                        {/* Billing Item Group */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-purple-500 rounded-full">
                                    <FontAwesomeIcon icon={faLayerGroup} className="text-white" aria-label="Billing Item Group" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Billing Item Group</p>
                                    <h3 className="text-2xl font-bold">{itemGroupCount}</h3>
                                    <div className="mt-2">
                                        <Link href={route('systemconfiguration0.itemgroups.index')} className="text-purple-500 hover:underline">Manage Billing Item Group</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {/* Billing Items */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-500 rounded-full">
                                    <FontAwesomeIcon icon={faListAlt} className="text-white" aria-label="Billing Items" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Billing Items</p>
                                    <h3 className="text-2xl font-bold">{billingItemCount}</h3>
                                    <div className="mt-2">
                                        <Link href={route('systemconfiguration0.items.index')} className="text-green-500 hover:underline">Manage Billing Items</Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customers */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-500 rounded-full">
                                    <FontAwesomeIcon icon={faUsers} className="text-white" aria-label="Customers" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Customers</p>
                                    <h3 className="text-2xl font-bold">{customerCount}</h3>
                                    <div className="mt-2">
                                        <Link href={route('systemconfiguration0.customers.index')} className="text-blue-500 hover:underline">Manage Customers</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
