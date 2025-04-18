import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '../../Components/CustomModal.jsx'; 


export default function Index({ auth, requistions, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",
        stage: filters.stage || "3",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        requistionToDeleteId: null,
    });

    useEffect(() => {
        get(route("inventory2.index"), { preserveState: true });
    }, [data.search, data.stage, get]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (stage) => {
        setData("stage", stage);
    };

   
    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, requistionToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("inventory2.destroy", modalState.requistionToDeleteId));
        } catch (error) {
            console.error("Failed to delete requistion:", error);
            showAlert("There was an error deleting the requistion. Please try again.");
        }
        setModalState({ isOpen: false, message: '', isAlert: false, requistionToDeleteId: null });
    };

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            requistionToDeleteId: null,
        });
    };

    // Map requistion stage numbers to labels
    const requistionStageLabels = {   
        3: 'Issued',
        4: 'Received', 
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Received List</h2>}
        >
            <Head title="Receive List" />
            <div className="container mx-auto p-4">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <div className="relative flex items-center">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                            <input
                                type="text"
                                name="search"
                                placeholder="Search by fromstore name"
                                value={data.search}
                                onChange={handleSearchChange}
                                className={`pl-10 border px-2 py-1 rounded text-sm ${errors.search ? "border-red-500" : ""
                                    }`}
                            />
                        </div>
                        
                    </div>

                    <ul className="flex space-x-2 mt-2">
                        
                         {Object.entries(requistionStageLabels).map(([key, label]) => (
                            <li
                                key={key}
                                className={`cursor-pointer px-2 py-1 rounded text-sm flex items-center ${data.stage === key ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                                    }`}
                                onClick={() => handleStageChange(key)}
                            >
                                {label}
                            </li>
                        ))}

                        <li
                            className={`cursor-pointer px-2 py-1 rounded text-sm flex items-center ${data.stage === "" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                                }`}
                            onClick={() => handleStageChange("")}
                        >
                            All
                        </li>
                    </ul>
                </div>

                {/* Requistions Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">From Store</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Total</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Stage</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requistions.data.length > 0 ? (
                                requistions.data.map((requistion, index) => (
                                    <tr key={requistion.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700">{requistion.fromstore ? requistion.fromstore.name : "n/a"}</td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(requistion.total).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                          <td className="border-b p-3 text-gray-700">{requistionStageLabels[requistion.stage]}</td>
                                        <td className="border-b p-3 flex space-x-2">
                                            <Link
                                                href={route("inventory2.edit", requistion.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                Receive
                                            </Link>                                            
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No requistions found.</td>
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