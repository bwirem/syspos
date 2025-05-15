import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

// Modal import is present but not used in the component. Remove if not planned.
// import Modal from '../../Components/CustomModal.jsx';

export default function SalePreview({ auth, sale }) {
    // Using useForm primarily to structure the data access.
    // For pure display, direct prop access (sale.customer.first_name) is also fine.
    const { data, setData } = useForm({
        // customer_type: sale.customer?.customer_type || 'N/A', // Can be derived directly
        // first_name: sale.customer?.first_name || '',        // Can be derived directly
        // ... other customer fields can be derived directly
        customer_id: sale.customer_id,
        total: parseFloat(sale.total) || 0,
        // saleitems: sale.items || [], // Not strictly needed in useForm for pure display
    });

    const saleItemsToDisplay = sale.items || [];
    const customer = sale.customer || {};
    const currencyCode = sale.currency_code || 'TZS'; // Default to TZS if not provided
                                                      // Or hardcode 'TZS' if it's always TZS

    // This useEffect is for if you want `data.total` in useForm to be updated
    // based on client-side calculation. For a preview, `sale.total` is usually sufficient.
    useEffect(() => {
        const calculatedTotal = saleItemsToDisplay.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal); // Updates the useForm's data.total
    }, [saleItemsToDisplay, setData]);

    const formatCurrency = (amount) => {
        return parseFloat(amount).toLocaleString(undefined, { // 'sw-TZ' for Swahili in Tanzania, or undefined for user's locale
            style: 'currency',
            currency: currencyCode, // Use TZS
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };
     const formatNumber = (amount, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
        return parseFloat(amount).toLocaleString(undefined, {
            minimumFractionDigits: minimumFractionDigits,
            maximumFractionDigits: maximumFractionDigits,
        });
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Sale Preview - Invoice #{sale.invoice_number || 'N/A'}</h2>}
        >
            <Head title={`Preview Sale - ${sale.invoice_number || 'Details'}`} />

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

                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    Sale Items
                                </h3>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Quantity</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {saleItemsToDisplay.length > 0 ? saleItemsToDisplay.map((item, index) => (
                                                <tr key={item.id || index}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item.item?.name || item.product_name || 'Unknown Item'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                        {formatNumber(item.quantity, 0, 2)} {/* Quantities often whole numbers */}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                        {formatCurrency(item.price)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                        {formatCurrency(item.quantity * item.price)}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-10 text-center text-sm text-gray-500">
                                                        No items in this sale.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {saleItemsToDisplay.length > 0 && (
                                            <tfoot className="bg-gray-100">
                                                <tr className="font-semibold">
                                                    <td colSpan="3" className="px-4 py-3 text-right text-sm uppercase text-gray-700">
                                                        Grand Total
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm text-gray-800">
                                                        {/* Use sale.total from prop for the definitive grand total */}
                                                        {formatCurrency(data.total)}
                                                    </td>
                                                </tr>
                                                {/* You can add rows for Discount, Tax, Paid Amount, Balance if available in `sale` prop */}
                                                {typeof sale.discount_amount !== 'undefined' && parseFloat(sale.discount_amount) > 0 && (
                                                    <tr >
                                                        <td colSpan="3" className="px-4 py-3 text-right text-sm text-gray-700">Discount</td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-800">({formatCurrency(sale.discount_amount)})</td>
                                                    </tr>
                                                )}
                                                {typeof sale.tax_amount !== 'undefined' && parseFloat(sale.tax_amount) > 0 && (
                                                     <tr >
                                                        <td colSpan="3" className="px-4 py-3 text-right text-sm text-gray-700">Tax</td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(sale.tax_amount)}</td>
                                                    </tr>
                                                )}
                                                {typeof sale.totaldue !== 'undefined' && ( // Assuming totaldue is grand total after discount/tax
                                                    <tr className="font-semibold border-t-2 border-gray-300">
                                                        <td colSpan="3" className="px-4 py-3 text-right text-sm uppercase text-gray-700">Net Amount Due</td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(sale.totaldue)}</td>
                                                    </tr>
                                                )}
                                                {typeof sale.totalpaid !== 'undefined' && (
                                                    <tr >
                                                        <td colSpan="3" className="px-4 py-3 text-right text-sm text-gray-700">Amount Paid</td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(sale.totalpaid)}</td>
                                                    </tr>
                                                )}
                                                {typeof sale.balance !== 'undefined' && (
                                                     <tr className="font-semibold">
                                                        <td colSpan="3" className="px-4 py-3 text-right text-sm uppercase text-gray-700">Balance Due</td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-800">{formatCurrency(sale.balance)}</td>
                                                    </tr>
                                                )}
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {sale.remarks && (
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                        Remarks
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{sale.remarks}</p>
                                </div>
                            )}


                            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6 mt-6">
                                <Link
                                    href={route('billing3.salehistory')}
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