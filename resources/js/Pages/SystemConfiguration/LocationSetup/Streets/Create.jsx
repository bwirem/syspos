import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/CustomModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

export default function Create({ regions, districts, wards }) {
    const { data, setData, post, errors, processing, reset } = useForm({
        name: '',
        ward_id: '',
    });

    const [filteredDistricts, setFilteredDistricts] = useState([]); // To Store District
    const [filteredWards, setFilteredWards] = useState([]);
    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRegionId, setSelectedRegionId] = useState(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState(null);

    useEffect(() => {
        // Update filtered district when a region changes
        if (selectedRegionId) {
            setFilteredDistricts(districts.filter(d => d.region_id == selectedRegionId));
        } else {
            setFilteredDistricts([]);
        }
        setSelectedDistrictId(null); // Reset District Selection
        setData('ward_id', ''); // Reset ward
        setFilteredWards([]); // Clear wards
    }, [selectedRegionId, districts, setData]);

    useEffect(() => {
        // Update filtered wards when a district changes
        if (selectedDistrictId) {
            setFilteredWards(wards.filter(w => w.district_id == selectedDistrictId));
        } else {
            setFilteredWards([]);
        }
        setData('ward_id', ''); // Reset ward selection
    }, [selectedDistrictId, wards, setData]);

    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });
    const resetForm = () => { reset(); showAlert('Street created successfully!'); };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        post(route('systemconfiguration4.streets.store'), data, {
            onSuccess: () => { setIsSaving(false); resetForm(); },
            onError: () => { setIsSaving(false); showAlert('An error occurred while saving the street.'); },
        });
    };

    const handleRegionChange = (e) => {
        const regionId = e.target.value;
        setSelectedRegionId(regionId);
        setSelectedDistrictId(null); // Reset District Selection
        setData('ward_id', ''); // Reset ward
        setFilteredWards([]); // Clear wards
    };

    const handleDistrictChange = (e) => {
        const districtId = e.target.value;
        setSelectedDistrictId(districtId);
        setData('ward_id', ''); // Reset ward
    };

    const handleWardChange = (e) => {
        setData('ward_id', e.target.value);
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">New Street</h2>}>
            <Head title="New Street" />
            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Region and District */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Region</label>
                                    <select value={selectedRegionId || ''} onChange={handleRegionChange} className="w-full border p-2 rounded text-sm">
                                        <option value="">Select Region</option>
                                        {regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
                                    </select>
                                    {errors.region_id && <p className="text-sm text-red-600">{errors.region_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">District</label>
                                    <select
                                        value={selectedDistrictId || ''} // Use local state
                                        onChange={handleDistrictChange}
                                        className="w-full border p-2 rounded text-sm"
                                        disabled={!selectedRegionId}
                                    >
                                        <option value="">Select District</option>
                                        {filteredDistricts.map(district => (
                                            <option key={district.id} value={district.id}>{district.name}</option>
                                        ))}
                                    </select>
                                    {errors.district_id && <p className="text-sm text-red-600">{errors.district_id}</p>}
                                </div>
                            </div>

                            {/* Name and Wards*/}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ward</label>
                                    <select
                                        value={data.ward_id}
                                        onChange={handleWardChange}
                                        className="w-full border p-2 rounded text-sm"
                                        disabled={!selectedDistrictId} // Disable if no district is selected
                                    >
                                        <option value="">Select Ward</option>
                                        {filteredWards.map(ward => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
                                    </select>
                                    {errors.ward_id && <p className="text-sm text-red-600">{errors.ward_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`w-full border p-2 rounded text-sm ${errors.name ? 'border-red-500' : ''}`}
                                        placeholder="Enter name..."
                                    />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end space-x-4">
                                <Link
                                    href={route('systemconfiguration4.streets.index')}
                                    className="bg-gray-300 text-gray-700 rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    <span>Cancel</span>
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing || isSaving}
                                    className="bg-blue-600 text-white rounded p-2 flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Alert Modal */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                title={modalState.isAlert ? "Alert" : "Confirm Action"}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </AuthenticatedLayout>
    );
}