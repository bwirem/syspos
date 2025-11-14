import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function AdjustmentReasonForm({ reason = null }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: reason?.name || '',
        action: reason?.action || '', // 'Add' or 'Deduct'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (reason) {
            put(route('systemconfiguration2.adjustmentreasons.update', reason.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration2.adjustmentreasons.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Reason Name*</label>
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={e => setData('name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., Initial Stock, Damaged Goods"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                    <label htmlFor="action" className="block text-sm font-medium text-gray-700">Action Type*</label>
                    <select
                        id="action"
                        value={data.action}
                        onChange={e => setData('action', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        <option value="">Select an action</option>
                        <option value="Add">Add to Stock</option>
                        <option value="Deduct">Deduct from Stock</option>
                    </select>
                    {errors.action && <p className="text-red-500 text-xs mt-1">{errors.action}</p>}
                </div>
            </div>


            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration2.adjustmentreasons.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {reason ? 'Update Reason' : 'Save Reason'}
                </button>
            </div>
        </form>
    );
}