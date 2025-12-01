import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react"; 
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEdit, faEye, faFilter, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { toast } from 'react-toastify'; 

// import Pagination from '@/Components/Pagination'; // Uncomment if you implement pagination

export default function Index({ auth, requistions, fromstore: fromStoreOptionsProp, filters, flash }) {
    
    const { data, setData, errors, clearErrors } = useForm({
        search: filters.search || "",
        stage: filters.stage || "",
        selected_fromstore_id: filters.fromstore || "", 
    });

    // Handle Flash Messages using Toast
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    useEffect(() => {
        const params = {
            search: data.search,
            stage: data.stage,
            ...(data.selected_fromstore_id && { fromstore: data.selected_fromstore_id }),
        };

        const cleanedParams = {};
        for (const key in params) {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                cleanedParams[key] = params[key];
            }
        }

        router.get(route("inventory1.index"), cleanedParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, [data.search, data.stage, data.selected_fromstore_id]); 


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

    const handleStageChange = (newStage) => {
        setData("stage", data.stage === newStage ? "" : newStage);
    };

    const handleFromStoreFilterChange = (e) => {
        setData("selected_fromstore_id", e.target.value); 
    };

    const resetFilters = () => {
        setData({
            search: "",
            stage: "",
            selected_fromstore_id: "" 
        });
        clearErrors();
    };

    const requistionStageInfo = {
        2: { label: 'Pending Approval', color: 'bg-yellow-500' },
        3: { label: 'Pending Issue', color: 'bg-blue-500' },
        4: { label: 'Issued', color: 'bg-green-500' },
    };

    const getToStoreName = (requistion) => {
        if (!requistion.tostore) return "N/A";
        const tostore = requistion.tostore;
        if (tostore.customer_type) {
            return tostore.customer_type === 'individual'
                ? `${tostore.first_name || ''} ${tostore.other_names || ''} ${tostore.surname || ''}`.trim()
                : tostore.company_name || 'N/A';
        }
        return tostore.name || 'N/A';
    };

    const formatCurrency = (amount) => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return '0.00';
        return parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Requisition Actions List</h2>}
        >
            <Head title="Requisition Actions" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="flex-1">
                                    <label htmlFor="selected_fromstore_id" className="block text-sm font-medium text-gray-700 mb-1">
                                        Filter by From Store
                                    </label>
                                    <select
                                        id="selected_fromstore_id"
                                        name="selected_fromstore_id"
                                        value={data.selected_fromstore_id} 
                                        onChange={handleFromStoreFilterChange}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2"
                                    >
                                        <option value="">All From Stores</option>
                                        {(Array.isArray(fromStoreOptionsProp) ? fromStoreOptionsProp : []).map(store => (
                                            <option key={store.id} value={store.id}>
                                                {store.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                                        Search (To Store/Customer)
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            id="search"
                                            placeholder="Search by name or ID..."
                                            value={data.search}
                                            onChange={handleSearchChange}
                                            className="block w-full rounded-md border-gray-300 py-2 pl-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-start md:justify-end pt-5">
                                     <button
                                        onClick={resetFilters}
                                        className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 flex items-center"
                                        title="Reset all filters"
                                    >
                                        <FontAwesomeIcon icon={faTimesCircle} className="mr-2 h-4 w-4" />
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                             <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Filter by Stage
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleStageChange("")}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                            ${data.stage === "" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                    >
                                        All Stages
                                    </button>
                                    {Object.entries(requistionStageInfo).map(([key, { label }]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleStageChange(key)}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                                ${data.stage === key ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flow-root">
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">From Store</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">To Store/Customer</th>
                                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Total</th>
                                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Stage</th>
                                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-3 text-center">
                                                    <span className="sr-only">Actions</span>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {requistions.data.length > 0 ? (
                                                requistions.data.map((requistion) => (
                                                    <tr key={requistion.id}>
                                                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{new Date(requistion.created_at).toLocaleDateString()}</td>  
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{requistion.fromstore?.name || 'N/A'}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{getToStoreName(requistion)}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">{formatCurrency(requistion.total)}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${requistionStageInfo[requistion.stage]?.color || 'bg-gray-400'}`}>
                                                                {requistionStageInfo[requistion.stage]?.label || `Stage ${requistion.stage}`}
                                                            </span>
                                                        </td>
                                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-3">
                                                            {(requistion.stage === 2 || requistion.stage === 3) && (
                                                                <Link
                                                                    href={route("inventory1.edit", requistion.id)}
                                                                    className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                                                >
                                                                    <FontAwesomeIcon icon={requistion.stage === 2 ? faEdit : faEye} className="mr-1" />
                                                                    {requistion.stage === 2 ? "Approve" : "Issue"}
                                                                </Link>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="whitespace-nowrap py-4 px-3 text-center text-sm text-gray-500">
                                                        No requisitions found matching your filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        {/* {requistions.links && requistions.data.length > 0 && (
                            <div className="mt-6">
                                <Pagination links={requistions.links} />
                            </div>
                        )} */}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}