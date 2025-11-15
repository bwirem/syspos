import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ExpenseGroupForm from './ExpenseGroupForm';

export default function Create({ auth }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Create New Expense Group</h2>}>
            <Head title="Create Expense Group" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ExpenseGroupForm />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
