import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSave, faMoneyBill, faSpinner, faStore, faTag, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';
import InputField from '../../Components/CustomInputField.jsx';
// 1. IMPORT TOAST
import { toast } from 'react-toastify';

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

const STORAGE_KEY = 'pendingOrderData';

const StockSelectionModal = ({ isOpen, onClose, onConfirm, item, stores, isLoading }) => {
    const [selectedStore, setSelectedStore] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500 mr-2" />
                    Insufficient Stock
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    The item <strong>{item?.name}</strong> is out of stock in the default store.
                </p>

                {isLoading ? (
                    <div className="text-center py-4 text-gray-500">
                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Checking other stores...
                    </div>
                ) : stores.length > 0 ? (
                    <>
                         <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Please select an alternative source store:
                        </p>
                        <select 
                            value={selectedStore} 
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full border p-2 rounded-md mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        >
                            <option value="">-- Select Source Store --</option>
                            {stores.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                        <div className="flex justify-end space-x-3">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">Cancel</button>
                            <button 
                                onClick={() => onConfirm(selectedStore)} 
                                disabled={!selectedStore}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50"
                            >
                                Confirm Source
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4 text-sm">
                            This item is out of stock in ALL stores.
                        </div>
                        <div className="flex justify-end">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">Close</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default function Create({ fromstore, priceCategories, auth, facilityOptions }) {
    const { data, setData, errors, processing } = useForm({
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
    
    // Logic for Stock Modal
    const [pendingItem, setPendingItem] = useState(null);
    const [showStockModal, setShowStockModal] = useState(false);
    const [availableAlternativeStores, setAvailableAlternativeStores] = useState([]);
    const [isCheckingStock, setIsCheckingStock] = useState(false);

    // Modal state only for Confirmations now
    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    useEffect(() => {
        const savedData = sessionStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const { orderItems: savedItems, store_id, pricecategory_id } = JSON.parse(savedData);
                if (savedItems) setOrderItems(savedItems);
                if (store_id) setData('store_id', store_id);
                if (pricecategory_id) setData('pricecategory_id', pricecategory_id);
            } catch (e) {
                console.error("Failed to parse pending order data", e);
                sessionStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    const fetchItems = useCallback((query) => {
        if (!query.trim() || !data.pricecategory_id) {
            setItemSearchResults([]);
            return;
        }
        setIsItemSearchLoading(true);
        
        axios.get(route('systemconfiguration0.items.search'), { 
            params: { 
                query: query.trim(), 
                pricecategory_id: data.pricecategory_id,
                store_id: data.store_id 
            } 
        })
        .then((response) => setItemSearchResults(response.data.items?.slice(0, 10) || []))
        .catch(() => toast.error('Failed to fetch items.')) // UPDATED
        .finally(() => setIsItemSearchLoading(false));
    }, [data.pricecategory_id, data.store_id]);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);

    useEffect(() => {
        if (itemSearchQuery.trim()) debouncedItemSearch(itemSearchQuery);
        else setItemSearchResults([]);
    }, [itemSearchQuery, debouncedItemSearch]);

    useEffect(() => {
        setData('orderitems', orderItems.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: parseFloat(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
            source_store_id: item.source_store_id, 
            source_store_name: item.source_store_name, 
            price_ref: item.price_ref 
        })));
        
        const calculatedTotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);
        setData('total', calculatedTotal);
    }, [orderItems, setData]);

    const showStoreBadge = useMemo(() => {
        if (orderItems.length === 0) return false;
        const uniqueStores = new Set(orderItems.map(item => String(item.source_store_id || '')));
        return uniqueStores.size > 1; 
    }, [orderItems]);

    const showPriceBadge = useMemo(() => {
        if (orderItems.length === 0) return false;
        const uniquePrices = new Set(orderItems.map(item => item.price_ref).filter(Boolean));
        return uniquePrices.size > 1; 
    }, [orderItems]);

    useEffect(() => {
        const handleClickOutside = (event) => { if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) setShowItemDropdown(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const checkStockAndAdd = (selectedItem) => {
        // Price Check
        const price = parseFloat(selectedItem.price) || 0;
        if (price <= 0) {
            toast.error(`Cannot add "${selectedItem.name}". The price is zero.`); // UPDATED
            setShowItemDropdown(false);
            return;
        }

        const defaultStore = fromstore.find(s => s.id == data.store_id);
        const allowNegative = facilityOptions?.allownegativestock; 
        const currentStock = parseFloat(selectedItem.stock_quantity) || 0;
        const isInventoryItem = !!selectedItem.product_id; 

        if (isInventoryItem && !allowNegative && currentStock <= 0) {
            setPendingItem(selectedItem);
            setAvailableAlternativeStores([]); 
            setIsCheckingStock(true);
            setShowStockModal(true); 
            setShowItemDropdown(false);

            axios.get(route('systemconfiguration0.items.availability', { item: selectedItem.id }))
                .then(response => {
                    const availableStoreIds = response.data; 
                    const filteredStores = fromstore.filter(s => 
                        s.id != data.store_id && availableStoreIds.includes(s.id)
                    );
                    setAvailableAlternativeStores(filteredStores);
                })
                .catch(error => {
                    console.error("Stock check failed", error);
                    toast.error("Failed to check stock in other stores."); // UPDATED
                    setShowStockModal(false);
                })
                .finally(() => {
                    setIsCheckingStock(false);
                });
            return;
        }

        addItemToCart(selectedItem, data.store_id, defaultStore?.name);
    };

    const handleAlternativeStoreSelect = (storeId) => {
        const store = fromstore.find(s => s.id == storeId);
        
        if (store && pendingItem) {
            axios.get(route('systemconfiguration0.items.search'), { 
                params: { 
                    query: pendingItem.name, 
                    store_id: store.id,
                    pricecategory_id: data.pricecategory_id 
                } 
            })
            .then(response => {
                const exactItem = response.data.items.find(i => i.id === pendingItem.id);
                if (exactItem) {
                    addItemToCart(exactItem, store.id, store.name);
                } else {
                    addItemToCart(pendingItem, store.id, store.name);
                }
                setShowStockModal(false);
                setPendingItem(null);
                setAvailableAlternativeStores([]);
            })
            .catch(error => {
                console.error("Failed to fetch stock for alternative store", error);
                addItemToCart(pendingItem, store.id, store.name);
                setShowStockModal(false);
            });
        }
    };

    const addItemToCart = (item, sourceStoreId, sourceStoreName) => {
        setIsAddingItem(true);
        
        const priceCatName = priceCategories.find(pc => pc.pricename === data.pricecategory_id)?.pricedescription || 'Standard';

        const newItem = { 
            item_name: item.name, 
            item_id: item.id, 
            quantity: 1, 
            price: item.price,
            source_store_id: sourceStoreId,
            source_store_name: sourceStoreName,
            price_ref: priceCatName,
            stock_quantity: parseFloat(item.stock_quantity) || 0,
            product_id: item.product_id 
        };

        setOrderItems((prevItems) => [...prevItems, newItem]);

        setTimeout(() => {
            setItemSearchQuery('');
            setItemSearchResults([]);
            setShowItemDropdown(false);
            setIsAddingItem(false);
            if(itemSearchInputRef.current) itemSearchInputRef.current.focus();
        }, 150);
    };

    const handleOrderItemChange = (index, field, value) => {
        setOrderItems(currentItems => {
            const newItems = [...currentItems];
            const item = { ...newItems[index] }; 
            
            let parsedValue = parseFloat(value);
            if (isNaN(parsedValue) || parsedValue < 0) {
                parsedValue = field === 'quantity' ? 1 : 0;
            }

            if (field === 'quantity') {
                const allowNegative = facilityOptions?.allownegativestock;
                const isInventoryItem = item.product_id !== null && item.product_id !== undefined && item.product_id !== 0;
                const hasStockData = item.stock_quantity !== undefined && item.stock_quantity !== null;

                if (isInventoryItem && !allowNegative && hasStockData) {
                    const maxStock = parseFloat(item.stock_quantity);
                    if (parsedValue > maxStock) {
                        // UPDATED: Use Toast
                        toast.error(`Cannot exceed available stock (${maxStock}) for "${item.item_name}" from ${item.source_store_name || 'Store'}.`);
                        parsedValue = maxStock; 
                    }
                }
            }

            item[field] = parsedValue;
            newItems[index] = item;
            return newItems;
        });
    };

    const removeOrderItem = (index) => setModalState({ isOpen: true, message: 'Remove this item?', isAlert: false, itemToRemoveIndex: index });
    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) setOrderItems(orderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex));
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };
    
    // handleProceed Validation
    const handleProceed = (destination) => {
        if (!data.store_id || !data.pricecategory_id) { 
            toast.error('Store and Price Category are required.'); // UPDATED
            return; 
        }
        if (orderItems.length === 0) { 
            toast.error('Add at least one item.'); // UPDATED
            return; 
        }

        const payload = {
            ...data,
            orderitems: orderItems 
        };

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ orderItems, store_id: data.store_id, pricecategory_id: data.pricecategory_id }));

        if (destination === 'save') router.post(route('billing1.confirmSave'), payload);
        else if (destination === 'pay') router.post(route('billing1.confirmPayment'), payload);
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">New Order</h2>}>
            <Head title="Create Order" />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            
                            {/* Setup Section */}
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Store</label>
                                        <select value={data.store_id || ''} onChange={(e) => setData("store_id", e.target.value)}
                                            className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                                            <option value="" disabled>Select Store...</option>
                                            {fromstore.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Category</label>
                                        <select value={data.pricecategory_id || ''} onChange={(e) => { 
                                                setData("pricecategory_id", e.target.value); 
                                                setItemSearchQuery(''); 
                                            }}
                                            className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                                            <option value="" disabled>Select Price Category...</option>
                                            {priceCategories.map(pc => <option key={pc.pricename} value={pc.pricename}>{pc.pricedescription}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* Items Section */}
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Item</label>
                                    <div className="relative" ref={itemDropdownRef}>
                                        <input
                                            ref={itemSearchInputRef}
                                            type="text"
                                            placeholder="Search item..."
                                            value={itemSearchQuery}
                                            onChange={(e) => { setItemSearchQuery(e.target.value); setShowItemDropdown(true); }}
                                            disabled={!data.pricecategory_id || !data.store_id}
                                            className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:text-gray-200"
                                        />
                                        {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-3 text-gray-400" />}
                                        
                                        {showItemDropdown && (
                                            <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {itemSearchResults.length > 0 ? (
                                                    itemSearchResults.map((item) => (
                                                        <li key={item.id} onClick={() => checkStockAndAdd(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm flex justify-between">
                                                            <span>{item.name}</span>
                                                            <span className="text-gray-500 text-xs">
                                                                Qty: {item.stock_quantity || 0} | TZS {formatCurrency(item.price)}
                                                            </span>
                                                        </li>
                                                    ))
                                                ) : <li className="p-2 text-sm text-gray-500">No items found.</li>}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Items Table */}
                                {orderItems.length > 0 && (
                                    <div className="overflow-x-auto border rounded-md">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Details</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Subtotal</th>
                                                    <th className="px-4 py-2 w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {orderItems.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.item_name}</div>
                                                            {(showStoreBadge || showPriceBadge) && (
                                                                <div className="flex space-x-2 mt-1">
                                                                    {showStoreBadge && item.source_store_name && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                            <FontAwesomeIcon icon={faStore} className="mr-1" /> {item.source_store_name}
                                                                        </span>
                                                                    )}
                                                                    {showPriceBadge && item.price_ref && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                                            <FontAwesomeIcon icon={faTag} className="mr-1" /> {item.price_ref}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-1 py-1"><InputField type="number" value={item.quantity} onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)} className="text-right" /></td>
                                                        <td className="px-4 py-2 text-right text-sm">{formatCurrency(item.price)}</td>
                                                        <td className="px-4 py-2 text-right text-sm">{formatCurrency(item.quantity * item.price)}</td>
                                                        <td className="px-4 py-2 text-center text-red-500 cursor-pointer" onClick={() => removeOrderItem(index)}><FontAwesomeIcon icon={faTrash} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t flex justify-end">
                                    <div className="text-2xl font-bold">Total: TZS {formatCurrency(data.total)}</div>
                                </div>
                            </section>

                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button onClick={() => { sessionStorage.removeItem(STORAGE_KEY); router.visit(route('billing1.index')); }} className="px-4 py-2 bg-gray-200 rounded-md">Close</button>
                                <button onClick={() => handleProceed('save')} disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"><FontAwesomeIcon icon={faSave} className="mr-2" /> Save</button>
                                <button onClick={() => handleProceed('pay')} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center"><FontAwesomeIcon icon={faMoneyBill} className="mr-2" /> Pay</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ ...modalState, isOpen: false })} onConfirm={handleModalConfirm} title={modalState.isAlert ? "Alert" : "Confirm"} message={modalState.message} isAlert={modalState.isAlert} />
            
            <StockSelectionModal 
                isOpen={showStockModal} 
                onClose={() => { setShowStockModal(false); setPendingItem(null); setAvailableAlternativeStores([]); }} 
                onConfirm={handleAlternativeStoreSelect} 
                item={pendingItem} 
                stores={availableAlternativeStores} 
                isLoading={isCheckingStock}
            />
        </AuthenticatedLayout>
    );
}