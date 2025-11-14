import React, { useEffect, useState, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash, faHome } from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import Pagination from "@/Components/Pagination";

const DEBOUNCE_DELAY = 300;

// Helper to get a styled badge for the action type
const ActionBadge = ({ action }) => {
    const baseClasses = "px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full";
    if (action === 'Add') {
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Add</span>;
    }
    if (action === 'Deduct') {
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Deduct</span>;
    }
    return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>N/A</span>;
};


export default function Index({ auth, adjustmentreasons, filters, success }) {
    const { data, setData } = useForm({ search: filters.search || "" });
    const [modalState, setModalState] = useState({ isOpen: false, reasonToDeleteId: null });
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("systemconfiguration2.adjustmentreasons.index"), { search: data.search }, {
                preserveState: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [data.search]);

    const handleDelete = (id) => setModalState({ isOpen: true, reasonToDeleteId: id });
    const handleModalClose = () => setModalState({ isOpen: false, reasonToDeleteId: null });
    const handleModalConfirm = () => {
        if (!modalState.reasonToDeleteId) return;
        router.delete(route("systemconfiguration2.adjustmentreasons.destroy", modalState.reasonToDeleteId), {
            onSuccess: () => handleModalClose(),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Adjustment Reasons</h2>}>
            <Head title="Adjustment Reason List" />
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
                                        placeholder="Search reasons..."
                                        value={data.search}
                                        onChange={e => setData("search", e.target.value)}
                                        className="w-full rounded-md border-gray-300 pl-10"
                                    />
                                </div>
                                <Link href={route("systemconfiguration2.adjustmentreasons.create")} className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create
                                </Link>
                                <Link href={route("systemconfiguration2.index")} className="flex items-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                    <FontAwesomeIcon icon={faHome} className="mr-2" /> Home
                                </Link>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {adjustmentreasons.data.length > 0 ? (
                                        adjustmentreasons.data.map((reason) => (
                                            <tr key={reason.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reason.name}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500"><ActionBadge action={reason.action} /></td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                                    <div className="flex items-center justify-center space-x-4">
                                                        <Link href={route("systemconfiguration2.adjustmentreasons.edit", reason.id)} className="text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faEdit} /></Link>
                                                        <button onClick={() => handleDelete(reason.id)} className="text-red-600 hover:text-red-800"><FontAwesomeIcon icon={faTrash} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="3" className="text-center py-10 text-gray-500">No adjustment reasons found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination class="mt-6" links={adjustmentreasons.links} />
                    </div>
                </div>
            </div>
            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title="Confirm Deletion" message="Are you sure you want to delete this adjustment reason?" />
        </AuthenticatedLayout>
    );
}