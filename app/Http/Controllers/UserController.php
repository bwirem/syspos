<?php
namespace App\Http\Controllers;

use App\Models\User
;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        $query = User::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $users = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('UserManagement/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new user.
     */
    public function create()
    {
        return inertia('UserManagement/Users/Create');
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'usergroup_id' => 'nullable|exists:sexp_usergroups,id',
        ]);

        // Create the user
        User::create($validated);

        return redirect()->route('usermanagement.users.index')
            ->with('success', 'User created successfully.');
    }

    /**
     * Show the form for editing the specified user.
     */
    public function edit(User $user)
    {
        return inertia('UserManagement/Users/Edit', [
            'user' => $user,
        ]);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'usergroup_id' => 'nullable|exists:sexp_usergroups,id',
        ]);

        // Update the user
        $user->update($validated);

        return redirect()->route('usermanagement.users.index')
            ->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(User $user)
    {
        $user->delete();

        return redirect()->route('usermanagement.users.index')
            ->with('success', 'User deleted successfully.');
    }

    /**
     * Search for users based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        //$users = User::where('name', 'like', '%' . $query . '%')->get();
        $users = User::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['users' => $users]);
    }
}