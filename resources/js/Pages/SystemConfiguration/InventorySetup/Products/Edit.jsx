import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ProductForm from './ProductForm';

// Your controller's `edit` method must pass `product`, `categories`, `units`, and `activePriceCategories`
export default function Edit({ auth, product, categories, units, activePriceCategories }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Product</h2>}>
            <Head title={`Edit ${product.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ProductForm 
                            product={product} 
                            categories={categories} 
                            units={units} 
                            activePriceCategories={activePriceCategories} 
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
