import React from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsersCog,      // User Management
    faUserShield,    // Role Management
    faKey,           // Permission Management
    faShieldVirus,   // Security Policies
    faTriangleExclamation, // Alerts
    faFingerprint,   // Biometric Security
    faArrowRight,
    faPrint          // <--- Added for Printer Configs
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function SecuritySettingsDashboard({
    auth,
    userCount = 0,
    roleCount = 0,
    permissionCount = 0,
    printerConfigCount = 0, // <--- Added new prop
    securityPolicyCount = 0,
    alertCount = 0,
    // securityKeyCount = "N/A", 
    // biometricSettingCount = "N/A"
}) {
    const dashboardItems = [
        { 
            title: "User Management", 
            count: userCount, 
            icon: faUsersCog, 
            routeName: 'usermanagement.users.index', 
            color: 'red', 
            description: "Administer user accounts, access, and profiles." 
        },
        { 
            title: "Role Management", 
            count: roleCount, 
            icon: faUserShield, 
            routeName: 'usermanagement.usergroups.index', 
            color: 'blue', 
            description: "Define and manage user roles and group access." 
        },
        { 
            title: "Permission Management", 
            count: permissionCount, 
            icon: faKey, 
            routeName: 'usermanagement.userpermission.index', 
            color: 'green', 
            description: "Control granular access permissions for roles." 
        },
        { 
            title: "Printer Configs", // <--- New Item
            count: printerConfigCount, 
            icon: faPrint, 
            routeName: 'usermanagement.usergroupprinters.index', 
            color: 'indigo', 
            description: "Assign printers to user groups and workstations." 
        },
        { 
            title: "Security Policies", 
            count: securityPolicyCount, 
            icon: faShieldVirus, 
            href: '/security-policies', 
            color: 'yellow', 
            description: "Configure and enforce system security policies." 
        }, 
        { 
            title: "Alerts & Monitoring", 
            count: alertCount, 
            icon: faTriangleExclamation, 
            href: '/alerts', 
            color: 'orange', 
            description: "View and manage security alerts and system logs." 
        }, 
        { 
            title: "Security Keys", 
            count: "N/A", 
            icon: faKey, 
            href: '/security-keys', 
            color: 'purple', 
            description: "Manage MFA keys and hardware security tokens." 
        }, 
        { 
            title: "Biometric Security", 
            count: "N/A", 
            icon: faFingerprint, 
            href: '/biometric-security', 
            color: 'teal', 
            description: "Configure and manage biometric authentication." 
        }, 
    ];

    const Card = ({ title, count, icon, routeName, href, color, description }) => {
        // Determine if we use an Inertia Link or standard anchor tag
        const linkProps = routeName ? { href: route(routeName) } : { href: href || '#' };
        const Tag = routeName ? Link : 'a'; 

        return (
            <Tag
                {...linkProps}
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
                            </dd>
                            {description && <p className="mt-3 text-sm text-gray-500">{description}</p>}
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className={`flex items-center text-sm font-medium text-${color}-600 group-hover:text-${color}-700`}>
                            {title.includes("Alerts") ? "View" : "Manage"} {title}
                            <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                    </div>
                </div>
            </Tag>
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Security Settings Dashboard
                </h2>
            }
        >
            <Head title="Security Settings" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Responsive Grid: 1 col mobile, 2 col small, 3 col large, 4 col extra large */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {dashboardItems.map(item => <Card key={item.title} {...item} />)}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}