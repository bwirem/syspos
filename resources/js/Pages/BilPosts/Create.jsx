import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faMoneyBill, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';
import InputField from '../../Components/CustomInputField.jsx';

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function Create({ fromstore, auth }) {
    const { data, setData, errors, processing, reset } = useForm({
        store_id: auth?.user?.store_id || null,
        pricecategory_id: auth?.user?.pricecategory_id || null,
        total: 0,
        orderitems: [],
    });

    const [orderItems, setOrderItems] = useState([]);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [blockNoItemsFound, setBlockNoItemsFound] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    const [storeIDError, setStoreIDError] = useState(null);
    const [pricecategoryIDError, setPricecategoryIDError] = useState(null);
    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    const [priceCategories, setPriceCategories] = useState([]);

    const fetchItems = useCallback((query) => {
        if (!query.trim() || !data.pricecategory_id) {
            setItemSearchResults([]);
            return;
        }
        setIsItemSearchLoading(true);
        axios.get(route('systemconfiguration0.items.search'), { params: { query: query.trim(), pricecategory_id: data.pricecategory_id } })
            .then((response) => setItemSearchResults(response.data.items?.slice(0, 10) || []))
            .catch(() => showAlert('Failed to fetch items.'))
            .finally(() => setIsItemSearchLoading(false));
    }, [data.pricecategory_id]);

    useEffect(() => {
        axios.get(route('systemconfiguration0.pricecategories.viewactive'))
            .then(response => setPriceCategories(response.data.priceCategories))
            .catch(() => showAlert('Failed to fetch price categories.'));
    }, []);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);

    useEffect(() => {
        if (itemSearchQuery.trim()) {
            debouncedItemSearch(itemSearchQuery);
        } else {
            setItemSearchResults([]);
        }
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => {
        setData('orderitems', orderItems.map(item => ({
            item_id: item.item_id,
            quantity: parseFloat(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
        })));
        const calculatedTotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);
        setData('total', calculatedTotal);
    }, [orderItems, setData]);

    useEffect(() => {
        const handleClickOutside = (event) => { if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) setShowItemDropdown(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOrderItemChange = (index, field, value) => {
        const updatedItems = [...orderItems];
        const parsedValue = parseFloat(value);
        updatedItems[index][field] = isNaN(parsedValue) || parsedValue < 0 ? (field === 'quantity' ? 1 : 0) : parsedValue;
        setOrderItems(updatedItems);
    };

    const addOrderItem = (selectedItem) => {
        setBlockNoItemsFound(true);
        setIsAddingItem(true);

        const newItem = { item_name: selectedItem.name, item_id: selectedItem.id, quantity: 1, price: selectedItem.price };
        setOrderItems((prevItems) => [...prevItems, newItem]);

        setTimeout(() => {
            setItemSearchQuery('');
            setItemSearchResults([]);
            setShowItemDropdown(false);
            setIsAddingItem(false);
            if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
        }, 150);
    };

    const removeOrderItem = (index) => setModalState({ isOpen: true, message: 'Are you sure you want to remove this item?', isAlert: false, itemToRemoveIndex: index });
    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) setOrderItems(orderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex));
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };
    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    const showAlert = (message) => setModalState({ isOpen: true, message: message, isAlert: true, itemToRemoveIndex: null });
    const isValidInteger = (value) => value !== null && value !== '' && !isNaN(value) && Number.isInteger(Number(value));

    const handleItemSearchChange = (e) => {
        setBlockNoItemsFound(false);
        setItemSearchQuery(e.target.value);
        setShowItemDropdown(!!e.target.value.trim() && !!data.pricecategory_id);
    };

    const validateForm = () => {
        let isValid = true;
        if (!isValidInteger(data.store_id)) { setStoreIDError('Store selection is required.'); isValid = false; } else { setStoreIDError(null); }
        if (!data.pricecategory_id) { setPricecategoryIDError('Price category is required.'); isValid = false; } else { setPricecategoryIDError(null); }
        if (orderItems.length === 0) { showAlert('Please add at least one item to the order.'); isValid = false; }
        else {
            const hasInvalidItems = orderItems.some(item => !item.item_id || (parseFloat(item.quantity) || 0) <= 0 || (parseFloat(item.price) || 0) < 0);
            if (hasInvalidItems) { showAlert('Ensure all items have valid details (quantity > 0, price >= 0).'); isValid = false; }
        }
        return isValid;
    }

    const handleProceed = (destination) => {
        if (!validateForm()) return;
    
        const payload = {
            store_id: data.store_id,
            pricecategory_id: data.pricecategory_id,
            total: data.total,
            orderitems: orderItems.map(item => ({
                item_id: item.item_id,
                item_name: item.item_name,
                quantity: parseFloat(item.quantity) || 0,
                price: parseFloat(item.price) || 0,
            })),
        };

        if (destination === 'save') {
            router.post(route('billing1.confirmSave'), payload, { preserveState: true });
        } else if (destination === 'pay') {
            router.post(route('billing1.confirmPayment'), payload, { preserveState: true });
        }
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">New Order</h2>}>
            <Head title="Create Order" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Setup</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                                        <select id="store_id" value={data.store_id || ''} onChange={(e) => { setData("store_id", e.target.value); setStoreIDError(null); }}
                                            className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.store_id || storeIDError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                            <option value="" disabled>Select Store...</option>
                                            {fromstore.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        {(errors.store_id || storeIDError) && <p className="text-xs text-red-500 mt-1">{errors.store_id || storeIDError}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="pricecategory_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Category</label>
                                        <select id="pricecategory_id" value={data.pricecategory_id || ''} onChange={(e) => { setData("pricecategory_id", e.target.value); setPricecategoryIDError(null); setItemSearchQuery(''); setItemSearchResults([]); setOrderItems([]); }}
                                            className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.pricecategory_id || pricecategoryIDError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                            <option value="" disabled>Select Price Category...</option>
                                            {priceCategories.map(pc => <option key={pc.pricename} value={pc.pricename}>{pc.pricedescription}</option>)}
                                        </select>
                                        {(errors.pricecategory_id || pricecategoryIDError) && <p className="text-xs text-red-500 mt-1">{errors.pricecategory_id || pricecategoryIDError}</p>}
                                    </div>
                                </div>
                            </section>

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Items</h3>
                                <div className="mb-4">
                                    <label htmlFor="item_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Item to Order</label>
                                    <div className="relative flex-grow" ref={itemDropdownRef}>
                                        <input
                                            id="item_search"
                                            type="text"
                                            placeholder="Search item by name or code..."
                                            value={itemSearchQuery}
                                            onChange={handleItemSearchChange}
                                            onFocus={() => setShowItemDropdown(!!itemSearchQuery.trim() && !!data.pricecategory_id)}
                                            disabled={!data.pricecategory_id}
                                            ref={itemSearchInputRef}
                                            className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-700/50 border-gray-300 dark:border-gray-600"
                                            autoComplete="off"
                                        />
                                        {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />}
                                        {showItemDropdown && (
                                            <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {isAddingItem ? (
                                                    <li className="p-2 text-center text-gray-500 dark:text-gray-400">
                                                        <FontAwesomeIcon icon={faSpinner} spin /> Adding...
                                                    </li>
                                                ) : itemSearchResults.length > 0 ? (
                                                    itemSearchResults.map((item) => (
                                                        <li key={item.id} onClick={() => addOrderItem(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                                                            {item.name} <span className="text-xs text-gray-500 dark:text-gray-400">(TZS {formatCurrency(item.price)})</span>
                                                        </li>
                                                    ))
                                                ) : !isItemSearchLoading && !blockNoItemsFound && (
                                                    <li className="p-2 text-gray-500 dark:text-gray-400 text-sm">No items found.</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {!data.pricecategory_id && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Select a Price Category to search items.</p>}
                                </div>

                                {orderItems.length > 0 && (
                                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">Subtotal</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {orderItems.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{item.item_name}</td>
                                                        <td className="px-1 py-1"><InputField id={`qty_${index}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)} className="w-full text-right text-sm dark:bg-gray-700 dark:text-gray-200" /></td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.price)}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.quantity * item.price)}</td>
                                                        <td className="px-4 py-2 text-center"><button type="button" onClick={() => removeOrderItem(index)} className="text-red-500 hover:text-red-700"><FontAwesomeIcon icon={faTrash} /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                    <div className="w-full md:w-1/3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Total</label>
                                        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md text-right">TZS {formatCurrency(data.total)}</div>
                                    </div>
                                </div>
                            </section>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={route('billing1.index')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm flex items-center"><FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> Close</Link>
                                <button type="button" onClick={() => handleProceed('save')} disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center"><FontAwesomeIcon icon={processing ? faSpinner : faSave} spin={processing} className="mr-2" /> Save</button>
                                <button type="button" onClick={() => handleProceed('pay')} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center"><FontAwesomeIcon icon={processing ? faSpinner : faMoneyBill} spin={processing} className="mr-2" /> Pay Bills</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title={modalState.isAlert ? "Alert" : "Confirm Action"} message={modalState.message} isAlert={modalState.isAlert} confirmButtonText={modalState.isAlert ? "OK" : "Confirm"} />
        </AuthenticatedLayout>
    );
}