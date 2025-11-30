import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faCheck, faSpinner, faStore, faTag, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx';
import InputField from '../../Components/CustomInputField.jsx';
import { toast } from 'react-toastify'; // Import Toast

// Utility function for debouncing
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

// Helper for currency formatting
const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const STORAGE_KEY = 'pendingBilOrderData';

// Stock Selection Modal Component
const StockSelectionModal = ({ isOpen, onClose, onConfirm, item, stores, isLoading }) => {
    const [selectedStore, setSelectedStore] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4"><FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500 mr-2" /> Insufficient Stock</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Item <strong>{item?.name}</strong> is out of stock in the default store.</p>
                 {isLoading ? (
                    <div className="text-center py-4 text-gray-500"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Checking other stores...</div>
                ) : stores.length > 0 ? (
                    <>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select source:</p>
                        <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="w-full border p-2 rounded-md mb-4 dark:bg-gray-700 dark:text-gray-200">
                            <option value="">-- Select Source Store --</option>
                            {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                        </select>
                        <div className="flex justify-end space-x-3">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">Cancel</button>
                            <button onClick={() => onConfirm(selectedStore)} disabled={!selectedStore} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50">Confirm</button>
                        </div>
                    </>
                ) : (
                    <>
                         <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4 text-sm">This item is out of stock in ALL stores.</div>
                        <div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">Close</button></div>
                    </>
                )}
            </div>
        </div>
    );
};

