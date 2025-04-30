import React, { useEffect, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

import Modal from '../../Components/CustomModal.jsx'; 

export default function Index({ auth, sales, filters }) {
    const { data, setData,put, get, errors } = useForm({
        search: filters.search || "",  
        remarks: '', // Add remarks field to the form data     
    });

    // Void Modal state

    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [voidSale, setVoidSale] = useState(null); // Sale to be voided
    const [voidRemarks, setVoidRemarks] = useState('');
    const [remarksError, setRemarksError] = useState('');
    const [voidModalLoading, setVoidModalLoading] = useState(false);
    const [voidModalSuccess, setVoidModalSuccess] = useState(false);

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        saleToDeleteId: null,
    });

    useEffect(() => {
        get(route("billing3.salehistory"), { preserveState: true });
    }, [data.search, data.stage, get]);


    const handleSearchChange = (e) => {
        setData("search", e.target.value);
    };

   
   

    

    // Show alert modal
    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            saleToDeleteId: null,
        });
    };  
    
    const handleVoidClick = (sale) => {  
        
        setVoidSale(sale); // Set the sale to be voided    
        setData('remarks', ''); // Reset remarks field in the form data

        setVoidModalOpen(true);
        setVoidRemarks('');
        setRemarksError('');
        setVoidModalLoading(false); // Reset loading state
        setVoidModalSuccess(false); // Reset success state
    };

    
    const handleVoidModalClose = () => {
        
        setVoidSale(null); // Reset the sale to be voided  
        setData('remarks', ''); // Reset remarks field in the form data

        setVoidModalOpen(false);
        setVoidRemarks('');
        setRemarksError('');
        setVoidModalLoading(false); // Reset loading state
        setVoidModalSuccess(false); // Reset success state
    };

    const handleVoidModalConfirm = () => {
        if (!data.remarks.trim()) {
            setRemarksError('Please enter Void remarks.');
            return;
        }
    
        const formData = new FormData();
        formData.append('remarks', data.remarks);
    
        setVoidModalLoading(true); // Set loading state
    
        put(route('billing3.voidsale', voidSale.id), formData, {
            forceFormData: true, // OK to keep
            onSuccess: () => {
                console.log('Sale voided successfully!');
                setVoidModalLoading(false);
                setVoidModalSuccess(true);
                handleVoidModalClose();
            },
            onError: (errors) => {
                setVoidModalLoading(false);
                console.error('Submission errors:', errors);
            },
        });
        
        
    };


    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Sales History</h2>}
        >
            <Head title="Sales History" />
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

                {/* Sales Table */}
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
                            {sales.data.length > 0 ? (
                                sales.data.map((sale, index) => (
                                    <tr key={sale.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700">
                                            {sale.customer.customer_type === 'individual' ? (
                                                `${sale.customer.first_name} ${sale.customer.other_names ? sale.customer.other_names + ' ' : ''}${sale.customer.surname}`
                                            ) : (
                                                sale.customer.company_name
                                            )}
                                        </td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(sale.totaldue).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(sale.totalpaid).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>

                                        <td className="border-b p-3 text-gray-700 text-right">
                                            {parseFloat(sale.totaldue-sale.totalpaid).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                       
                                        <td className="border-b p-3 flex space-x-2">
                                            <Link
                                                href={route("billing3.preview", sale.id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                                 Preview
                                            </Link>
                                            <button
                                                onClick={() => handleVoidClick(sale)}
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
                                    <td colSpan="4" className="border-b p-3 text-center text-gray-700">No sales found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Void Confirmation Modal */}
            <Modal
                isOpen={voidModalOpen}
                onClose={handleVoidModalClose}
                onConfirm={handleVoidModalConfirm}
                title="Void Confirmation"
                confirmButtonText={voidModalLoading ? 'Loading...' : (voidModalSuccess ? "Success" : 'Void')}
                confirmButtonDisabled={voidModalLoading || voidModalSuccess}
            >
                <div>
                    <p>
                        Are you sure you want to void the sale to <strong>
                            {voidSale && voidSale.customer ? (
                            voidSale.customer.customer_type === 'individual' ? (
                                `${voidSale.customer.first_name} ${voidSale.customer.other_names ? voidSale.customer.other_names + ' ' : ''}${voidSale.customer.surname}`
                            ) : (
                                voidSale.customer.company_name
                            )
                            ) : (
                            ''
                            )}
                        </strong>? This action cannot be undone.  
                    </p>

                    <label htmlFor="Void_remarks" className="block text-sm font-medium text-gray-700 mt-4">
                        Void Remarks:
                    </label>
                    <textarea
                        id="Void_remarks"
                        rows="3"
                        className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={data.remarks}
                        onChange={(e) => setData('remarks', e.target.value)}
                    />
                    {remarksError && <p className="text-red-500 text-sm mt-1">{remarksError}</p>}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}