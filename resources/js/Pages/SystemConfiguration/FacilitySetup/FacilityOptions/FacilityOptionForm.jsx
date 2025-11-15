import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

const CheckboxInput = ({ id, label, checked, onChange }) => (
    <div className="flex items-center">
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">
            {label}
        </label>
    </div>
);

export default function FacilityOptionForm({ option = null, chartOfAccounts, customers }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: option?.name || '',
        chart_of_account_id: option?.chart_of_account_id || '',
        default_customer_id: option?.default_customer_id || '',
        affectstockatcashier: option ? Boolean(option.affectstockatcashier) : false,
        doubleentryissuing: option ? Boolean(option.doubleentryissuing) : false,
        allownegativestock: option ? Boolean(option.allownegativestock) : false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (option) {
            put(route('systemconfiguration5.facilityoptions.update', option.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration5.facilityoptions.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Facility Name*</label>
                <input
                    id="name"
                    type="text"
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    placeholder="e.g., Main Pharmacy, Lab Services"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="chart_of_account_id" className="block text-sm font-medium text-gray-700">Revenue Account*</label>
                    <select
                        id="chart_of_account_id"
                        value={data.chart_of_account_id}
                        onChange={e => setData('chart_of_account_id', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        <option value="">Select an account</option>
                        {chartOfAccounts.map(account => (
                            <option key={account.id} value={account.id}>
                                {account.account_name} ({account.account_code})
                            </option>
                        ))}
                    </select>
                    {errors.chart_of_account_id && <p className="text-red-500 text-xs mt-1">{errors.chart_of_account_id}</p>}
                </div>
                <div>
                    <label htmlFor="default_customer_id" className="block text-sm font-medium text-gray-700">Default Customer*</label>
                    <select
                        id="default_customer_id"
                        value={data.default_customer_id}
                        onChange={e => setData('default_customer_id', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        <option value="">Select a customer</option>
                        {customers.map(customer => (
                            <option key={customer.id} value={customer.id}>
                                {customer.display_name}
                            </option>
                        ))}
                    </select>
                    {errors.default_customer_id && <p className="text-red-500 text-xs mt-1">{errors.default_customer_id}</p>}
                </div>
            </div>

            <div className="p-4 border rounded-md">
                <h3 className="text-base font-medium text-gray-800 mb-4">Stock Options</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <CheckboxInput id="affectstockatcashier" label="Affect Stock at Cashier" checked={data.affectstockatcashier} onChange={e => setData('affectstockatcashier', e.target.checked)} />
                    <CheckboxInput id="doubleentryissuing" label="Double Entry Issuing" checked={data.doubleentryissuing} onChange={e => setData('doubleentryissuing', e.target.checked)} />
                    <CheckboxInput id="allownegativestock" label="Allow Negative Stock" checked={data.allownegativestock} onChange={e => setData('allownegativestock', e.target.checked)} />
                </div>
                 {/* Display errors for checkboxes if they exist */}
                {errors.affectstockatcashier && <p className="text-red-500 text-xs mt-2">{errors.affectstockatcashier}</p>}
                {errors.doubleentryissuing && <p className="text-red-500 text-xs mt-2">{errors.doubleentryissuing}</p>}
                {errors.allownegativestock && <p className="text-red-500 text-xs mt-2">{errors.allownegativestock}</p>}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration5.facilityoptions.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {option ? 'Update Option' : 'Save Option'}
                </button>
            </div>
        </form>
    );
}