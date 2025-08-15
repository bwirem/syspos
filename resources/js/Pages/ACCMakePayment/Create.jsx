import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import PaymentForm from './PaymentForm';

export default function Create({ auth, facilities }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Create New Payment</h2>}>
            <Head title="Create Payment" />
            <div className="py-12"><div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <PaymentForm facilities={facilities} />
                </div>
            </div></div>
        </AuthenticatedLayout>
    );
}