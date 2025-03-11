
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react'; // Import Link
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faWarehouse,   // Normal/Regular Adjustment (more appropriate icon)
    faClipboardList, // Physical Inventory (more appropriate icon)
} from '@fortawesome/free-solid-svg-icons';

export default function Index() { // Receive counts as props
    // itemGroupCount and expenseItemCount are now received as props
    const itemGroupCount = 0;
    const expenseItemCount = 0;
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Inventory Reconciliation
                </h2>
            }
        >
            <Head title="Inventory Reconciliation" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                        {/* Normal/Regular Adjustment */}
                        <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow duration-200">
                            <Link href="/inventory3/normal-adjustment" className="block"> {/* Wrap with Link */}
                                <div className="flex items-center">
                                    <div className="p-3 bg-purple-500 rounded-full">
                                        <FontAwesomeIcon icon={faWarehouse} className="text-white" aria-label="Normal/Regular Adjustment" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-gray-600">Normal/Regular Adjustment</p>
                                        <h3 className="text-2xl font-bold text-gray-800">{itemGroupCount}</h3> {/* Use prop */}
                                        <div className="mt-2">
                                            <span className="text-purple-500">Manage Adjustments</span> {/* Removed hover:underline, as it's now within the Link */}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Physical Inventory */}
                        <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow duration-200">
                            <Link href="/inventory3/physical-inventory" className="block"> {/* Wrap with Link */}
                                <div className="flex items-center">
                                    <div className="p-3 bg-green-500 rounded-full">
                                        <FontAwesomeIcon icon={faClipboardList} className="text-white" aria-label="Physical Inventory" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-gray-600">Physical Inventory</p>
                                        <h3 className="text-2xl font-bold text-gray-800">{expenseItemCount}</h3> {/* Use prop */}
                                        <div className="mt-2">
                                           <span className="text-green-500">Manage Inventory</span>  {/* Removed hover:underline */}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}