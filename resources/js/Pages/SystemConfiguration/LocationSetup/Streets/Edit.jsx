import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Modal from '@/Components/CustomModal';

export default function Edit({ street, regions, districts, wards }) {
    const { data, setData, put, errors, processing, reset } = useForm({
        name: street.name,
        ward_id: street.ward_id,
    });

    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        isAlert: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [filteredDistricts, setFilteredDistricts] = useState([]);
    const [filteredWards, setFilteredWards] = useState([]);
    const [selectedRegionId, setSelectedRegionId] = useState(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState(null);

    useEffect(() => {
        // Initialize district and region on load based on street.ward_id
        if (street.ward_id && wards.length && districts.length) {
            const selectedWard = wards.find(w => w.id === street.ward_id);
            if (selectedWard) {
                const selectedDistrict = districts.find(d => d.id === selectedWard.district_id);

                if (selectedDistrict) {
                    setSelectedRegionId(selectedDistrict.region_id);
                    setSelectedDistrictId(selectedDistrict.id);
                    // Filter wards on initial load based on the existing district
                    setFilteredWards(wards.filter(w => w.district_id === selectedDistrict.id));
                }
            }
        }
    }, [street.ward_id, wards, districts]);

    useEffect(() => {
        // Filter districts based on the selected region, and it is depend on selectedRegionId and should execute when the regions load
        if (selectedRegionId) {
            setFilteredDistricts(districts.filter(d => d.region_id == selectedRegionId));
        } else {
            setFilteredDistricts([]);
        }

    }, [selectedRegionId, districts]);

    useEffect(() => {
        // Set data ward id to district when district changed
        setData('ward_id', street.ward_id)
    }, [street.ward_id])

    useEffect(() => {
        // Filter wards based on the selected district
        if (selectedDistrictId) {
            setFilteredWards(wards.filter(w => w.district_id === selectedDistrictId));
        } else {
            setFilteredWards([]);
        }
    }, [selectedDistrictId, wards]);

    const handleModalClose = () => {
        setModalState({ isOpen: false, message: '', isAlert: false });
    };

    const showAlert = (message) => {
        setModalState({ isOpen: true, message, isAlert: true });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        put(route('systemconfiguration4.streets.update', street.id), data, {
            onSuccess: () => {
                setIsSaving(false);
                resetForm();
            },
            onError: (errors) => {
                console.error(errors);
                setIsSaving(false);
                showAlert('An error occurred while saving the street.');
            },
        });
    };

    const resetForm = () => {
        reset();
        showAlert('Street updated successfully!');
    };

    const handleRegionChange = (e) => {
        const regionId = e.target.value;
        setSelectedRegionId(regionId);
        setSelectedDistrictId(null); // Clear selected district
        setData('ward_id', ''); // Clear selected ward
        setFilteredDistricts(districts.filter(d => d.region_id == regionId)); // update available districts
        setFilteredWards([]); // Clear the ward list
    };

    const handleDistrictChange = (e) => {
        const districtId = e.target.value;
        setSelectedDistrictId(districtId);
        setData('ward_id', ''); // Clear selected ward
        setFilteredWards(wards.filter(w => w.district_id === districtId)); // Update the filtered wards
    };

    const handleWardChange = (e) => {
        setData('ward_id', e.target.value);
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Street</h2>}
        >
            <Head title="Edit Street" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Region */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Region</label>
                                    <select
                                        value={selectedRegionId || ''}
                                        onChange={handleRegionChange}
                                        className="w-full border p-2 rounded text-sm"
                                    >
                                        <option value="">Select Region</option>
                                        {regions.map(region => (
                                            <option key={region.id} value={region.id}>
                                                {region.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">District</label>
                                    <select
                                        value={selectedDistrictId || ''}
                                        onChange={handleDistrictChange}
                                        className="w-full border p-2 rounded text-sm"
                                        disabled={!selectedRegionId}
                                    >
                                        <option value="">Select District</option>
                                        {filteredDistricts.map(district => (
                                            <option key={district.id} value={district.id}>
                                                {district.name}
                                            </option>
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
                                        {filteredWards.map(ward => (
                                            <option key={ward.id} value={ward.id}>{ward.name}</option>
                                        ))}
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

                            <div className="flex justify-end space-x-4 mt-6">
                                <Link
                                    href={route('systemconfiguration4.streets.index')}
                                    method="get"
                                    preserveState={true}
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