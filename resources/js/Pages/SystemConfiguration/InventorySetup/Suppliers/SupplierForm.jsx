import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function SupplierForm({ supplier = null, supplierTypes }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        supplier_type: supplier?.supplier_type || 'individual',
        first_name: supplier?.first_name || '',
        other_names: supplier?.other_names || '',
        surname: supplier?.surname || '',
        company_name: supplier?.company_name || '',
        email: supplier?.email || '',
        phone: supplier?.phone || '',
        address: supplier?.address || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (supplier) {
            put(route('systemconfiguration2.suppliers.update', supplier.id), { preserveScroll: true });
        } else {
            post(route('systemconfiguration2.suppliers.store'), { onSuccess: () => reset() });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="supplier_type" className="block text-sm font-medium text-gray-700">Supplier Type</label>
                <select id="supplier_type" value={data.supplier_type} onChange={e => setData('supplier_type', e.target.value)} className="mt-1 block w-full md:w-1/3 rounded-md border-gray-300">
                    {supplierTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
                {errors.supplier_type && <p className="text-red-500 text-xs mt-1">{errors.supplier_type}</p>}
            </div>

            {data.supplier_type === 'individual' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
                    <div><label>First Name*</label><input type="text" value={data.first_name} onChange={e => setData('first_name', e.target.value)} className="w-full mt-1"/>{errors.first_name && <p className="text-red-500 text-xs">{errors.first_name}</p>}</div>
                    <div><label>Other Names</label><input type="text" value={data.other_names} onChange={e => setData('other_names', e.target.value)} className="w-full mt-1"/></div>
                    <div><label>Surname*</label><input type="text" value={data.surname} onChange={e => setData('surname', e.target.value)} className="w-full mt-1"/>{errors.surname && <p className="text-red-500 text-xs">{errors.surname}</p>}</div>
                </div>
            ) : (
                <div className="p-4 border rounded-md">
                    <label>Company Name*</label>
                    <input type="text" value={data.company_name} onChange={e => setData('company_name', e.target.value)} className="w-full mt-1"/>
                    {errors.company_name && <p className="text-red-500 text-xs">{errors.company_name}</p>}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>Email*</label><input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="w-full mt-1"/>{errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}</div>
                <div><label>Phone</label><input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className="w-full mt-1"/>{errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}</div>
            </div>

            <div>
                <label>Address</label>
                <textarea value={data.address} onChange={e => setData('address', e.target.value)} className="w-full mt-1 rounded-md border-gray-300" rows="3"></textarea>
                {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration2.suppliers.index')} className="text-gray-700 font-medium">Cancel</Link>
                <button type="submit" disabled={processing} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300">
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {supplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
            </div>
        </form>
    );
}