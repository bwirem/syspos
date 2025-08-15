<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateACCMakePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
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
            'stage' => 'required|integer|in:1,2,3',
            'recipient_type' => 'required|string',
            'recipient_id' => 'required|integer',
            'payment_method' => 'nullable|string|max:100',
            'reference_number' => 'nullable|string|max:255',
            'currency' => 'required|string|max:3',

            // Items and documents rules for updating
            'items' => 'required|array|min:1',
            'items.*.payable_id' => 'required|integer',
            'items.*.payable_type' => 'required|string',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.amount' => 'required|numeric|min:0',

            'documents' => 'nullable|array',
            'documents.*.file' => 'nullable|file|mimes:pdf,jpg,png,jpeg|max:2048', // Nullable on update
            'documents.*.description' => 'nullable|string|max:255',
        ];
    }
}
