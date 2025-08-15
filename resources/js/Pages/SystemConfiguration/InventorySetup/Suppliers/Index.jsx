import React, { useEffect, useState, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash , faHome} from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import Pagination from "@/Components/Pagination";

const DEBOUNCE_DELAY = 300;

export default function Index({ auth, suppliers, filters, success }) {
    const { data, setData } = useForm({ search: filters.search || "" });
    const [modalState, setModalState] = useState({ isOpen: false, supplierToDeleteId: null });
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("systemconfiguration2.suppliers.index"), { search: data.search }, {
                preserveState: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [data.search]);

    const handleDelete = (id) => setModalState({ isOpen: true, supplierToDeleteId: id });
    const handleModalClose = () => setModalState({ isOpen: false, supplierToDeleteId: null });
    const handleModalConfirm = () => {
        if (!modalState.supplierToDeleteId) return;
        router.delete(route("systemconfiguration2.suppliers.destroy", modalState.supplierToDeleteId), {
            onSuccess: () => handleModalClose(),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Suppliers</h2>}>
            <Head title="Supplier List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {success && <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">{success}</div>}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6">
                        <div className="mb-6 flex justify-between items-center">
                             <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Search suppliers..." value={data.search} onChange={e => setData("search", e.target.value)} className="w-full rounded-md border-gray-300 pl-10"/>
                                </div>
                                <Link href={route("systemconfiguration2.suppliers.create")} className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white">
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
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {suppliers.data.length > 0 ? (
                                        suppliers.data.map((supplier) => (
                                            <tr key={supplier.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 font-medium">{supplier.display_name}</td>
                                                <td className="px-4 py-4">{supplier.email}</td>
                                                <td className="px-4 py-4">{supplier.phone || 'N/A'}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex justify-center space-x-4">
                                                        <Link href={route("systemconfiguration2.suppliers.edit", supplier.id)}><FontAwesomeIcon icon={faEdit} className="text-blue-600"/></Link>
                                                        <button onClick={() => handleDelete(supplier.id)}><FontAwesomeIcon icon={faTrash} className="text-red-600"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="text-center py-10">No suppliers found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination class="mt-6" links={suppliers.links} />
                    </div>
                </div>
            </div>
            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title="Confirm Deletion" message="Are you sure you want to delete this supplier?" />
        </AuthenticatedLayout>
    );
}