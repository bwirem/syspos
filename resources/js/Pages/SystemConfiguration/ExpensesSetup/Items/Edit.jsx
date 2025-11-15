import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ExpenseItemForm from './ExpenseItemForm';

export default function Edit({ auth, item, itemGroups }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Expense</h2>}>
            <Head title={`Edit ${item.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ExpenseItemForm item={item} itemGroups={itemGroups} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
