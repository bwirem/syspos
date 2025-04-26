import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimesCircle, faMoneyBill } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';

import Modal from '../../Components/CustomModal.jsx'; 
import InputField from '../../Components/CustomInputField.jsx'; 

export default function PayBills({ debtor }) {
    const { data, setData, post, errors, processing, reset } = useForm({       
        customer_id: debtor.customer_id,        
        total: debtor.balance,
        stage: 3,
        debtorItems: debtor.customer.invoices || [], // Renamed to debtorItems
    });

    const [debtorItems, setDebtorItems] = useState(data.debtorItems); // Renamed to debtorItems
    const [selectedItems, setSelectedItems] = useState(new Array(data.debtorItems.length).fill(true)); // Default to all selected
    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
        itemToRemoveIndex: null,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [totalDue, setTotalDue] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paidAmount, setPaidAmount] = useState('');
    const [amountDisplay, setAmountDisplay] = useState('');
    const [paymentErrors, setPaymentErrors] = useState({});
    const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);

    const fetchPaymentMethods = useCallback(async () => {
        setPaymentMethodsLoading(true);
        try {
            const response = await axios.get(route('systemconfiguration0.paymenttypes.search'));
            if (response.data && response.data.paymenttype) {
                setPaymentMethods(response.data.paymenttype);
            } else {
                console.error('Error fetching payment methods: Invalid response format');
                showAlert('Failed to fetch payment methods. Please try again.');
            }
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            showAlert('Failed to fetch payment methods. Please try again.');
        } finally {
            setPaymentMethodsLoading(false);
        }
    }, []);

    useEffect(() => {
        setData('debtorItems', debtorItems); // Updated to debtorItems
        const calculatedTotal = debtorItems.reduce(
            (sum, item) => sum + (parseFloat(item.balancedue) || 0),
            0
        );
        setData('total', calculatedTotal);
        setTotalDue(calculatedTotal);
    }, [debtorItems, setData]);

    useEffect(() => {
        fetchPaymentMethods();
    }, [fetchPaymentMethods]);
    
    const handleModalConfirm = () => {
        if (modalState.itemToRemoveIndex !== null) {
            const updatedItems = debtorItems.filter((_, idx) => idx !== modalState.itemToRemoveIndex); // Updated to debtorItems
            setDebtorItems(updatedItems); // Updated to debtorItems
            setSelectedItems(prev => prev.filter((_, idx) => idx !== modalState.itemToRemoveIndex));
            updateTotals(updatedItems); // Updated to debtorItems
        }
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false, itemToRemoveIndex: null });
    };

    const showAlert = (message) => {
        setModalState({
            isOpen: true,
            message: message,
            isAlert: true,
            itemToRemoveIndex: null,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const hasEmptyFields = debtorItems.some( // Updated to debtorItems
            (item) => !item.invoiceno || !item.item_id || item.invoiceno <= 0 || item.balancedue < 0
        );

        if (hasEmptyFields) {
            showAlert('Please ensure all order items have valid item names, quantities, balancedues, and item IDs.');
            return;
        }

        setIsSaving(true);
        post(route('billing1.pay'), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (error) => {
                console.error(error);
                setIsSaving(false);
                showAlert('An error occurred while saving the order.');
            },
        });
    };

    const resetForm = () => {
        reset();
        setDebtorItems([]); // Updated to debtorItems
        setSelectedItems(new Array(debtorItems.length).fill(true)); // Reset to all selected
        showAlert('Order created successfully!');
    };

    const handlePayBillsClick = () => {
        setPaymentModalOpen(true);
    };

    const handlePaymentModalClose = () => {
        setPaymentModalOpen(false);
        setPaymentMethod('');
        setPaidAmount('');
        setAmountDisplay('');
        setPaymentErrors({});
    };

    const handlePaymentModalConfirm = async () => {
        const errors = {};  
        
        if (!paymentMethod) {
            errors.paymentMethod = 'Payment method is required';
        }
        if (!paidAmount) {
            errors.paidAmount = 'Paid amount is required';
        }
        
        setPaymentErrors(errors);
        
        if (Object.keys(errors).length === 0) {
            try {
                const payload = {
                    customer_id: data.customer_id,
                    total: data.total,
                    debtorItems: debtorItems.filter((_, index) => selectedItems[index]).map(item => ({ // Updated to debtorItems
                        invoiceno: item.invoiceno,
                        totaldue: item.totaldue,
                        balancedue: item.balancedue,
                    })),
                    payment_method: paymentMethod,
                    paid_amount: paidAmount,
                    total_paid: 0,
                };
                
                const selectedPaymentMethod = paymentMethods.find(method => method.name === paymentMethod);
                
                if (selectedPaymentMethod) {
                    payload.payment_method = selectedPaymentMethod.id;
                } else {
                    showAlert('Invalid Payment Method. Please try again.');
                    return;
                }
                
                setIsSaving(true);
                
                let response = await axios.post(route('billing2.pay'), payload);
                     
                if (response.data && response.data.success) {
                    setIsSaving(false);
                    setPaymentModalOpen(false);
                    setPaidAmount('');
                    setAmountDisplay('');
                    setPaymentErrors({});
                    Inertia.get(route('billing2.index'));
                } else {
                    setIsSaving(false);
                    showAlert('Payment processing failed. Please try again.');
                    console.error('Payment processing failed:', response.data.message || 'Unknown error');
                }
            } catch (error) {
                setIsSaving(false);
                console.error('Error during payment processing:', error);
                showAlert('An error occurred during payment processing.');
            }
        }
    };

    const handlePaidAmountChange = (e) => {
        const value = e.target.value;
        setPaidAmount(value);

        const dueAmount = parseFloat(totalDue) || 0;
        const paidValue = parseFloat(value) || 0;
        const diff = (paidValue).toFixed(2);

        setAmountDisplay(diff);
    };

    const handleCheckboxChange = (index) => {
        const updatedSelection = [...selectedItems];
        updatedSelection[index] = !updatedSelection[index];
        setSelectedItems(updatedSelection);
        updateTotals(debtorItems, updatedSelection); // Updated to debtorItems
    };

    const updateTotals = (items, selected = selectedItems) => {
        const newTotalDue = items.reduce((sum, item, index) => {
            return selected[index] ? sum + (parseFloat(item.balancedue) || 0) : sum;
        }, 0);
        setTotalDue(newTotalDue);
        setData('total', newTotalDue);
    };

    const handleSelectAllChange = (e) => {
        const isChecked = e.target.checked;
        const updatedSelection = new Array(debtorItems.length).fill(isChecked); // Updated to debtorItems
        setSelectedItems(updatedSelection);
        updateTotals(debtorItems, updatedSelection); // Updated to debtorItems
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Pay Bills</h2>}
        >
            <Head title="Pay Bills" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="flex-1">
                                    <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 text-left">
                                        Customer Name
                                    </label>                                        
                                    <div className="mt-1 text-left font-bold text-gray-800 bg-gray-100 p-2 rounded">
                                     
                                        {debtor.customer.customer_type === 'individual' ? (
                                                `${debtor.customer.first_name} ${debtor.customer.other_names ? debtor.customer.other_names + ' ' : ''}${debtor.customer.surname}`
                                            ) : (
                                                debtor.customer.company_name
                                            )}                               
                                    </div>
                                </div>                            
                                <div className="flex-1">
                                    <label htmlFor="total" className="block text-sm font-medium text-gray-700 text-left">
                                        Total (Auto-calculated)
                                    </label>
                                    <div className="mt-1 text-right font-bold text-gray-800 bg-gray-100 p-2 rounded">
                                        {parseFloat(data.total).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
                                </div>                                
                            </div>                       

                            <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <input
                                                    type="checkbox"
                                                    onChange={handleSelectAllChange}
                                                    checked={selectedItems.every(Boolean)}
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Due</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>                                           
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {debtorItems
                                            .filter(item => item.balancedue > 0) // Filter items with balancedue > 0
                                            .map((item, index) => (
                                                <tr key={index} className="bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems[index]}
                                                            onChange={() => handleCheckboxChange(index)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.invoiceno}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                        {parseFloat(item.totaldue).toLocaleString(undefined, {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                        {parseFloat(item.balancedue).toLocaleString(undefined, {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>

                                </table>
                            </div>

                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('billing2.index'))}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={processing || isSaving}
                                    className="bg-green-600 text-white rounded p-2 flex items-center space-x-2"
                                    onClick={handlePayBillsClick}
                                >
                                    <FontAwesomeIcon icon={faMoneyBill} />
                                    <span>Pay Bills</span>
                                </button>
                            </div>
                        </form>
                    </div>
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

            {/* Payment Modal */}
            <Modal
                isOpen={paymentModalOpen}
                onClose={handlePaymentModalClose}
                onConfirm={handlePaymentModalConfirm}
                title="Process Payment"
                confirmButtonText={'Confirm Payment'}
                confirmButtonDisabled={false}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <label htmlFor="total-due" className="block text-sm font-medium text-gray-700">
                            Total Due
                        </label>
                        <div className="mt-1 text-right font-bold text-gray-800 bg-gray-100 p-2 rounded">
                            {parseFloat(totalDue).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">
                            Payment Method
                        </label>
                        <select
                            id="payment-method"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentErrors.paymentMethod ? 'border-red-500' : ''}`}
                        >
                            <option value="" disabled>Select Payment Method</option>
                            {paymentMethodsLoading ? (
                                <option disabled>Loading Payment Methods...</option>
                            ) : (
                                paymentMethods.map((method) => (
                                    <option key={method.id} value={method.name}>{method.name}</option>
                                ))
                            )}
                        </select>
                        {paymentErrors.paymentMethod && <p className="text-sm text-red-600 mt-1">{paymentErrors.paymentMethod}</p>}
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="paid-amount" className="block text-sm font-medium text-gray-700">
                            Paid Amount
                        </label>
                        <input
                            type="number"
                            id="paid-amount"
                            value={paidAmount}
                            onChange={handlePaidAmountChange}
                            placeholder="Paid Amount"
                            className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${paymentErrors.paidAmount ? 'border-red-500' : ''}`}
                        />
                        {paymentErrors.paidAmount && <p className="text-sm text-red-600 mt-1">{paymentErrors.paidAmount}</p>}
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="amount-display" className="block text-sm font-medium text-gray-700">
                            Amount Display
                        </label>
                        <div className="mt-1 text-right font-bold text-gray-800 bg-gray-100 p-2 rounded">
                            {parseFloat(amountDisplay).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
