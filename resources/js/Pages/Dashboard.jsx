import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Sales
    faDollarSign, faFileInvoiceDollar, faHistory as faSalesHistory, faChartBar, faPlusSquare as faNewSale,
    // Procurement
    faShoppingCart, faTruck, faFileContract as faPOContract, faTasks,
    // Inventory
    faBoxes, faWarehouse, faExchangeAlt, faEdit as faStockEdit, faBalanceScale, faExclamationTriangle,
    // Expenses
    faFileSignature, faClipboardCheck, faPlusSquare as faNewExpense,
    // --- NEW: Accounting Icons ---
    faBook, faHandHoldingDollar, faPaperPlane,
    // Common
    faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";
import usePermissionsStore from '@/stores/usePermissionsStore';

// Reusable Card Component
function SummaryCard({ title, value, unit, description, linkHref, linkText, icon, iconBgColor, footerText, footerTextColor = "text-gray-500 dark:text-gray-400" }) {
    const valueTextColor = iconBgColor ? iconBgColor.replace('bg-', 'text-') : 'text-gray-800 dark:text-white';
    const linkColor = iconBgColor ? iconBgColor.replace('bg-', 'text-') : 'text-indigo-600 dark:text-indigo-400';

    const displayValue = (value !== undefined && value !== null) ? value : 'N/A';

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col justify-between">
            <div>
                <div className="flex items-start">
                    <div className={`p-3.5 ${iconBgColor || 'bg-gray-500'} rounded-lg shadow-md flex-shrink-0`}>
                        <FontAwesomeIcon icon={icon} className="text-white h-6 w-6" aria-label={title} />
                    </div>
                    <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                        <h3 className={`text-2xl sm:text-3xl font-bold ${valueTextColor} dark:text-gray-100 mt-1`}>
                            {displayValue}
                            {unit && displayValue !== 'N/A' && <small className="text-gray-500 dark:text-gray-400 text-sm ml-1">{unit}</small>}
                        </h3>
                        {description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-3">
                {linkHref ? (
                    <Link href={linkHref} className={`${linkColor} hover:underline text-sm font-medium flex items-center group`}>
                        {linkText || 'View Details'}
                        <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                ) : footerText ? (
                    <span className={`text-sm ${footerTextColor}`}>{footerText}</span>
                ) : <div className="h-[20px]"></div> /* Placeholder for consistent height */}
            </div>
        </div>
    );
}


