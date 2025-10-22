<?php

namespace App\Http\Controllers\Traits;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

trait GeneratesUniqueNumbers
{
    /**
     * Generates a unique number for a given model and column.
     *
     * @param string $modelClass The Eloquent model class to check against (e.g., BILSale::class).
     * @param string $column The database column to check for uniqueness (e.g., 'receiptno').
     * @param string $prefix The prefix for the generated number (e.g., 'REC').
     * @return string The generated unique number.
     */
    protected function generateUniqueNumber(string $modelClass, string $column, string $prefix): string
    {
        // Ensure the provided class is a valid Eloquent model
        if (!is_subclass_of($modelClass, Model::class)) {
            throw new \InvalidArgumentException("{$modelClass} is not a valid Eloquent model.");
        }

        do {
            // Generate a number based on the current timestamp and a random component
            $number = $prefix . Carbon::now()->format('YmdHis') . rand(100, 999);
        } while ($modelClass::where($column, $number)->exists()); // Check for existence in the specified model

        return $number;
    }
}