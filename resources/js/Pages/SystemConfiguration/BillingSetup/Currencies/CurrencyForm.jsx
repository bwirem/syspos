import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function CurrencyForm({ currency = null }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        // This logic correctly populates the form for editing
        // or leaves it empty for creating.
        name: currency?.name || '',
        currencysymbol: currency?.currencysymbol || '',
        exchangerate: currency?.exchangerate || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currency) {
            put(route('systemconfiguration0.currencies.update', currency.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration0.currencies.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Currency Name*</label>
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={e => setData('name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., US Dollar"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="currencysymbol" className="block text-sm font-medium text-gray-700">Symbol*</label>
                    <input
                        id="currencysymbol"
                        type="text"
                        value={data.currencysymbol}
                        onChange={e => setData('currencysymbol', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., $"
                    />
                    {errors.currencysymbol && <p className="text-red-500 text-xs mt-1">{errors.currencysymbol}</p>}
                </div>
            </div>

            <div>
                <label htmlFor="exchangerate" className="block text-sm font-medium text-gray-700">Exchange Rate*</label>
                <input
                    id="exchangerate"
                    type="number"
                    step="any"
                    value={data.exchangerate}
                    onChange={e => setData('exchangerate', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    placeholder="e.g., 1.00"
                />
                {errors.exchangerate && <p className="text-red-500 text-xs mt-1">{errors.exchangerate}</p>}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration0.currencies.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {currency ? 'Update Currency' : 'Save Currency'}
                </button>
            </div>
        </form>
    );
}