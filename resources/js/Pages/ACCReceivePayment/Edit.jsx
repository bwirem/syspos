import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ReceivePaymentForm from './ReceivePaymentForm';

export default function Edit({ auth, receivedPayment, facilities }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Edit Received Payment #{receivedPayment.id}</h2>}>
            <Head title={`Edit Payment ${receivedPayment.id}`} />
            <div className="py-12"><div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                     <ReceivePaymentForm receivedPayment={receivedPayment} facilities={facilities} />
                </div>
            </div></div>
        </AuthenticatedLayout>
    );
}