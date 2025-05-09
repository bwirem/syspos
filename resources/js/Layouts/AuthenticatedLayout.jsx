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
    faBuilding,faUpload, faUserSlash, faMoneyCheckAlt,

    faJournalWhills,    
    faBalanceScaleLeft, // or faFileContract if you choose that
    faFileInvoiceDollar,
    faExchangeAlt,      // or faCoins
    faLandmark,         // or faTasks

   
    faArrowDown,        // or faSortAmountDown
    faTrashAlt,    
    faWrench,    
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

import usePermissionsStore from "../stores/usePermissionsStore";

// Constants for CSS classes
const navLinkClasses = 'flex items-center p-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md';
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

    person: faUser,
    upload: faUpload,
    person_outline: faUserSlash,
    payroll: faMoneyCheckAlt,

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
    facility_setup: faBuilding,      // <--- ADDED facility_setup mapping

    // New: Accounting
    journal_whills: faJournalWhills,   
    balance_scale: faBalanceScale,
    balance_scale_left: faBalanceScaleLeft,
    // 'file-contract': faFileContract, // if chosen for balance sheet
    file_invoice_dollar: faFileInvoiceDollar,
    exchange_alt: faExchangeAlt,
    // 'coins': faCoins, // if chosen for cash flow
    landmark: faLandmark,
    // 'tasks': faTasks, // if chosen for bank reconciliation

    //Fixed Assets
    fixed_assets: faBuilding, // You can change this to a more appropriate icon if needed

    list_alt: faListAlt,
    arrow_down: faArrowDown, // or 'sort-amount-down': faSortAmountDown,
    trash_alt: faTrashAlt,       
    wrench: faWrench,
    shield_alt : faShieldAlt,
    
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
  
    const { modules, moduleItems,fetchPermissions } = usePermissionsStore();

    const user = usePage().props.auth.user;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(window.innerWidth >= 640);   
    const [sidebarState, setSidebarState] = useState({});

    useEffect(() => {
        fetchPermissions(); // Fetch permissions on mount
    }, []);

   
    useEffect(() => {
              
        const initialState = {};
        modules.forEach(module => {
            initialState[module.modulekey] = false; // Set initial state to false
        });
        setSidebarState(initialState);
    }, []);

    const toggleSidebarSection = (section) => {
        setSidebarState((prevState) => ({
            ...prevState,
            [section]: !prevState[section],
        }));
    };

    const sidebarMenuItems = modules.map(module => ({
        label: module.moduletext,
        icon: iconMap[module.icon] || null, // Get the icon for the module
        isOpen: sidebarState[module.modulekey],
        toggleOpen: () => toggleSidebarSection(module.modulekey),
        children: moduleItems[module.modulekey].map(item => ({
            label: item.text,
            icon: iconMap[item.icon] || null, // Get the icon for the item
            href: `/${item.key}`,
        })),
    }));

    return (
        <div className="min-h-screen flex bg-gray-100">            

            {/* Sidebar */}
            <div
                className={`sidebar transition-all duration-300 ease-in-out ${sidebarVisible ? 'block' : 'hidden'} sm:block bg-gray-800 text-white border-r border-gray-700 overflow-y-auto`}
                style={{ maxHeight: '100vh' }}
            >
                <div className="flex items-center justify-center p-4">
                    <Link href="/">
                        <div className="flex items-center">
                            <img
                                src="/img/poslogo.png"
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
                                children={item.children && item.isOpen ? (
                                    <>
                                        {item.children.map((child) => (
                                            <SidebarNavLink key={child.label} href={child.href} icon={child.icon}>
                                                {child.label}
                                            </SidebarNavLink>
                                        ))}
                                    </>
                                ) : null}
                            />
                        ))}
                    </ul>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
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
                                                <FontAwesomeIcon icon={faUser} className="mr-2" /> Profile
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
                        className={`${showingNavigationDropdown ? 'block' : 'hidden'} sm:hidden`}
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
                                <SidebarNavLink href={route('profile.edit')}>
                                    <FontAwesomeIcon icon={faUser} className="mr-2" /> Profile
                                </SidebarNavLink>
                                <SidebarNavLink
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                >
                                    <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" /> Log Out
                                </SidebarNavLink>
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="flex-1 h-full overflow-y-auto">
                    <div className="p-4 h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}