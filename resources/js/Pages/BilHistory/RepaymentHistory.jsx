import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '../../Components/CustomModal.jsx'; 

export default function Index({ auth, repayments, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",       
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        repaymentToDeleteId: null,
    });

    useEffect(() => {
        get(route("billing4.repaymenthistory"), { preserveState: true });
    }, [data.search, data.stage, get]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

   
    const handleVoid = (repayment) => {
        const customerName = repayment.customer.customer_type === 'individual'
            ? `${repayment.customer.first_name} ${repayment.customer.other_names ? repayment.customer.other_names + ' ' : ''}${repayment.customer.surname}`
            : repayment.customer.company_name;
    
        setModalState({
            isOpen: true,
            message: `Are you sure you want to void this repayment for ${customerName}?`,
            isAlert: false,
            repaymentToDeleteId: repayment.id,
        });
    };
    

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, repaymentToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("billing1.destroy", modalState.repaymentToDeleteId));
        } catch (error) {
            console.error("Failed to delete repayment:", error);
            showAlert("There was an error deleting the repayment. Please try again.");
        }
        setModalState({ isOpen: false, message: '', isAlert: false, repaymentToDeleteId: null });
    };

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            repaymentToDeleteId: null,
        });
    };    

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Repayments History</h2>}
        >
            <Head title="Repayments History" />
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

                {/* Repayments Table */}
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
                            {repayments.data.length > 0 ? (
                                repayments.data.map((repayment, index) => (
                                    <tr key={repayment.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700">
                                            {repayment.customer.customer_type === 'individual' ? (
                                                `${repayment.customer.first_name} ${repayment.customer.other_names ? repayment.customer.other_names + ' ' : ''}${repayment.customer.surname}`
                                            ) : (
                                                repayment.customer.company_name
                                            )}
                                        </td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(repayment.totaldue).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(repayment.totalpaid).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>

                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(repayment.totaldue-repayment.totalpaid).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                       
                                        <td className="border-b p-3 flex space-x-2">
                                            <Link
                                                href={route("billing4.preview", repayment.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                 Preview
                                            </Link>
                                            <button
                                                onClick={() => handleVoid(repayment)}
                                                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                                Void
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No repayments found.</td>
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