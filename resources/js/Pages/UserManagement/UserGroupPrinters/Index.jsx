import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faSearch, faPlus, faEdit, faTrash, faPrint } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import Modal from '@/Components/CustomModal';

export default function Index({ printers, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        printerToDeleteId: null,
    });

    useEffect(() => {
        get(route("usermanagement.usergroupprinters.index"), { preserveState: true });
    }, [data.search, get]);

    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this printer configuration?",
            isAlert: false,
            printerToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, printerToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("usermanagement.usergroupprinters.destroy", modalState.printerToDeleteId));
        } catch (error) {
            console.error("Failed to delete printer:", error);
        }
        setModalState({ isOpen: false, message: '', isAlert: false, printerToDeleteId: null });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Printer Configurations</h2>}
        >
            <Head title="Group Printers" />
            <div className="container mx-auto p-4">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <div className="relative flex items-center">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                            <input
                                type="text"
                                name="search"
                                placeholder="Search printer or machine..."
                                value={data.search}
                                onChange={handleSearchChange}
                                className={`pl-10 border px-2 py-1 rounded text-sm ${errors.search ? "border-red-500" : ""}`}
                            />
                        </div>

                        <Link
                            href={route("usermanagement.usergroupprinters.create")}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-1" /> Create
                        </Link>
                        <Link
                            href={route("usermanagement.index")}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faHome} className="mr-1" /> Home
                        </Link>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-left font-medium text-gray-700">Machine Name</th>
                                <th className="border-b p-3 text-left font-medium text-gray-700">User Group</th>
                                <th className="border-b p-3 text-left font-medium text-gray-700">Doc Type</th>
                                <th className="border-b p-3 text-left font-medium text-gray-700">Printer Name</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Auto?</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Screen?</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printers.data.length > 0 ? (
                                printers.data.map((printer, index) => (
                                    <tr key={printer.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-sm text-gray-700">{printer.machinename || 'Any'}</td>
                                        <td className="border-b p-3 text-sm text-gray-700">{printer.usergroup?.name || 'N/A'}</td>
                                        <td className="border-b p-3 text-sm text-gray-700">{printer.documenttypecode}</td>
                                        <td className="border-b p-3 text-sm text-gray-700">{printer.printername}</td>
                                        <td className="border-b p-3 text-center text-sm text-gray-700">
                                            <span className={`px-2 rounded ${printer.autoprint ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {printer.autoprint ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="border-b p-3 text-center text-sm text-gray-700">
                                            <span className={`px-2 rounded ${printer.printtoscreen ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {printer.printtoscreen ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="border-b p-3 flex justify-center space-x-2">
                                            <Link
                                                href={route("usermanagement.usergroupprinters.edit", printer.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" /> Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(printer.id)}
                                                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="mr-1" /> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="border-b p-3 text-center text-gray-700">No printer configurations found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}