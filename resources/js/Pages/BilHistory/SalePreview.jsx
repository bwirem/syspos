import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

import Modal from '../../Components/CustomModal.jsx';

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export default function SalePreview({ sale }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        customer_type: sale.customer.customer_type,
        first_name: sale.customer.first_name || '',
        other_names: sale.customer.other_names || '',
        surname: sale.customer.surname || '',
        company_name: sale.customer.company_name || '',
        email: sale.customer.email,
        phone: sale.customer.phone || '',
        customer_id: sale.customer_id,
        total: sale.total,
        saleitems: sale.items || [],
    });

    const [saleItems, setSaleItems] = useState(data.saleitems);

    useEffect(() => {
        setData('saleitems', saleItems);
        const calculatedTotal = saleItems.reduce(
            (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            0
        );
        setData('total', calculatedTotal);
    }, [saleItems, setData]);

    useEffect(() => {
        setSaleItems(data.saleitems);
    }, [data.saleitems]);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Preview Sale</h2>}
        >
            <Head title="Preview Sale" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form className="space-y-6">
                            {/* Customer Section */}
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <div className="relative flex-1">
                                    {data.customer_id && (
                                        <section className="border-b border-gray-200 pb-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {data.customer_type === 'individual' ? (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">First Name:</label>
                                                            <p className="mt-1 text-sm text-gray-500">{data.first_name || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Other Names:</label>
                                                            <p className="mt-1 text-sm text-gray-500">{data.other_names || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Surname:</label>
                                                            <p className="mt-1 text-sm text-gray-500">{data.surname || 'N/A'}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Company Name:</label>
                                                        <p className="mt-1 text-sm text-gray-500">{data.company_name || 'N/A'}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Email:</label>
                                                    <p className="mt-1 text-sm text-gray-500">{data.email || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Phone:</label>
                                                    <p className="mt-1 text-sm text-gray-500">{data.phone || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </div>

                            {/* Sale Items Table */}
                            <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {saleItems.map((item, index) => (
                                            <tr key={index} className="bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.item ? item.item.name : 'Unknown Item'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {parseFloat(item.quantity).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {parseFloat(item.price).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {parseFloat(item.quantity * item.price).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Total Row */}
                                        <tr className="bg-gray-100 font-bold">
                                            <td colSpan="3" className="px-6 py-4 text-right text-gray-700">
                                                Total
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-800">
                                                {parseFloat(data.total).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-4 mt-6">
                                <Link
                                    href={route('billing3.salehistory')}
                                    method="get"
                                    preserveState={true}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Close</span>
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
