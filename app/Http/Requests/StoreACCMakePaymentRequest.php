<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreACCMakePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Set to true if you have authentication and authorization logic
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'transdate' => 'required|date',
            'total_amount' => 'required|numeric|min:0',
            'facilityoption_id' => 'required|exists:facilityoptions,id',
            'description' => 'nullable|string|max:255',
            'stage' => 'required|integer|in:1,2,3', // e.g., 1:Pending, 2:Approved, 3:Paid
            'recipient_type' => 'required|string', // e.g., 'App\Models\Supplier'
            'recipient_id' => 'required|integer', // Check if the recipient exists based on type
            'payment_method' => 'nullable|string|max:100',
            'reference_number' => 'nullable|string|max:255',
            'currency' => 'required|string|max:3',

            // Validation for Payment Items (as an array)
            'items' => 'required|array|min:1',
            'items.*.payable_id' => 'required|integer',
            'items.*.payable_type' => 'required|string',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.amount' => 'required|numeric|min:0',

            // Validation for Documents (as an array)
            'documents' => 'nullable|array',
            'documents.*.file' => 'required|file|mimes:pdf,jpg,png,jpeg|max:2048', // 2MB max
            'documents.*.description' => 'nullable|string|max:255',
        ];
    }
}
