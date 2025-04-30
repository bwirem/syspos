import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '../../Components/CustomModal.jsx'; 

export default function Index({ auth, voidsales, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",       
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        voidsaleToDeleteId: null,
    });

    useEffect(() => {
        get(route("billing5.voidsalehistory"), { preserveState: true });
    }, [data.search, data.stage, get]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

   
    const handleVoidsale = (voidsale) => {
        const customerName = voidsale.customer.customer_type === 'individual'
            ? `${voidsale.customer.first_name} ${voidsale.customer.other_names ? voidsale.customer.other_names + ' ' : ''}${voidsale.customer.surname}`
            : voidsale.customer.company_name;
    
        setModalState({
            isOpen: true,
            message: `Are you sure you want to voidsale this voidsale for ${customerName}?`,
            isAlert: false,
            voidsaleToDeleteId: voidsale.id,
        });
    };
    

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, voidsaleToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("billing1.destroy", modalState.voidsaleToDeleteId));
        } catch (error) {
            console.error("Failed to delete voidsale:", error);
            showAlert("There was an error deleting the voidsale. Please try again.");
        }
        setModalState({ isOpen: false, message: '', isAlert: false, voidsaleToDeleteId: null });
    };

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            voidsaleToDeleteId: null,
        });
    };    

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Voidsales History</h2>}
        >
            <Head title="Voidsales History" />
            <div className="container mx-auto p-4">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <div className="relative flex items-center">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                            <input
                                type="text"
                                name="search"
                                placeholder="Search by customer name"
                                value={data.search}
                                onChange={handleSearchChange}
                                className={`pl-10 border px-2 py-1 rounded text-sm ${errors.search ? "border-red-500" : ""
                                    }`}
                            />
                        </div>                        
                    </div>
                </div>

                {/* Voidsales Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Customer Name</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Total Due</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Total Paid</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Balance</th>                               
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {voidsales.data.length > 0 ? (
                                voidsales.data.map((voidsale, index) => (
                                    <tr key={voidsale.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700">
                                            {voidsale.customer.customer_type === 'individual' ? (
                                                `${voidsale.customer.first_name} ${voidsale.customer.other_names ? voidsale.customer.other_names + ' ' : ''}${voidsale.customer.surname}`
                                            ) : (
                                                voidsale.customer.company_name
                                            )}
                                        </td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(voidsale.totaldue).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(voidsale.totalpaid).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>

                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(voidsale.totaldue-voidsale.totalpaid).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                       
                                        <td className="border-b p-3 flex space-x-2">
                                            <Link
                                                href={route("billing5.preview", voidsale.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                 Preview
                                            </Link>
                                            <button
                                                onClick={() => handleVoidsale(voidsale)}
                                                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                                Voidsale
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No voidsales found.</td>
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