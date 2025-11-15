import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ExpenseItemForm from './ExpenseItemForm';

export default function Create({ auth, itemGroups }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Create New Expense</h2>}>
            <Head title="Create Expense" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ExpenseItemForm itemGroups={itemGroups} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
