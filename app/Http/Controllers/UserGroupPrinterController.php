<?php

namespace App\Http\Controllers;

use App\Models\UserGroupPrinter;
use App\Models\UserGroup;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserGroupPrinterController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = UserGroupPrinter::query()->with('usergroup'); // Eager load usergroup

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('printername', 'like', '%' . $search . '%')
                  ->orWhere('machinename', 'like', '%' . $search . '%')
                  ->orWhere('documenttypecode', 'like', '%' . $search . '%');
            });
        }

        // Paginate the results
        $printers = $query->orderBy('created_at', 'desc')->paginate(10);

        return Inertia::render('UserManagement/UserGroupPrinters/Index', [
            'printers' => $printers,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('UserManagement/UserGroupPrinters/Create', [
            'usergroups' => UserGroup::all(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'usergroup_id' => 'required|exists:usergroups,id',
            'machinename' => 'nullable|string|max:50',
            'documenttypecode' => 'required|string|max:50',
            'printername' => 'required|string|max:255',
            'autoprint' => 'boolean',
            'printtoscreen' => 'boolean',
            'printedwhen' => 'integer',
        ]);

        UserGroupPrinter::create($validated);

        return redirect()->route('usermanagement.usergroupprinters.index')
            ->with('success', 'Printer configuration created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(UserGroupPrinter $usergroupprinter)
    {
        return Inertia::render('UserManagement/UserGroupPrinters/Edit', [
            'printer' => $usergroupprinter,
            'usergroups' => UserGroup::all(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, UserGroupPrinter $usergroupprinter)
    {
        $validated = $request->validate([
            'usergroup_id' => 'required|exists:usergroups,id',
            'machinename' => 'nullable|string|max:50',
            'documenttypecode' => 'required|string|max:50',
            'printername' => 'required|string|max:255',
            'autoprint' => 'boolean',
            'printtoscreen' => 'boolean',
            'printedwhen' => 'integer',
        ]);

        $usergroupprinter->update($validated);

        return redirect()->route('usermanagement.usergroupprinters.index')
            ->with('success', 'Printer configuration updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(UserGroupPrinter $usergroupprinter)
    {
        $usergroupprinter->delete();

        return redirect()->route('usermanagement.usergroupprinters.index')
            ->with('success', 'Printer configuration deleted successfully.');
    }
}