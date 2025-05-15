import React from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faGlobeAmericas, // Country (slightly different globe)
    faMapMarkedAlt,  // Region (map with marker)
    faCity,          // District (cityscape icon)
    faHome,          // Ward (home/community icon, faPlaceOfWorship might be too specific)
    faRoad,          // Street
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function LocationSetupIndex({
    auth,
    countryCount = 0,    // Renamed from nocountry
    regionCount = 0,     // Renamed from noregion
    districtCount = 0,   // Renamed from nodistrict
    wardCount = 0,       // Renamed from noward
    streetCount = 0      // Renamed from nostreet
}) {
    const dashboardItemsRow1 = [
        { title: "Countries", count: countryCount, icon: faGlobeAmericas, routeName: 'systemconfiguration4.countries.index', color: 'blue', description: "Manage countries within your system." },
        { title: "Regions", count: regionCount, icon: faMapMarkedAlt, routeName: 'systemconfiguration4.regions.index', color: 'green', description: "Define and administer geographical regions." },
        { title: "Districts", count: districtCount, icon: faCity, routeName: 'systemconfiguration4.districts.index', color: 'orange', description: "Set up districts or major administrative areas." },
        { title: "Wards", count: wardCount, icon: faHome, routeName: 'systemconfiguration4.wards.index', color: 'teal', description: "Manage smaller administrative units or wards." },
    ];

    const dashboardItemsRow2 = [
        { title: "Streets", count: streetCount, icon: faRoad, routeName: 'systemconfiguration4.streets.index', color: 'indigo', description: "Define streets and local address details." },
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
                            {/* Optional: Add a unit like "Locations" or "Areas" if useful */}
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
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Location Setup Dashboard
                </h2>
            }
        >
            <Head title="Location Setup" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {dashboardItemsRow1.map(item => <Card key={item.title} {...item} />)}
                    </div>
                    {/* The second row with a single item. Adjust grid columns if more items are added here. */}
                    {/* For a single item, you might want it to span more columns on larger screens or center it. */}
                    {/* Example: Centering a single card in a row that could hold up to 4 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* This structure will make the single card take up 1/4 of the width on lg screens. */}
                        {/* If you want it larger, you'd adjust the parent grid or the card's col-span. */}
                        {/* For now, keeping it consistent with how it would appear if there were more cards. */}
                        {dashboardItemsRow2.map(item => (
                            // You could add col-span utilities here if you want this card to be wider
                            // e.g., className="lg:col-span-2" to make it take half the width on large screens
                            <div key={item.title} className={dashboardItemsRow2.length === 1 ? "lg:col-start-2 lg:col-span-2" : ""}> {/* Example centering for 1 item in a 4-col grid */}
                                <Card {...item} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}