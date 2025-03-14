import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';
import Modal from '@/Components/CustomModal';

export default function Edit({ product }) {
    const { data, setData, put, errors, processing, reset } = useForm({      
       

        name: product.name,
        displayname:  product.displayname,
        category_id:  product.category_id,
        package_id:  product.package_id,
        
        costprice:  product.costprice,
        prevcost:  product.prevcost,
        averagecost:  product.averagecost,
       
        addtocart:  product.addtocart,
        hasexpiry:  product.hasexpiry,
        expirynotice:  product.expirynotice,
        display:  product.display,
        
        defaultqty:  product.defaultqty,
        reorderlevel:  product.reorderlevel,
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [productCategories, setProductCategories] = useState([]);
    const [productPackage, setProductPackage] = useState([]);

    const handleModalConfirm = () => setModalState({ isOpen: false, message: '', isAlert: false });    
    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false }); 
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });
    const resetForm = () => { reset(); showAlert('Product updated successfully!');};

    

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        put(route('systemconfiguration2.products.update', product.id), {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the product.');
            },
        });
    };

    
    // useEffect(() => {
    //     const fetchProductCategories = async () => {
    //         try {
    //             const response = await axios.get(route('systemconfiguration2.categories.search'));
    //             setProductCategories(response.data.categories);
    //         } catch (error) {
    //             console.error('Error fetching product categories:', error);
    //             showAlert('Failed to fetch product categories.');
    //         }
    //     };

    //     fetchProductCategories();
    // }, []);

    // Fetch product categories
    useEffect(() => {
        axios.get(route('systemconfiguration2.categories.search'))
            .then(response => setProductCategories(response.data.categories))
            .catch(() => showAlert('Failed to fetch product categories.'));
    }, []);

    // Fetch product package
    useEffect(() => {
        axios.get(route('systemconfiguration2.units.search'))
            .then(response => setProductPackage(response.data.units))
            .catch(() => showAlert('Failed to fetch product units.'));
    }, []);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Product</h2>}
        >
            <Head title="Edit Product" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                           
                             {/* Name and Display name */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">                               
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input type="text" value={data.displayname} onChange={(e) => setData('displayname', e.target.value)} className={`w-full border p-2 rounded text-sm ${errors.displayname ? 'border-red-500' : ''}`} placeholder="Enter display name..." />
                                    {errors.displayname && <p className="text-sm text-red-600">{errors.displayname}</p>}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`} placeholder="Enter name..." />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                            </div>

                            {/* Product Category and  Packaging */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Product Category</label>
                                    <select value={data.category_id} onChange={(e) => setData('category_id', e.target.value)} className="w-full border p-2 rounded text-sm">
                                        <option value="">Select Product Category</option>
                                        {productCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                                    </select>
                                    {errors.category_id && <p className="text-sm text-red-600">{errors.category_id}</p>}
                                </div> 
                               
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Product Category</label>
                                    <select value={data.package_id} onChange={(e) => setData('package_id', e.target.value)} className="w-full border p-2 rounded text-sm">
                                        <option value="">Select Product Unit</option>
                                        {productPackage.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                                    </select>
                                    {errors.package_id && <p className="text-sm text-red-600">{errors.package_id}</p>}
                                </div>                                
                            </div>                           

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">                              
                               
                                <div className="relative flex-1">
                                    <label htmlFor="costprice" className="block text-sm font-medium text-gray-700 mr-2">Cost Price</label>
                                    <input
                                        id="costprice"
                                        type="number"
                                        placeholder="Enter Cost..."
                                        value={data.costprice}
                                        onChange={(e) => setData('costprice', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.costprice ? 'border-red-500' : ''}`}
                                    />
                                    {errors.costprice && <p className="text-sm text-red-600 mt-1">{errors.costprice}</p>}
                                </div>

                                <div className="relative flex-1">
                                    <label htmlFor="prevcost" className="block text-sm font-medium text-gray-700 mr-2">Previous Cost</label>
                                    <input
                                        id="prevcost"
                                        type="number"
                                        placeholder="Enter previous cost..."
                                        value={data.prevcost}
                                        onChange={(e) => setData('prevcost', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.prevcost ? 'border-red-500' : ''}`}
                                    />
                                    {errors.prevcost && <p className="text-sm text-red-600 mt-1">{errors.prevcost}</p>}
                                </div>

                                <div className="relative flex-1">
                                    <label htmlFor="averagecost" className="block text-sm font-medium text-gray-700 mr-2">Average Cost</label>
                                    <input
                                        id="averagecost"
                                        type="number"
                                        placeholder="Enter average cost..."
                                        value={data.averagecost}
                                        onChange={(e) => setData('averagecost', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.averagecost ? 'border-red-500' : ''}`}
                                    />
                                    {errors.averagecost && <p className="text-sm text-red-600 mt-1">{errors.averagecost}</p>}
                                </div>

                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">

                                <div className="relative flex-1 flex products-center">
                                    <input
                                        id="addtocart"
                                        type="checkbox"
                                        checked={data.addtocart}
                                        onChange={(e) => setData('addtocart', e.target.checked)}
                                    />
                                    <label htmlFor="addtocart" className="ml-2 text-sm font-medium text-gray-700">Add to Cart</label>
                                </div>

                                <div className="relative flex-1 flex products-center">
                                    <input
                                        id="hasexpiry"
                                        type="checkbox"
                                        checked={data.hasexpiry}
                                        onChange={(e) => setData('hasexpiry', e.target.checked)}
                                    />
                                    <label htmlFor="hasexpiry" className="ml-2 text-sm font-medium text-gray-700">Has Expiry</label>
                                </div>

                                <div className="relative flex-1 flex products-center">
                                    <input
                                        id="expirynotice"
                                        type="checkbox"
                                        checked={data.expirynotice}
                                        onChange={(e) => setData('expirynotice', e.target.checked)}
                                    />
                                    <label htmlFor="expirynotice" className="ml-2 text-sm font-medium text-gray-700">Expiry Notice</label>
                                </div>

                                <div className="relative flex-1 flex products-center">
                                    <input
                                        id="display"
                                        type="checkbox"
                                        checked={data.display}
                                        onChange={(e) => setData('display', e.target.checked)}
                                    />
                                    <label htmlFor="display" className="ml-2 text-sm font-medium text-gray-700">Display</label>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">                              
                               
                                <div className="relative flex-1">
                                    <label htmlFor="defaultqty" className="block text-sm font-medium text-gray-700 mr-2">Default Quantity</label>
                                    <input
                                        id="defaultqty"
                                        type="number"
                                        placeholder="Enter default ..."
                                        value={data.defaultqty}
                                        onChange={(e) => setData('defaultqty', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.defaultqty ? 'border-red-500' : ''}`}
                                    />
                                    {errors.defaultqty && <p className="text-sm text-red-600 mt-1">{errors.defaultqty}</p>}
                                </div>

                                <div className="relative flex-1">
                                    <label htmlFor="reorderlevel" className="block text-sm font-medium text-gray-700 mr-2">Reorder Level</label>
                                    <input
                                        id="reorderlevel"
                                        type="number"
                                        placeholder="Enter reorder..."
                                        value={data.reorderlevel}
                                        onChange={(e) => setData('reorderlevel', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.reorderlevel ? 'border-red-500' : ''}`}
                                    />
                                    {errors.reorderlevel && <p className="text-sm text-red-600 mt-1">{errors.reorderlevel}</p>}
                                </div>                              

                            </div>


                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => Inertia.get(route('systemconfiguration2.products.index'))}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex products-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || isSaving}
                                    className="bg-blue-600 text-white rounded p-2 flex products-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}          
                onConfirm={handleModalConfirm}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />

        </AuthenticatedLayout>
    );
}
