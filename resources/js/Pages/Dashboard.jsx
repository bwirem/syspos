import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { faPeopleCarry, faDollarSign, faHistory, faCheckCircle, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Orders Card */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-red-500 rounded-full">
                                    <FontAwesomeIcon icon={faPeopleCarry} className="text-white" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Orders</p>
                                    <h3 className="text-2xl font-bold">
                                        150 <small className="text-gray-500">Orders</small>
                                    </h3>
                                    <div className="mt-2">
                                        <a href="#pablo" className="text-red-500 hover:underline">Manage Orders</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bills Card */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-500 rounded-full">
                                    <FontAwesomeIcon icon={faDollarSign} className="text-white" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Bills</p>
                                    <h3 className="text-2xl font-bold">
                                        75 <small className="text-gray-500">Bills</small>
                                    </h3>
                                    <div className="mt-2">
                                        <a href="#pablo" className="text-blue-500 hover:underline">Manage Bills</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bills History Card */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-500 rounded-full">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-white" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Bills History</p>
                                    <h3 className="text-2xl font-bold">
                                        50 <small className="text-gray-500">Clients</small>
                                    </h3>
                                    <div className="mt-2">
                                        <a href="#pablo" className="text-green-500 hover:underline">Preview History</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Voided History Card */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-orange-500 rounded-full">
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-white" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Voided History</p>
                                    <h3 className="text-2xl font-bold">
                                        Tsh 1,000,000
                                    </h3>
                                    <div className="mt-2">
                                        <span className="text-orange-500">Tsh 200,000 Pending</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Rows for Charts or Other Content */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        {/* Daily Registrations Chart */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h4 className="text-xl font-bold">Daily Registrations</h4>
                            <p className="text-gray-600">
                                <span className="text-green-500"><i className="fa fa-long-arrow-up"></i> 15% </span>
                                increase in today registrations.
                            </p>
                            {/* Chart would go here */}
                        </div>

                        {/* Top Regions Chart */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h4 className="text-xl font-bold">Top Regions</h4>
                            <p className="text-gray-600">High Number of Active Members</p>
                            {/* Chart would go here */}
                        </div>

                        {/* Clients Registrations Chart */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h4 className="text-xl font-bold">Clients Registrations</h4>
                            <p className="text-gray-600">Clients Registration Process Trend</p>
                            {/* Chart would go here */}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
