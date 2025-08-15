import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import CustomerForm from './CustomerForm';

export default function Create({ auth, customerTypes }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Create New Customer</h2>}>
            <Head title="Create Customer" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <CustomerForm customerTypes={customerTypes} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}