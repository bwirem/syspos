import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import UnitForm from './UnitForm';

export default function Edit({ auth, unit }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Unit</h2>}>
            <Head title={`Edit ${unit.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <UnitForm unit={unit} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
