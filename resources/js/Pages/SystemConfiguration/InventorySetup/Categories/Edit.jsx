import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import CategoryForm from './CategoryForm';

export default function Edit({ auth, category }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Category</h2>}>
            <Head title={`Edit ${category.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <CategoryForm category={category} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
