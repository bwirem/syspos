import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function ChartOfAccountMappingForm({ mapping = null, chartofaccounts }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        account_payable_id: mapping?.account_payable_id || '',
        account_receivable_id: mapping?.account_receivable_id || '',
        customer_deposit_code: mapping?.customer_deposit_code || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mapping) {
            // Use PUT for updating the existing record
            put(route('systemconfiguration3.chartofaccountmappings.update', mapping.id), {
                preserveScroll: true,
            });
        } else {
            // Use POST for creating a new record
            post(route('systemconfiguration3.chartofaccountmappings.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="account_payable_id" className="block text-sm font-medium text-gray-700">Accounts Payable Account*</label>
                <select
                    id="account_payable_id"
                    value={data.account_payable_id}
                    onChange={e => setData('account_payable_id', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                    <option value="">Select an account</option>
                    {chartofaccounts.map(account => (
                        <option key={account.id} value={account.id}>
                            {account.account_name} ({account.account_code})
                        </option>
                    ))}
                </select>
                {errors.account_payable_id && <p className="text-red-500 text-xs mt-1">{errors.account_payable_id}</p>}
            </div>

            <div>
                <label htmlFor="account_receivable_id" className="block text-sm font-medium text-gray-700">Accounts Receivable Account*</label>
                <select
                    id="account_receivable_id"
                    value={data.account_receivable_id}
                    onChange={e => setData('account_receivable_id', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                    <option value="">Select an account</option>
                    {chartofaccounts.map(account => (
                        <option key={account.id} value={account.id}>
                            {account.account_name} ({account.account_code})
                        </option>
                    ))}
                </select>
                {errors.account_receivable_id && <p className="text-red-500 text-xs mt-1">{errors.account_receivable_id}</p>}
            </div>
            
            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration3.chartofaccountmappings.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {mapping ? 'Update Mappings' : 'Save Mappings'}
                </button>
            </div>
        </form>
    );
}