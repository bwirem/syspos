import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMoneyBill, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import axios from 'axios';
import Modal from '../../Components/CustomModal.jsx';

// Reusable helper functions
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

export default function ProcessPayment({ auth, orderData }) {
    const { data, setData, post, errors, processing, reset } = useForm({
        // Fields for the final submission
        customer_id: null,
        stage: '3', // Default save stage
        sale_type: 'cash',
        payment_method: auth?.user?.paymenttype_id || '',
        paid_amount: orderData.total || 0,
        // Data passed from the create page
        store_id: orderData.store_id || null,
        pricecategory_id: orderData.pricecategory_id || null,
        total: orderData.total || 0,
        orderitems: orderData.orderitems || [],
    });

    // --- Customer Logic ---
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
    const customerDropdownRef = useRef(null);

    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '',
    });
    const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);
    // --- End Customer Logic ---

    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

    // --- Customer Functions ---
    const fetchCustomers = useCallback((query) => {
        if (!query.trim()) {
            setCustomerSearchResults([]);
            return;
        }
        setIsCustomerSearchLoading(true);
        axios.get(route('systemconfiguration0.customers.search'), { params: { query } })
            .then((response) => setCustomerSearchResults(response.data.customers?.slice(0, 10) || []))
            .catch(() => setAlertModal({ isOpen: true, message: 'Failed to fetch customers.' }))
            .finally(() => setIsCustomerSearchLoading(false));
    }, []);

    const debouncedCustomerSearch = useMemo(() => debounce(fetchCustomers, 300), [fetchCustomers]);

    useEffect(() => {
        if (customerSearchQuery.trim()) {
            debouncedCustomerSearch(customerSearchQuery);
        } else {
            setCustomerSearchResults([]);
        }
    }, [customerSearchQuery, debouncedCustomerSearch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
                setShowCustomerDropdown(false);
            }
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
    // --- End Customer Functions ---

    useEffect(() => {
        setPaymentMethodsLoading(true);
        axios.get(route('systemconfiguration0.paymenttypes.search'))
            .then(response => {
                const fetchedMethods = response.data.paymenttype || [];
                setPaymentMethods(fetchedMethods);
                if (!data.payment_method && fetchedMethods.length > 0) {
                    setData('payment_method', fetchedMethods[0].id);
                }
            })
            .finally(() => setPaymentMethodsLoading(false));
    }, []);

    const submitPayment = (e) => {
        e.preventDefault();
        if (!data.customer_id) {
            setAlertModal({ isOpen: true, message: 'Please select a customer before proceeding.' });
            return;
        }
        post(route('billing1.pay'), {
            onSuccess: () => {
                alert('Payment processed successfully!');
                reset();
            },
             onError: (formErrors) => {
                const errorMessages = Object.values(formErrors).join('\n');
                setAlertModal({ isOpen: true, message: `Payment failed:\n${errorMessages || 'Please check your input.'}` });
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

                            {/* Order Summary Section */}
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
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{item.item_name}</td>
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
                            
                            {/* Payment Details Section */}
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Payment Details</h3>
                                {/* Use a container with vertical spacing for the rows */}
                                <div className="space-y-4">
                                    
                                    {/* --- Row 1: Sale Type (Full Width) --- */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Type</label>
                                        <select value={data.sale_type} onChange={e => setData('sale_type', e.target.value)} className="w-full mt-1 border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                                            <option value="cash">Cash Sale</option>
                                            <option value="credit">Credit Sale</option>
                                            <option value="partial">Partial Payment</option>
                                        </select>
                                        {errors.sale_type && <p className="text-red-500 text-xs mt-1">{errors.sale_type}</p>}
                                    </div>

                                    {/* --- Row 2: Payment Method and Paid Amount (Conditional Grid) --- */}
                                    {data.sale_type !== 'credit' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                                                <select value={data.payment_method} onChange={e => setData('payment_method', e.target.value)} className="w-full mt-1 border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={paymentMethodsLoading}>
                                                    <option value="" disabled>Select Method...</option>
                                                    {paymentMethodsLoading ? <option>Loading...</option> : paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                                                </select>
                                                {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid Amount</label>
                                                <input type="number" value={data.paid_amount} onChange={e => setData('paid_amount', e.target.value)} className="w-full mt-1 border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"/>
                                                {errors.paid_amount && <p className="text-red-500 text-xs mt-1">{errors.paid_amount}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                             {/* Customer Section */}
                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Customer Details</h3>
                                <label htmlFor="customer_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select or Create Customer</label>
                                <div className="flex items-center space-x-2">
                                    <div className="relative flex-grow" ref={customerDropdownRef}>
                                        <input
                                            id="customer_search" type="text" placeholder="Search customer..."
                                            value={customerSearchQuery}
                                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                            onFocus={() => setShowCustomerDropdown(true)}
                                            className={`w-full border p-2 rounded text-sm dark:bg-gray-700 dark:text-gray-200 ${errors.customer_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                            autoComplete="off"
                                        />
                                        {isCustomerSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />}
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

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={route('billing1.create')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Back</Link>
                                <button type="submit" disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center">
                                    <FontAwesomeIcon icon={processing ? faSpinner : faMoneyBill} spin={processing} className="mr-2" />
                                    Confirm Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* New Customer Modal */}
            <Modal isOpen={newCustomerModalOpen} onClose={handleNewCustomerModalClose} onConfirm={handleNewCustomerModalConfirm} title="Create New Customer" confirmButtonText={newCustomerModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : 'Confirm'} confirmButtonDisabled={newCustomerModalLoading}>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div><label htmlFor="customer_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Type</label><select id="customer_type" value={newCustomer.customer_type} onChange={(e) => setNewCustomer(prev => ({ ...prev, customer_type: e.target.value }))} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading}><option value="individual">Individual</option><option value="company">Company</option></select></div>
                    {newCustomer.customer_type === 'individual' && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label><input type="text" id="first_name" value={newCustomer.first_name} onChange={(e) => setNewCustomer(prev => ({...prev, first_name: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading} /></div><div><label htmlFor="other_names" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Other Names</label><input type="text" id="other_names" value={newCustomer.other_names} onChange={(e) => setNewCustomer(prev => ({...prev, other_names: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading} /></div><div><label htmlFor="surname" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Surname</label><input type="text" id="surname" value={newCustomer.surname} onChange={(e) => setNewCustomer(prev => ({...prev, surname: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading} /></div></div>)}
                    {newCustomer.customer_type === 'company' && (<div><label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label><input type="text" id="company_name" value={newCustomer.company_name} onChange={(e) => setNewCustomer(prev => ({...prev, company_name: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading} /></div>)}
                    <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><input type="email" id="email" value={newCustomer.email} onChange={(e) => setNewCustomer(prev => ({...prev, email: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading} /></div>
                    <div><label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label><input type="text" id="phone" value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({...prev, phone: e.target.value}))} className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" disabled={newCustomerModalLoading} /></div>
                </form>
            </Modal>

            {/* *****FIXED ALERT MODAL***** */}
            <Modal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ isOpen: false, message: '' })}
                onConfirm={() => setAlertModal({ isOpen: false, message: '' })} // Set onConfirm to close the modal
                title="Alert"
                message={alertModal.message}
                isAlert={true}
                confirmButtonText="OK" // Change button text to be more intuitive
            />
        </AuthenticatedLayout>
    );
}