export default function Create({ fromstore, auth, priceCategories, facilityOptions }) {
    // Form state using Inertia's useForm hook
    const { data, setData, post, errors, processing, reset } = useForm({
        customer_name: '',
        customer_id: null,
        store_name: '',
        store_id: auth?.user?.store_id || null,
        pricecategory_name: '',
        pricecategory_id: auth?.user?.pricecategory_id || null,
        total: 0,
        stage: 1,
        orderitems: [],
    });

    const [orderItems, setOrderItems] = useState(data.orderitems);

    // Item Search State
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [isItemSearchLoading, setIsItemSearchLoading] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchInputRef = useRef(null);

    // Stock Checking State
    const [pendingItem, setPendingItem] = useState(null);
    const [showStockModal, setShowStockModal] = useState(false);
    const [availableAlternativeStores, setAvailableAlternativeStores] = useState([]);
    const [isCheckingStock, setIsCheckingStock] = useState(false);

    // Customer Search State
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
    const customerDropdownRef = useRef(null);
    const customerSearchInputRef = useRef(null);
    const [customerIDError, setCustomerIDError] = useState(null);

    // Modals
    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' });
    const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);
    const [newCustomerModalSuccess, setNewCustomerModalSuccess] = useState(false);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalLoading, setSaveModalLoading] = useState(false);
    const [saveModalSuccess, setSaveModalSuccess] = useState(false);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submitModalLoading, setSubmitModalLoading] = useState(false);
    const [submitModalSuccess, setSubmitModalSuccess] = useState(false);
    
    const [storeIDError, setStoreIDError] = useState(null);
    const [pricecategoryIDError, setPricecategoryIDError] = useState(null);

    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });

    // Fetch items dynamically
    const fetchItems = useCallback((query) => {
        if (!query.trim()) { setItemSearchResults([]); return; }
        setIsItemSearchLoading(true);
        // Pass store_id to get correct stock for default store
        axios.get(route('systemconfiguration0.items.search'), {
            params: { query: query.trim(), pricecategory_id: data.pricecategory_id, store_id: data.store_id }
        })
        .then((response) => setItemSearchResults(response.data.items?.slice(0, 10) || []))
        .catch(() => toast.error('Failed to fetch items.'))
        .finally(() => setIsItemSearchLoading(false));
    }, [data.pricecategory_id, data.store_id]);

    const fetchCustomers = useCallback((query) => {
        if (!query.trim()) { setCustomerSearchResults([]); return; }
        setIsCustomerSearchLoading(true);
        axios.get(route('systemconfiguration0.customers.search'), { params: { query } })
            .then((response) => setCustomerSearchResults(response.data.customers?.slice(0, 10) || []))
            .catch(() => toast.error('Failed to fetch customers.'))
            .finally(() => setIsCustomerSearchLoading(false));
    }, []);

    const debouncedItemSearch = useMemo(() => debounce(fetchItems, 300), [fetchItems]);
    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 300), [fetchCustomers]);

    useEffect(() => { if (itemSearchQuery.trim()) debouncedItemSearch(itemSearchQuery); else setItemSearchResults([]); }, [itemSearchQuery, debouncedItemSearch]);
    useEffect(() => { if (customerSearchQuery.trim()) debouncedCustomerSearch(customerSearchQuery); else setCustomerSearchResults([]); }, [customerSearchQuery, debouncedCustomerSearch]);

    // Update total & Sync Data
    useEffect(() => {
        setData('orderitems', orderItems);
        const calculatedTotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);
        setData('total', calculatedTotal);
    }, [orderItems, setData]);

    // --- Badge Logic ---
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
        const handleClickOutside = (event) => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) setShowItemDropdown(false);
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) setShowCustomerDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Stock Check Logic ---
    const checkStockAndAdd = (selectedItem) => {
        const price = parseFloat(selectedItem.price) || 0;
        if (price <= 0) {
            toast.error(`Cannot add "${selectedItem.name}". The price is zero.`);
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
                    const filteredStores = fromstore.filter(s => s.id != data.store_id && availableStoreIds.includes(s.id));
                    setAvailableAlternativeStores(filteredStores);
                })
                .catch(error => { console.error(error); toast.error("Failed to check stock."); setShowStockModal(false); })
                .finally(() => setIsCheckingStock(false));
            return;
        }
        addItemToCart(selectedItem, data.store_id, defaultStore?.name);
    };

    const handleAlternativeStoreSelect = (storeId) => {
        const store = fromstore.find(s => s.id == storeId);
        if (store && pendingItem) {
            // Fetch exact item details for the new store to get correct stock
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
                    addItemToCart(pendingItem, store.id, store.name); // Fallback
                }
                setShowStockModal(false);
                setPendingItem(null);
                setAvailableAlternativeStores([]);
            })
            .catch(error => {
                console.error("Failed to fetch stock", error);
                addItemToCart(pendingItem, store.id, store.name);
                setShowStockModal(false);
            });
        }
    };

    const addItemToCart = (item, sourceStoreId, sourceStoreName) => {
        const priceCatName = priceCategories.find(pc => pc.pricename === data.pricecategory_id)?.pricedescription || 'Standard';
        
        const newItem = {
            item_name: item.name,
            item_id: item.id,
            quantity: 1,
            price: item.price,
            // Track source and stock
            source_store_id: sourceStoreId,
            source_store_name: sourceStoreName,
            price_ref: priceCatName,
            stock_quantity: parseFloat(item.stock_quantity) || 0,
            product_id: item.product_id
        };
        setOrderItems(prev => [...prev, newItem]);
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemDropdown(false);
    };

    // --- Updated Quantity Handler ---
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

    const removeOrderItem = (index) => setModalState({ isOpen: true, message: 'Are you sure you want to remove this item?', isAlert: false, itemToRemoveIndex: index });
    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) setOrderItems(orderItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex));
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };
    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });

    const isValidInteger = (value) => value !== null && value !== '' && !isNaN(value) && Number.isInteger(Number(value));

    const handleItemSearchChange = (e) => {
        const query = e.target.value;
        setItemSearchQuery(query);
        setShowItemDropdown(!!query.trim());
    };    
  
    const handleCustomerSearchChange = (e) => {
        const query = e.target.value;
        setCustomerSearchQuery(query);
        setCustomerSearchResults([]);
        setShowCustomerDropdown(!!query.trim());
        setData(prev => ({ ...prev, first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '', customer_id: null }));
    };

    const handleClearCustomerSearch = () => {
        setCustomerSearchQuery(''); setCustomerSearchResults([]); setShowCustomerDropdown(false);
        if (customerSearchInputRef.current) customerSearchInputRef.current.focus();
        setData(prev => ({ ...prev, first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '', customer_id: null }));
    };

    const selectCustomer = (selectedCustomer) => {
        setData(prev => ({
            ...prev,
            customer_type: selectedCustomer.customer_type,
            first_name: selectedCustomer.first_name || '',
            other_names: selectedCustomer.other_names || '',
            surname: selectedCustomer.surname || '',
            company_name: selectedCustomer.company_name || '',
            email: selectedCustomer.email,
            phone: selectedCustomer.phone || '',
            customer_id: selectedCustomer.id,
        }));
        setCustomerSearchQuery(''); setCustomerSearchResults([]); setShowCustomerDropdown(false);
    };

    const handleNewCustomerClick = () => { setNewCustomerModalOpen(true); setNewCustomerModalSuccess(false); setNewCustomer({ customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' }); };
    const handleNewCustomerModalClose = () => { setNewCustomerModalOpen(false); setNewCustomerModalLoading(false); setNewCustomerModalSuccess(false); };

    const handleNewCustomerModalConfirm = async () => {
        setNewCustomerModalLoading(true);
        try {
            const response = await axios.post(route('systemconfiguration0.customers.directstore'), newCustomer);
            if (response.data && response.data.id) {
                setData(prev => ({
                    ...prev,
                    customer_type: response.data.customer_type,
                    first_name: response.data.first_name,
                    other_names: response.data.other_names,
                    surname: response.data.surname,
                    company_name: response.data.company_name,
                    email: response.data.email,
                    phone: response.data.phone,
                    customer_id: response.data.id,
                }));
                setNewCustomerModalSuccess(true);
            } else { toast.error('Error creating new customer!'); }
        } catch (error) { console.error(error); toast.error('Failed to create new customer.'); } 
        finally {
            setNewCustomerModalLoading(false);
            setTimeout(() => { setNewCustomerModalOpen(false); setNewCustomerModalSuccess(false); }, 1000)
        }
    };

    const handleNewCustomerInputChange = (e) => { setNewCustomer(prev => ({ ...prev, [e.target.id]: e.target.value })); };

    const handleSaveClick = () => {       
        if (!isValidInteger(data.customer_id)) { setCustomerIDError('Customer ID must be a valid integer.'); return; } else { setCustomerIDError(null); }
        if (!isValidInteger(data.store_id)) { setStoreIDError('Store ID must be a valid integer.'); return; } else { setStoreIDError(null); }
        if (!Array.isArray(data.orderitems) || data.orderitems.length === 0) { toast.error('Please add at least one item before saving.'); return; }
        
        const hasEmptyFields = data.orderitems.some(item => !item.item_name || !item.item_id || item.quantity <= 0 || item.price < 0);
        if (hasEmptyFields) { toast.error('Ensure all items have valid details.'); return; }
    
        setSaveModalOpen(true); setSaveModalLoading(false); setSaveModalSuccess(false);
    };
    
    const handleSaveModalClose = () => { setSaveModalOpen(false); setSaveModalLoading(false); setSaveModalSuccess(false); };

    const handleSaveModalConfirm = () => {        
        const formData = new FormData();      
        setSaveModalLoading(true);
        post(route('billing0.store'), formData, {
            forceFormData: true,
            onSuccess: () => { setSaveModalLoading(false); reset(); setSaveModalSuccess(true); handleSaveModalClose(); toast.success('Order Saved Successfully'); },
            onError: (errors) => { setSaveModalLoading(false); console.error(errors); toast.error('Error saving order.'); },
        });
    };

    const handleSubmitClick = () => {
        if (!isValidInteger(data.customer_id)) { setCustomerIDError('Customer ID must be a valid integer.'); return; } else { setCustomerIDError(null); }
        if (!isValidInteger(data.store_id)) { setStoreIDError('Store ID must be a valid integer.'); return; } else { setStoreIDError(null); }
        if (data.orderitems.length === 0) { toast.error('Add items before submitting.'); return; }
        const hasEmptyFields = orderItems.some(item => !item.item_name || !item.item_id || item.quantity <= 0 || item.price < 0);
        if (hasEmptyFields) { toast.error('Ensure all items have valid details.'); return; }

        setData('stage', 3);
        setSubmitModalOpen(true); setSubmitModalLoading(false); setSubmitModalSuccess(false);
    };

    const handleSubmitModalClose = () => { setData('stage', 1); setSubmitModalOpen(false); setSubmitModalLoading(false); setSubmitModalSuccess(false); };

    const handleSubmitModalConfirm = () => {        
        const formData = new FormData();      
        setSubmitModalLoading(true);
        post(route('billing0.store'), formData, {
            onSuccess: () => { setSubmitModalLoading(false); reset(); setSubmitModalSuccess(true); handleSubmitModalClose(); toast.success('Order Submitted Successfully'); },
            onError: (errors) => { setSubmitModalLoading(false); console.error(errors); toast.error('Error submitting order.'); },
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Order</h2>}>
            <Head title="Create Order" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            {/* Section 1: Customer & Order Details */}
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Customer & Order Setup</h3>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select or Create Customer</label>
                                    <div className="flex items-center space-x-2">
                                        <div className="relative flex-grow" ref={customerDropdownRef}>   
                                            <input type="text" placeholder="Search customer..." value={customerSearchQuery} onChange={handleCustomerSearchChange} onFocus={() => setShowCustomerDropdown(!!customerSearchQuery.trim())} className={`w-full border p-2 rounded text-sm pr-10 ${customerIDError ? 'border-red-500' : ''}`} ref={customerSearchInputRef} autoComplete="off" />
                                            {customerSearchQuery && <button type="button" onClick={handleClearCustomerSearch} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"><FontAwesomeIcon icon={faTimesCircle} /></button>}
                                            {isCustomerSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />}
                                            {showCustomerDropdown && (
                                                <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {customerSearchResults.length > 0 ? customerSearchResults.map((c) => (
                                                        <li key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-700 dark:text-gray-200">{c.customer_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.surname || ''}`} ({c.phone || c.email || 'No Contact'})</li>
                                                    )) : !isCustomerSearchLoading && <li className="p-2 text-gray-500 dark:text-gray-400 text-sm">No customers found. Type to search.</li>}
                                                </ul>
                                            )}
                                        </div>
                                        <button type="button" onClick={handleNewCustomerClick} className="bg-green-500 text-white rounded p-2 flex items-center space-x-2"><FontAwesomeIcon icon={faPlus} /></button>
                                    </div>
                                    {(errors.customer_id || customerIDError) && <p className="text-xs text-red-500 mt-1">{errors.customer_id || customerIDError}</p>}
                                    {data.customer_id && (
                                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-sm">
                                            Selected: <strong className="text-gray-700 dark:text-gray-100">{data.customer_type === 'individual' ? `${data.first_name} ${data.other_names ? data.other_names + ' ' : ''}${data.surname}` : data.company_name}</strong>
                                        </div>
                                    )}   
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                                        <select id="store_id" value={data.store_id || ''} onChange={(e) => { setData("store_id", e.target.value); setStoreIDError(null); }} className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.store_id || storeIDError ? 'border-red-500' : 'border-gray-300'}`}>
                                            <option value="" disabled>Select Store...</option>
                                            {fromstore.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        {(errors.store_id || storeIDError) && <p className="text-xs text-red-500 mt-1">{errors.store_id || storeIDError}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="pricecategory_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Category</label>
                                        <select id="pricecategory_id" value={data.pricecategory_id || ''} onChange={(e) => { setData("pricecategory_id", e.target.value); setPricecategoryIDError(null); setItemSearchQuery(''); setItemSearchResults([]); }} className={`w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.pricecategory_id || pricecategoryIDError ? 'border-red-500' : 'border-gray-300'}`}>
                                            <option value="" disabled>Select Price Category...</option>
                                            {priceCategories.map(pc => <option key={pc.pricename} value={pc.pricename}>{pc.pricedescription}</option>)}
                                        </select>
                                        {(errors.pricecategory_id || pricecategoryIDError) && <p className="text-xs text-red-500 mt-1">{errors.pricecategory_id || pricecategoryIDError}</p>}
                                    </div>
                                </div>
                            </section>
                    
                            {/* Section 2: Order Items */}
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Items</h3>
                                 <div className="mb-4">
                                    <label htmlFor="item_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Item to Order</label>
                                    <div className="relative flex-grow" ref={itemDropdownRef}>
                                        <input id="item_search" type="text" placeholder="Search item by name or code..." value={itemSearchQuery} onChange={handleItemSearchChange} onFocus={() => setShowItemDropdown(!!itemSearchQuery.trim() && !!data.pricecategory_id)} className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 border-gray-300" ref={itemSearchInputRef} disabled={!data.pricecategory_id} />
                                        {isItemSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />}
                                        {showItemDropdown && (
                                            <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {itemSearchResults.length > 0 ? (
                                                    itemSearchResults.map((item) => (
                                                        <li key={item.id} onClick={() => checkStockAndAdd(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm flex justify-between dark:text-gray-200">
                                                            <span>{item.name}</span>
                                                            <span className="text-gray-500 text-xs">Qty: {item.stock_quantity || 0} | TZS {formatCurrency(item.price)}</span>
                                                        </li>
                                                    ))
                                                ) : !isItemSearchLoading && <li className="p-2 text-gray-500 dark:text-gray-400 text-sm">No items found.</li>}
                                            </ul>
                                        )}
                                    </div>
                                    {!data.pricecategory_id && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Select a Price Category to enable item search.</p>}
                                </div>                          

                                {/* Items Table */}
                                {orderItems.length > 0 && (
                                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Item</th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">Qty</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32">Price</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32">Subtotal</th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {orderItems.map((item, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                                                                <div className="font-medium">{item.item_name}</div>
                                                                {(showStoreBadge || showPriceBadge) && (
                                                                    <div className="flex space-x-2 mt-1">
                                                                        {showStoreBadge && item.source_store_name && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"><FontAwesomeIcon icon={faStore} className="mr-1" /> {item.source_store_name}</span>}
                                                                        {showPriceBadge && item.price_ref && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"><FontAwesomeIcon icon={faTag} className="mr-1" /> {item.price_ref}</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-1 py-1">
                                                                <InputField id={`qty_${index}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)} className="w-full text-right text-sm" error={errors[`orderitems.${index}.quantity`]} />
                                                            </td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.price)}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">{formatCurrency(item.quantity * item.price)}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <button type="button" onClick={() => removeOrderItem(index)} className="text-red-500 hover:text-red-700"><FontAwesomeIcon icon={faTrash} /></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                )}
                                {errors.orderitems && typeof errors.orderitems === 'string' && <p className="text-xs text-red-500 mt-1">{errors.orderitems}</p>}

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                    <div className="w-full md:w-1/3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Total</label>
                                        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-right">
                                            TZS {formatCurrency(data.total)}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={route('billing0.index')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm flex items-center">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> Close
                                </Link>
                                <button type="button" onClick={handleSaveClick} disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center">
                                    <FontAwesomeIcon icon={processing ? faSpinner : faSave} spin={processing} className="mr-2" /> Save
                                </button>
                                <button type="button" onClick={handleSubmitClick} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center">
                                    <FontAwesomeIcon icon={processing ? faSpinner : faCheck} spin={processing} className="mr-2" /> Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={newCustomerModalOpen} onClose={handleNewCustomerModalClose} onConfirm={handleNewCustomerModalConfirm} title="Create New Customer" confirmButtonText={newCustomerModalLoading ? 'Loading...' : (newCustomerModalSuccess ? "Success" : 'Confirm')} confirmButtonDisabled={newCustomerModalLoading || newCustomerModalSuccess}>
                {/* Customer Form (Same as before) */}
                <form className="space-y-4">
                    <div><label htmlFor="customer_type" className="block text-sm font-medium">Customer Type</label><select id="customer_type" value={newCustomer.customer_type} onChange={handleNewCustomerInputChange} className="w-full border p-2 rounded text-sm"><option value="individual">Individual</option><option value="company">Company</option></select></div>
                    {/* ... other inputs ... */}
                </form>
            </Modal>

            <Modal isOpen={saveModalOpen} onClose={handleSaveModalClose} onConfirm={handleSaveModalConfirm} title="Save Confirmation" confirmButtonText={saveModalLoading ? 'Loading...' : (saveModalSuccess ? "Success" : 'Save')} confirmButtonDisabled={saveModalLoading || saveModalSuccess}>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select how you want to save this order:</p>
                <select id="stage" value={data.stage} onChange={(e) => setData('stage', e.target.value)} className="w-full border p-2 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 border-gray-300">
                    <option value="1">Save as Draft</option>
                    <option value="2">Save as Quotation</option>
                </select>
            </Modal>

            <Modal isOpen={submitModalOpen} onClose={handleSubmitModalClose} onConfirm={handleSubmitModalConfirm} title="Submit Confirmation" confirmButtonText={submitModalLoading ? 'Loading...' : (submitModalSuccess ? "Success" : 'Submit')} confirmButtonDisabled={submitModalLoading || submitModalSuccess}>
                <p className="text-sm text-gray-600 dark:text-gray-300">Are you sure you want to submit this order? This will finalize the order.</p>  
            </Modal>

            <Modal isOpen={modalState.isOpen} onClose={handleModalClose} onConfirm={handleModalConfirm} title={modalState.isAlert ? "Alert" : "Confirm Action"} message={modalState.message} isAlert={modalState.isAlert} />
            <StockSelectionModal isOpen={showStockModal} onClose={() => { setShowStockModal(false); setPendingItem(null); setAvailableAlternativeStores([]); }} onConfirm={handleAlternativeStoreSelect} item={pendingItem} stores={availableAlternativeStores} isLoading={isCheckingStock} />
        </AuthenticatedLayout>
    );
}