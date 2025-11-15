import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ChartOfAccountMappingForm from './ChartOfAccountMappingForm';

export default function Create({ auth, chartofaccounts }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Define Account Mappings</h2>}>
            <Head title="Define Account Mappings" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ChartOfAccountMappingForm chartofaccounts={chartofaccounts} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}