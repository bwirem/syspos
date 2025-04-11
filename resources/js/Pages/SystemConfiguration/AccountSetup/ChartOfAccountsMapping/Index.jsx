import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faPlus, faEdit } from "@fortawesome/free-solid-svg-icons";
import Modal from "@/Components/CustomModal";

export default function Index({ auth, chartofaccountsmapping, chartofaccounts }) {
    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        chartofaccountToDeleteId: null,
    });

    // Step 1: Collect all account IDs from mappings
    const mappedAccountIds = new Set();
    chartofaccountsmapping.data.forEach(mapping => {
        if (mapping.account_payable_id) mappedAccountIds.add(mapping.account_payable_id.toString());
        if (mapping.account_receivable_id) mappedAccountIds.add(mapping.account_receivable_id.toString());       
    });

    // Step 2: Filter chart of accounts using the mapped IDs
    const filteredAccounts = chartofaccounts?.filter(account =>
        mappedAccountIds.has(account.id.toString())
    ) || [];

    const handleDelete = (id) => {
        setModalState({
            isOpen: true,
            message: "Are you sure you want to delete this chart of account?",
            isAlert: false,
            chartofaccountToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, chartofaccountToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("systemconfiguration3.chartofaccountsmapping.destroy", modalState.chartofaccountToDeleteId));
        } catch (error) {
            console.error("Failed to delete chart of account:", error);
            showAlert("There was an error deleting the chart of account. Please try again.");
        }
        handleModalClose();
    };

    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            chartofaccountToDeleteId: null,
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Mapping Special Accounts </h2>}
        >
            <Head title="Mapping Special Accounts" />
            <div className="container mx-auto p-4">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <Link
                            href={route("systemconfiguration3.chartofaccountmappings.create")}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-1" /> Create
                        </Link>
                        <Link
                            href={route("systemconfiguration3.index")}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faHome} className="mr-1" /> Home
                        </Link>
                    </div>
                </div>

                {/* Chart of Accounts Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Account Code</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Account Name</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Description</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAccounts.length > 0 ? (
                                filteredAccounts.map((account, index) => (
                                    <tr key={account.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700 text-center">{account.account_code || "n/a"}</td>
                                        <td className="border-b p-3 text-gray-700 text-left">{account.account_name || "n/a"}</td>
                                        <td className="border-b p-3 text-gray-700 text-left">{account.description || "n/a"}</td>
                                        <td className="border-b p-3 flex justify-center space-x-2">                                           
                                            <Link
                                                href={route("systemconfiguration3.chartofaccountmappings.edit")}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No chart of accounts found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
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
