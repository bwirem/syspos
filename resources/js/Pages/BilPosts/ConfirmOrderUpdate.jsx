// resources/js/Pages/Billing1/ConfirmOrderUpdate.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react'; // Added router
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
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

export default function ConfirmOrderUpdate({ auth, orderData, originalOrder }) {

    // --- NEW: DYNAMIC STORAGE KEY ---
    const STORAGE_KEY = `pendingOrderChanges_${orderData.id}`;

    const { data, setData, put, errors, processing } = useForm({
        ...orderData,
        customer_id: originalOrder.customer_id,
        stage: originalOrder.stage,
    });
    
    // --- Customer Logic ---
    const [customerSearchQuery, setCustomerSearchQuery] = useState(
        originalOrder.customer?.customer_type === 'company'
            ? originalOrder.customer?.company_name
            : `${originalOrder.customer?.first_name || ''} ${originalOrder.customer?.surname || ''}`.trim()
    );
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
    const customerDropdownRef = useRef(null);
    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ 
        customer_type: 'individual', first_name: '', other_names: '', surname: '', company_name: '', email: '', phone: '' 
    });
    const [newCustomerModalLoading, setNewCustomerModalLoading] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

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
        // Prevent search on initial load with the original customer name
        const originalCustomerName = originalOrder.customer?.customer_type === 'company' ? originalOrder.customer?.company_name : `${originalOrder.customer?.first_name || ''} ${originalOrder.customer?.surname || ''}`.trim();
        if (customerSearchQuery !== originalCustomerName) {
            if (customerSearchQuery.trim()) {
                debouncedCustomerSearch(customerSearchQuery);
            } else {
                setCustomerSearchResults([]);
            }
        }
    }, [customerSearchQuery, debouncedCustomerSearch, originalOrder]);
    
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
            selectCustomer(response.data);
            handleNewCustomerModalClose();
        } catch (error) {
            setAlertModal({ isOpen: true, message: error.response?.data?.message || 'Failed to create customer.' });
            setNewCustomerModalLoading(false);
        }
    };
    // --- End Customer Logic ---

    const submitUpdate = (e) => {
        e.preventDefault();
        if (!data.customer_id) {
            setAlertModal({ isOpen: true, message: 'A customer must be selected.' });
            return;
        }
        put(route('billing1.update', { order: orderData.id }), {
            onSuccess: () => {
                sessionStorage.removeItem(STORAGE_KEY); // <-- CLEAR STORAGE ON SUCCESS
                // alert('Order updated successfully!');
                // router.visit(route('billing1.index')); // Or back to edit page
            },
            onError: (formErrors) => {
                const errorMessages = Object.values(formErrors).join('\n');
                setAlertModal({ isOpen: true, message: `Update failed:\n${errorMessages}` });
            }
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Confirm Update for Order #{orderData.id}</h2>}>
            <Head title="Confirm Order Update" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        <form onSubmit={submitUpdate} className="space-y-6">                           

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Order Summary</h3>
                                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                     <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {data.orderitems.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{item.item_name}</td>
                                                    <td className="px-4 py-2 text-center text-sm">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right text-sm">{formatCurrency(item.price)}</td>
                                                    <td className="px-4 py-2 text-right text-sm">{formatCurrency(item.quantity * item.price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="text-right text-2xl font-bold mt-4 text-gray-900 dark:text-gray-100">Total: TZS {formatCurrency(data.total)}</div>
                            </section>

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Save Options</h3>
                                <label htmlFor="stage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Save As</label>
                                <select id="stage" value={data.stage} onChange={e => setData('stage', e.target.value)} className="w-full mt-1 border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600">
                                    <option value="3">Pending</option>
                                    <option value="4">Proforma</option>
                                </select>
                                {errors.stage && <p className="text-red-500 text-xs mt-1">{errors.stage}</p>}
                            </section>

                            <section className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Customer Details</h3>
                                <div className="flex items-center space-x-2">
                                     <div className="relative flex-grow" ref={customerDropdownRef}>
                                        <input
                                            type="text" placeholder="Search to change customer..."
                                            value={customerSearchQuery}
                                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                            onFocus={() => setShowCustomerDropdown(true)}
                                            className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                            autoComplete="off"
                                        />
                                        {isCustomerSearchLoading && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />}
                                        {showCustomerDropdown && (
                                            <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {customerSearchResults.length > 0 ? customerSearchResults.map(c => (
                                                    <li key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                                                        {c.customer_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.surname || ''}`.trim()}
                                                    </li>
                                                )) : <li className="p-2 text-sm text-gray-500">No customers found.</li>}
                                            </ul>
                                        )}
                                    </div>
                                    <button type="button" onClick={handleNewCustomerClick} className="bg-green-500 hover:bg-green-600 text-white p-2.5 rounded text-sm flex items-center space-x-2">
                                        <FontAwesomeIcon icon={faPlus} /> <span className="hidden sm:inline">New</span>
                                    </button>
                                </div>
                                {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
                            </section>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={route('billing1.edit', { order: orderData.id })} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded">Back to Edit</Link>
                                <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center">
                                    {processing ? <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> : <FontAwesomeIcon icon={faSave} className="mr-2" />}
                                    Confirm & Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <Modal isOpen={newCustomerModalOpen} onClose={handleNewCustomerModalClose} onConfirm={handleNewCustomerModalConfirm} title="Create New Customer" confirmButtonText={newCustomerModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : 'Confirm'} confirmButtonDisabled={newCustomerModalLoading}>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div><label htmlFor="customer_type" className="block text-sm font-medium">Customer Type</label><select id="customer_type" value={newCustomer.customer_type} onChange={(e) => setNewCustomer(prev => ({ ...prev, customer_type: e.target.value }))} className="w-full border p-2 rounded text-sm" disabled={newCustomerModalLoading}><option value="individual">Individual</option><option value="company">Company</option></select></div>
                    {newCustomer.customer_type === 'individual' && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label htmlFor="first_name" className="block text-sm font-medium">First Name</label><input type="text" id="first_name" value={newCustomer.first_name} onChange={(e) => setNewCustomer(prev => ({...prev, first_name: e.target.value}))} className="w-full border p-2 rounded text-sm" disabled={newCustomerModalLoading} /></div><div><label htmlFor="other_names" className="block text-sm font-medium">Other Names</label><input type="text" id="other_names" value={newCustomer.other_names} onChange={(e) => setNewCustomer(prev => ({...prev, other_names: e.target.value}))} className="w-full border p-2 rounded text-sm" disabled={newCustomerModalLoading} /></div><div><label htmlFor="surname" className="block text-sm font-medium">Surname</label><input type="text" id="surname" value={newCustomer.surname} onChange={(e) => setNewCustomer(prev => ({...prev, surname: e.target.value}))} className="w-full border p-2 rounded text-sm" disabled={newCustomerModalLoading} /></div></div>)}
                    {newCustomer.customer_type === 'company' && (<div><label htmlFor="company_name" className="block text-sm font-medium">Company Name</label><input type="text" id="company_name" value={newCustomer.company_name} onChange={(e) => setNewCustomer(prev => ({...prev, company_name: e.target.value}))} className="w-full border p-2 rounded text-sm" disabled={newCustomerModalLoading} /></div>)}
                    <div><label htmlFor="email" className="block text-sm font-medium">Email</label><input type="email" id="email" value={newCustomer.email} onChange={(e) => setNewCustomer(prev => ({...prev, email: e.target.value}))} className="w-full border p-2 rounded text-sm" disabled={newCustomerModalLoading} /></div>
                    <div><label htmlFor="phone" className="block text-sm font-medium">Phone</label><input type="text" id="phone" value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({...prev, phone: e.target.value}))} className="w-full border p-2 rounded text-sm" disabled={newCustomerModalLoading} /></div>
                </form>
            </Modal>

            <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal({isOpen: false, message: ''})} onConfirm={() => setAlertModal({isOpen: false, message: ''})} title="Alert" message={alertModal.message} isAlert confirmButtonText="OK" />
        </AuthenticatedLayout>
    );
}