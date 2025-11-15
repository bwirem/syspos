import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ChartOfAccountForm from './ChartOfAccountForm';

export default function Edit({ auth, chartofaccount, accountTypeLabels }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Account</h2>}>
            <Head title={`Edit ${chartofaccount.account_name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ChartOfAccountForm account={chartofaccount} accountTypeLabels={accountTypeLabels} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
