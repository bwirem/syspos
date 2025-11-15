import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function ExpenseGroupForm({ itemgroup = null }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: itemgroup?.name || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (itemgroup) {
            put(route('systemconfiguration1.itemgroups.update', itemgroup.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration1.itemgroups.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Group Name*</label>
                <input
                    id="name"
                    type="text"
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    placeholder="e.g., Utilities, Salaries, Rent"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration1.itemgroups.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {itemgroup ? 'Update Group' : 'Save Group'}
                </button>
            </div>
        </form>
    );
}