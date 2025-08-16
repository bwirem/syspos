<?php

namespace App\Http\Controllers;


use App\Models\Loan;
use App\Models\LoanGuarantor;
use App\Models\BLSCustomer;

use App\Models\BLSPackage;
use App\Models\FacilityBranch;
use App\Models\FacilityOption;

use App\Enums\LoanStage; // Or your constants class
use App\Enums\ApprovalStatus;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;


class LoanApplicationController extends Controller
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
        //    (and an empty collection for facilityBranches to pass to the view)
        if ($userFacilityBranches->isEmpty()) {
            return inertia('LoanApplication/Index', [
                'loans' => ['data' => []], // Or an empty paginator: Loan::query()->paginate(10)
                'facilityBranches' => collect(), // Pass empty collection
                'filters' => $request->only(['search', 'stage', 'facilitybranch_id']), // Include facilitybranch_id
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

        // 4c. Default stage filter (always apply this base filter)
        $query->where('stage', '<=', '3');

        // 4d. Filtering by specific stage (if requested, overrides/refines the default)
        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        // 4e. Filtering by specific facility branch (if requested)
        //    This will further filter from the branches the user already has access to (due to whereIn)
        if ($request->filled('facilitybranch_id')) {
            // Optional: You might want to double-check if $request->facilitybranch_id is in $userFacilityBranchIds
            // if (in_array($request->facilitybranch_id, $userFacilityBranchIds)) {
            //     $query->where('facilitybranch_id', $request->facilitybranch_id);
            // } else {
            //     // Handle case where user tries to filter by a branch they don't own - e.g., return no results
            //     $query->whereRaw('1 = 0'); // Effectively makes the query return nothing
            // }
            // Simpler: just apply the filter. The `whereIn` above provides the base security.
            $query->where('facilitybranch_id', $request->facilitybranch_id);
        }

        // 5. Paginate the results
        $loans = $query->orderBy('created_at', 'desc')->paginate(10);

        // 6. Return data to Inertia view
        return inertia('LoanApplication/Index', [
            'loans' => $loans,
            'facilityBranches' => $userFacilityBranches, // Pass the user's branches for dropdown
            'filters' => $request->only(['search', 'stage', 'facilitybranch_id']), // Include facilitybranch_id
        ]);
    }


    /**
     * Get the stage of a loan.
     *
     * @param  int  $loan
     * @return \Illuminate\Http\JsonResponse
     */
    
    public function getStage($customer_id)
    {
        // Find the most recent loan for the customer where stage is 3 (approved stage)
        $customer = BLSCustomer::where('id', $customer_id)->where('stage', 3)->latest()->first();

        // If no customer with stage 3 exists, it means the customer has not reached approval stage
        if (!$customer) {
            return response()->json([
                'allowed' => false, // Customer has not reached stage 3 (approved)
                'message' => 'This customer has not been approved for a loan application yet.'
            ]);
        }

        // Find the most recent loan for the customer
        $loan = Loan::where('customer_id', $customer_id)->latest()->first();

        // If no loan exists, it means the customer is new and can apply
        if (!$loan) {
            return response()->json([
                'allowed' => true, // New customer is allowed to apply for a loan
                'message' => 'This is a new customer. Loan application is allowed.'
            ]);
        }

        // If the loan's stage is 10 (Repaid), allow a new loan application
        if ($loan->stage == 10) {
            return response()->json([
                'allowed' => true,
                'message' => 'The customer has fully repaid their previous loan. Loan application is allowed.'
            ]);
        }

        // If the loan stage is different than 10 (e.g., unpaid or in-progress), block the new loan application
        return response()->json([
            'allowed' => false,
            'message' => 'This customer has an unpaid or ongoing loan. Would you like to submit a top-up application?',
            'highlight' => 'Would you like to submit a top-up application?'
        ]);
        
    }


    /**
     * Show the form for creating a new loan.
     */
    public function create()
    {
        $facilityOption = FacilityOption::first();

        return inertia('LoanApplication/Create', [          
            'loanTypes' => BLSPackage::all(),
            'facilityBranches' => FacilityBranch::all(),
            'facilityoption' => $facilityOption ? $facilityOption : null, // Set default value if null
        ]);
    }


    /**
     * Store a newly created loan in storage.
     */
    
    
     public function store(Request $request)
     {   
         $validated = $request->validate($this->validationRules());
         $mappedData = $this->mapLoanData($validated);
     
         // Handle file upload before transaction to prevent orphaned files
         if ($request->hasFile('applicationForm')) {
             $path = $request->file('applicationForm')->store('application_forms', 'public');
             $mappedData['application_form'] = $path;
         }
     
         try {
             $loan = DB::transaction(fn () => Loan::create($mappedData));
     
             return redirect()->route('loan0.edit', ['loan' => $loan->id]);

         } catch (\Exception $e) {
             // Rollback file if transaction fails
             if (isset($path)) Storage::disk('public')->delete($path);
     
             return back()->withErrors(['error' => 'Loan creation failed. Please try again.']);
         }
     }    
    


    /**
     * Show the form for editing the specified loan.
     */
    public function edit(Loan $loan)
    { 
        $loan->load('customer');  

        if (request()->wantsJson()) {  //Handle API requests separately
            return response()->json([
                'loan' => $loan,
                'loanTypes' => BLSPackage::all(),
                'facilityBranches' => FacilityBranch::all(),
                'facilityoption' => FacilityOption::first(),
            ]);
        }
        
        if($loan->stage == 1){
            $facilityOption = FacilityOption::first();

            return inertia('LoanApplication/Edit', [
                'loan' => $loan,
                'loanTypes' => BLSPackage::all(),
                'facilityBranches' => FacilityBranch::all(),
                'facilityoption' => $facilityOption ? $facilityOption : null, // Set default value if null
            ]);
           
        }else{

            $loan->load('loanGuarantors.guarantor'); // Eager load the relationship and the guarantor details

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

            if($loan->stage == 2){    
        
            return inertia('LoanApplication/Documentation', [
                'loan' => $loan,
                'loanTypes' => BLSPackage::all(),
            ]);

            }else{

                return inertia('LoanApplication/Submission', [
                    'loan' => $loan,
                    'loanTypes' => BLSPackage::all(),
                ]);
            }
            
        }     
        
    }

    /**
     * Update the specified loan in storage.
     */  
   
     public function update(Request $request, Loan $loan)
     {       
       
        $validated = $request->validate($this->validationRules());
        $mappedData = $this->mapLoanData($validated);
     
         try {
             
            DB::transaction(function () use ($request, $loan, &$mappedData) {
                $this->handleFileUpload($request, $loan, $mappedData);
                $loan->update($mappedData);
            });
     
            return response()->json([
                'success' => true, // Now a boolean
                'message' => 'Loan updated successfully!',
            ]);
            
                              
         } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Loan update failed. Please try again.']);
         }
     }
     

    /**
     * Update the specified loan in storage.
     */  
    
    
     public function next(Request $request, Loan $loan)
     {   

        if($loan->stage == 1){
        
            $validated = $request->validate($this->validationRules());
            $mappedData = $this->mapLoanData($validated);        
            $mappedData['stage'] = $validated['stage'] + 1; 
            
            try {
                DB::transaction(function () use ($request, $loan, &$mappedData) {
                    $this->handleFileUpload($request, $loan, $mappedData);
                    $loan->update($mappedData);
                });
        
                return redirect()->route('loan0.edit', ['loan' => $loan->id,'saved' => true])
                                ->with('success', 'Loan updated successfully!');
            } catch (\Exception $e) {
                return back()->withErrors(['error' => 'An error occurred while updating the loan. Please try again.']);
            }
        }
        else if($loan->stage == 2){

            $this->documentation($request,$loan);
        }
        else if($loan->stage == 3){

            $this->submit($request, $loan);

            return redirect()->route('loan0.index')->with('success', 'Loan submitted successfully!');

        }
       
    }
     

    /**
     * Update the specified loan in storage.
     */    
     
    private function documentation($request,$loan)
    {
        // Validate request fields
        $validator = Validator::make($request->all(), [
            'stage' => 'required|integer',
            'guarantors' => 'nullable|array|min:1',
            'guarantors.*.id' => [
                'nullable',
                Rule::exists('loan_guarantors', 'id')->where('loan_id', $loan->id),
            ], // Ensuring guarantor belongs to the loan
            'guarantors.*.guarantor_id' => 'required_with:guarantors|exists:bls_guarantors,id',
            'guarantors.*.collateral_doc' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:2048',
        ]);

        

        DB::transaction(function () use ($request, $loan) {
            // Update loan details
            $loan->update(['stage' => $request->input('stage') + 1]);

            // Fetch existing and updating guarantors
            $existingGuarantors = $loan->loanGuarantors()->pluck('guarantor_id')->toArray();
            $updatingGuarantors = collect($request->input('guarantors'))->pluck('guarantor_id')->map(fn($id) => (int) $id)->toArray();

            // Identify guarantors to delete
            $guarantorsToDelete = array_values(array_diff($existingGuarantors, $updatingGuarantors));
            $guarantorData = [];

            // Process new/updated guarantors
            if ($request->has('guarantors')) {
                foreach ($request->input('guarantors') as $index => $guarantor) {
                    $guarantorId = $guarantor['guarantor_id'];
                    $collateralDocPath = null;
                    $collateralDocName = null;

                    if ($request->hasFile("guarantors.{$index}.collateral_doc")) {
                        $file = $request->file("guarantors.{$index}.collateral_doc");

                        // Delete existing file if present
                        $existingGuarantor = LoanGuarantor::where('loan_id', $loan->id)
                            ->where('guarantor_id', $guarantorId)
                            ->first();

                        if ($existingGuarantor && $existingGuarantor->collateral_doc) {
                            $oldFilePath = storage_path('app/public/' . $existingGuarantor->collateral_doc);
                            if (file_exists($oldFilePath)) {
                                unlink($oldFilePath);
                            }
                        }

                        // Store new file
                        $filename = uniqid() . '.' . $file->getClientOriginalExtension();
                        $collateralDocPath = $file->storeAs('loan_guarantor_collateral', $filename, 'public');
                        $collateralDocName = $file->getClientOriginalName();
                    }

                    // Set attributes for the relationship
                    $attributes = ['user_id' => Auth::id()];
                    if ($collateralDocPath) {
                        $attributes['collateral_doc'] = $collateralDocPath;
                        $attributes['collateral_docname'] = $collateralDocName;
                    }

                    $guarantorData[$guarantorId] = $attributes;
                }

                // Sync relationships
                $loan->blsGuarantors()->syncWithoutDetaching($guarantorData);
            }

            // Delete unselected guarantors and their files
            if (!empty($guarantorsToDelete)) {
                LoanGuarantor::whereIn('guarantor_id', $guarantorsToDelete)
                    ->where('loan_id', $loan->id)
                    ->get()
                    ->each(function ($guarantor) {
                        if ($guarantor->collateral_doc) {
                            $filePath = storage_path('app/public/' . $guarantor->collateral_doc);
                            if (file_exists($filePath)) {
                                unlink($filePath);
                            }
                        }
                        $guarantor->delete();
                    });
            }
        });

        
        // Redirect to the 'edit' route for the current loan
        return redirect()->route('loan0.edit', ['loan' => $loan->id]);

    } 
   
   
    private function validationRules(): array
    {
        // Base validation rules
        $rules = [
            'customer_id' => 'nullable|exists:bls_customers,id',
            'loanType' => 'required|exists:bls_packages,id',
            'loanAmount' => 'required|numeric|min:0',
            'loanDuration' => 'required|integer|min:1',
            'interestRate' => 'required|numeric',
            'interestAmount' => 'required|numeric',
            'monthlyRepayment' => 'required|numeric',
            'totalRepayment' => 'required|numeric',
            'stage' => 'required|integer',
            'facilitybranch_id' => 'required|exists:facilitybranches,id',
        ];

        // Check if applicationForm is present
        if (request()->file('applicationForm') !== null) {
            $rules['applicationForm'] = 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:2048';
        }

        return $rules;
    }


    private function mapLoanData(array $validated): array
    {
        return [
            'customer_id' => $validated['customer_id'],
            'loan_type' => $validated['loanType'],
            'loan_amount' => $validated['loanAmount'],
            'loan_duration' => $validated['loanDuration'],
            'interest_rate' => $validated['interestRate'],
            'interest_amount' => $validated['interestAmount'],
            'monthly_repayment' => $validated['monthlyRepayment'],
            'total_repayment' => $validated['totalRepayment'],
            'stage' => $validated['stage'],
            'facilitybranch_id' => $validated['facilitybranch_id'],
            'user_id' => Auth::id(),
        ];
    }

     /**
     * Handle file upload safely.
     */
    private function handleFileUpload(Request $request, Loan $loan, array &$mappedData)
    {
        if ($request->hasFile('applicationForm')) {
            $newPath = $request->file('applicationForm')->store('application_forms', 'public');

            if ($newPath) { // Check for successful upload
                // Delete old file *only* if a new file was successfully uploaded
                if ($loan->application_form) { 
                    Storage::disk('public')->delete($loan->application_form);
                }
                $mappedData['application_form'] = $newPath;
            } else {
                // Handle the upload failure (log, throw exception, etc.)
                Log::error('Application form upload failed.');
                // Optionally add an error message to mappedData or throw an exception
                // $mappedData['upload_error'] = 'File upload failed.'; 
                // or throw new \Exception('File upload failed.');
            }


        } else{ //Add check for no new file submitted
            $mappedData['application_form'] = $loan->application_form; //keep old path
        }
    }


    private function submit($request, $loan)
    {    
          
        // Validate request fields.
        $validator = Validator::make($request->all(), [
            'remarks' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {

            DB::transaction(function () use ($request, $loan) {
                // Update loan stage to Loan Officer Review using Enum
                $loan->update([
                    'stage' => LoanStage::LoanOfficerReview->value,// Enum value for Loan Officer Review
                    'submit_remarks' => $request->input('remarks')
                ]);   
                
                // Create a new approval record for the next stage
                $loan->approvals()->create([
                    'stage' => LoanStage::LoanOfficerReview->value,
                    'status' => ApprovalStatus::Pending->value,
                    'approved_by' => auth()->user()->id,
                    // ... other fields ... (e.g., assigned approver)
                ]);
            });           
            

        } catch (\Exception $e) {
            Log::error('Error approving loan: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to approve loan. Please try again.'], 500);
        }
    }



    public function back(Loan $loan)
    { 
        // Check if the current stage is greater than 0
        if ($loan->stage > 1) {
            // Decrease the loan stage by 1
            $loan->update(['stage' => $loan->stage - 1]);
        } else {
            // Optionally, you can log or handle the case where the stage is already 0
            // Log::warning('Attempted to decrease loan stage below zero for loan ID: ' . $loan->id);
        }
    
        // Redirect to the 'edit' route for the current loan
        return redirect()->route('loan0.edit', ['loan' => $loan->id]);
    }    


    public function customerLoans($customerId)
    {
        $loan = Loan::with('payments') // Eager load payments
                ->where('customer_id', $customerId)
                ->where('stage', 8)
                ->first();

        if ($loan) {
            return response()->json([
                'loan' => $loan,
                'disburse_date' => $loan->created_at,//$loan->disburse_date, // Assuming you have a disburse_date column on your Loan model            
            ]);
        } else {
            return response()->json(['loan' => null]);
        }
    }


    
}