import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function ItemForm({ item = null, itemGroups, pricecategories }) {
    // Use the first price category record if it exists, otherwise provide fallbacks.
    const priceLabels = pricecategories[0] || {
        price1: 'Price 1',
        price2: 'Price 2',
        price3: 'Price 3',
        price4: 'Price 4',
    };

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: item?.name || '',
        itemgroup_id: item?.itemgroup_id || '',
        price1: item?.price1 || '0.00',
        price2: item?.price2 || '0.00',
        price3: item?.price3 || '0.00',
        price4: item?.price4 || '0.00',
        defaultqty: item?.defaultqty || 1,
        addtocart: item ? Boolean(item.addtocart) : false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (item) {
            put(route('systemconfiguration0.items.update', item.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration0.items.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Item Name*</label>
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={e => setData('name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., Laptop Pro"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="itemgroup_id" className="block text-sm font-medium text-gray-700">Item Group*</label>
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

            {/* Pricing Info */}
            <div className="p-4 border rounded-md">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(index => (
                        <div key={index}>
                            <label htmlFor={`price${index}`} className="block text-sm font-medium text-gray-700">
                                {priceLabels[`price${index}`]}*
                            </label>
                            <input
                                id={`price${index}`}
                                type="number"
                                step="0.01"
                                value={data[`price${index}`]}
                                onChange={e => setData(`price${index}`, e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            />
                            {errors[`price${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`price${index}`]}</p>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Other Settings */}
            <div className="p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                    <label htmlFor="defaultqty" className="block text-sm font-medium text-gray-700">Default Quantity*</label>
                    <input
                        id="defaultqty"
                        type="number"
                        value={data.defaultqty}
                        onChange={e => setData('defaultqty', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                    {errors.defaultqty && <p className="text-red-500 text-xs mt-1">{errors.defaultqty}</p>}
                </div>
                <div className="flex items-center pt-6">
                    <input
                        id="addtocart"
                        type="checkbox"
                        checked={data.addtocart}
                        onChange={e => setData('addtocart', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="addtocart" className="ml-2 block text-sm text-gray-900">
                        Add to Cart by Default
                    </label>
                </div>
            </div>


            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration0.items.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {item ? 'Update Item' : 'Save Item'}
                </button>
            </div>
        </form>
    );
}