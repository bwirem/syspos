import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import SupplierForm from './SupplierForm';

export default function Create({ auth, supplierTypes }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Create New Supplier</h2>}>
            <Head title="Create Supplier" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <SupplierForm supplierTypes={supplierTypes} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
