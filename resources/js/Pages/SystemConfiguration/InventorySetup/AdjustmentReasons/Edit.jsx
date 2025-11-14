import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import AdjustmentReasonForm from './AdjustmentReasonForm';

export default function Edit({ auth, adjustmentreason }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Adjustment Reason</h2>}>
            <Head title={`Edit ${adjustmentreason.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <AdjustmentReasonForm reason={adjustmentreason} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}