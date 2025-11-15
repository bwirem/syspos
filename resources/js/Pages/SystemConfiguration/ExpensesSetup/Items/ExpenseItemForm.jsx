import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function ExpenseItemForm({ item = null, itemGroups }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: item?.name || '',
        itemgroup_id: item?.itemgroup_id || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (item) {
            put(route('systemconfiguration1.items.update', item.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration1.items.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Expense Name*</label>
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={e => setData('name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., Electricity Bill, Staff Lunch"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="itemgroup_id" className="block text-sm font-medium text-gray-700">Expense Group*</label>
                    <select
                        id="itemgroup_id"
                        value={data.itemgroup_id}
                        onChange={e => setData('itemgroup_id', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        <option value="">Select a group</option>
                        {itemGroups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </select>
                    {errors.itemgroup_id && <p className="text-red-500 text-xs mt-1">{errors.itemgroup_id}</p>}
                </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration1.items.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {item ? 'Update Expense' : 'Save Expense'}
                </button>
            </div>
        </form>
    );
}