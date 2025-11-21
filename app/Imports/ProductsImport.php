<?php

namespace App\Imports;

use App\Models\SIV_Product;
use App\Models\SIV_ProductCategory;
use App\Models\SIV_Packaging;
use App\Models\BLSItemGroup;
use App\Models\BLSItem;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class ProductsImport implements ToModel, WithHeadingRow, WithValidation
{
    private $categories;
    private $units;

    public function __construct()
    {
        $this->categories = SIV_ProductCategory::pluck('id', 'name');
        $this->units = SIV_Packaging::pluck('id', 'name');
    }

    /**
    * @param array $row
    *
    * @return \Illuminate\Database\Eloquent\Model|null
    */
    public function model(array $row)
    {
        $categoryId = $this->categories[$row['category_name']] ?? null;
        $unitId = $this->units[$row['unit_name']] ?? null;

        return DB::transaction(function () use ($row, $categoryId, $unitId) {
            // --- THIS IS THE FIX ---
            // Create the product with ALL required fields, providing defaults for those not in the Excel file.
            $product = SIV_Product::create([
                'name'           => $row['name'],
                'displayname'    => $row['displayname'],
                'category_id'    => $categoryId,
                'package_id'     => $unitId,
                'costprice'      => $row['costprice'],
                'reorderlevel'   => $row['reorderlevel'],
                
                // Add default values for all other non-nullable fields
                'prevcost'       => $row['costprice'], // Default prevcost to the current costprice on import
                'averagecost'    => $row['costprice'], // Default averagecost to the current costprice on import
                'defaultqty'     => 1,
                'addtocart'      => true,
                'hasexpiry'      => false,
                'expirynotice'   => false,
                'display'        => true,
            ]);

            $itemGroup = BLSItemGroup::firstOrCreate(['name' => 'Inventory']);

            // Also ensure the corresponding BLSItem has all necessary defaults
            BLSItem::create([
                'product_id'   => $product->id,
                'itemgroup_id' => $itemGroup->id,
                'name'         => $row['name'],
                'price1'       => $row['price1'],
                'price2'       => 0,
                'price3'       => 0,
                'price4'       => 0,
                'addtocart'    => true,
                'defaultqty'   => 1,
            ]);
            
            return $product;
        });
    }

    public function rules(): array
    {
        // ... rules remain the same ...
        return [
            'name' => 'required|string|max:255|unique:siv_products,name',
            'displayname' => 'required|string|max:255',
            'category_name' => 'required|string|exists:siv_productcategories,name',
            'unit_name' => 'required|string|exists:siv_packagings,name',
            'costprice' => 'required|numeric|min:0',
            'reorderlevel' => 'required|integer|min:0',
            'price1' => 'required|numeric|min:0',
        ];
    }
}