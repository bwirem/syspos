import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome,faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '@/Components/CustomModal';

export default function Index({ auth, users, filters }) {
    const { data, setData, get, errors } = useForm({
        search: filters.search || "",
        stage: filters.stage || "1",
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        userToDeleteId: null,
    });

    useEffect(() => {
        get(route("usermanagement.users.index"), { preserveState: true });
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
            message: "Are you sure you want to delete this user?",
            isAlert: false,
            userToDeleteId: id,
        });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, userToDeleteId: null });
    };

    const handleModalConfirm = async () => {
        try {
            await router.delete(route("usermanagement.users.destroy", modalState.userToDeleteId));
        } catch (error) {
            console.error("Failed to delete user:", error);
            showAlert("There was an error deleting the user. Please try again.");
        }
        setModalState({ isOpen: false, message: '', isAlert: false, userToDeleteId: null });
    };

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            userToDeleteId: null,
        });
    };


    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">User List</h2>}
        >
            <Head title="User List" />
            <div className="container mx-auto p-4">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between users-center mb-4">
                    <div className="flex users-center space-x-2 mb-4 md:mb-0">
                        <div className="relative flex users-center">
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
                                href={route("usermanagement.users.create")}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex users-center"
                            >
                                <FontAwesomeIcon icon={faPlus} className="mr-1" /> Create
                            </Link>

                            <Link
                                href={route("usermanagement.index")}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center"
                            >
                                <FontAwesomeIcon icon={faHome} className="mr-1" /> Home
                            </Link>                        

                    </div>
                    
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700">User Descriptions</th>                                 
                                <th className="border-b p-3 text-center font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.length > 0 ? (
                                users.data.map((user, index) => (
                                    <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700">{user.name ? user.name : "n/a"}</td>                                        
                                                                      
                                        <td className="border-b p-3 flex space-x-2">
                                            <Link
                                                href={route("usermanagement.users.edit", user.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex users-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs flex users-center"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No users found.</td>
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