import React, { useEffect, useState, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash, faHome, faCheckCircle, faTimesCircle, faChevronDown, faChevronUp, faUpload, faSave, faSpinner, faPencilAlt, faTimes } from "@fortawesome/free-solid-svg-icons"; // Import new icons
import Modal from '@/Components/CustomModal';
import Pagination from "@/Components/Pagination";
import { toast } from 'react-toastify'; // Assuming you have a toast library like react-toastify
import axios from 'axios'; // Import axios for the PATCH request

const DEBOUNCE_DELAY = 300;

const StatusIndicator = ({ isActive }) => (
    isActive
        ? <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" title="Yes" />
        : <FontAwesomeIcon icon={faTimesCircle} className="text-gray-400" title="No" />
);

export default function Index({ auth, products, filters, success }) {
    const { data: searchData, setData: setSearchData } = useForm({ search: filters.search || "" });
    const [modalState, setModalState] = useState({ isOpen: false, productToDeleteId: null });
    const searchTimeoutRef = useRef(null);
    const [expandedGroups, setExpandedGroups] = useState({});

    // --- NEW: State for inline editing ---
    const [editingProductId, setEditingProductId] = useState(null);
    const [currentPrice, setCurrentPrice] = useState('');
    const [isSavingPrice, setIsSavingPrice] = useState(false);

    // Grouping logic (no changes here)
    const groupedProducts = products.data.reduce((acc, product) => {
        const groupName = product.category?.name || 'Uncategorized';
        if (!acc[groupName]) { acc[groupName] = []; }
        acc[groupName].push(product);
        return acc;
    }, {});

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    // Debounced search (no changes here)
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("systemconfiguration2.products.index"), { search: searchData.search }, { preserveState: true, replace: true });
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchData.search]);

    // Toast for success messages from redirects
    useEffect(() => {
        if (success) {
            toast.success(success);
        }
    }, [success]);

    const handleDelete = (id) => setModalState({ isOpen: true, productToDeleteId: id });
    const handleModalClose = () => setModalState({ isOpen: false, productToDeleteId: null });
    const handleModalConfirm = () => {
        if (!modalState.productToDeleteId) return;
        router.delete(route("systemconfiguration2.products.destroy", modalState.productToDeleteId), { onSuccess: () => handleModalClose() });
    };

    // --- NEW: Functions for inline editing ---
    const handleEditPrice = (product) => {
        setEditingProductId(product.id);
        setCurrentPrice(parseFloat(product.costprice).toFixed(2));
    };

    const handleCancelEdit = () => {
        setEditingProductId(null);
        setCurrentPrice('');
    };

    const handleSavePrice = (productId) => {
        if (isSavingPrice) return;
        setIsSavingPrice(true);

        axios.patch(route('systemconfiguration2.products.update-price', productId), {
            costprice: currentPrice,
        })
        .then(response => {
            toast.success(response.data.message || 'Price updated!');
            router.reload({ only: ['products'] }); // Reload only the products data
            handleCancelEdit(); // Exit editing mode
        })
        .catch(error => {
            if (error.response?.data?.errors?.costprice) {
                toast.error(error.response.data.errors.costprice[0]);
            } else {
                toast.error('Failed to update price.');
            }
            console.error(error);
        })
        .finally(() => {
            setIsSavingPrice(false);
        });
    };


    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Products</h2>}>
            <Head title="Product List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* The success prop is now handled by a toast, so this can be removed or kept as a fallback */}
                    {/* {success && <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">{success}</div>} */}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6">
                        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Search products..." value={searchData.search} onChange={e => setSearchData("search", e.target.value)} className="w-full rounded-md border-gray-300 pl-10" />
                                </div>
                                <Link href={route("systemconfiguration2.products.create")} className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create
                                </Link>
                                <Link href={route("systemconfiguration2.products.import.show")} className="flex items-center whitespace-nowrap rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
                                    <FontAwesomeIcon icon={faUpload} className="mr-2" /> Import
                                </Link>
                                <Link href={route("systemconfiguration2.index")} className="flex items-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                    <FontAwesomeIcon icon={faHome} className="mr-2" /> Home
                                </Link>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Price</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Display</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedProducts).length > 0 ? (
                                        Object.entries(groupedProducts).map(([groupName, groupProducts]) => (
                                            <React.Fragment key={groupName}>
                                                <tr className="bg-gray-100">
                                                    <td colSpan="5" className="px-4 py-2 text-left font-bold text-gray-700 cursor-pointer" onClick={() => toggleGroup(groupName)}>
                                                        <FontAwesomeIcon icon={expandedGroups[groupName] ? faChevronUp : faChevronDown} className="mr-3" />
                                                        {groupName} ({groupProducts.length})
                                                    </td>
                                                </tr>
                                                {expandedGroups[groupName] && groupProducts.map((product) => (
                                                    <tr key={product.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                                        
                                                        {/* --- UPDATED COST PRICE CELL --- */}
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {editingProductId === product.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={currentPrice}
                                                                        onChange={(e) => setCurrentPrice(e.target.value)}
                                                                        className="w-24 rounded-md border-gray-300 shadow-sm text-sm"
                                                                        autoFocus
                                                                        onKeyDown={(e) => e.key === 'Enter' && handleSavePrice(product.id)}
                                                                    />
                                                                    <button onClick={() => handleSavePrice(product.id)} disabled={isSavingPrice} className="text-green-600 hover:text-green-800 disabled:opacity-50">
                                                                        {isSavingPrice ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                                                                    </button>
                                                                    <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800">
                                                                        <FontAwesomeIcon icon={faTimes} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <span>{parseFloat(product.costprice).toFixed(2)}</span>
                                                                    <button onClick={() => handleEditPrice(product)} className="text-blue-500 hover:text-blue-700">
                                                                        <FontAwesomeIcon icon={faPencilAlt} size="xs" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{product.unit?.name || 'N/A'}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center"><StatusIndicator isActive={product.display} /></td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                                            <div className="flex items-center justify-center space-x-4">
                                                                <Link href={route("systemconfiguration2.products.edit", product.id)} className="text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faEdit} /></Link>
                                                                <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800"><FontAwesomeIcon icon={faTrash} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="text-center py-10 text-gray-500">No products found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination class="mt-6" links={products.links} />
                    </div>
                </div>
            </div>
            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title="Confirm Deletion" message="Are you sure you want to delete this product?" />
        </AuthenticatedLayout>
    );
}