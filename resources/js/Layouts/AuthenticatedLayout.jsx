import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBars, faTimes, faUser, faSignOutAlt, faHome, faShoppingCart, faPlusSquare, faMoneyBill, faMoneyBillAlt,
    faHistory, faBoxes, faFileInvoice, faCartPlus, faWarehouse, faStore, faTruck, faSyncAlt, faRedo, faBalanceScale,
    faBook, faChartBar, faFileAlt, faCog, faUsersCog, faCogs,
    faBox,
    faClipboardList,
    faListAlt,
    faBuilding  // <--- ADDED IMPORT for faBuilding
} from "@fortawesome/free-solid-svg-icons";
import { faHistory as faSalesHistory } from '@fortawesome/free-solid-svg-icons'; // Sales History
import { faMoneyCheckAlt as faPaymentsHistory } from '@fortawesome/free-solid-svg-icons'; // Payments History
import { faBan as faVoidHistory } from '@fortawesome/free-solid-svg-icons'; // Void History
import { faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { faFileInvoice as faBillingSetupIcon } from '@fortawesome/free-solid-svg-icons'; // New icon for Billing Setup
import { faMoneyBillWave as faExpensesSetupIcon } from '@fortawesome/free-solid-svg-icons'; // New icon for Expenses Setup
import { faBoxOpen as faInventorySetupIcon } from '@fortawesome/free-solid-svg-icons'; // New icon for Inventory Setup
import { faMapMarkerAlt as faLocationSetupIcon } from '@fortawesome/free-solid-svg-icons'; // New icon for Location Setup
import "@fortawesome/fontawesome-svg-core/styles.css";


// Constants for CSS classes
const navLinkClasses =
    'flex items-center p-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md';
const caretClasses = (isOpen) => `caret ${isOpen ? 'rotate-180' : ''}`;

// Icon Map
const iconMap = {
    home: faHome,
    //Sales and Billing
    add_shopping_cart: faShoppingCart,
    post_add: faPlusSquare,
    paid: faMoneyBill,
    sales_history: faSalesHistory, // New
    payments_history: faPaymentsHistory, // New
    void_history: faVoidHistory, // New

    //Expenses
    attach_money: faMoneyBillAlt,
    history: faHistory,

    //Inventories
    inventory: faBoxes,
    request_quote: faFileInvoice,
    shopping_cart: faCartPlus,
    storage: faWarehouse,
    store: faStore,
    local_shipping: faTruck,
    sync_alt: faSyncAlt,
    autorenew: faRedo,
    account_balance: faBalanceScale,
    menu_book: faBook,
    analytics: faChartBar,
    description: faFileAlt,
    settings: faCog,
    manage_accounts: faUsersCog,
    security_settings: faShieldAlt, // Added for Security Settings
    billing_setup: faBillingSetupIcon, // New
    expenses_setup: faExpensesSetupIcon, // New
    inventory_setup: faInventorySetupIcon, // New
    location_setup: faLocationSetupIcon,  // New
    goods_receiving: faBox,          // New: For Goods Receiving
    inventory_reconciliation: faClipboardList, // New: For Inventory Reconciliation
    stock_history: faListAlt,       // New: For Stock History
    facility_setup: faBuilding      // <--- ADDED facility_setup mapping

};


// SidebarNavLink Component
function SidebarNavLink({ href, icon, children }) {
    return (
        <li>
            <Link href={href} className={navLinkClasses}>
                {icon && <FontAwesomeIcon icon={icon} className="mr-2" />}
                <span className="sidebar-normal">{children}</span>
            </Link>
        </li>
    );
}

// SidebarItem Component
function SidebarItem({ icon, label, isOpen, toggleOpen, children, href }) {
    return (
        <li>
            {href ? (
                <Link href={href} className={navLinkClasses}>
                    {icon && <FontAwesomeIcon icon={icon} className="mr-2" />}
                    <p>{label}</p>
                </Link>
            ) : (
                <button
                    onClick={toggleOpen}
                    className="flex items-center p-2 text-gray-300 hover:bg-gray-700 hover:text-white w-full rounded-md focus:outline-none"
                    aria-expanded={isOpen}
                >
                    {icon && <FontAwesomeIcon icon={icon} className="mr-2" />}
                    <p>
                        {label}
                        <b className={caretClasses(isOpen)}></b>
                    </p>
                </button>
            )}
            {children && isOpen && (
                <div className="pl-6">
                    <ul className="nav">{children}</ul>
                </div>
            )}
        </li>
    );
}

// Menu Button Component
function MenuButton({ children, onClick, className }) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none ${className}`}
        >
            {children}
        </button>
    );
}

// Main Component
export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(window.innerWidth >= 640);
    const [sidebarState, setSidebarState] = useState({
        billing: false,
        expenses: false,
        procurements: false,
        inventory: false,
        material: false,
        accounting: false,
        reporting: false,
        // adminTools: false, // REMOVED: No longer a single "Administrative Tools" section
        systemConfig: false, // NEW: State for "System Configuration"
        userManagement: false, // NEW: State for "User Management"
        security: false,      // NEW: State for "Security"
    });

    useEffect(() => {
        const handleResize = () => setSidebarVisible(window.innerWidth >= 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const toggleSidebarSection = (section) => {
        setSidebarState((prevState) => ({
            ...prevState,
            [section]: !prevState[section],
        }));
    };


    const sidebarMenuItems = [
        {
            label: 'Home',
            icon: iconMap.home,
            isOpen: true,
            toggleOpen: () => { },
            href: '/dashboard',
        },
        {
            label: 'Sales and Billing',
            icon: iconMap.add_shopping_cart,
            isOpen: sidebarState.billing,
            toggleOpen: () => toggleSidebarSection('billing'),
            children: (
                <>
                    <SidebarNavLink href="/billing0" icon={iconMap.add_shopping_cart}>
                        Order
                    </SidebarNavLink>
                    <SidebarNavLink href="/billing1" icon={iconMap.post_add}>
                        Post Bills
                    </SidebarNavLink>
                    <SidebarNavLink href="/billing2" icon={iconMap.paid}>
                        Pay Bills
                    </SidebarNavLink>
                    <SidebarNavLink href="/billing3" icon={iconMap.sales_history}>
                        Sales History
                    </SidebarNavLink>
                    <SidebarNavLink href="/billing4" icon={iconMap.payments_history}>
                        Payments History
                    </SidebarNavLink>
                    <SidebarNavLink href="/billing5" icon={iconMap.void_history}>
                        Void History
                    </SidebarNavLink>
                </>
            ),
        },
        {
            label: 'Expenses',
            icon: iconMap.attach_money,
            isOpen: sidebarState.expenses,
            toggleOpen: () => toggleSidebarSection('expenses'),
            children: (
                <>
                    <SidebarNavLink href="/expenses0" icon={iconMap.post_add}>
                        Post Expenses
                    </SidebarNavLink>
                    <SidebarNavLink href="/expenses1" icon={iconMap.history}>
                        Expenses History
                    </SidebarNavLink>
                </>
            ),
        },
        {
            label: 'Procurements',
            icon: iconMap.inventory,
            isOpen: sidebarState.procurements,
            toggleOpen: () => toggleSidebarSection('procurements'),
            children: (
                <>
                    <SidebarNavLink href="/procurements0" icon={iconMap.request_quote}>
                        Tender and Quotation
                    </SidebarNavLink>
                    <SidebarNavLink href="/procurements1" icon={iconMap.shopping_cart}>
                        Purchase and Receiving
                    </SidebarNavLink>
                </>
            ),
        },
        {
            label: 'Inventory',
            icon: iconMap.storage,
            isOpen: sidebarState.inventory,
            toggleOpen: () => toggleSidebarSection('inventory'),
            children: (
                <>
                    <SidebarNavLink href="/inventory0" icon={iconMap.store}>
                        Internal Requisitions
                    </SidebarNavLink>
                    <SidebarNavLink href="/inventory1" icon={iconMap.local_shipping}>
                        Goods Issuance
                    </SidebarNavLink>
                    <SidebarNavLink href="/inventory2" icon={iconMap.goods_receiving}>
                        Goods Receiving
                    </SidebarNavLink>
                    <SidebarNavLink href="/inventory3" icon={iconMap.inventory_reconciliation}>
                        Inventory Reconciliation
                    </SidebarNavLink>
                    <SidebarNavLink href="/inventory4" icon={iconMap.stock_history}>
                        Stock History
                    </SidebarNavLink>
                </>
            ),
        },
        {
            label: 'Material Conversion',
            icon: iconMap.sync_alt,
            isOpen: sidebarState.material,
            toggleOpen: () => toggleSidebarSection('material'),
            children: (
                <>
                    <SidebarNavLink href="/conversion0" icon={iconMap.autorenew}>
                        Request Materials
                    </SidebarNavLink>
                </>
            ),
        },
        {
            label: 'Financial Accounting',
            icon: iconMap.account_balance,
            isOpen: sidebarState.accounting,
            toggleOpen: () => toggleSidebarSection('accounting'),
            children: (
                <SidebarNavLink href="/general-ledger" icon={iconMap.menu_book}>
                    General Ledger
                </SidebarNavLink>
            ),
        },
        {
            label: 'Reporting/Analytics',
            icon: iconMap.analytics,
            isOpen: sidebarState.reporting,
            toggleOpen: () => toggleSidebarSection('reporting'),
            children: (
                <SidebarNavLink href="/reportingAnalytics0" icon={iconMap.description}>
                    Reports
                </SidebarNavLink>
            ),
        },
        // --- Begin Administrative Sections ---
        {
            label: 'System Configuration',
            icon: faCogs, // Using faCogs for a general settings icon
            isOpen: sidebarState.systemConfig,
            toggleOpen: () => toggleSidebarSection('systemConfig'),
            children: (
                <>
                    <SidebarNavLink href="/systemconfiguration0" icon={iconMap.billing_setup}>Billing Setup</SidebarNavLink>
                    <SidebarNavLink href="/systemconfiguration1" icon={iconMap.expenses_setup}>Expenses Setup</SidebarNavLink>
                    <SidebarNavLink href="/systemconfiguration2" icon={iconMap.inventory_setup}>Inventory Setup</SidebarNavLink>
                    <SidebarNavLink href="/systemconfiguration3" icon={iconMap.location_setup}>Location Setup</SidebarNavLink>
                    <SidebarNavLink href="/systemconfiguration4" icon={iconMap.facility_setup}>Facility Setup</SidebarNavLink>
                </>
            ),
        },
        {
            label: 'User Management',
            icon: iconMap.manage_accounts,
            isOpen: sidebarState.userManagement,
            toggleOpen: () => toggleSidebarSection('userManagement'),
            href: "/usermanagement", // Direct link, as it doesn't have children in this structure
        },
        {
            label: 'Security',
            icon: iconMap.security_settings,
            isOpen: sidebarState.security,
            toggleOpen: () => toggleSidebarSection('security'),
            href: "/security", // Direct link
        },
        // --- End Administrative Sections ---

    ];

    return (
        <div className="min-h-screen flex bg-gray-100">
            {/* Sidebar */}
            <div
                className={`sidebar transition-all duration-300 ease-in-out ${sidebarVisible ? 'block' : 'hidden'
                    } sm:block bg-gray-800 text-white border-r border-gray-700  overflow-y-auto`}
                style={{ maxHeight: '100vh' }}
            >
                <div className="flex items-center justify-center p-4">
                    <Link href="/">
                        <div className="flex items-center">
                            <img
                                src="/img/poslogo.png"  /*  Make sure the path is correct! */
                                alt="Application Logo"
                                className="w-8 h-8 mr-2"
                            />
                            <h1 className="text-xl font-bold">SysPos</h1>
                        </div>
                    </Link>
                </div>

                <nav className="mt-6">
                    <ul className="nav">
                        {sidebarMenuItems.map((item) => (
                            <SidebarItem
                                key={item.label}
                                icon={item.icon}
                                label={item.label}
                                isOpen={item.isOpen}
                                toggleOpen={item.toggleOpen}
                                children={item.children}
                                href={item.href}
                            />
                        ))}
                    </ul>
                </nav>
            </div>


            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden"> {/* Changed to h-screen and overflow-hidden for container*/}
                <nav className="border-b border-gray-200 bg-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 justify-between">
                            <div className="flex items-center">
                                <MenuButton onClick={() => setSidebarVisible(!sidebarVisible)} className="sm:hidden">
                                    <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
                                </MenuButton>

                                {header && (
                                    <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                        {header}
                                    </div>
                                )}
                            </div>

                            <div className="hidden sm:ms-6 sm:flex sm:items-center">
                                <div className="relative ms-3">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <span className="inline-flex rounded-md">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                                                >
                                                    {user.name}
                                                    <svg
                                                        className="-me-0.5 ms-2 h-4 w-4"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                            </span>
                                        </Dropdown.Trigger>

                                        <Dropdown.Content>
                                            <Dropdown.Link href={route('profile.edit')}>
                                                <FontAwesomeIcon icon={faUser} className="mr-2" />  Profile
                                            </Dropdown.Link>
                                            <Dropdown.Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                            >
                                                <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" /> Log Out
                                            </Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            </div>

                            <div className="-me-2 flex items-center sm:hidden">
                                <MenuButton
                                    onClick={() =>
                                        setShowingNavigationDropdown(
                                            (previousState) => !previousState
                                        )
                                    }
                                >
                                    <FontAwesomeIcon icon={showingNavigationDropdown ? faTimes : faBars} className="h-6 w-6" />
                                </MenuButton>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`${showingNavigationDropdown ? 'block' : 'hidden'
                            } sm:hidden`}
                    >
                        <div className="border-t border-gray-200 pb-1 pt-4">
                            <div className="px-4">
                                <div className="text-base font-medium text-gray-800">
                                    {user.name}
                                </div>
                                <div className="text-sm font-medium text-gray-500">
                                    {user.email}
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')}>
                                    <FontAwesomeIcon icon={faUser} className="mr-2" /> Profile
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                >
                                    <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" /> Log Out
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="flex-1 h-full overflow-y-auto"> {/* Changed to h-full and overflow-y-auto for content area */}
                    <div className="p-4 h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}