export default function Dashboard({
    auth,
    // Sales props
    salesTodayCount,
    salesTodayValue,
    // Procurement props
    pendingPOCount,
    activeSuppliersCount,
    // Inventory props
    lowStockItemCount,
    totalStockValue,
    // Expense props
    pendingExpensesCount,
    approvedExpensesTodayValue,

    // --- NEW: Accounting Props ---
    paymentsMadeTodayValue,
    paymentsReceivedTodayValue,
    journalEntriesTodayCount,
}) {
    // Define application URLs. Using Ziggy's route() is recommended if available.
    const urls = {

        modules: route("usermanagement.userpermission.modulesAndItems"),
        // Sales
        salesHub: '/billing',
        newSale: route('billing1.index'), // Assuming this route exists for creating a new sale
        dailySalesReport: '/reports/sales/daily',

        // Procurement
        procurementHub: '/procurement',
        newPurchaseOrder: '/procurement/purchase-orders/create',
        pendingPOs: '/procurement/purchase-orders/pending',

        // Inventory
        inventoryHub: '/inventory',
        stockLevels: '/inventory/stock/levels',
        lowStockAlerts: '/inventory/items/low-stock',

        // Expenses
        expensesHub: '/expenses', // Main expense dashboard
        pendingExpenses: '/expenses/pending', // List of expenses needing approval
        newExpense: '/expenses/create', // Form to create a new expense claim

         // --- NEW: Accounting URLs ---
        accountingHub: '/accounting', // Main hub can be a list of received payments for now
        
        makePayment: route('accounting1.index'),
        receivePayment: route('accounting0.index'),
        newJournalEntry: route('accounting2.create'),
    };

    // Fetch permissions on mount

    const modules = usePermissionsStore((state) => state.modules);

    const formatAmount = (amount, currency = 'TZS ') => {
        if (amount === undefined || amount === null) return 'N/A';
        return currency + parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Main Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-10">
                     

                    {/* Sales Section */}
                    {modules.some(module => module.modulekey === 'billing') && (
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Sales Overview</h3>
                            <Link href={urls.salesHub} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center group">
                                Go to Sales Hub <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="Today's Sales Value"
                                value={formatAmount(salesTodayValue)}
                                icon={faDollarSign}
                                iconBgColor="bg-green-500"
                                linkHref={urls.dailySalesReport}
                                linkText="View Daily Report"
                            />
                            <SummaryCard
                                title="Today's Transactions"
                                value={salesTodayCount}
                                unit="Transactions"
                                icon={faFileInvoiceDollar}
                                iconBgColor="bg-blue-500"
                                linkHref={urls.dailySalesReport}
                                linkText="Details"
                            />
                            <SummaryCard
                                title="New Sale / Invoice"
                                description="Start a new transaction."
                                icon={faNewSale}
                                iconBgColor="bg-sky-500"
                                linkHref={urls.newSale}
                                linkText="Create Sale"
                            />
                        </div>
                    </section>
                    )}

                    {/* Procurement Section */}
                    {modules.some(module => module.modulekey === 'procurements') && (
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Procurement Overview</h3>
                            <Link href={urls.procurementHub} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center group">
                                Go to Procurement Hub <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="Pending Purchase Orders"
                                value={pendingPOCount}
                                unit="POs"
                                icon={faTasks}
                                iconBgColor="bg-orange-500"
                                linkHref={urls.pendingPOs}
                                linkText="View Pending POs"
                            />
                            <SummaryCard
                                title="Active Suppliers"
                                value={activeSuppliersCount}
                                unit="Suppliers"
                                icon={faTruck}
                                iconBgColor="bg-purple-500"
                                linkHref={urls.procurementHub}
                                linkText="Manage Suppliers"
                            />
                            <SummaryCard
                                title="New Purchase Order"
                                description="Create a new PO for suppliers."
                                icon={faPOContract}
                                iconBgColor="bg-teal-500"
                                linkHref={urls.newPurchaseOrder}
                                linkText="Create PO"
                            />
                        </div>
                    </section>    
                    )}              

                    {/* Inventory Section */}
                    {modules.some(module => module.modulekey === 'inventory') && (
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Inventory Overview</h3>
                            <Link href={urls.inventoryHub} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center group">
                                Go to Inventory Hub <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="Total Stock Value"
                                value={formatAmount(totalStockValue)}
                                icon={faBalanceScale}
                                iconBgColor="bg-cyan-500"
                                linkHref={urls.inventoryHub}
                                linkText="View Valuation"
                            />
                            <SummaryCard
                                title="Low Stock Items"
                                value={lowStockItemCount}
                                unit="Items"
                                icon={faExclamationTriangle}
                                iconBgColor="bg-red-500"
                                linkHref={urls.lowStockAlerts}
                                linkText="View Alerts"
                            />
                            <SummaryCard
                                title="Current Stock Levels"
                                description="Check detailed stock quantities."
                                icon={faBoxes}
                                iconBgColor="bg-lime-500"
                                linkHref={urls.stockLevels}
                                linkText="Check Stock"
                            />
                        </div>
                    </section>
                    )}

                    {/* Expenses Section */}
                    {modules.some(module => module.modulekey === 'expenses') && (
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Expenses Overview</h3>
                            <Link href={urls.expensesHub} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center group">
                                Go to Expenses Hub <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="Pending Expenses"
                                value={pendingExpensesCount}
                                unit="Claims"
                                icon={faFileSignature}
                                iconBgColor="bg-yellow-500"
                                linkHref={urls.pendingExpenses}
                                linkText="Process Expenses"
                            />
                            <SummaryCard
                                title="Expenses Approved Today"
                                value={formatAmount(approvedExpensesTodayValue)}
                                icon={faClipboardCheck}
                                iconBgColor="bg-blue-500"
                                linkHref={urls.expensesHub} // Link to a general expenses report or hub
                                linkText="View Reports"
                            />
                            <SummaryCard
                                title="New Expense Claim"
                                description="Submit a new request for funds."
                                icon={faNewExpense}
                                iconBgColor="bg-sky-500"
                                linkHref={urls.newExpense}
                                linkText="Create Claim"
                            />
                        </div>
                    </section>
                    )}

                     {/* Financial Accounting Section --- */}
                    {modules.some(module => module.modulekey === 'accounting') && (
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Financial Accounting</h3>
                            <Link href={urls.accountingHub} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center group">
                                Go to Accounting Hub <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="Payments Received Today"
                                value={formatAmount(paymentsReceivedTodayValue)}
                                icon={faHandHoldingDollar}
                                iconBgColor="bg-emerald-500"
                                linkHref={urls.receivePayment}
                                linkText="View Receipts"
                            />
                            <SummaryCard
                                title="Payments Made Today"
                                value={formatAmount(paymentsMadeTodayValue)}
                                icon={faPaperPlane}
                                iconBgColor="bg-red-500"
                                linkHref={urls.makePayment}
                                linkText="View Payments"
                            />
                            <SummaryCard
                                title="New Journal Entry"
                                description={`Record a manual transaction. ${journalEntriesTodayCount || 0} entries today.`}
                                icon={faBook}
                                iconBgColor="bg-sky-500"
                                linkHref={urls.newJournalEntry}
                                linkText="Create Entry"
                            />
                        </div>
                    </section>                
                    )}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}