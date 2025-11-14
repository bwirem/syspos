import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function PriceCategoryForm({ pricecategory = null }) {
    // Initialize form with existing data or sensible defaults
    const { data, setData, put, post, processing, errors, reset } = useForm({
        price1: pricecategory?.price1 || 'Price Level 1',
        useprice1: pricecategory ? Boolean(pricecategory.useprice1) : true,
        price2: pricecategory?.price2 || 'Price Level 2',
        useprice2: pricecategory ? Boolean(pricecategory.useprice2) : false,
        price3: pricecategory?.price3 || 'Price Level 3',
        useprice3: pricecategory ? Boolean(pricecategory.useprice3) : false,
        price4: pricecategory?.price4 || 'Price Level 4',
        useprice4: pricecategory ? Boolean(pricecategory.useprice4) : false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (pricecategory) {
            put(route('systemconfiguration0.pricecategories.update', pricecategory.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration0.pricecategories.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    // Helper to render each price row, reducing code duplication
    const renderPriceInput = (index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 border rounded-md">
            <div className="md:col-span-2">
                <label htmlFor={`price${index}`} className="block text-sm font-medium text-gray-700">
                    Price Level {index} Name*
                </label>
                <input
                    id={`price${index}`}
                    type="text"
                    value={data[`price${index}`]}
                    onChange={(e) => setData(`price${index}`, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors[`price${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`price${index}`]}</p>}
            </div>
            <div className="flex items-center pt-6">
                <input
                    id={`useprice${index}`}
                    type="checkbox"
                    checked={data[`useprice${index}`]}
                    onChange={(e) => setData(`useprice${index}`, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor={`useprice${index}`} className="ml-2 block text-sm text-gray-900">
                    Enable
                </label>
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {[1, 2, 3, 4].map(renderPriceInput)}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration0.pricecategories.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {pricecategory ? 'Update Categories' : 'Save Categories'}
                </button>
            </div>
        </form>
    );
}