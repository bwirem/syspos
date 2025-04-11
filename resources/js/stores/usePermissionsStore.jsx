import { create } from "zustand";

const usePermissionsStore = create((set) => ({
    modules: [],
    moduleItems: {},
    fetchPermissions: async () => {
        try {
            const response = await fetch(route("usermanagement.userpermission.modulesAndItems"));
            const data = await response.json(); // Fetch data properly

            set({
                modules: data.modules,
                moduleItems: data.moduleItems,
            });
        } catch (error) {
            console.error("Error fetching modules:", error);
        }
    },
}));

export default usePermissionsStore;

