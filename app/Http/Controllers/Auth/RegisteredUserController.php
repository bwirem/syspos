<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\UserPermissionController;

use App\Models\User;
use App\Models\UserGroup;

use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{

    protected $userPermissionController;

    public function __construct(UserPermissionController $userPermissionController)
    {
        $this->userPermissionController = $userPermissionController;
    }


    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Check if the user group 'Admin' exists or create it
        $userGroup = UserGroup::firstOrCreate(['name' => 'Admin']);

        // Assign permissions to the 'Admin' group if it was just created
        if ($userGroup->wasRecentlyCreated) {
            $this->userPermissionController->assignAllPermissionsToAdmin($userGroup);
        }


        // Create a new user associated with the user group
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'usergroup_id' => $userGroup->id,
        ]);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}