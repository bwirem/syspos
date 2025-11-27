<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductsExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    protected $products;
    protected $activePriceCategories;

    public function __construct($products, $activePriceCategories)
    {
        $this->products = $products;
        $this->activePriceCategories = $activePriceCategories;
    }

    public function collection()
    {
        return $this->products;
    }

    public function headings(): array
    {
        $headers = [
            'Product Name',
            'Display Name',
            'Category',
            'Unit',
            'Cost Price',
        ];

        // Add dynamic headers for active prices
        foreach ($this->activePriceCategories as $cat) {
            $headers[] = $cat['label'];
        }

        $headers[] = 'Reorder Level';

        return $headers;
    }

    public function map($product): array
    {
        $row = [
            $product->name,
            $product->displayname,
            $product->category->name ?? '',
            $product->unit->name ?? '',
            (float) $product->costprice,
        ];

        // Add dynamic price values
        foreach ($this->activePriceCategories as $cat) {
            $row[] = isset($product->blsItem->{$cat['key']}) 
                ? (float) $product->blsItem->{$cat['key']} 
                : 0.00;
        }

        $row[] = $product->reorderlevel;

        return $row;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}