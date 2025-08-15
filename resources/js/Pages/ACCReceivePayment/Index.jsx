import React, { useEffect, useState, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import Pagination from '@/Components/Pagination';

const STAGE_LABELS = { 1: 'Pending Verification', 2: 'Cleared', 3: 'Bounced' };
const DEBOUNCE_DELAY = 300;

// Helper to get styling for different stages
const getStageStyles = (stage) => {
    switch (stage) {
        case 1: return 'bg-yellow-100 text-yellow-800'; // Pending
        case 2: return 'bg-green-100 text-green-800';   // Cleared
        case 3: return 'bg-red-100 text-red-800';       // Bounced
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default function Index({ auth, receivedPayments, filters, success }) {
    const { data, setData } = useForm({
        search: filters.search || "",
        stage: filters.stage || "",
    });

    const [modalState, setModalState] = useState({ isOpen: false, paymentToDeleteId: null });
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("accounting0.index"), data, { // Note: using accounting0 as per your routes
                preserveState: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(searchTimeoutRef.current);
    }, [data.search, data.stage]);

    const handleSearchChange = (e) => setData("search", e.target.value);
    const handleStageChange = (stage) => setData("stage", stage);

    const handleDelete = (id) => {
        setModalState({ isOpen: true, paymentToDeleteId: id });
    };

    const handleModalClose = () => setModalState({ isOpen: false, paymentToDeleteId: null });

    const handleModalConfirm = () => {
        if (!modalState.paymentToDeleteId) return;
        router.delete(route("accounting0.destroy", modalState.paymentToDeleteId), {
            onSuccess: () => handleModalClose(),
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Received Payments</h2>}
        >
            <Head title="Received Payments List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {success && <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">{success}</div>}
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg p-6">
                        {/* Toolbar */}
                        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <div className="relative flex items-center">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by payer..."
                                        value={data.search}
                                        onChange={handleSearchChange}
                                        className="w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm"
                                    />
                                </div>
                                <Link
                                    href={route("accounting0.create")}
                                    className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" /> New
                                </Link>
                            </div>
                            <ul className="flex flex-wrap items-center gap-2">
                                <li onClick={() => handleStageChange("")} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium ${data.stage === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>All</li>
                                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                                    <li key={key} onClick={() => handleStageChange(key)} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium ${data.stage == key ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payer</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                                        <th className="px-4 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {receivedPayments.data.length > 0 ? (
                                        receivedPayments.data.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-gray-50">
                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-800 font-medium">
                                                    {/* THE FIX IS HERE: Use `display_name` from the BLSCustomer accessor */}
                                                    {payment.payer?.display_name || 'N/A'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{new Date(payment.transdate).toLocaleDateString()}</td>
                                                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-800">{parseFloat(payment.total_amount).toLocaleString()} {payment.currency}</td>
                                                <td className="whitespace-nowrap px-4 py-4 text-center text-sm">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStageStyles(payment.stage)}`}>
                                                        {STAGE_LABELS[payment.stage] || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                    <div className="flex items-center justify-center space-x-4">
                                                        <Link href={route("accounting0.edit", payment.id)} className="text-blue-600 hover:text-blue-800" title="Edit/View"><FontAwesomeIcon icon={faEdit} /></Link>
                                                        <button onClick={() => handleDelete(payment.id)} className="text-red-600 hover:text-red-800" title="Delete"><FontAwesomeIcon icon={faTrash} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-10 text-gray-500">
                                                No payments received matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination class="mt-6" links={receivedPayments.links} />
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                title="Confirm Deletion"
                message="Are you sure you want to delete this received payment record? This action cannot be undone."
            />
        </AuthenticatedLayout>
    );
}