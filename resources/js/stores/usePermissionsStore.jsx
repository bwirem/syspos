import { create } from "zustand";

// Helper function to safely get items from sessionStorage
const getCachedPermissions = () => {
    try {
        const cachedModules = sessionStorage.getItem('userModules');
        const cachedModuleItems = sessionStorage.getItem('userModuleItems');

        if (cachedModules && cachedModuleItems) {
            return {
                modules: JSON.parse(cachedModules),
                moduleItems: JSON.parse(cachedModuleItems),
            };
        }
    } catch (error) {
        console.error("Failed to parse cached permissions:", error);
    }
    // Return a default empty state if cache is missing or invalid
    return { modules: [], moduleItems: {} };
};

const usePermissionsStore = create((set, get) => ({
    // 1. HYDRATE: Initialize state directly from sessionStorage
    ...getCachedPermissions(),

    // The fetch action now acts more like a "fetch if needed" function
    fetchPermissions: async () => {
        // 2. CHECK: Only fetch if the store is currently empty.
        // `get()` is a Zustand function to access the current state inside an action.
        if (get().modules.length > 0) {
            console.log("Permissions already loaded from cache or a previous fetch.");
            return; // Don't re-fetch if we already have data
        }

        try {
            console.log("No permissions in store, fetching from API...");
            // Using axios as in your previous examples, but fetch is also fine.
            // Ensure you have a global `route` helper or import it.
            const response = await axios.get(route("usermanagement.userpermission.modulesAndItems"));
            const data = response.data; // with axios, data is on the .data property

            // 3. UPDATE & CACHE: Update the store's state and save to sessionStorage
            set({
                modules: data.modules,
                moduleItems: data.moduleItems,
            });

            sessionStorage.setItem('userModules', JSON.stringify(data.modules));
            sessionStorage.setItem('userModuleItems', JSON.stringify(data.moduleItems));

        } catch (error) {
            console.error("Error fetching permissions:", error);
            // Optional: You could set an error state here
            // set({ error: "Failed to load permissions" });
        }
    },
    
    // Optional: Action to clear permissions on logout
    clearPermissions: () => {
        sessionStorage.removeItem('userModules');
        sessionStorage.removeItem('userModuleItems');
        set({ modules: [], moduleItems: {} });
    }
   
}));

export default usePermissionsStore;

