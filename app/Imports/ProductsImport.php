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
        // Cache categories and units to avoid repeated DB queries inside the loop
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
        // Look up the IDs from the cached collections
        $categoryId = $this->categories[$row['category_name']] ?? null;
        $unitId = $this->units[$row['unit_name']] ?? null;

        // Use a transaction to ensure both product and item are created or neither
        return DB::transaction(function () use ($row, $categoryId, $unitId) {
            $product = SIV_Product::create([
                'name'         => $row['name'],
                'displayname'  => $row['displayname'],
                'category_id'  => $categoryId,
                'package_id'   => $unitId,
                'costprice'    => $row['costprice'],
                'reorderlevel' => $row['reorderlevel'],
                'display'      => true, // Set default values
                'addtocart'    => true,
            ]);

            $itemGroup = BLSItemGroup::firstOrCreate(['name' => 'Inventory']);

            BLSItem::create([
                'product_id'   => $product->id,
                'itemgroup_id' => $itemGroup->id,
                'name'         => $row['name'],
                'price1'       => 0, // Default prices
                'addtocart'    => true,
                'defaultqty'   => 1,
            ]);
            
            return $product;
        });
    }

    /**
     * Define the validation rules for each row.
     *
     * @return array
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:siv_products,name',
            'displayname' => 'required|string|max:255',
            'category_name' => 'required|string|exists:siv_productcategories,name',
            'unit_name' => 'required|string|exists:siv_packagings,name',
            'costprice' => 'required|numeric|min:0',
            'reorderlevel' => 'required|integer|min:0',
        ];
    }
}