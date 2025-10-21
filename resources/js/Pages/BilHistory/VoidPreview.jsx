
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faExclamationTriangle, faUndo, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

export default function VoidPreview({ auth, sale }) {
    // --- Direct Prop Access ---
    const saleItemsToDisplay = sale.items || [];
    const customer = sale.customer || {};
    const currencyCode = sale.currency_code || 'TZS';

    // --- Helper Functions ---
    const formatCurrency = (amount) => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return 'N/A';
        return parsedAmount.toLocaleString(undefined, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatNumber = (amount, minimumFractionDigits = 0, maximumFractionDigits = 2) => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) return 'N/A';
        return parsedAmount.toLocaleString(undefined, {
            minimumFractionDigits: minimumFractionDigits,
            maximumFractionDigits: maximumFractionDigits,
        });
    };

    // --- Derived Data for Display ---
    const voidDate = sale.created_at ? new Date(sale.created_at).toLocaleString() : 'N/A';
    const originalTotal = saleItemsToDisplay.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);
    
    // --- Refund Calculation Logic ---
    const totalPaid = parseFloat(sale.totalpaid) || 0;
    const refundedAmount = parseFloat(sale.refunded_amount) || 0;
    const amountToRefund = totalPaid - refundedAmount;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Voided Sale Preview - Ref #{sale.invoice_number || sale.receiptno || 'N/A'}</h2>}
        >
            <Head title={`Voided Sale - ${sale.invoice_number || 'Details'}`} />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="space-y-8">

                            {/* --- FIX: Use a ternary operator to prevent "0" from rendering --- */}
                            {sale.is_refunded ? (
                                <div className="rounded-md bg-green-50 p-4 border border-green-200">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 text-green-400" aria-hidden="true" />
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-green-800">Fully Refunded</h3>
                                            <div className="mt-2 text-sm text-green-700">
                                                <p>The total paid amount for this voided sale has been successfully refunded.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Void Information Section */}
                            <div className="rounded-md bg-red-50 p-4 border border-red-200">
                                <div className="flex">
                                    <div className="flex-shrink-0"><FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-red-400" aria-hidden="true" /></div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">This sale has been voided.</h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p><strong>Voided On:</strong> {voidDate}</p>
                                            {sale.reasons && (<p className="mt-1"><strong>Reason:</strong> {sale.reasons}</p>)}
                                            {sale.voided_by_user && (<p className="mt-1"><strong>Voided By:</strong> {sale.voided_by_user.name || 'N/A'}</p>)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- COMPLETE: Original Customer Details --- */}
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    Original Customer Details
                                </h3>
                                {customer.id ? (
                                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                                        {customer.customer_type === 'individual' ? (
                                            <>
                                                <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">First Name</dt><dd className="mt-1 text-sm text-gray-900">{customer.first_name || 'N/A'}</dd></div>
                                                <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Other Names</dt><dd className="mt-1 text-sm text-gray-900">{customer.other_names || 'N/A'}</dd></div>
                                                <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Surname</dt><dd className="mt-1 text-sm text-gray-900">{customer.surname || 'N/A'}</dd></div>
                                            </>
                                        ) : (
                                            <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Company Name</dt><dd className="mt-1 text-sm text-gray-900">{customer.company_name || 'N/A'}</dd></div>
                                        )}
                                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Email</dt><dd className="mt-1 text-sm text-gray-900">{customer.email || 'N/A'}</dd></div>
                                        <div className="sm:col-span-1"><dt className="text-sm font-medium text-gray-500">Phone</dt><dd className="mt-1 text-sm text-gray-900">{customer.phone || 'N/A'}</dd></div>
                                    </dl>
                                ) : (
                                    <p className="text-sm text-gray-500">Customer details not available.</p>
                                )}
                            </div>

                           {/* --- COMPLETE: Original Sale Items or Invoice Payment Details --- */}
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    {sale.items?.length > 0 ? 'Original Sale Items' : 'Invoice Payment Details'}
                                </h3>

                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            {sale.items?.length > 0 ? (
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Quantity</th>
                                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Subtotal</th>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoice No</th>
                                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total Due</th>
                                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total Paid</th>
                                                </tr>
                                            )}
                                        </thead>

                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {sale.items?.length > 0 ? (
                                                sale.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {item.item?.name || 'Unknown Item'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                            {formatNumber(item.quantity)}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                            {formatCurrency(item.price)}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-right text-gray-700">
                                                            {formatCurrency(item.quantity * item.price)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : sale.invoicepaymentdetails?.length > 0 ? (
                                                sale.invoicepaymentdetails.map((detail, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {detail.invoiceno || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                            {formatCurrency(detail.totaldue)}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 font-semibold">
                                                            {formatCurrency(detail.totalpaid)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-10 text-center text-sm text-gray-500">
                                                        No item or payment detail records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>

                                        {/* --- Totals --- */}
                                        {(sale.items?.length > 0 || sale.invoicepaymentdetails?.length > 0) && (
                                            <tfoot className="bg-gray-100">
                                                {sale.items?.length > 0 ? (
                                                    <>
                                                        <tr className="font-semibold">
                                                            <td colSpan="3" className="px-4 py-3 text-right text-sm uppercase text-gray-700">
                                                                Original Grand Total
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm text-gray-800">
                                                                {formatCurrency(originalTotal)}
                                                            </td>
                                                        </tr>
                                                        {typeof sale.totaldue !== 'undefined' && (
                                                            <tr className="font-semibold border-t-2 border-gray-300">
                                                                <td colSpan="3" className="px-4 py-3 text-right text-sm uppercase text-gray-700">
                                                                    Original Net Amount Due
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-sm text-gray-800">
                                                                    {formatCurrency(sale.totaldue)}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {totalPaid > 0 && (
                                                            <>
                                                                <tr className="font-bold text-green-700">
                                                                    <td colSpan="3" className="px-4 py-3 text-right text-sm uppercase">
                                                                        Amount Paid Before Void
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm">
                                                                        {formatCurrency(totalPaid)}
                                                                    </td>
                                                                </tr>
                                                                <tr className="font-bold text-red-700">
                                                                    <td colSpan="3" className="px-4 py-3 text-right text-sm uppercase">
                                                                        Amount Refunded
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm">
                                                                        ({formatCurrency(refundedAmount)})
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {totalPaid > 0 && (
                                                            <tr className="font-semibold">
                                                                <td className="px-4 py-3 text-right text-sm uppercase text-gray-700">
                                                                    Total Paid Before Void
                                                                </td>
                                                                <td colSpan="2" className="px-4 py-3 text-right text-sm text-gray-800">
                                                                    {formatCurrency(totalPaid)}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                )}
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>


                            {/* --- COMPLETE: Action Buttons --- */}
                            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6 mt-6">
                                <Link
                                    href={route('billing5.voidsalehistory')}
                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2 h-4 w-4" />
                                    Close
                                </Link>

                                {/* Smart Conditional Refund Button */}
                                {amountToRefund > 0 && (
                                    <Link
                                        href={route('billing5.refund.create', sale.id)}
                                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        <FontAwesomeIcon icon={faUndo} className="mr-2 h-4 w-4" />
                                        Process Refund
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
