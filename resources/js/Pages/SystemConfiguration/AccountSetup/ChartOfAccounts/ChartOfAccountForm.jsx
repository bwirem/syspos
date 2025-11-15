import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function ChartOfAccountForm({ account = null, accountTypeLabels }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        account_name: account?.account_name || '',
        account_code: account?.account_code || '',
        account_type: account?.account_type || '',
        description: account?.description || '',
        is_active: account ? Boolean(account.is_active) : true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (account) {
            put(route('systemconfiguration3.chartofaccounts.update', account.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration3.chartofaccounts.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="account_name" className="block text-sm font-medium text-gray-700">Account Name*</label>
                    <input
                        id="account_name"
                        type="text"
                        value={data.account_name}
                        onChange={e => setData('account_name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., Cash on Hand"
                    />
                    {errors.account_name && <p className="text-red-500 text-xs mt-1">{errors.account_name}</p>}
                </div>
                <div>
                    <label htmlFor="account_code" className="block text-sm font-medium text-gray-700">Account Code*</label>
                    <input
                        id="account_code"
                        type="text"
                        value={data.account_code}
                        onChange={e => setData('account_code', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., 1010"
                    />
                    {errors.account_code && <p className="text-red-500 text-xs mt-1">{errors.account_code}</p>}
                </div>
            </div>

            <div>
                <label htmlFor="account_type" className="block text-sm font-medium text-gray-700">Account Type*</label>
                <select
                    id="account_type"
                    value={data.account_type}
                    onChange={e => setData('account_type', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                    <option value="">Select an account type</option>
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                {errors.account_type && <p className="text-red-500 text-xs mt-1">{errors.account_type}</p>}
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                    id="description"
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    rows="3"
                    placeholder="Optional description of the account's purpose..."
                ></textarea>
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            <div className="flex items-center">
                <input
                    id="is_active"
                    type="checkbox"
                    checked={data.is_active}
                    onChange={e => setData('is_active', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Is Active
                </label>
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration3.chartofaccounts.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {account ? 'Update Account' : 'Save Account'}
                </button>
            </div>
        </form>
    );
}