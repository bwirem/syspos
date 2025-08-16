<?php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserGroup;
use App\Models\FacilityBranch;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
        return inertia('UserManagement/Users/Create', [         
            'userGroups' => UserGroup::all(),
            'facilityBranches' => FacilityBranch::all(),
        ]);
        
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:8',
            'usergroup_id' => 'required|exists:usergroups,id',
            'facilitybranch_id' => 'required|exists:facilitybranches,id',
            'selectedBranches' => 'array',
            'selectedBranches.*' => 'exists:facilitybranches,id', // Validate each branch ID
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'usergroup_id' => $validated['usergroup_id'],
            'facilitybranch_id' => $validated['facilitybranch_id'], // Store the primary branch
        ]);

        // Attach the selected branches
        $user->facilityBranches()->attach($validated['selectedBranches']);


        return redirect()->route('usermanagement.users.index')
            ->with('success', 'User created successfully.');
    }

    /**
     * Show the form for editing the specified user.
     */
    public function edit(User $user)
    {
        $user->load('facilityBranches'); // Eager load the relationship

        return inertia('UserManagement/Users/Edit', [
            'user' => $user,
            'userGroups' => UserGroup::all(),
            'facilityBranches' => FacilityBranch::all(),
            'assignedBranchIds' => $user->facilityBranches->pluck('id'), // Send assigned branch IDs
        ]);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                Rule::unique('users')->ignore($user->id),
            ],
            'usergroup_id' => 'required|exists:usergroups,id',
            'facilitybranch_id' => 'required|exists:facilitybranches,id',
            'selectedBranches' => 'array', 
            'selectedBranches.*' => 'exists:facilitybranches,id', 
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'usergroup_id' => $validated['usergroup_id'],
            'facilitybranch_id' => $validated['facilitybranch_id'],
        ]);

        // Sync the selected branches using the correct pivot table name
        $user->facilityBranches()->sync($validated['selectedBranches']);

        return redirect()->route('usermanagement.users.index')
            ->with('success', 'User updated successfully.');
    }
  
    /**
     * Show the form for resetting the password of the specified user.
     */
    public function resetPassword(Request $request, User $user)
    {
        // Validate input
        $validated = $request->validate([
            'password' => 'required|string|min:8',
        ]);

        // Hash the password
        $validated['password'] = Hash::make($validated['password']);

        Log::info('Start processing purchase update:', ['user' => $user, 'request_data' => $request->all()]);

        // Update the user
        $user->update($validated);

        // Return a success response in JSON format
        return response()->json([
            'message' => 'Password reset successfully.',
        ], 200);
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