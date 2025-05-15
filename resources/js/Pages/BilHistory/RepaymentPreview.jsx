import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react'; // Removed unused router
import { useEffect } from 'react'; // Removed useState if not strictly needed
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

// Modal and debounce are not used, can be removed if not planned
// import Modal from '../../Components/CustomModal.jsx';
// const debounce = (func, delay) => { ... };

export default function RepaymentPreview({ auth, repayment }) { // Added auth prop
    // useForm is used here mainly for consistency if other previews use it,
    // or if editing capabilities might be added later.
    // For pure display, direct prop access is simpler.
    // `put`, `errors`, `processing`, `reset` are not used, can be omitted from destructuring.
    const { data, setData } = useForm({
        // Customer details can be accessed directly from repayment.customer
        customer_id: repayment.customer_id,
        total: parseFloat(repayment.totalpaid) || 0, // The grand total paid in this repayment transaction
        // repaymentitems: repayment.items || [], // Not strictly needed in useForm for display
    });

    const repaymentItemsToDisplay = repayment.items || [];
    const customer = repayment.customer || {};
    const currencyCode = repayment.currency_code || 'TZS'; // Default to TZS

    // This useEffect updates data.total in useForm if repaymentItemsToDisplay changes.
    // For a preview, repayment.totalpaid is likely the definitive total for this transaction.
    useEffect(() => {
        const calculatedTotalPaidInItems = repaymentItemsToDisplay.reduce(
            (sum, item) => sum + (parseFloat(item.totalpaid) || 0), // Summing totalpaid for each item in this repayment
            0
        );
        // This will set data.total to the sum of totalpaid from items,
        // which should match repayment.totalpaid if data is consistent.
        setData('total', calculatedTotalPaidInItems);
    }, [repaymentItemsToDisplay, setData]);


    const formatCurrency = (amount) => {
        return parseFloat(amount).toLocaleString(undefined, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user} // Pass user prop
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Repayment Preview - Ref #{repayment.reference_number || 'N/A'}</h2>}
        >
            <Head title={`Preview Repayment - ${repayment.reference_number || 'Details'}`} />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    Customer Details
                                </h3>
                                {customer.id ? (
                                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                                        {customer.customer_type === 'individual' ? (
                                            <>
                                                <div className="sm:col-span-1">
                                                    <dt className="text-sm font-medium text-gray-500">First Name</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{customer.first_name || 'N/A'}</dd>
                                                </div>
                                                <div className="sm:col-span-1">
                                                    <dt className="text-sm font-medium text-gray-500">Other Names</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{customer.other_names || 'N/A'}</dd>
                                                </div>
                                                <div className="sm:col-span-1">
                                                    <dt className="text-sm font-medium text-gray-500">Surname</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{customer.surname || 'N/A'}</dd>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="sm:col-span-1">
                                                <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{customer.company_name || 'N/A'}</dd>
                                            </div>
                                        )}
                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{customer.email || 'N/A'}</dd>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{customer.phone || 'N/A'}</dd>
                                        </div>
                                    </dl>
                                ) : (
                                    <p className="text-sm text-gray-500">Customer details not available.</p>
                                )}
                            </div>

                            {repayment.payment_method_name && ( // Display payment method if available
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                        Payment Details
                                    </h3>
                                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{repayment.payment_method_name}</dd>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-gray-500">Date Paid</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {repayment.payment_date ? new Date(repayment.payment_date).toLocaleDateString() : 'N/A'}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    Repayment Allocation
                                </h3>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoice #</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Original Invoice Due</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amount Paid (This Repayment)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {repaymentItemsToDisplay.length > 0 ? repaymentItemsToDisplay.map((item, index) => (
                                                <tr key={item.id || index}> {/* Prefer item.id if available */}
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item.invoiceno || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                        {formatCurrency(item.totaldue)} {/* Original due of the invoice */}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                        {formatCurrency(item.totalpaid)} {/* Amount paid towards this invoice in this repayment */}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="3" className="px-4 py-10 text-center text-sm text-gray-500">
                                                        No invoice allocations for this repayment.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {repaymentItemsToDisplay.length > 0 && (
                                            <tfoot className="bg-gray-100">
                                                <tr className="font-semibold">
                                                    <td colSpan="2" className="px-4 py-3 text-right text-sm uppercase text-gray-700">
                                                        Total Amount Repaid
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm text-gray-800">
                                                        {/* data.total from useForm, which should be sum of item.totalpaid */}
                                                        {/* Or directly repayment.totalpaid if that's the grand total for this transaction */}
                                                        {formatCurrency(data.total)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {repayment.remarks && (
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                        Repayment Remarks
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{repayment.remarks}</p>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6 mt-6">
                                <Link
                                    href={route('billing4.repaymenthistory')} // Make sure this route is correct
                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2 h-4 w-4" />
                                    Close
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}