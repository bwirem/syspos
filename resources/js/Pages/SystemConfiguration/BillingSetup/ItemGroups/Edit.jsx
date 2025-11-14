import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ItemGroupForm from './ItemGroupForm';

export default function Edit({ auth, itemgroup }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Item Group</h2>}>
            <Head title={`Edit ${itemgroup.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ItemGroupForm itemgroup={itemgroup} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
