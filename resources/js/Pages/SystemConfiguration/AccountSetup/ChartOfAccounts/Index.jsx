import React, { useEffect, useState, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch, faPlus, faEdit, faTrash, faHome,
    faCheckCircle, faTimesCircle, faChevronDown, faChevronUp
} from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import Pagination from "@/Components/Pagination";

const DEBOUNCE_DELAY = 300;

const StatusIndicator = ({ isActive }) => (
    isActive
        ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-600">
              <FontAwesomeIcon icon={faCheckCircle} /> Active
          </span>
        : <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
              <FontAwesomeIcon icon={faTimesCircle} /> Inactive
          </span>
);

export default function Index({ auth, chartofaccounts, filters, success, accountTypeLabels }) {
    const { data, setData } = useForm({ search: filters.search || "" });
    const [modalState, setModalState] = useState({ isOpen: false, accountToDeleteId: null });
    const searchTimeoutRef = useRef(null);
    const [expandedGroups, setExpandedGroups] = useState({});

    const groupedAccounts = chartofaccounts.data.reduce((acc, account) => {
        const type = account.account_type;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(account);
        return acc;
    }, {});

    const toggleGroup = (type) => {
        setExpandedGroups(prev => ({ ...prev, [type]: !prev[type] }));
    };

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("systemconfiguration3.chartofaccounts.index"), { search: data.search }, {
                preserveState: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [data.search]);

    const handleDelete = (id) => setModalState({ isOpen: true, accountToDeleteId: id });
    const handleModalClose = () => setModalState({ isOpen: false, accountToDeleteId: null });
    const handleModalConfirm = () => {
        if (!modalState.accountToDeleteId) return;
        router.delete(route("systemconfiguration3.chartofaccounts.destroy", modalState.accountToDeleteId), {
            onSuccess: () => handleModalClose(),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Chart of Accounts</h2>}>
            <Head title="Chart of Accounts" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {success && <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">{success}</div>}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6">
                        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search accounts..."
                                        value={data.search}
                                        onChange={e => setData("search", e.target.value)}
                                        className="w-full rounded-md border-gray-300 pl-10"
                                    />
                                </div>
                                <Link href={route("systemconfiguration3.chartofaccounts.create")} className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create
                                </Link>
                                <Link href={route("systemconfiguration3.index")} className="flex items-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                    <FontAwesomeIcon icon={faHome} className="mr-2" /> Home
                                </Link>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedAccounts).length > 0 ? (
                                        Object.entries(groupedAccounts).map(([type, accounts]) => (
                                            <React.Fragment key={type}>
                                                <tr className="bg-gray-100">
                                                    <td colSpan="5" className="px-4 py-2 text-left font-bold text-gray-700 cursor-pointer" onClick={() => toggleGroup(type)}>
                                                        <FontAwesomeIcon icon={expandedGroups[type] ? faChevronUp : faChevronDown} className="mr-3" />
                                                        {accountTypeLabels[type] || 'Unknown Type'} ({accounts.length})
                                                    </td>
                                                </tr>
                                                {expandedGroups[type] && accounts.map((account) => (
                                                    <tr key={account.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{account.account_code}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.account_name}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-500 truncate" title={account.description}>{account.description || 'N/A'}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center"><StatusIndicator isActive={account.is_active} /></td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                                            <div className="flex items-center justify-center space-x-4">
                                                                <Link href={route("systemconfiguration3.chartofaccounts.edit", account.id)} className="text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faEdit} /></Link>
                                                                <button onClick={() => handleDelete(account.id)} className="text-red-600 hover:text-red-800"><FontAwesomeIcon icon={faTrash} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="text-center py-10 text-gray-500">No accounts found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination class="mt-6" links={chartofaccounts.links} />
                    </div>
                </div>
            </div>
            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title="Confirm Deletion" message="Are you sure you want to delete this account?" />
        </AuthenticatedLayout>
    );
}
