
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers,            // General HR / Employees
    faUserPlus,         // Add New Employee / Recruitment
    faIdCard,           // Employee Profiles / Records
    faMoneyCheckAlt,    // Payroll
    faCalendarAlt,      // Leave Management / Events
    faClock,            // Attendance / Time Tracking
    faClipboardUser,    // Performance Appraisals (or faUserCheck)
    faBriefcase,        // Job Openings / Careers
    faSitemap,          // Organizational Chart / Departments
    faTasks,            // Pending HR Tasks (e.g., approvals)
    faBirthdayCake,     // Birthdays / Anniversaries
    faChartBar,         // HR Analytics / Reports
    faFileSignature,    // Contracts / Documents
    faArrowRight,
    faFilter,
    faUserTie,          // For specific roles or management
    faUserCog,          // Employee Settings / Self-Service
} from '@fortawesome/free-solid-svg-icons';

// Reusable Card Component (ActionOrReportCard from previous examples)
function ActionOrReportCard({ title, value, description, icon, iconBgColor, linkHref, linkRoute, linkText }) {
    const { ziggy } = usePage().props;

    let href = linkHref || '#';
    if (linkRoute && typeof route === 'function' && ziggy?.routes?.[linkRoute]) {
        try { href = route(linkRoute, undefined, undefined, ziggy); }
        catch (e) {
            console.warn(`Route '${linkRoute}' not found for Card.`);
            href = linkHref || '#';
        }
    } else if (linkRoute) {
        console.warn(`Route function or Ziggy not available, or route '${linkRoute}' missing. Falling back to direct link prop.`);
        href = linkHref || '#';
    }

    const textColorClass = iconBgColor ? iconBgColor.replace('bg-', 'text-') : 'text-indigo-600';

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col">
            <Link href={href} className="block group flex-grow flex flex-col">
                <div className="flex items-start mb-auto">
                    <div className={`p-3.5 ${iconBgColor || 'bg-indigo-500'} rounded-lg shadow-md flex-shrink-0`}>
                        <FontAwesomeIcon icon={icon} className="text-white h-6 w-6" aria-label={title} />
                    </div>
                    <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                        {value && (
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</h3>
                        )}
                        {description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                        )}
                    </div>
                </div>
                <div className="mt-3 text-sm font-medium">
                    <span className={`${textColorClass} group-hover:underline flex items-center`}>
                        {linkText}
                        <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                </div>
            </Link>
        </div>
    );
}


// Main Page Component
export default function HumanResourceDashboard({
    auth,
    totalEmployeesCount,
    pendingLeaveRequestsCount,
    openPositionsCount,
    upcomingBirthdaysCount, // Count for the next 7 days, for example
    // Add other relevant counts/data from your controller
}) {
    // Props from controller:
    // return Inertia::render('HumanResource/Index', [
    // 'totalEmployeesCount' => Employee::where('status', 'active')->count(),
    // 'pendingLeaveRequestsCount' => LeaveApplication::where('status', 'pending')->count(),
    // 'openPositionsCount' => JobOpening::where('status', 'open')->count(),
    // 'upcomingBirthdaysCount' => Employee::whereMonth('date_of_birth', now()->month)->whereDay('date_of_birth', '>=', now()->day)->whereDay('date_of_birth', '<=', now()->addDays(7)->day)->count(),
    // ]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Human Resources Hub
                </h2>
            }
        >
            <Head title="Human Resource Management" />

            <div className="py-8 md:py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Section 1: Core Actions / Overview */}
                    <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            Quick Actions & Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"> 
                            <ActionOrReportCard
                                title="Total Employees"
                                value={totalEmployeesCount !== undefined ? totalEmployeesCount : 'N/A'}
                                description="Current active workforce count."
                                icon={faUsers}
                                iconBgColor="bg-blue-600"
                                linkRoute="hr.employees.index"
                                linkText="Manage Employees"
                            />
                            <ActionOrReportCard
                                title="Pending Leave Requests"
                                value={pendingLeaveRequestsCount !== undefined ? pendingLeaveRequestsCount : 'N/A'}
                                description="Leave applications awaiting approval."
                                icon={faCalendarAlt}
                                iconBgColor="bg-yellow-500"
                                linkRoute="hr.leave.pending_approvals"
                                linkText="Review Requests"
                            />
                            <ActionOrReportCard
                                title="Open Job Positions"
                                value={openPositionsCount !== undefined ? openPositionsCount : 'N/A'}
                                description="Vacancies currently being recruited for."
                                icon={faBriefcase}
                                iconBgColor="bg-green-600"
                                linkRoute="hr.recruitment.openings"
                                linkText="Manage Openings"
                            />
                            <ActionOrReportCard
                                title="Upcoming Birthdays"
                                value={upcomingBirthdaysCount !== undefined ? upcomingBirthdaysCount : 'N/A'} // (Next 7 days)
                                description="Employee birthdays in the coming week."
                                icon={faBirthdayCake}
                                iconBgColor="bg-pink-500"
                                linkRoute="hr.employees.birthdays" // A page to view all birthdays
                                linkText="View Calendar"
                            />
                        </div>
                    </section>

                    {/* Section 2: Key HR Operations */}
                     <section className="mb-10">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wider">
                            HR Operations
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                             <ActionOrReportCard
                                title="Add New Employee"
                                description="Onboard a new member to the team."
                                icon={faUserPlus}
                                iconBgColor="bg-sky-500"
                                linkRoute="hr.employees.create"
                                linkText="Add Employee"
                            />
                            <ActionOrReportCard
                                title="Manage Payroll"
                                description="Process salaries, view payslips, and manage deductions."
                                icon={faMoneyCheckAlt}
                                iconBgColor="bg-purple-600"
                                linkRoute="hr.payroll.index" // Or "hr.payroll.process"
                                linkText="Process Payroll"
                            />
                            <ActionOrReportCard
                                title="Manage Attendance"
                                description="Track employee clock-in/out and work hours."
                                icon={faClock}
                                iconBgColor="bg-teal-500"
                                linkRoute="hr.attendance.index"
                                linkText="Track Attendance"
                            />
                            <ActionOrReportCard
                                title="Manage Leave"
                                description="Oversee leave types, balances, and applications."
                                icon={faCalendarAlt} // Consistent
                                iconBgColor="bg-orange-500"
                                linkRoute="hr.leave.management"
                                linkText="Manage Leave System"
                            />
                             <ActionOrReportCard
                                title="Performance Appraisals"
                                description="Conduct and review employee performance."
                                icon={faClipboardUser}
                                iconBgColor="bg-indigo-500"
                                linkRoute="hr.performance.index"
                                linkText="Manage Appraisals"
                            />
                            <ActionOrReportCard
                                title="Organizational Chart"
                                description="View the company's reporting structure."
                                icon={faSitemap}
                                iconBgColor="bg-rose-500"
                                linkRoute="hr.organization.chart"
                                linkText="View Structure"
                            />
                        </div>
                    </section>                   
                </div>
            </div>
        </AuthenticatedLayout>
    );
}