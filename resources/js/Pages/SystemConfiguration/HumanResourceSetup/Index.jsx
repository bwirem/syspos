import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from '@inertiajs/react';  // Import Link
import {
    faCog,           // Settings
    faGlobe,         // Country
    faMap,           // Region
    faMapMarkerAlt,  // District
    faPlaceOfWorship,       // Ward (Place/Location Icon)
    faRoad,          // Street (Road Icon)
} from '@fortawesome/free-solid-svg-icons';

export default function Index() { // Pass data as props
    // Destructure the data prop
    const { nocountry, noregion, nodistrict, noward, nostreet } = 0;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Location Setup Dashboard
                </h2>
            }
        >
            <Head title="Location Setup Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Country */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-500 rounded-full">
                                    <FontAwesomeIcon icon={faGlobe} className="text-white" aria-label="Country" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Country</p>
                                    <h3 className="text-2xl font-bold">{nocountry}</h3>
                                    <div className="mt-2">                                      
                                        <Link href={route('systemconfiguration4.countries.index')} className="text-purple-500 hover:underline">Manage Countries</Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Region */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-500 rounded-full">
                                    <FontAwesomeIcon icon={faMap} className="text-white" aria-label="Region" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Region</p>
                                    <h3 className="text-2xl font-bold">{noregion}</h3>
                                    <div className="mt-2">                                      
                                        <Link href={route('systemconfiguration4.regions.index')} className="text-purple-500 hover:underline">Manage Regions</Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* District */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-orange-500 rounded-full">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-white" aria-label="District" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">District</p>
                                    <h3 className="text-2xl font-bold">{nodistrict}</h3>
                                    <div className="mt-2">
                                        <Link href={route('systemconfiguration4.districts.index')} className="text-purple-500 hover:underline">Manage Districts</Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ward */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-500 rounded-full">
                                    <FontAwesomeIcon icon={faPlaceOfWorship} className="text-white" aria-label="Ward" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Ward</p>
                                    <h3 className="text-2xl font-bold">{noward}</h3>
                                    <div className="mt-2">                                     
                                        <Link href={route('systemconfiguration4.wards.index')} className="text-purple-500 hover:underline">Manage Wards</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 mt-6">
                        {/* Street */}
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-orange-500 rounded-full">
                                    <FontAwesomeIcon icon={faRoad} className="text-white" aria-label="Street" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-600">Street</p>
                                    <h3 className="text-2xl font-bold">{nostreet}</h3>
                                    <div className="mt-2">                                   
                                        <Link href={route('systemconfiguration4.streets.index')} className="text-purple-500 hover:underline">Manage Streets</Link>
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
