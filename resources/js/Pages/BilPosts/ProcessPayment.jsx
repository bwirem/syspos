import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMoneyBill, faTimesCircle, faSpinner, faStore, faTag, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios'; 
import Modal from '../../Components/CustomModal.jsx';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2'; // Add this at the top

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

export default function ProcessPayment({ auth, orderData, facilityoption, paymentMethods }) {
    const { data, setData, errors, setError, clearErrors, reset } = useForm({
        customer_id: orderData.customer_id || null, 
        stage: '3',
        sale_type: 'cash',
        payment_method: auth?.user?.paymenttype_id || '',
        paid_amount: orderData.total || 0,
        store_id: orderData.store_id || null,
        pricecategory_id: orderData.pricecategory_id || null,
        total: orderData.total || 0,
        orderitems: orderData.orderitems || [],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isProcessingRef = useRef(false);
    const [amountDisplay, setAmountDisplay] = useState(formatCurrency(orderData.total || 0));
    
    const [showCustomerSelection, setShowCustomerSelection] = useState(false);

    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
    const customerDropdownRef = useRef(null);

    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '', });
    const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);   
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paymentConfirmationModal, setPaymentConfirmationModal] = useState({ isOpen: false });
    
    // Badges Logic
    const showStoreBadge = useMemo(() => {
        if (!data.orderitems || data.orderitems.length === 0) return false;
        const uniqueStores = new Set(data.orderitems.map(item => item.source_store_name).filter(Boolean));
        return uniqueStores.size > 1; 
    }, [data.orderitems]);

    const showPriceBadge = useMemo(() => {
        if (!data.orderitems || data.orderitems.length === 0) return false;
        const uniquePrices = new Set(data.orderitems.map(item => item.price_ref).filter(Boolean));
        return uniquePrices.size > 1; 
    }, [data.orderitems]);

    // --- 1. UPDATED: Logic for Hiding/Showing Customer Section ---
    useEffect(() => {
        if (data.sale_type === 'cash') {
            // Check if we are currently using the default customer or no customer
            const isDefaultOrEmpty = !data.customer_id || (facilityoption?.default_customer_id && data.customer_id === facilityoption.default_customer_id);

            if (isDefaultOrEmpty) {
                // If it was default, keep it default and hide section
                if (facilityoption?.default_customer_id) {
                    setData('customer_id', facilityoption.default_customer_id);
                }
                setShowCustomerSelection(false); 
                setCustomerSearchQuery('');
            } else {
                // If a CUSTOM customer was selected, keep the section open and keep the ID
                setShowCustomerSelection(true);
            }
        } else {
            // For Credit or Partial, always show section
            setShowCustomerSelection(true);
            
            // If the current ID is the default "Cash Customer", clear it to force specific selection
            if (facilityoption?.default_customer_id && data.customer_id === facilityoption.default_customer_id) {
                setData('customer_id', null); 
                setCustomerSearchQuery('');
            }
        }
    }, [data.sale_type, facilityoption]);

    // --- 2. UPDATED: Logic for Paid Amount Resetting ---
    useEffect(() => {
        if (data.sale_type === 'credit') {
            // Credit: Always 0
            setData('paid_amount', 0);
            setAmountDisplay(formatCurrency(0));
        } else if (data.sale_type === 'cash') {
            // Cash: Always full total
            setData('paid_amount', data.total);
            setAmountDisplay(formatCurrency(data.total));
        } 
        // Partial: Do NOTHING. Keep whatever value is currently in paid_amount.
        // This prevents the rollback when switching from Cash (with edited amount) -> Partial.
    }, [data.sale_type, data.total]);

    const handleCustomerToggle = (e) => {
        const isChecked = e.target.checked;
        setShowCustomerSelection(isChecked);

        if (!isChecked && data.sale_type === 'cash' && facilityoption?.default_customer_id) {
            setData('customer_id', facilityoption.default_customer_id);
            setCustomerSearchQuery('');
        } else if (isChecked) {
            // If opening the box, clear ID if it was default to prompt search
            if (data.customer_id === facilityoption?.default_customer_id) {
                setData('customer_id', null);
                setCustomerSearchQuery('');
            }
        }
    };

    const handlePaidAmountChange = (e) => {
        const value = e.target.value;
        setData('paid_amount', value);
        setAmountDisplay(formatCurrency(value));
    };

    const fetchCustomers = useCallback((query) => {
        if (!query.trim()) { setCustomerSearchResults([]); return; }
        setIsCustomerSearchLoading(true);
        axios.get(route('systemconfiguration0.customers.search'), { params: { query } })
            .then((response) => setCustomerSearchResults(response.data.customers?.slice(0, 10) || []))
            .catch(() => setAlertModal({ isOpen: true, message: 'Failed to fetch customers.' }))
            .finally(() => setIsCustomerSearchLoading(false));
    }, []);

    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 300), [fetchCustomers]);

    useEffect(() => {
        if (customerSearchQuery.trim()) { debouncedCustomerSearch(customerSearchQuery); }
        else { setCustomerSearchResults([]); }
    }, [customerSearchQuery, debouncedCustomerSearch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) { setShowCustomerDropdown(false); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectCustomer = (customer) => {
        setData('customer_id', customer.id);
        const customerName = customer.customer_type === 'company' ? customer.company_name : `${customer.first_name || ''} ${customer.surname || ''}`.trim();
        setCustomerSearchQuery(customerName);
        setShowCustomerDropdown(false);
    };

    const handleNewCustomerClick = () => {
        setNewCustomerModalOpen(true);
        setNewCustomer({ customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' });
    };

    const handleNewCustomerModalClose = () => {
        setNewCustomerModalOpen(false);
        setNewCustomerModalLoading(false);
    };

    const handleNewCustomerModalConfirm = async () => {
        setNewCustomerModalLoading(true);
        try {
            const response = await axios.post(route('systemconfiguration0.customers.directstore'), newCustomer);
            if (response.data && response.data.id) {
                selectCustomer(response.data);
                setTimeout(() => handleNewCustomerModalClose(), 500);
            } else {
                setAlertModal({ isOpen: true, message: response.data?.message || 'Error creating new customer!' });
            }
        } catch (error) {
            setAlertModal({ isOpen: true, message: error.response?.data?.message || 'Failed to create new customer.' });
        } finally {
            setNewCustomerModalLoading(false);
        }
    };

    const proceedWithSubmission = () => {
        if (isProcessingRef.current) return; 

        isProcessingRef.current = true; 
        setIsSubmitting(true);          
        clearErrors();

        const toastId = toast.loading("Processing payment... Please wait.");

        axios.post(route('billing1.pay'), data)
            .then((response) => {
               
                toast.dismiss(toastId);
                toast.success("Payment Successful!");
                sessionStorage.removeItem(STORAGE_KEY);

                if (response.data.success) {                    
                                     
                    const { invoice_url, auto_print, backend_printed } = response.data;

                    // Scenario 1: Server handled it (SumatraPDF)
                    if (backend_printed) {
                        console.log("Printed via Server/SumatraPDF");
                        // Just show the alert, no window opening needed
                    } 
                    // Scenario 2: Cloud/Browser needs to print
                    else if (invoice_url) {
                        if (auto_print) {
                            // Scenario 2a: Silent/Auto Print Configured (Iframe)
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.src = invoice_url;
                            document.body.appendChild(iframe);

                            iframe.onload = function() {
                                try {
                                    iframe.contentWindow.focus();
                                    iframe.contentWindow.print();
                                } catch (e) {
                                    console.error(e);
                                }
                                // Cleanup
                                setTimeout(() => document.body.removeChild(iframe), 60000);
                            };
                        } else {
                            // Scenario 2b: Preview Configured (New Tab)
                            window.open(invoice_url, '_blank');
                        }
                    }                  
                    
                }
                
                setShowSuccessModal(true);
                reset();
                setTimeout(() => {
                    router.visit(route('billing1.index'));
                }, 1500);

                
            })
            .catch((error) => {
                isProcessingRef.current = false;
                setIsSubmitting(false);
                toast.dismiss(toastId);

                if (error.response && error.response.status === 422) {
                    const serverErrors = error.response.data.errors;
                    
                    if (serverErrors.orderitems) {
                        toast.error(serverErrors.orderitems[0]); 
                    } else {
                        toast.error('Please check the input fields for errors.');
                    }

                    Object.keys(serverErrors).forEach((key) => {
                        setError(key, serverErrors[key][0]);
                    });
                } else {
                    toast.error(error.response?.data?.message || 'An unexpected error occurred.');
                }
            });
    };

    const handlePaymentConfirmation = () => {
        setPaymentConfirmationModal({ isOpen: false });
        // NOTE: The useEffect logic ensures paid_amount is NOT reset when type becomes 'partial'
        setData(data => ({
            ...data,
            sale_type: 'partial',
            // Do NOT clear customer_id here automatically if it was default,
            // let useEffect handle logic, but usually partial implies a specific customer is needed.
            // We force clear it if it was default to ensure they pick someone.
            customer_id: (facilityoption?.default_customer_id && data.customer_id === facilityoption.default_customer_id) ? null : data.customer_id
        }));
        
        toast.info('Switched to Partial Payment. Please select the customer who owes the balance.');
    };

    const submitPayment = (e) => {
        e.preventDefault();
        
        if (!data.customer_id) { 
            toast.error('Please select a customer before proceeding.');
            setShowCustomerSelection(true); 
            return; 
        }

        if (data.sale_type === 'cash' && parseFloat(data.paid_amount) < data.total) { 
            setPaymentConfirmationModal({ isOpen: true }); 
            return; 
        }

        // 2. SweetAlert2 Popup (Replaces your <Modal>)
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to process this payment?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#16a34a', // Matches Tailwind green-600
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, process it!',
            cancelButtonText: 'No, cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                proceedWithSubmission();
            }
        });
        
    };
   

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Process Order Payment</h2>}>
            <Head title="Process Payment" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        <form onSubmit={submitPayment} className="space-y-6">                            
                            
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Summary</h3>
                                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md mb-4">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Qty</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">Price</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {data.orderitems.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                                                        <div className="font-medium">{item.item_name}</div>
                                                        {(showStoreBadge || showPriceBadge) && (
                                                            <div className="flex space-x-2 mt-1">
                                                                {showStoreBadge && item.source_store_name && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                        <FontAwesomeIcon icon={faStore} className="mr-1" /> {item.source_store_name}
                                                                    </span>
                                                                )}
                                                                {showPriceBadge && item.price_ref && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                                        <FontAwesomeIcon icon={faTag} className="mr-1" /> {item.price_ref}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-700 dark:text-gray-200">{item.quantity}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-200">{formatCurrency(item.price)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-200">{formatCurrency(item.quantity * item.price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end">
                                    <div className="w-full md:w-1/2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Due</label>
                                        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md text-right">
                                            TZS {formatCurrency(data.total)}
                                        </div>
                                    </div>
                                </div>
                            </section>
                            
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Payment Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Type</label>
                                        <select value={data.sale_type} onChange={e => setData('sale_type', e.target.value)} className="w-full mt-1 border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                                            <option value="cash">Cash Sale</option>
                                            <option value="credit">Credit Sale</option>
                                            <option value="partial">Partial Payment</option>
                                        </select>
                                        {errors.sale_type && <p className="text-red-500 text-xs mt-1">{errors.sale_type}</p>}
                                    </div>
                                    {data.sale_type !== 'credit' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                                                <select value={data.payment_method} onChange={e => setData('payment_method', e.target.value)} className="w-full mt-1 border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                                                    <option value="" disabled>Select Method...</option>
                                                    {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                                                </select>
                                                {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid Amount</label>
                                                <input type="number" value={data.paid_amount} onChange={handlePaidAmountChange} className="w-full mt-1 border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"/>
                                                {errors.paid_amount && <p className="text-red-500 text-xs mt-1">{errors.paid_amount}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (Display)</label>
                                                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700/50 rounded text-right font-bold">TZS {amountDisplay}</div>
                                                {parseFloat(data.paid_amount) > 0 && data.total > 0 && (
                                                    <>
                                                        {data.sale_type === 'partial' && parseFloat(data.paid_amount) < data.total && (
                                                            <div className="mt-1 text-xs text-right text-orange-500 dark:text-orange-400">Balance Due: TZS {formatCurrency(data.total - parseFloat(data.paid_amount))}</div>
                                                        )}
                                                        {parseFloat(data.paid_amount) > data.total && (
                                                            <div className="mt-1 text-xs text-right text-green-600 dark:text-green-400">Change: TZS {formatCurrency(parseFloat(data.paid_amount) - data.total)}</div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {data.sale_type === 'cash' && (
                                <div className="flex items-center space-x-2 px-4">
                                    <input 
                                        type="checkbox" 
                                        id="toggleCustomer" 
                                        checked={showCustomerSelection} 
                                        onChange={handleCustomerToggle}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    />
                                    <label htmlFor="toggleCustomer" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                        Add/Change Customer Details (Default: Walk-in)
                                    </label>
                                </div>
                            )}

                            {showCustomerSelection && (
                                <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg animate-fade-in-down">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Customer Details</h3>
                                    <div className="flex items-center space-x-2">
                                        <div className="relative flex-grow" ref={customerDropdownRef}>
                                            <input
                                                id="customer_search" type="text" placeholder="Search customer..."
                                                value={customerSearchQuery}
                                                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                                onFocus={() => setShowCustomerDropdown(true)}
                                                className={`w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${errors.customer_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                autoComplete="off"
                                            />
                                            {isCustomerSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />}
                                            {showCustomerDropdown && (
                                                <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {customerSearchResults.length > 0 ? customerSearchResults.map((c) => (
                                                        <li key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                                                            {c.customer_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.surname || ''}`.trim()} ({c.phone || c.email || 'No Contact'})
                                                        </li>
                                                    )) : !isCustomerSearchLoading && <li className="p-2 text-gray-500 dark:text-gray-400 text-sm">No customers found.</li>}
                                                </ul>
                                            )}
                                        </div>
                                        <button type="button" onClick={handleNewCustomerClick} className="bg-green-500 hover:bg-green-600 text-white rounded p-2.5 flex items-center space-x-2 text-sm">
                                            <FontAwesomeIcon icon={faPlus} /> <span className="hidden sm:inline">New</span>
                                        </button>
                                    </div>
                                    {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
                                </section>
                            )}

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={route('billing1.create')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Back</Link>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                                >
                                    <FontAwesomeIcon icon={isSubmitting ? faSpinner : faMoneyBill} spin={isSubmitting} className="mr-2" />
                                    {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <Modal isOpen={newCustomerModalOpen} onClose={handleNewCustomerModalClose} onConfirm={handleNewCustomerModalConfirm} title="Create New Customer" confirmButtonText={newCustomerModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : 'Confirm'} confirmButtonDisabled={newCustomerModalLoading}>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div><label htmlFor="customer_type" className="block text-sm font-medium dark:text-gray-300">Customer Type</label><select value={newCustomer.customer_type} onChange={(e) => setNewCustomer(prev => ({ ...prev, customer_type: e.target.value }))} className="w-full border p-2 rounded text-sm dark:bg-gray-700" disabled={newCustomerModalLoading}><option value="individual">Individual</option><option value="company">Company</option></select></div>
                    {newCustomer.customer_type === 'individual' && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-sm font-medium dark:text-gray-300">First Name</label><input type="text" value={newCustomer.first_name} onChange={(e) => setNewCustomer(prev => ({...prev, first_name: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700" disabled={newCustomerModalLoading} /></div><div><label className="block text-sm font-medium dark:text-gray-300">Other Names</label><input type="text" value={newCustomer.other_names} onChange={(e) => setNewCustomer(prev => ({...prev, other_names: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700" disabled={newCustomerModalLoading} /></div><div><label className="block text-sm font-medium dark:text-gray-300">Surname</label><input type="text" value={newCustomer.surname} onChange={(e) => setNewCustomer(prev => ({...prev, surname: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700" disabled={newCustomerModalLoading} /></div></div>)}
                    {newCustomer.customer_type === 'company' && (<div><label className="block text-sm font-medium dark:text-gray-300">Company Name</label><input type="text" value={newCustomer.company_name} onChange={(e) => setNewCustomer(prev => ({...prev, company_name: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700" disabled={newCustomerModalLoading} /></div>)}
                    <div><label className="block text-sm font-medium dark:text-gray-300">Email</label><input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer(prev => ({...prev, email: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700" disabled={newCustomerModalLoading} /></div>
                    <div><label className="block text-sm font-medium dark:text-gray-300">Phone</label><input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({...prev, phone: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700" disabled={newCustomerModalLoading} /></div>
                </form>
            </Modal>
            <Modal isOpen={showSuccessModal} title="Success" isAlert={true} hideCloseButton={true}>
                <div className="text-center"><p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Payment processed successfully! Redirecting...</p><FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500" /></div>
            </Modal>
            <Modal isOpen={paymentConfirmationModal.isOpen} onClose={() => setPaymentConfirmationModal({ isOpen: false })} onConfirm={handlePaymentConfirmation} title="Confirm Payment Type" confirmButtonText="Proceed as Partial">
                <p className="text-sm text-gray-600 dark:text-gray-300">The amount paid is less than the total due.<br /><br />Do you want to proceed by changing the Sale Type to 'Partial Payment'?</p>
            </Modal>
            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal({ isOpen: false, message: '' })} onConfirm={() => setAlertModal({ isOpen: false, message: '' })} title="Alert" message={alertModal.message} isAlert={true} confirmButtonText="OK" />
           
        </AuthenticatedLayout>
    );
}