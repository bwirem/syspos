import React from 'react';
import { Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function UnitForm({ unit = null }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: unit?.name || '',
        pieces: unit?.pieces || 1,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (unit) {
            put(route('systemconfiguration2.units.update', unit.id), {
                preserveScroll: true,
            });
        } else {
            post(route('systemconfiguration2.units.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Unit Name*</label>
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={e => setData('name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., Box, Carton, Piece"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="pieces" className="block text-sm font-medium text-gray-700">Pieces per Base Unit*</label>
                    <input
                        id="pieces"
                        type="number"
                        min="1"
                        value={data.pieces}
                        onChange={e => setData('pieces', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                    {errors.pieces && <p className="text-red-500 text-xs mt-1">{errors.pieces}</p>}
                </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <Link href={route('systemconfiguration2.units.index')} className="text-gray-700 font-medium">
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-blue-300"
                >
                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                    {unit ? 'Update Unit' : 'Save Unit'}
                </button>
            </div>
        </form>
    );
}