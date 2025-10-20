import React, { useEffect, useState, useCallback, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faMoneyBill,
    // faPlus, // Not used in the provided snippet for this component
    // faTrash, // Not used in the provided snippet for this component
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css"; // Keep if not globally configured

// import Modal from '@/Components/CustomModal.jsx'; // Removed as no modal actions are present

// Define constants outside the component
const DEBTOR_STAGE_LABELS = {
    1: 'Partial',
    2: 'Complete',
};

const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

const DEBOUNCE_DELAY = 300; // milliseconds for search debounce

export default function Index({ auth, debtors, filters }) {
    const { data, setData, errors, processing } = useForm({ // `processing` might be useful if actions become forms
        search: filters.search || "",
        stage: filters.stage || "",
        start_date: filters.start_date || getTodayDate(),
        end_date: filters.end_date || getTodayDate(),
    });

    // Ref for debouncing
    const searchTimeoutRef = useRef(null);

    // Effect to fetch data when filters change (debounced for search)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("billing2.index"), {
                search: data.search,
                stage: data.stage,
                start_date: data.start_date,
                end_date: data.end_date,
            }, {
                preserveState: true,
                replace: true, // Avoids polluting browser history with filter changes
            });
        }, data.search ? DEBOUNCE_DELAY : 0); // Debounce if search is active, otherwise immediate for stage change

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [data.search, data.stage,data.start_date, data.end_date]);

    const handleSearchChange = useCallback((e) => {
        setData("search", e.target.value);
    }, [setData]);

    const handleStageChange = useCallback((stage) => {
        setData("stage", stage);
    }, [setData]);

    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user prop
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Debtor List</h2>}
        >
            <Head title="Debtor List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            {/* Header Actions */}                          

                            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex items-center space-x-2"> 
                                    
                                    <div className="relative flex items-center">
                                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500" />
                                        <input
                                            type="text"
                                            name="search"
                                            placeholder="Search by customer name"
                                            value={data.search}
                                            onChange={handleSearchChange}
                                            className={`w-full rounded-md border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:w-64 ${errors.search ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    {/* No "Create" button in the original snippet for billing2, kept as is */}
                                </div>

                                <ul className="flex flex-wrap items-center gap-2">
                                    <li
                                        className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium flex items-center ${data.stage === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                        onClick={() => handleStageChange("")}
                                    >
                                        All
                                    </li>
                                    {Object.entries(DEBTOR_STAGE_LABELS).map(([key, label]) => (
                                        <li
                                            key={key}
                                            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium flex items-center ${data.stage === key ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                            onClick={() => handleStageChange(key)}
                                        >
                                            {label}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Debtors Table */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                                            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Balance</th>                                            
                                            <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {debtors.data.length > 0 ? (
                                            debtors.data.map((debtor) => (
                                                <tr key={debtor.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                        {debtor.customer.customer_type === 'individual' ? (
                                                            `${debtor.customer.first_name} ${debtor.customer.other_names ? debtor.customer.other_names + ' ' : ''}${debtor.customer.surname}`.trim()
                                                        ) : (
                                                            debtor.customer.company_name
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                                                        {parseFloat(debtor.balance).toLocaleString(undefined, {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </td>                                                    
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center"> {/* Adjusted justify-end to justify-center since only one button */}
                                                            <Link
                                                                href={route("billing2.edit", debtor.id)}
                                                                className="flex items-center rounded bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                                                                title="Make Payment"
                                                            >
                                                                <FontAwesomeIcon icon={faMoneyBill} className="mr-1.5 h-3 w-3" />
                                                                Pay
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="whitespace-nowrap px-4 py-10 text-center text-sm text-gray-500">
                                                    No debtors found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* TODO: Add Pagination Links if debtors.links exists and is needed */}
                        </div>
                    </div>
                </div>
            </div>
            {/* Modal component removed as no modal actions are defined in this version */}
        </AuthenticatedLayout>
    );
}