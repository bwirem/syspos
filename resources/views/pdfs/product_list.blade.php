<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Product List Report</title>
    <style>
        body { font-family: sans-serif; font-size: 11px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 5px 0; color: #555; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9px; color: #777; border-top: 1px solid #ddd; padding-top: 5px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Inventory Product List</h1>
        <p>Generated on {{ now()->format('d-M-Y H:i A') }}</p>
    </div>

    @if(!empty($categoryName))
        <p><strong>Filter Category:</strong> {{ $categoryName }}</p>
    @endif

    <table>
        <thead>
            <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th class="text-right">Cost</th>
                {{-- Dynamic Price Headers --}}
                @foreach($activePriceCategories as $priceCat)
                    <th class="text-right">{{ $priceCat['label'] }}</th>
                @endforeach
                <th class="text-center">Reorder Lvl</th>
            </tr>
        </thead>
        <tbody>
            @foreach($products as $product)
                <tr>
                    <td>
                        {{ $product->name }}
                        @if($product->displayname && $product->displayname !== $product->name)
                            <br><small style="color:#666">({{ $product->displayname }})</small>
                        @endif
                    </td>
                    <td>{{ $product->category->name ?? '-' }}</td>
                    <td>{{ $product->unit->name ?? '-' }}</td>
                    <td class="text-right">{{ number_format($product->costprice, 2) }}</td>
                    
                    {{-- Dynamic Price Columns --}}
                    @foreach($activePriceCategories as $priceCat)
                        <td class="text-right">
                            {{ isset($product->blsItem->{$priceCat['key']}) 
                                ? number_format($product->blsItem->{$priceCat['key']}, 2) 
                                : '0.00' 
                            }}
                        </td>
                    @endforeach
                    
                    <td class="text-center">{{ $product->reorderlevel }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        Page <span class="page-number"></span>
    </div>
    
    {{-- Simple script for PDF page numbers if using DOMPDF 0.8+ --}}
    <script type="text/php">
        if (isset($pdf)) {
            $x = 270;
            $y = 820;
            $text = "Page {PAGE_NUM} of {PAGE_COUNT}";
            $font = null;
            $size = 9;
            $color = array(0,0,0);
            $word_space = 0.0;  //  default
            $char_space = 0.0;  //  default
            $angle = 0.0;   //  default
            $pdf->page_text($x, $y, $text, $font, $size, $color, $word_space, $char_space, $angle);
        }
    </script>
</body>
</html>