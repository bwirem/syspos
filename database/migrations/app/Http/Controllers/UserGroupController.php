<?php
namespace App\Http\Controllers;

use App\Models\UserGroup
;
use Illuminate\Http\Request;

class UserGroupController extends Controller
{
    /**
     * Display a listing of usergroups.
     */
    public function index(Request $request)
    {
        $query = UserGroup::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $usergroups = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('UserManagement/UserGroups/Index', [
            'usergroups' => $usergroups,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        return inertia('UserManagement/UserGroups/Create');
    }

    /**
     * Store a newly created item in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the item
        UserGroup::create($validated);

        return redirect()->route('usermanagement.usergroups.index')
            ->with('success', 'Item created successfully.');
    }

    /**
     * Show the form for editing the specified item.
     */
    public function edit(UserGroup $usergroup)
    {
        return inertia('UserManagement/UserGroups/Edit', [
            'usergroup' => $usergroup,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, UserGroup $usergroup)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the item
        $usergroup->update($validated);

        return redirect()->route('usermanagement.usergroups.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(UserGroup $usergroup)
    {
        $usergroup->delete();

        return redirect()->route('usermanagement.usergroups.index')
            ->with('success', 'Item deleted successfully.');
    }

    /**
     * Search for usergroups based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');      
        $groups = UserGroup::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['groups' => $groups]);
    }
}