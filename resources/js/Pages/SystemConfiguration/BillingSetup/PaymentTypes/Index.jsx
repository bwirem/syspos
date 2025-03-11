import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal';

export default function Index({ auth, paymenttypes, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",       
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        paymenttypeToDeleteId: null,
    });

    useEffect(() => {
        get(route("systemconfiguration0.paymenttypes.index"), { preserveState: true });
    }, [data.search, data.stage, get]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    
    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this paymenttype?",
            isAlert: false,
            paymenttypeToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, paymenttypeToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("systemconfiguration0.paymenttypes.destroy", modalState.paymenttypeToDeleteId));
        } catch (error) {
            console.error("Failed to delete paymenttype:", error);
            showAlert("There was an error deleting the paymenttype. Please try again.");
        }
        setModalState({ isOpen: false, message: '', isAlert: false, paymenttypeToDeleteId: null });
    };

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            paymenttypeToDeleteId: null,
        });
    };


    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Payment Type List</h2>}
        >
            <Head title="Payment Type List" />
            <div className="container mx-auto p-4">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <div className="relative flex items-center">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                            <input
                                type="text"
                                name="search"
                                placeholder="Search by supplier name"
                                value={data.search}
                                onChange={handleSearchChange}
                                className={`pl-10 border px-2 py-1 rounded text-sm ${errors.search ? "border-red-500" : ""
                                    }`}
                            />
                        </div>


                        <Link
                            href={route("systemconfiguration0.paymenttypes.create")}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-1" /> Create
                        </Link>
                    </div>
                    
                </div>

                {/* Paymenttypes Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Paymenttype Descriptions</th>                                 
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymenttypes.data.length > 0 ? (
                                paymenttypes.data.map((paymenttype, index) => (
                                    <tr key={paymenttype.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700">{paymenttype.name ? paymenttype.name : "n/a"}</td>                                        
                                                                      
                                        <td className="border-b p-3 flex space-x-2">
                                            <Link
                                                href={route("systemconfiguration0.paymenttypes.edit", paymenttype.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(paymenttype.id)}
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
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No paymenttypes found.</td>
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