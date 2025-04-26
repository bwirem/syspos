import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal';

export default function Index({ auth, pricecategories, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",       
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToDeleteId: null,
    });

    useEffect(() => {
        get(route("systemconfiguration0.pricecategories.index"), { preserveState: true });
    }, [data.search]);

    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this price category?",
            isAlert: false,
            itemToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, itemToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("systemconfiguration0.pricecategories.destroy", modalState.itemToDeleteId));
        } catch (error) {
            console.error("Failed to delete item:", error);
            showAlert("There was an error deleting the item. Please try again.");
        }
        setModalState({ isOpen: false, message: '', isAlert: false, itemToDeleteId: null });
    };

    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            itemToDeleteId: null,
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Price Categories</h2>}>
            <Head title="Price Categories" />
            <div className="container mx-auto p-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <div className="relative flex items-center">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                            <input
                                type="text"
                                name="search"
                                placeholder="Search by price1 value"
                                value={data.search}
                                onChange={handleSearchChange}
                                className={`pl-10 border px-2 py-1 rounded text-sm ${errors.search ? "border-red-500" : ""}`}
                            />
                        </div>

                        <Link
                            href={route("systemconfiguration0.pricecategories.create")}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-1" /> Create
                        </Link>
                        <Link
                            href={route("systemconfiguration0.index")}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faHome} className="mr-1" /> Home
                        </Link>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Price 1</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Use Price 1</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Price 2</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Use Price 2</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Price 3</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Use Price 3</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Price 4</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Use Price 4</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pricecategories.data.length > 0 ? (
                                pricecategories.data.map((pricecategory, index) => (
                                    <tr key={pricecategory.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-center text-gray-700">{pricecategory.price1}</td>
                                        <td className="border-b p-3 text-center text-gray-700">{pricecategory.useprice1 ? 'Yes' : 'No'}</td>
                                        <td className="border-b p-3 text-center text-gray-700">{pricecategory.price2 || '-'}</td>
                                        <td className="border-b p-3 text-center text-gray-700">{pricecategory.useprice2 ? 'Yes' : 'No'}</td>
                                        <td className="border-b p-3 text-center text-gray-700">{pricecategory.price3 || '-'}</td>
                                        <td className="border-b p-3 text-center text-gray-700">{pricecategory.useprice3 ? 'Yes' : 'No'}</td>
                                        <td className="border-b p-3 text-center text-gray-700">{pricecategory.price4 || '-'}</td>
                                        <td className="border-b p-3 text-center text-gray-700">{pricecategory.useprice4 ? 'Yes' : 'No'}</td>
                                        <td className="border-b p-3 flex space-x-2 justify-center">
                                            <Link
                                                href={route("systemconfiguration0.pricecategories.edit", pricecategory.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(pricecategory.id)}
                                                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="border-b p-3 text-center text-gray-700">No price categories found.</td>
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
