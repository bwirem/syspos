import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCog,           // Settings
    faStore,         // Stores
    faTags,          // Product Categories
    faRulerHorizontal, // Product Units
    faBoxes,         // Product Register
    faEdit,          // Adjustment Reasons
    faTruck          // Suppliers
} from '@fortawesome/free-solid-svg-icons';

export default function Index() { // Receive data prop
    // Destructure the data prop
    const { storeCount, productCategoryCount, productUnitCount, productRegisterCount, adjustmentReasonCount, supplierCount } = 0;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Inventory Setup Dashboard
                </h2>
            }
        >
            <Head title="Inventory Setup Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">                   
                    
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Stores */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-red-500 rounded-full">
                                    <FontAwesomeIcon icon={faStore} className="text-white" aria-label="Stores" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Stores</p>
                                    <h3 className="text-2xl font-bold">{storeCount}</h3>
                                    <div className="mt-2">                                        
                                        <a href={route('systemconfiguration2.stores.index')} className="text-purple-500 hover:underline">Manage Stores</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Product Categories */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-500 rounded-full">
                                    <FontAwesomeIcon icon={faTags} className="text-white" aria-label="Product Categories" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Product Categories</p>
                                    <h3 className="text-2xl font-bold">{productCategoryCount}</h3>
                                    <div className="mt-2">                                       
                                        <a href={route('systemconfiguration2.categories.index')} className="text-purple-500 hover:underline">Manage Product Categories</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Product Units */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-orange-500 rounded-full">
                                    <FontAwesomeIcon icon={faRulerHorizontal} className="text-white" aria-label="Product Units" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Product Units</p>
                                    <h3 className="text-2xl font-bold">{productUnitCount}</h3>
                                    <div className="mt-2">                                       
                                        <a href={route('systemconfiguration2.units.index')} className="text-purple-500 hover:underline">Manage Product Units</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Product Register */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-purple-500 rounded-full">
                                    <FontAwesomeIcon icon={faBoxes} className="text-white" aria-label="Product Register" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Product Register</p>
                                    <h3 className="text-2xl font-bold">{productRegisterCount}</h3>
                                    <div className="mt-2">                                   
                                        <a href={route('systemconfiguration2.products.index')} className="text-purple-500 hover:underline">Manage Product Register</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
                        {/* Adjustment Reasons */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-500 rounded-full">
                                    <FontAwesomeIcon icon={faEdit} className="text-white" aria-label="Adjustment Reasons" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Adjustment Reasons</p>
                                    <h3 className="text-2xl font-bold">{adjustmentReasonCount}</h3>
                                    <div className="mt-2">                                        
                                        <a href={route('systemconfiguration2.adjustmentreasons.index')} className="text-purple-500 hover:underline">Manage Adjustment Reasons</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Suppliers */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-500 rounded-full">
                                    <FontAwesomeIcon icon={faTruck} className="text-white" aria-label="Suppliers" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Suppliers</p>
                                    <h3 className="text-2xl font-bold">{supplierCount}</h3>
                                    <div className="mt-2">                                       
                                        <a href={route('systemconfiguration2.suppliers.index')} className="text-purple-500 hover:underline">Manage Suppliers</a>
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