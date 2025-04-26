import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faMoneyBill, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '../../Components/CustomModal.jsx'; 

export default function Index({ auth, debtors, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",
        stage: filters.stage || "",
    });    

    useEffect(() => {
        get(route("billing2.index"), { preserveState: true });
    }, [data.search, data.stage, get]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (stage) => {
        setData("stage", stage);
    };
      
    // Map debtor stage numbers to labels
    const debtorStageLabels = {       
        1: 'Partial',
        2: 'Complete',       
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Debtor List</h2>}
        >
            <Head title="Debtor List" />
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

                    <ul className="flex space-x-2 mt-2">

                        <li
                            className={`cursor-pointer px-2 py-1 rounded text-sm flex items-center ${data.stage === "" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                                }`}
                            onClick={() => handleStageChange("")}
                        >
                            All
                        </li>
                        
                         {Object.entries(debtorStageLabels).map(([key, label]) => (
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

                {/* Debtors Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Customer Name</th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Balance</th>                               
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debtors.data.length > 0 ? (
                                debtors.data.map((debtor, index) => (
                                    <tr key={debtor.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>                                        
                                        <td className="border-b p-3 text-gray-700">
                                            {debtor.customer.customer_type === 'individual' ? (
                                                `${debtor.customer.first_name} ${debtor.customer.other_names ? debtor.customer.other_names + ' ' : ''}${debtor.customer.surname}`
                                            ) : (
                                                debtor.customer.company_name
                                            )}
                                        </td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(debtor.balance).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>                                          
                                        <td className="border-b p-3 flex justify-end space-x-2">
                                            <Link
                                                href={route("billing2.edit", debtor.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faMoneyBill} className="mr-1" />
                                                Pay
                                            </Link>                                            
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No debtors found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </AuthenticatedLayout>
    );
}