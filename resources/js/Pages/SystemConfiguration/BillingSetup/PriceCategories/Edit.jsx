import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import PriceCategoryForm from './PriceCategoryForm';

export default function Edit({ auth, pricecategory }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Price Categories</h2>}>
            <Head title="Edit Price Categories" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <PriceCategoryForm pricecategory={pricecategory} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

