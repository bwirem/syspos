import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ChartOfAccountForm from './ChartOfAccountForm';

export default function Create({ auth, accountTypeLabels }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Create New Account</h2>}>
            <Head title="Create Account" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ChartOfAccountForm accountTypeLabels={accountTypeLabels} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

