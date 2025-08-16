<?php

namespace App\Http\Controllers;

use App\Models\Loan;
use App\Models\LoanGuarantor;
use App\Models\BLSPackage;
use App\Models\FacilityBranch;

use App\Enums\LoanStage; // Or your constants class
use App\Enums\ApprovalStatus;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;


class LoanApprovalController extends Controller
{
    /**
     * Display a listing of loans.
     */
   
     public function index(Request $request)
    {
        $user = auth()->user();

        // 1. Get ALL facility branches associated with the authenticated user
        $userFacilityBranches = $user->facilityBranches()->get();

        // 2. If the user has no facility branches, return empty loans
        if ($userFacilityBranches->isEmpty()) {
            return inertia('LoanApproval/Index', [
                'loans' => ['data' => []], // Or an empty paginator: Loan::query()->paginate(10)
                'facilityBranches' => collect(), // Pass empty collection
                'filters' => $request->only(['search', 'stage', 'facilitybranch_id']),
            ]);
        }

        // 3. Get the IDs of the user's facility branches to filter loans
        $userFacilityBranchIds = $userFacilityBranches->pluck('id')->toArray();

        // 4. Build the Loan query
        $query = Loan::with(['customer', 'loanPackage', 'user']);

        // 4a. CRITICAL: Filter loans to only those in the user's assigned facility branches
        $query->whereIn('facilitybranch_id', $userFacilityBranchIds);

        // 4b. Search functionality
        if ($request->filled('search')) {
            $query->whereHas('customer', function ($q) use ($request) {
                $q->where('first_name', 'like', '%' . $request->search . '%')
                ->orWhere('other_names', 'like', '%' . $request->search . '%')
                ->orWhere('surname', 'like', '%' . $request->search . '%')
                ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }

        // 4c. Enforce base stage range for approvals (e.g., 4 to 6)
        $query->whereBetween('stage', [4, 6]); // Assuming stages 4, 5, 6 are for approval

        // 4d. Filtering by specific stage(s) from the request
        // This allows further refinement within the 4-6 range
        if ($request->filled('stage')) {
            $stages = explode(',', $request->stage); // Allows comma-separated stages like "4,5"
            $validStages = [];
            foreach ($stages as $stage) {
                $s = (int)trim($stage);
                if ($s >= 4 && $s <= 6) { // Ensure requested stages are within the valid approval range
                    $validStages[] = $s;
                }
            }
            if (!empty($validStages)) {
                $query->whereIn('stage', $validStages);
            }
        }

        // 4e. Filter by specific facility branch (if requested by user via UI filter)
        // This will further filter from the branches the user already has access to (due to whereIn)
        if ($request->filled('facilitybranch_id')) {
            // Ensure the requested facilitybranch_id is one the user has access to
            if (in_array($request->facilitybranch_id, $userFacilityBranchIds)) {
                $query->where('facilitybranch_id', $request->facilitybranch_id);
            } else {
                // If user tries to filter by a branch they don't own, return no results for that filter
                // Or handle as an error/ignore. For now, effectively makes query return nothing if this condition is met.
                $query->whereRaw('1 = 0');
            }
        }

        // 5. Paginate the results
        $loans = $query->orderBy('created_at', 'desc')->paginate(10);

        // 6. Return data to Inertia view
        return inertia('LoanApproval/Index', [
            'loans' => $loans,
            'facilityBranches' => $userFacilityBranches, // Pass all user's branches for dropdown
            'filters' => $request->only(['search', 'stage', 'facilitybranch_id']),
        ]);
    }
    
    /**
     * Show the form for editing the specified loan.
     */
    public function edit(Loan $loan)
    {
        //\Log::info($loan->load('approvals.approver.userGroup')->toArray());

        $loan->load('customer'); 
        $loan->load('loanGuarantors.guarantor'); // Eager load the relationship and the guarantor details       
        $loan->load('approvals.approver.userGroup'); 
       

        $loan->loanGuarantors->transform(function ($loanGuarantor) {
            return [    
                //'id' => $loanGuarantor->id,         
                'collateral_doc' => $loanGuarantor->collateral_doc, // Or format as needed    
                'collateralDocName' => $loanGuarantor->collateral_docname,         
                'first_name' => $loanGuarantor->guarantor->first_name,               
                'surname' => $loanGuarantor->guarantor->surname,
                'company_name' => $loanGuarantor->guarantor->company_name,
                'guarantor_type' => $loanGuarantor->guarantor->guarantor_type,
                'guarantor_id' => $loanGuarantor->guarantor->id,  

            ];
        });

        return inertia('LoanApproval/ManagerReview', [
            'loan' => $loan,
            'loanTypes' => BLSPackage::all(),
        ]);
           
    }

    /**
     * Show the form for approve the specified loan.
     */
         
    public function approve(Request $request, Loan $loan)
    {
        // ... validation ...
    
        DB::transaction(function () use ($request, $loan) {
            $currentStage = LoanStage::from($loan->stage);
    
            if (!$currentStage) {
                // Handle invalid stage (e.g., throw an exception or return an error response)
                abort(400, 'Invalid loan stage.'); 
            }
    
    
            $nextStage = match ($currentStage) {
                LoanStage::LoanOfficerReview => LoanStage::ManagerReview,
                LoanStage::ManagerReview => LoanStage::CommitteeReview,
                LoanStage::CommitteeReview => LoanStage::Approved,
                default => null, // No next stage (already approved or rejected, or in an unapprovable state)
            };
    
            $approval = $loan->approvals()->where([
                //'approved_by' => auth()->user()->id,
                'stage' => $currentStage->value,  // Use ->value here
                'status' => ApprovalStatus::Pending->value // Assuming ApprovalStatus is also an enum
            ])->firstOrFail();    
    
    
            // Update the current approval record
            $approval->update([
                'approved_by' => auth()->user()->id,
                'status' => ApprovalStatus::Approved->value, 
                'remarks' => $request->input('remarks')
            ]);
    
            if ($nextStage) {
                // Update loan stage
                $loan->update(['stage' => $nextStage->value]);
    
                // Create a new approval record for the next stage
                $loan->approvals()->create([
                    'stage' => $nextStage->value,
                    'status' => ApprovalStatus::Pending->value,
                    'approved_by' => auth()->user()->id,
                    // ... other fields ... (e.g., assigned approver)
                ]);
    
                // ... send notification to the next approver ...
            } 
    
        });
    
        return redirect()->route('loan1.index')->with('success', 'Loan review approved successfully!');
    }
      
   
}