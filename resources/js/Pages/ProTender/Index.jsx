import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '../../Components/CustomModal.jsx'; 

export default function Index({ auth, tenders, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",
        stage: filters.stage || "",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        tenderToDeleteId: null,
    });

    useEffect(() => {
        get(route("procurements0.index"), { preserveState: true });
    }, [data.search, data.stage, get]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (stage) => {
        setData("stage", stage);
    };

    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this tender?",
            isAlert: false,
            tenderToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, tenderToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("procurements0.destroy", modalState.tenderToDeleteId));
        } catch (error) {
            console.error("Failed to delete tender:", error);
            showAlert("There was an error deleting the tender. Please try again.");
        }
        setModalState({ isOpen: false, message: '', isAlert: false, tenderToDeleteId: null });
    };

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            tenderToDeleteId: null,
        });
    };

    // Map tender stage numbers to labels
    const tenderStageLabels = {  
        1: 'Draft',  
        2: 'Quotation',
        3: 'Evaluation',       
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Tender List</h2>}
        >
            <Head title="Tender List" />
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
                            href={route("procurements0.create")}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-1" /> Create
                        </Link>
                    </div>

                    <ul className="flex space-x-2 mt-2">

                        <li
                            className={`cursor-pointer px-2 py-1 rounded text-sm flex items-center ${data.stage === "" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                                }`}
                            onClick={() => handleStageChange("")}
                        >
                            All
                        </li>
                        
                        {Object.entries(tenderStageLabels).map(([key, label]) => (
                            <li
                                key={key}
                                className={`cursor-pointer px-2 py-1 rounded text-sm flex items-center ${data.stage === key ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                                    }`}
                                onClick={() => handleStageChange(key)}
                            >
                                {label}
                            </li>
                        ))}

                        
                    </ul>
                </div>

                {/* Tenders Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Tender Descriptions</th>                               
                                <th className="border-b p-3 text-center font-medium text-gray-700">Stage</th>
                                <th colspan = "2" className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenders.data.length > 0 ? (
                                tenders.data.map((tender, index) => (
                                    <tr key={tender.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700">{tender.description ? tender.description : "n/a"}</td>                                        
                                        <td className="border-b p-3 text-gray-700">{tenderStageLabels[tender.stage]}</td>
                                        <td className="border-b p-3 text-gray-700">
                                            <Link
                                                href={route("procurements0.edit", tender.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />                                                
                                                {{
                                                    2: "Process",
                                                    3: "Award"
                                                }[tender.stage] || "Edit"}                                           
                                            </Link>
                                         </td>   

                                         <td className="border-b p-3 text-gray-700">   
                                            <button
                                                onClick={() => handleDelete(tender.id)}
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
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No tenders found.</td>
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