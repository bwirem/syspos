import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function CategoryForm({ category = null }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: category?.name || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (category) {
            put(route('systemconfiguration2.categories.update', category.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration2.categories.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Category Name*</label>
                <input
                    id="name"
                    type="text"
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    placeholder="e.g., Laptops, Monitors, Accessories"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration2.categories.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {category ? 'Update Category' : 'Save Category'}
                </button>
            </div>
        </form>
    );
}