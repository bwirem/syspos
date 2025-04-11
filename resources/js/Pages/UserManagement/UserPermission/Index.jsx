import React, { useEffect, useState, useMemo } from "react";
import { Head,Link, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import axios from 'axios';
import { Inertia } from '@inertiajs/inertia';

export default function Index({ auth, usergroups, modules, moduleitems, functionAccessData }) {
    const [modalState, setModalState] = useState({ isOpen: false, message: '', isAlert: false });
    const [selectedUserGroup, setSelectedUserGroup] = useState(null);
    const [selectedModules, setSelectedModules] = useState([]);
    const [selectedModuleItems, setSelectedModuleItems] = useState([]);
    const [functionAccess, setFunctionAccess] = useState({});
    const [activeModuleItem, setActiveModuleItem] = useState(null);
    const [lastSelectedModule, setLastSelectedModule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [existingPermissions, setExistingPermissions] = useState([]); // Store existing permissions in state

    const handleModalClose = () => setModalState({ isOpen: false, message: '', isAlert: false });
    const showAlert = (message) => setModalState({ isOpen: true, message, isAlert: true });

    const handleUserGroupSelect = (userGroup) => {
        setLoading(true);
        setSelectedUserGroup(userGroup);
        setSelectedModules([]);
        setSelectedModuleItems([]);
        setFunctionAccess({});
        setActiveModuleItem(null);
        setLastSelectedModule(null);

        axios.get(route('usermanagement.userpermission.getPermissions', { userGroup: userGroup.id }))
            .then(response => {
                const fetchedPermissions = response.data; // Fetch permissions
                setExistingPermissions(fetchedPermissions); // Update state with fetched permissions               

                const selectedModulesFromData = [];
                const selectedModuleItemsFromData = [];
                const functionAccessFromData = {}; // Initialize outside loop

                for (const moduleKey in moduleitems) {
                    const moduleItemsForModule = moduleitems[moduleKey];

                    moduleItemsForModule.forEach(moduleItem => {
                        functionAccessFromData[moduleItem.key] = { ...functionAccessData[moduleItem.key] }; // Initialize with defaults

                        const permissionsForItem = fetchedPermissions.filter(p => p.moduleitemkey === moduleItem.key);
                        permissionsForItem.forEach(permission => {
                            if (permission.value !== undefined) { // Check if value exists
                                functionAccessFromData[moduleItem.key][permission.functionaccesskey] = permission.value;
                            }
                        });

                        if (permissionsForItem.length > 0) {
                            selectedModuleItemsFromData.push(moduleItem);
                        }
                    });

                    if (moduleItemsForModule.some(moduleItem =>
                        fetchedPermissions.some(permission => permission.moduleitemkey === moduleItem.key)
                    )) {
                        selectedModulesFromData.push(moduleKey);
                    }
                }

                // Set data for SelectedModules, SelectedModuleItems, and functionAccess
                setSelectedModules(selectedModulesFromData);
                setSelectedModuleItems(selectedModuleItemsFromData);
                setFunctionAccess(functionAccessFromData); // Now set outside the loop
                setLastSelectedModule(selectedModulesFromData[0] || null); // Access first element safely
            })
            .catch(error => {
                console.error("Error fetching existing permissions:", error);
            })
            .finally(() => setLoading(false));
    };

    const filteredModuleItems = useMemo(() => {
        if (!selectedUserGroup) {
            return [];
        }
        return lastSelectedModule ? moduleitems[lastSelectedModule] || [] : [];
    }, [lastSelectedModule, moduleitems, selectedUserGroup]);

    const handleModuleCheckboxChange = (moduleKey) => {
        if (!selectedUserGroup) return;

        setSelectedModules(prevModules => {
            const isSelected = prevModules.includes(moduleKey);
            const newSelectedModules = isSelected
                ? prevModules.filter(key => key !== moduleKey)
                : [...prevModules, moduleKey];

            const relatedItems = moduleitems[moduleKey] || [];
            const areItemsSelected = relatedItems.some(item => selectedModuleItems.some(selected => selected.key === item.key));

            if (isSelected && areItemsSelected) {
                return prevModules;
            }

            if (isSelected) {
                setSelectedModuleItems(prevItems =>
                    prevItems.filter(item => !relatedItems.some(mi => mi.key === item.key))
                );
            }

            setLastSelectedModule(isSelected ? null : moduleKey);
            return newSelectedModules;
        });
    };

    const handleModuleRowClick = (moduleKey) => {
        if (!selectedUserGroup) return;
        handleModuleCheckboxChange(moduleKey);
    
        // Set the last selected module
        setLastSelectedModule(moduleKey);
    
        // If there are module items for the selected module, set the function access for the first module item
        const firstModuleItem = moduleitems[moduleKey]?.[0];
        if (firstModuleItem) {
            handleModuleItemSelect(firstModuleItem); // Select the first module item
        }
    };
    
    const handleModuleItemSelect = (moduleItem) => {
        if (!selectedUserGroup) return;
    
        setSelectedModuleItems(prevItems => {
            const isSelected = prevItems.some(item => item.key === moduleItem.key);
            if (isSelected) {
                setActiveModuleItem(moduleItem);
                return prevItems; // Return existing items if already selected
            }
    
            const newSelectedItems = [...prevItems, moduleItem];
            setActiveModuleItem(moduleItem);
    
            setFunctionAccess(prevAccess => {
                const newAccess = { ...prevAccess }; // Start with existing access
    
                // Check if moduleItem and data exist using optional chaining and hasOwnProperty to prevent issues.
                if (moduleItem && moduleItem.key && functionAccessData.hasOwnProperty(moduleItem.key)) {
                    // Initialize access for the new module item if it doesn't exist
                    if (!newAccess[moduleItem.key]) {
                        newAccess[moduleItem.key] = { ...functionAccessData[moduleItem.key] };
                    }
    
                    const permissionsForItem = existingPermissions.filter(p => p?.moduleitemkey === moduleItem.key);
                    permissionsForItem.forEach(permission => {
                        if (permission?.value !== undefined) {
                            newAccess[moduleItem.key][permission.functionaccesskey] = permission.value;
                        }
                    });
                }
    
                return newAccess; // Return the updated access object
            });
    
            return newSelectedItems; // Return the new selected items
        });
    };
    

    const handleModuleItemCheckboxChange = (moduleItem) => {
        // This function can be used for checkbox change event
        handleModuleItemSelect(moduleItem);
    };

    const handleFunctionAccessChange = (moduleItemKey, accessType) => {
        if (!selectedUserGroup) return;

        setFunctionAccess(prevAccess => ({
            ...prevAccess,
            [moduleItemKey]: {
                ...prevAccess[moduleItemKey], // Spread existing access for the module item
                [accessType]: !(prevAccess[moduleItemKey]?.[accessType] ?? false) // Toggle and handle missing keys
            }
        }));

        // Update activeModuleItem (important for UI update)
        setActiveModuleItem(prev =>
            prev?.key === moduleItemKey
                ? { ...prev, ...functionAccess[moduleItemKey] }
                : prev
        );    
    };

    const handleSavePermissions = async () => {
        if (!selectedUserGroup) {
            showAlert("Please select a user group.");
            return;
        }

        if (selectedModuleItems.length === 0) {
            showAlert("Please select at least one module item before saving.");
            return;
        }

        const permissionsToSend = selectedModuleItems.map(item => ({
            moduleItemKey: item.key,
            functionAccess: functionAccess[item.key] || {}, // Send the entire access object
        }));

        try {
            const response = await axios.post(route('usermanagement.userpermission.storePermissions', { userGroup: selectedUserGroup.id }), {
                permissions: permissionsToSend,
            });

            showAlert(response.data.success);
            Inertia.get(route('usermanagement.userpermission.index'));           
        } catch (error) {
            console.error("Error saving permissions:", error);
            showAlert(error.response?.data?.message || 'Failed to save permissions. Please try again.');
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Permission</h2>}>
            <Head title="Permission" />

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between users-center mb-4">
                <div className="flex users-center space-x-2 mb-4 md:mb-0"> 
                    <Link
                        href={route("usermanagement.index")}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center"
                    >
                        <FontAwesomeIcon icon={faHome} className="mr-1" /> Home
                    </Link>    
                </div>                    
            </div>
           
            <div className="container mx-auto p-4 flex space-x-4">
                {/* Usergroups Table */}
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700"></th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Roles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usergroups.data.length > 0 ? (
                                usergroups.data.map((usergroup, index) => (
                                    <tr key={usergroup.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="border-b p-3 text-gray-700 text-center">
                                            <input
                                                type="radio"
                                                checked={selectedUserGroup?.id === usergroup.id}
                                                onChange={() => handleUserGroupSelect(usergroup)}
                                            />
                                        </td>
                                        <td className="border-b p-3 text-gray-700">{usergroup.name || "n/a"}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="border-b p-3 text-center text-gray-700">No role found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modules Table - Now always renders */}
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700"></th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Modules</th>
                            </tr>
                        </thead>
                        <tbody>
                            {modules.map((module, index) => (
                                <tr key={index} className={`${selectedModules.includes(module.modulekey) ? 'bg-blue-100' : (index % 2 === 0 ? 'bg-gray-50' : '')}`} onClick={() => handleModuleRowClick(module.modulekey)} style={{ cursor: selectedUserGroup ? 'pointer' : 'default' }}>
                                    <td className="border-b p-3 text-gray-700 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedModules.includes(module.modulekey)}
                                            onChange={() => handleModuleCheckboxChange(module.modulekey)}
                                            disabled={!selectedUserGroup}
                                        />
                                    </td>
                                    <td className="border-b p-3 text-gray-700">{module.moduletext || "n/a"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ModuleItems Table - Now always renders */}
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700"></th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">Module Items</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredModuleItems.map((moduleitem, index) => (
                                <tr key={index}
                                    className={`${selectedModuleItems.some(item => item.key === moduleitem.key) ? 'bg-blue-100' : (index % 2 === 0 ? 'bg-gray-50' : '')}`}
                                    onClick={() => handleModuleItemSelect(moduleitem)} // Row click selects item
                                    style={{ cursor: selectedUserGroup ? 'pointer' : 'default' }}
                                >
                                    <td className="border-b p-3 text-gray-700 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedModuleItems.some(item => item.key === moduleitem.key)}
                                            onChange={() => handleModuleItemCheckboxChange(moduleitem)} // Checkbox change
                                            disabled={!selectedUserGroup}
                                        />
                                    </td>
                                    <td className="border-b p-3 text-gray-700">{moduleitem.text || "n/a"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Function Access Table - Now shows only relevant functions for the active module item */}
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full border border-gray-300 shadow-md rounded">
                        <thead>
                            <tr>
                                <th className="border-b p-3 text-center font-medium text-gray-700"></th>
                                <th className="border-b p-3 text-center font-medium text-gray-700">
                                    {activeModuleItem ? `Function Access for ${activeModuleItem.text}` : "Function Access"}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                        {activeModuleItem && functionAccess[activeModuleItem.key] &&
                            Object.keys(functionAccess[activeModuleItem.key]).map(accessType => (
                                <tr key={accessType}>                                    
                                    <td className="border-b p-3 text-gray-700 text-center">
                                        <input
                                            type="checkbox"
                                            checked={functionAccess[activeModuleItem.key][accessType] || false}
                                            onChange={() => handleFunctionAccessChange(activeModuleItem.key, accessType)}
                                            disabled={!selectedUserGroup}
                                        />
                                    </td>
                                    <td className="border-b p-3 text-gray-700 text-left">
                                        {accessType.charAt(0).toUpperCase() + accessType.slice(1)}:
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
                <div className="fixed top-0 left-0 w-full h-full bg-gray-500 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded shadow">Loading...</div>
                </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={handleSavePermissions}
                >
                    Save Permissions
                </button>
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
