import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import PaymentForm from './PaymentForm';

export default function Edit({ auth, payment, facilities }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Edit Payment #{payment.id}</h2>}>
            <Head title={`Edit Payment ${payment.id}`} />
            <div className="py-12"><div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                     <PaymentForm payment={payment} facilities={facilities} />
                </div>
            </div></div>
        </AuthenticatedLayout>
    );
}