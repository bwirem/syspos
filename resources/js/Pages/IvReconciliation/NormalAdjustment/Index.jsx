import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faTimes, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";

import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal';


export default function Index({ auth, normaladjustments, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",
        stage: filters.stage || "1",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        normaladjustmentToDeleteId: null,
    });

    useEffect(() => {
        get(route("inventory3.normal-adjustment.index"), { preserveState: true });
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
            message: "Are you sure you want to delete this normaladjustment?",
            isAlert: false,
            normaladjustmentToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, normaladjustmentToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("inventory0.destroy", modalState.normaladjustmentToDeleteId));
        } catch (error) {
            console.error("Failed to delete normaladjustment:", error);
            showAlert("There was an error deleting the normaladjustment. Please try again.");
        }
        setModalState({ isOpen: false, message: '', isAlert: false, normaladjustmentToDeleteId: null });
    };

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            normaladjustmentToDeleteId: null,
        });
    };

    // Map normaladjustment stage numbers to labels
    const normaladjustmentstageLabels = {
        1: 'Draft',
        2: 'Checked',        
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Normal Adjustment List</h2>}
        >
            <Head title="Normal Adjustment List" />
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

                        <Link
                            href={route("inventory3.normal-adjustment.create")}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-1" /> Create
                        </Link>

                        <Link
                            href={route("inventory3.index")}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faTimes} className="mr-1" /> {/* Changed icon */} Close
                        </Link>
                        
                    </div>

                    <ul className="flex space-x-2 mt-2">
                        
                         {Object.entries(normaladjustmentstageLabels).map(([key, label]) => (
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

                {/* Normaladjustments Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Store</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Total</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Stage</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {normaladjustments.data.length > 0 ? (
                                normaladjustments.data.map((normaladjustment, index) => (
                                    <tr key={normaladjustment.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700">{normaladjustment.store ? normaladjustment.store.name : "n/a"}</td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(normaladjustment.total).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                          <td className="border-b p-3 text-gray-700">{normaladjustmentstageLabels[normaladjustment.stage]}</td>
                                        <td className="border-b p-3 flex space-x-2">
                                            <Link
                                                href={route("inventory3.normal-adjustment.edit", normaladjustment.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(normaladjustment.id)}
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
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No normaladjustments found.</td>
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