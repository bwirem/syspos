import React, { useEffect, useState, useRef } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch, faPlus, faEdit, faTrash, faHome,
    faChevronDown, faChevronUp, faSave, faTimes, faSpinner, faPencilAlt
} from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import Pagination from "@/Components/Pagination";
import axios from 'axios';
import { toast } from 'react-toastify';

const DEBOUNCE_DELAY = 300;

export default function Index({ auth, items, filters, success, activePriceCategories = [] }) {
    const { data: searchData, setData: setSearchData } = useForm({ search: filters.search || "" });
    const [modalState, setModalState] = useState({ isOpen: false, itemToDeleteId: null });
    const searchTimeoutRef = useRef(null);
    const [expandedGroups, setExpandedGroups] = useState({});

    const [editingItemId, setEditingItemId] = useState(null);
    const [currentPrices, setCurrentPrices] = useState({});
    const [isSavingPrices, setIsSavingPrices] = useState(false);

    const groupedItems = items.data.reduce((acc, item) => {
        const groupName = item.itemgroup?.name || 'Uncategorized';
        if (!acc[groupName]) { acc[groupName] = []; }
        acc[groupName].push(item);
        return acc;
    }, {});

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            router.get(route("systemconfiguration0.items.index"), { search: searchData.search }, {
                preserveState: true,
                replace: true,
            });
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchData.search]);
    
    useEffect(() => {
        if (success) {
            toast.success(success);
        }
    }, [success]);

    const handleDelete = (id) => setModalState({ isOpen: true, itemToDeleteId: id });
    const handleModalClose = () => setModalState({ isOpen: false, itemToDeleteId: null });
    const handleModalConfirm = () => {
        if (!modalState.itemToDeleteId) return;
        router.delete(route("systemconfiguration0.items.destroy", modalState.itemToDeleteId), {
            onSuccess: () => handleModalClose(),
        });
    };

    const handleEditItem = (item) => {
        // REMOVED: The check for item.product_id that prevented editing.
        setEditingItemId(item.id);
        const initialPrices = activePriceCategories.reduce((acc, category) => {
            acc[category.key] = parseFloat(item[category.key] || 0).toFixed(2);
            return acc;
        }, {});
        setCurrentPrices(initialPrices);
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setCurrentPrices({});
    };

    const handlePriceChange = (key, value) => {
        setCurrentPrices(prev => ({ ...prev, [key]: value }));
    };

    const handleSavePrices = (itemId) => {
        if (isSavingPrices) return;
        setIsSavingPrices(true);

        axios.patch(route('systemconfiguration0.items.update-prices', itemId), currentPrices)
            .then(response => {
                toast.success(response.data.message || 'Prices updated!');
                router.reload({ only: ['items'] });
                handleCancelEdit();
            })
            .catch(error => {
                const errorMessage = error.response?.data?.message || 'An error occurred.';
                toast.error(errorMessage);
                console.error(error.response?.data);
            })
            .finally(() => {
                setIsSavingPrices(false);
            });
    };

    const tableColSpan = 2 + activePriceCategories.length;

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Billing Items & Services</h2>}>
            <Head title="Billing Items List" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white shadow-sm sm:rounded-lg p-6">
                        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Search items..." value={searchData.search} onChange={e => setSearchData("search", e.target.value)} className="w-full rounded-md border-gray-300 pl-10" />
                                </div>
                                <Link href={route("systemconfiguration0.items.create")} className="flex items-center whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" /> Create
                                </Link>
                                <Link href={route("systemconfiguration0.index")} className="flex items-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                    <FontAwesomeIcon icon={faHome} className="mr-2" /> Home
                                </Link>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        {activePriceCategories.map(category => (
                                            <th key={category.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{category.label}</th>
                                        ))}
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedItems).length > 0 ? (
                                        Object.entries(groupedItems).map(([groupName, groupItems]) => (
                                            <React.Fragment key={groupName}>
                                                <tr className="bg-gray-100">
                                                    <td colSpan={tableColSpan} className="px-4 py-2 text-left font-bold text-gray-700 cursor-pointer" onClick={() => toggleGroup(groupName)}>
                                                        <FontAwesomeIcon icon={expandedGroups[groupName] ? faChevronUp : faChevronDown} className="mr-3" />
                                                        {groupName} ({groupItems.length})
                                                    </td>
                                                </tr>
                                                {expandedGroups[groupName] && groupItems.map((item) => (
                                                    <tr key={item.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 pl-10">{item.name}</td>
                                                        
                                                        {activePriceCategories.map(category => (
                                                            <td key={category.key} className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {editingItemId === item.id ? (
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={currentPrices[category.key]}
                                                                        onChange={(e) => handlePriceChange(category.key, e.target.value)}
                                                                        className="w-24 rounded-md border-gray-300 shadow-sm text-sm"
                                                                    />
                                                                ) : (
                                                                    <span>{parseFloat(item[category.key] || 0).toFixed(2)}</span>
                                                                )}
                                                            </td>
                                                        ))}

                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                                            <div className="flex items-center justify-center space-x-4">
                                                                {editingItemId === item.id ? (
                                                                    <>
                                                                        <button onClick={() => handleSavePrices(item.id)} disabled={isSavingPrices} className="text-green-600 hover:text-green-800 disabled:opacity-50">
                                                                            {isSavingPrices ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                                                                        </button>
                                                                        <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800">
                                                                            <FontAwesomeIcon icon={faTimes} />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {/* UPDATED: The "Edit Prices" button is now always enabled */}
                                                                        <button onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-800" title="Edit Prices">
                                                                            <FontAwesomeIcon icon={faPencilAlt} />
                                                                        </button>
                                                                        <Link href={route("systemconfiguration0.items.edit", item.id)} className="text-yellow-600 hover:text-yellow-800" title="Edit Full Item">
                                                                            <FontAwesomeIcon icon={faEdit} />
                                                                        </Link>
                                                                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800" title="Delete Item">
                                                                            <FontAwesomeIcon icon={faTrash} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr><td colSpan={tableColSpan} className="text-center py-10 text-gray-500">No items found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination class="mt-6" links={items.links} />
                    </div>
                </div>
            </div>
            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title="Confirm Deletion" message="Are you sure you want to delete this item?" />
        </AuthenticatedLayout>
    );
}