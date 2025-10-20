import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link,useForm, router } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBill, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '@/Components/CustomModal.jsx';

export default function PayBills({ auth, debtor, payment_types }) {
    // The controller now guarantees that only payable, non-voided invoices are received.
    const initialDebtorInvoices = debtor?.customer?.invoices || [];

    const {
        data: formData,
        setData: setFormData,
        post: processPayment,
        errors: formErrors,
        processing,
        clearErrors,
    } = useForm({
        customer_id: debtor?.customer_id || null,
        total: 0,
        debtorItems: [],
        payment_method: '',
        paid_amount: '',
        total_paid: '', // This should mirror paid_amount for the backend
    });

    const [selectedInvoicesMask, setSelectedInvoicesMask] = useState(
        new Array(initialDebtorInvoices.length).fill(true)
    );
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

    // Effect to recalculate total and update form data when invoice selection changes
    useEffect(() => {
        const currentlySelectedInvoices = initialDebtorInvoices.filter(
            (_, index) => selectedInvoicesMask[index]
        );
        const calculatedTotalDue = currentlySelectedInvoices.reduce(
            (sum, item) => sum + (parseFloat(item.balancedue) || 0),
            0
        );

        setFormData(prevData => ({
            ...prevData,
            total: calculatedTotalDue.toFixed(2),
            debtorItems: currentlySelectedInvoices.map(inv => ({
                invoiceno: inv.invoiceno,
                totaldue: parseFloat(inv.totaldue).toFixed(2),
                balancedue: parseFloat(inv.balancedue).toFixed(2),
            })),
            customer_id: prevData.customer_id || debtor?.customer_id || null,
        }));
    }, [selectedInvoicesMask, initialDebtorInvoices, setFormData, debtor?.customer_id]);


    const showAlert = (message) => setAlertModal({ isOpen: true, message });
    const closeAlertModal = () => setAlertModal({ isOpen: false, message: '' });

    const handlePayBillsClick = () => {
        if (formData.debtorItems.length === 0 || parseFloat(formData.total) <= 0) {
            showAlert("No items selected or total due is zero. Please select invoices to pay.");
            return;
        }
        clearErrors();
        setFormData(prevData => ({
            ...prevData,
            paid_amount: prevData.total,
            total_paid: prevData.total,
            payment_method: payment_types.length > 0 ? payment_types[0].id.toString() : '',
        }));
        setPaymentModalOpen(true);
    };

    const handlePaymentModalClose = () => setPaymentModalOpen(false);

    const handlePaymentModalConfirm = () => {
        // Basic client-side checks; the backend will perform the definitive validation
        if (!formData.payment_method) {
            setFormData('errors', { ...formErrors, payment_method: 'Payment method is required.' });
            return;
        }
        if (!formData.paid_amount || parseFloat(formData.paid_amount) <= 0) {
            setFormData('errors', { ...formErrors, paid_amount: 'Paid amount must be greater than zero.' });
            return;
        }

        processPayment(route('billing2.pay'), {
            preserveScroll: true,
            onSuccess: (page) => {
                setPaymentModalOpen(false);
                const successMessage = page.props.flash?.success || 'Payment processed successfully!';
                showAlert(successMessage);
                // After showing success, redirect back to the main debtors list
                setTimeout(() => router.get(route('billing2.index'), {}, { replace: true }), 1500);
            },
            onError: (pageErrors) => {
                console.error('Payment processing failed:', pageErrors);
                // formErrors are automatically populated by Inertia's useForm hook
            },
        });
    };

    const handlePaidAmountChange = (e) => {
        const value = e.target.value;
        setFormData(prevData => ({ ...prevData, paid_amount: value, total_paid: value }));
    };

    const handleCheckboxChange = (index) => {
        const updatedSelection = [...selectedInvoicesMask];
        updatedSelection[index] = !updatedSelection[index];
        setSelectedInvoicesMask(updatedSelection);
    };

    const handleSelectAllChange = (e) => {
        setSelectedInvoicesMask(new Array(initialDebtorInvoices.length).fill(e.target.checked));
    };

    const customerDisplayName = debtor?.customer?.customer_type === 'individual'
        ? `${debtor.customer.first_name || ''} ${debtor.customer.surname || ''}`.trim()
        : debtor?.customer?.company_name || 'N/A';

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Pay Bills for {customerDisplayName}</h2>}
        >
            <Head title={`Pay Bills - ${customerDisplayName}`} />
            <div className="py-12">
                <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="space-y-6">
                            <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Debtor Information</h3>
                                <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                    <div>
                                        <p className="block text-sm font-medium text-gray-700">Customer Name</p>
                                        <p className="mt-1 text-sm text-gray-900 font-semibold">{customerDisplayName}</p>
                                    </div>
                                    <div>
                                        <p className="block text-sm font-medium text-gray-700">Total Due (Selected Invoices)</p>
                                        <p className="mt-1 text-lg font-semibold text-indigo-600">
                                            {parseFloat(formData.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-lg font-medium leading-6 text-gray-900">Select Invoices to Pay</h3>
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="w-12 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    onChange={handleSelectAllChange}
                                                    checked={initialDebtorInvoices.length > 0 && selectedInvoicesMask.every(Boolean)}
                                                    disabled={initialDebtorInvoices.length === 0}
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoice No</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Original Due</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Balance Due</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {initialDebtorInvoices.length > 0 ? initialDebtorInvoices.map((item, index) => (
                                            <tr key={item.id} className={`${selectedInvoicesMask[index] ? 'bg-indigo-50' : ''}`}>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={selectedInvoicesMask[index]}
                                                        onChange={() => handleCheckboxChange(index)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.invoiceno}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">{parseFloat(item.totaldue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-right text-gray-700">{parseFloat(item.balancedue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" className="px-4 py-10 text-center text-sm text-gray-500">No outstanding invoices found for this debtor.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6">
                                <Link href={route('billing2.index')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                    Cancel
                                </Link>
                                <button
                                    type="button"
                                    disabled={processing || formData.debtorItems.length === 0 || parseFloat(formData.total) <= 0}
                                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                                    onClick={handlePayBillsClick}
                                >
                                    <FontAwesomeIcon icon={faMoneyBill} className="mr-2" />
                                    Pay Selected Bills
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={alertModal.isOpen} onClose={closeAlertModal} title="Alert" isAlert={true}>
                <p>{alertModal.message}</p>
            </Modal>

            <Modal
                isOpen={paymentModalOpen}
                onClose={handlePaymentModalClose}
                onConfirm={handlePaymentModalConfirm}
                title="Process Payment"
                confirmButtonText={processing ? 'Processing...' : 'Confirm Payment'}
                isProcessing={processing}
            >
                <div className="space-y-4 p-1">
                    <div>
                        <label htmlFor="payment_total_due" className="block text-sm font-medium text-gray-700">Total Amount to Pay</label>
                        <p id="payment_total_due" className="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">{parseFloat(formData.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <label htmlFor="payment_method_select" className="block text-sm font-medium text-gray-700">Payment Method <span className="text-red-500">*</span></label>
                        <select
                            id="payment_method_select"
                            value={formData.payment_method}
                            onChange={(e) => setFormData('payment_method', e.target.value)}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.payment_method ? 'border-red-500' : ''}`}
                            disabled={processing}
                        >
                            <option value="" disabled>Select Payment Method</option>
                            {payment_types.map((method) => (
                                <option key={method.id} value={method.id}>{method.name}</option>
                            ))}
                        </select>
                        {formErrors.payment_method && <p className="mt-1 text-sm text-red-600">{formErrors.payment_method}</p>}
                    </div>
                    <div>
                        <label htmlFor="paid_amount_input" className="block text-sm font-medium text-gray-700">Amount Paid <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            id="paid_amount_input"
                            value={formData.paid_amount}
                            onChange={handlePaidAmountChange}
                            placeholder="Enter amount paid"
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.paid_amount ? 'border-red-500' : ''}`}
                            disabled={processing}
                            step="0.01"
                        />
                        {formErrors.paid_amount && <p className="mt-1 text-sm text-red-600">{formErrors.paid_amount}</p>}
                        {parseFloat(formData.paid_amount) > parseFloat(formData.total) && <p className="mt-1 text-sm text-yellow-600">Amount paid is greater than total due.</p>}
                        {parseFloat(formData.paid_amount) < parseFloat(formData.total) && parseFloat(formData.paid_amount) > 0 && <p className="mt-1 text-sm text-yellow-600">Partial payment. Balance will remain.</p>}
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}