import React from 'react';
import { Link, useForm, usePage } from '@inertiajs/react'; // Added usePage to access auth/props
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner, faInfoCircle, faLock, faUnlock } from '@fortawesome/free-solid-svg-icons';

const CheckboxInput = ({ id, label, checked, onChange }) => (
    <div className="flex items-center pt-6">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label>
    </div>
);

export default function ProductForm({ product = null, categories, units, activePriceCategories, userPermissions = [] }) {
    
    // 1. Get Authentication/Permission Data
    // We assume 'userPermissions' is passed as a prop, OR acts as a fallback to check global auth props.
    // Ensure your SIV_ProductController passes a list of function permissions (e.g., ['allow_price'])
    const { auth } = usePage().props; 

   // Fallback to auth user permissions if not explicitly passed     
    const canEditPrice = userPermissions.includes('systemconfiguration2.allow_price');

    // 2. Initialize Form Data including Prices
    // We pull existing prices from the relationship (product.bls_item)
    const initialPrices = product?.bls_item || {};

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: product?.name || '',
        displayname: product?.displayname || '',
        category_id: product?.category_id || '',
        package_id: product?.package_id || '',
        costprice: product?.costprice || '0.00',
        
        // Initialize dynamic selling prices
        price1: initialPrices.price1 || '0.00',
        price2: initialPrices.price2 || '0.00',
        price3: initialPrices.price3 || '0.00',
        price4: initialPrices.price4 || '0.00',

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

                {/* Selling Prices Display/Edit Section */}
                <div className={`p-4 border rounded-md space-y-4 ${canEditPrice ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Selling Prices</h3>
                        {/* Visual indicator for permission state */}
                        {canEditPrice ? 
                            <span className="text-xs text-green-600 flex items-center gap-1"><FontAwesomeIcon icon={faUnlock} /> Editable</span> : 
                            <span className="text-xs text-gray-500 flex items-center gap-1"><FontAwesomeIcon icon={faLock} /> Read-Only</span>
                        }
                    </div>

                    <div className="space-y-4">
                        {activePriceCategories.map(category => (
                            <div key={category.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                                <label htmlFor={category.key} className="text-gray-700 font-medium w-32">{category.label}:</label>
                                
                                {canEditPrice ? (
                                    // 3. Conditional Rendering: Input if allowed
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        id={category.key}
                                        value={data[category.key]} 
                                        onChange={e => setData(category.key, e.target.value)}
                                        className="block w-full sm:w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-right"
                                    />
                                ) : (
                                    // 3. Conditional Rendering: Text if not allowed
                                    <span className="font-semibold text-gray-800 bg-gray-100 px-3 py-2 rounded-md w-full sm:w-40 text-right border border-gray-200">
                                        {parseFloat(data[category.key] || 0).toFixed(2)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {!canEditPrice && (
                        <div className="mt-2 text-xs text-gray-500 flex items-start gap-2">
                            <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5" />
                            <span>You do not have permission ('allow_price') to edit selling prices here.</span>
                        </div>
                    )}
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