import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ItemForm from './ItemForm';

export default function Edit({ auth, item, itemGroups, pricecategories }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Item</h2>}>
            <Head title={`Edit ${item.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ItemForm item={item} itemGroups={itemGroups} pricecategories={pricecategories} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
