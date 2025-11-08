import React, { useEffect, useState, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash, faEye, faCheck, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import Pagination from '@/Components/Pagination';

const PAYMENT_STAGE_LABELS = { 1: 'Pending', 2: 'Approved', 3: 'Paid', 4: 'Cancelled' };
const DEBOUNCE_DELAY = 300;

// Helper to get styling for different stages
const getStageStyles = (stage) => {
    switch (stage) {
        case 1: return 'bg-yellow-100 text-yellow-800'; // Pending
        case 2: return 'bg-blue-100 text-blue-800';   // Approved
        case 3: return 'bg-green-100 text-green-800'; // Paid
        case 4: return 'bg-red-100 text-red-800';     // Cancelled
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default function Index({ auth, payments, filters, success }) {
    const { data, setData, processing } = useForm({
        search: filters.search || "",
        stage: filters.stage || "",
    });

    const [modalState, setModalState] = useState({ isOpen: false, paymentToDeleteId: null });
    const searchTimeoutRef = useRef(null);

    // Effect for handling search and filter debouncing
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("accounting1.index"), data, {
                preserveState: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [data.search, data.stage]);

    const handleSearchChange = (e) => setData("search", e.target.value);
    const handleStageChange = (stage) => setData("stage", stage);
    
    // --- Delete Modal Handlers ---
    const handleDelete = (id) => setModalState({ isOpen: true, paymentToDeleteId: id });
    const handleModalClose = () => setModalState({ isOpen: false, paymentToDeleteId: null });
    const handleModalConfirm = () => {
        if (!modalState.paymentToDeleteId) return;
        router.delete(route("accounting1.destroy", modalState.paymentToDeleteId), {
            onSuccess: () => handleModalClose(),
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Make Payments</h2>}
        >
            <Head title="Payments List" />
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
                                        placeholder="Search by recipient..."
                                        value={data.search}
                                        onChange={handleSearchChange}
                                        className="w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm"
                                    />
                                </div>
                                <Link
                                    href={route("accounting1.create")}
                                    className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" /> Create
                                </Link>
                            </div>
                            <ul className="flex flex-wrap items-center gap-2">
                                <li onClick={() => handleStageChange("")} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium ${data.stage === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>All</li>
                                {Object.entries(PAYMENT_STAGE_LABELS).map(([key, label]) => (
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
                                        <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                                        <th className="px-4 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payments.data.length > 0 ? (
                                        payments.data.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-gray-50">
                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-800 font-medium">{payment.recipient?.display_name || 'N/A'}</td>
                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{new Date(payment.transdate).toLocaleDateString()}</td>
                                                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-800">{parseFloat(payment.total_amount).toLocaleString()} {payment.currency}</td>
                                                <td className="whitespace-nowrap px-4 py-4 text-center text-sm">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStageStyles(payment.stage)}`}>{PAYMENT_STAGE_LABELS[payment.stage] || 'Unknown'}</span>
                                                </td>
                                                {/* --- THIS IS THE CRITICAL CHANGE --- */}
                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                    <div className="flex items-center justify-center space-x-4">
                                                        {payment.stage === 1 && ( // PENDING
                                                            <>
                                                                {/* This is now a Link to the approval confirmation page */}
                                                                <Link href={route('accounting1.approve.confirm', payment.id)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800" title="Approve Payment">
                                                                    <FontAwesomeIcon icon={faCheck} /> Approve
                                                                </Link>
                                                                <Link href={route("accounting1.edit", payment.id)} className="text-gray-500 hover:text-gray-700" title="Edit/View"><FontAwesomeIcon icon={faEdit} /></Link>
                                                                <button onClick={() => handleDelete(payment.id)} disabled={processing} className="text-red-600 hover:text-red-800 disabled:opacity-50" title="Delete"><FontAwesomeIcon icon={faTrash} /></button>
                                                            </>
                                                        )}
                                                        {payment.stage === 2 && ( // APPROVED
                                                             <>
                                                                {/* This is now a Link to the payment confirmation page */}
                                                                <Link href={route('accounting1.pay.confirm', payment.id)} className="flex items-center gap-1 text-green-600 hover:text-green-800" title="Mark as Paid">
                                                                    <FontAwesomeIcon icon={faMoneyBillWave} /> Mark as Paid
                                                                </Link>
                                                                <Link href={route("accounting1.edit", payment.id)} className="text-gray-500 hover:text-gray-700" title="View Details"><FontAwesomeIcon icon={faEye} /></Link>
                                                             </>
                                                        )}
                                                        {payment.stage === 3 && ( // PAID
                                                            <Link href={route("accounting1.edit", payment.id)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700" title="View Details">
                                                                <FontAwesomeIcon icon={faEye} /> View
                                                            </Link>
                                                        )}
                                                        {payment.stage === 4 && ( // CANCELLED
                                                            <span className="text-sm text-gray-400">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="text-center py-10 text-gray-500">No payments found matching your criteria.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination class="mt-6" links={payments.links} />
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                title="Confirm Deletion"
                message="Are you sure you want to delete this payment record? This action cannot be undone."
            />
        </AuthenticatedLayout>
    );
}