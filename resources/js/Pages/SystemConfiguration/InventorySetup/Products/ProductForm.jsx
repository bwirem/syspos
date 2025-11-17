import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const CheckboxInput = ({ id, label, checked, onChange }) => (
    <div className="flex items-center pt-6">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label>
    </div>
);

export default function ProductForm({ product = null, categories, units, activePriceCategories }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: product?.name || '',
        displayname: product?.displayname || '',
        category_id: product?.category_id || '',
        package_id: product?.package_id || '',
        costprice: product?.costprice || '0.00',
        addtocart: product ? Boolean(product.addtocart) : false,
        hasexpiry: product ? Boolean(product.hasexpiry) : false,
        expirynotice: product ? Boolean(product.expirynotice) : false,
        display: product ? Boolean(product.display) : true,
        defaultqty: product?.defaultqty || 1,
        reorderlevel: product?.reorderlevel || 1,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (product) {
            put(route('systemconfiguration2.products.update', product.id), { preserveScroll: true });
        } else {
            post(route('systemconfiguration2.products.store'), { onSuccess: () => reset() });
        }
    };

    // The controller eager-loads the `blsItem` relationship as `bls_item` in the JSON payload.
    const sellingPrices = product?.bls_item || {};

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="p-4 border rounded-md space-y-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name*</label>
                        <input id="name" type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="e.g., HP EliteBook 840 G5" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="displayname" className="block text-sm font-medium text-gray-700">Display Name*</label>
                        <input id="displayname" type="text" value={data.displayname} onChange={e => setData('displayname', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="e.g., HP EliteBook 14-inch" />
                        {errors.displayname && <p className="text-red-500 text-xs mt-1">{errors.displayname}</p>}
                    </div>
                    <div>
                        <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">Category*</label>
                        <select id="category_id" value={data.category_id} onChange={e => setData('category_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="">Select a category</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
                    </div>
                    <div>
                        <label htmlFor="package_id" className="block text-sm font-medium text-gray-700">Base Unit*</label>
                        <select id="package_id" value={data.package_id} onChange={e => setData('package_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="">Select a unit</option>
                            {units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                        </select>
                        {errors.package_id && <p className="text-red-500 text-xs mt-1">{errors.package_id}</p>}
                    </div>
                </div>
            </div>

            {/* Costing & Selling Prices Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Costing Section */}
                <div className="p-4 border rounded-md space-y-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Costing</h3>
                    <div>
                        <label htmlFor="costprice" className="block text-sm font-medium text-gray-700">Cost Price*</label>
                        <input id="costprice" type="number" step="0.01" value={data.costprice} onChange={e => setData('costprice', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        {errors.costprice && <p className="text-red-500 text-xs mt-1">{errors.costprice}</p>}
                    </div>
                </div>

                {/* Selling Prices Display Section */}
                <div className="p-4 border rounded-md space-y-4 bg-gray-50">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Selling Prices (Read-Only)</h3>
                    <div className="space-y-2">
                        {activePriceCategories.map(category => (
                            <div key={category.key} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 font-medium">{category.label}:</span>
                                <span className="font-semibold text-gray-800">
                                    {parseFloat(sellingPrices[category.key] || 0).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex items-start gap-2">
                        <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5" />
                        <span>Selling prices are managed in "Billing Items & Services" after saving.</span>
                    </div>
                </div>
            </div>

            {/* Settings Section */}
            <div className="p-4 border rounded-md space-y-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="reorderlevel" className="block text-sm font-medium text-gray-700">Re-Order Level*</label>
                        <input id="reorderlevel" type="number" min="0" value={data.reorderlevel} onChange={e => setData('reorderlevel', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        {errors.reorderlevel && <p className="text-red-500 text-xs mt-1">{errors.reorderlevel}</p>}
                    </div>
                    <div>
                        <label htmlFor="defaultqty" className="block text-sm font-medium text-gray-700">Default Quantity*</label>
                        <input id="defaultqty" type="number" min="1" value={data.defaultqty} onChange={e => setData('defaultqty', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        {errors.defaultqty && <p className="text-red-500 text-xs mt-1">{errors.defaultqty}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <CheckboxInput id="display" label="Display" checked={data.display} onChange={e => setData('display', e.target.checked)} />
                    <CheckboxInput id="addtocart" label="Add to Cart" checked={data.addtocart} onChange={e => setData('addtocart', e.target.checked)} />
                    <CheckboxInput id="hasexpiry" label="Has Expiry" checked={data.hasexpiry} onChange={e => setData('hasexpiry', e.target.checked)} />
                    <CheckboxInput id="expirynotice" label="Expiry Notice" checked={data.expirynotice} onChange={e => setData('expirynotice', e.target.checked)} />
                </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration2.products.index')} className="text-gray-700 font-medium">Cancel</Link>
                <button type="submit" disabled={processing} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300">
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {product ? 'Update Product' : 'Save Product'}
                </button>
            </div>
        </form>
    );
}