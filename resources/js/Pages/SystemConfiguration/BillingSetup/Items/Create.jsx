import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ItemForm from './ItemForm';

export default function Create({ auth, itemGroups, pricecategories }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Create New Item</h2>}>
            <Head title="Create Item" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ItemForm itemGroups={itemGroups} pricecategories={pricecategories} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
