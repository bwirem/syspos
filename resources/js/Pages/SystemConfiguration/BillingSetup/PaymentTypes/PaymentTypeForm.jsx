import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function PaymentTypeForm({ paymenttype = null, chartofaccounts }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: paymenttype?.name || '',
        chart_of_account_id: paymenttype?.chart_of_account_id || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (paymenttype) {
            put(route('systemconfiguration0.paymenttypes.update', paymenttype.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration0.paymenttypes.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Payment Type Name*</label>
                <input
                    id="name"
                    type="text"
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    placeholder="e.g., Cash, Bank Transfer"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
                <label htmlFor="chart_of_account_id" className="block text-sm font-medium text-gray-700">Linked Account*</label>
                <select
                    id="chart_of_account_id"
                    value={data.chart_of_account_id}
                    onChange={e => setData('chart_of_account_id', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                    <option value="">Select an account</option>
                    {chartofaccounts.map(account => (
                        <option key={account.id} value={account.id}>
                            {account.account_name} ({account.account_code})
                        </option>
                    ))}
                </select>
                {errors.chart_of_account_id && <p className="text-red-500 text-xs mt-1">{errors.chart_of_account_id}</p>}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration0.paymenttypes.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {paymenttype ? 'Update Payment Type' : 'Save Payment Type'}
                </button>
            </div>
        </form>
    );
}