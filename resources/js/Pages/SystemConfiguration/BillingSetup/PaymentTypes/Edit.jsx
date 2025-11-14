import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import PaymentTypeForm from './PaymentTypeForm';

export default function Edit({ auth, paymenttype, chartofaccounts }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Payment Type</h2>}>
            <Head title={`Edit ${paymenttype.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <PaymentTypeForm paymenttype={paymenttype} chartofaccounts={chartofaccounts} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
