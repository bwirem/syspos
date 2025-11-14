import React, { useEffect, useState, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash, faHome } from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import Pagination from "@/Components/Pagination";

const DEBOUNCE_DELAY = 300;

export default function Index({ auth, stores, filters, success }) {
    const { data, setData } = useForm({ search: filters.search || "" });
    const [modalState, setModalState] = useState({ isOpen: false, storeToDeleteId: null });
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("systemconfiguration2.stores.index"), { search: data.search }, {
                preserveState: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [data.search]);

    const handleDelete = (id) => setModalState({ isOpen: true, storeToDeleteId: id });
    const handleModalClose = () => setModalState({ isOpen: false, storeToDeleteId: null });
    const handleModalConfirm = () => {
        if (!modalState.storeToDeleteId) return;
        router.delete(route("systemconfiguration2.stores.destroy", modalState.storeToDeleteId), {
            onSuccess: () => handleModalClose(),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Stores</h2>}>
            <Head title="Store List" />
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
                                        placeholder="Search stores..."
                                        value={data.search}
                                        onChange={e => setData("search", e.target.value)}
                                        className="w-full rounded-md border-gray-300 pl-10"
                                    />
                                </div>
                                <Link href={route("systemconfiguration2.stores.create")} className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
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
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stores.data.length > 0 ? (
                                        stores.data.map((store) => (
                                            <tr key={store.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{store.name}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                                    <div className="flex items-center justify-center space-x-4">
                                                        <Link href={route("systemconfiguration2.stores.edit", store.id)} className="text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faEdit} /></Link>
                                                        <button onClick={() => handleDelete(store.id)} className="text-red-600 hover:text-red-800"><FontAwesomeIcon icon={faTrash} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="2" className="text-center py-10 text-gray-500">No stores found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination class="mt-6" links={stores.links} />
                    </div>
                </div>
            </div>
            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title="Confirm Deletion" message="Are you sure you want to delete this store?" />
        </AuthenticatedLayout>
    );
}