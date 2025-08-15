import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ReceivePaymentForm from './ReceivePaymentForm';

export default function Create({ auth, facilities }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Record New Received Payment</h2>}>
            <Head title="Receive Payment" />
            <div className="py-12"><div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <ReceivePaymentForm facilities={facilities} />
                </div>
            </div></div>
        </AuthenticatedLayout>
    );
}