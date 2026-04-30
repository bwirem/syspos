<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - {{ $sale->invoiceno ?? $sale->receiptno }}</title>
    <style>
        /* 
           1. PAGE SETUP 
           Sets the paper size to 80mm width. 
           Auto height allows the paper to unroll as long as needed.
        */
        @page {
            margin: 0;
            size: 80mm auto;
        }

        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.3;
            color: #000000;
            margin: 0;
            padding: 0;
            background-color: #fff;
        }

        /* 
           2. CONTAINER 
           72mm is the "Safe Area" for 80mm printers.
           This prevents text from being cut off at the edges.
        */
        .receipt {
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            padding: 2mm 0; 
        }

        /* UTILITIES */
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        
        .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
            width: 100%;
        }

        .divider-solid {
            border-top: 1px solid #000;
            margin: 6px 0;
            width: 100%;
        }

        /* HEADER */
        .logo-img {
            max-width: 40mm;
            height: auto;
            /* Grayscale makes logos print sharper on thermal paper */
            filter: grayscale(100%); 
        }

        .shop-name {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            margin-top: 5px;
        }

        .shop-info {
            font-size: 10px;
            margin-bottom: 5px;
        }

        .receipt-title {
            font-size: 15px;
            font-weight: 800;
            border: 2px solid #000;
            display: inline-block;
            padding: 2px 8px;
            margin: 5px 0;
        }

        /* META INFO */
        .meta-info {
            font-size: 11px;
        }

        /* TABLE STYLES */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 5px;
        }

        th {
            text-align: left;
            border-bottom: 2px solid #000;
            padding-bottom: 3px;
            font-size: 10px;
            text-transform: uppercase;
        }

        td {
            padding: 3px 0;
            vertical-align: top;
        }

        /* COLUMN WIDTHS (Optimized for 72mm) */
        .col-item { width: 45%; padding-right: 2px; }
        .col-qty  { width: 15%; text-align: center; }
        .col-price{ width: 20%; text-align: right; }
        .col-total{ width: 20%; text-align: right; }

        .item-name {
            display: block;
            font-weight: 600;
        }

        /* TOTALS SECTION */
        .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        
        .grand-total {
            font-size: 14px;
            font-weight: 800;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 5px 0;
            margin-top: 5px;
        }

        /* QR CODE (Fixed for SVG) */
        .qr-section {
            text-align: center;
            margin: 10px 0;
        }
        .qr-section img {
            width: 100px; /* Perfect size for 80mm scanning */
            height: auto;
        }
        .qr-text {
            font-size: 9px;
            font-family: monospace;
            margin-top: 2px;
        }

        /* FOOTER */
        .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 10px;
        }

        /* FEED PADDING */
        .feed-padding {
            height: 15mm; /* Extra space so cutter doesn't cut text */
        }
    </style>
</head>

<body>

<div class="receipt">

    <!-- 1. LOGO & HEADER -->
    <div class="center">
        <!-- We use Base64 encoding to ensure the logo loads in PDF generators -->
        @if(!empty($facility->logo_path) && file_exists(storage_path('app/public/' . $facility->logo_path)))
            <img class="logo-img" src="data:image/png;base64,{{ base64_encode(file_get_contents(storage_path('app/public/' . $facility->logo_path))) }}" alt="Logo">
        @endif

        <div class="shop-name">{{ $facility->name ?? 'FACILITY NAME' }}</div>

        <div class="shop-info">
            {!! $facility->address ? nl2br(e($facility->address)) : '' !!}<br>
            @if($facility->phone) <strong>Tel:</strong> {{ $facility->phone }}<br>@endif
            @if($facility->tin) TIN: {{ $facility->tin }} | @endif
            @if($facility->vrn) VRN: {{ $facility->vrn }} @endif
        </div>

        <div class="receipt-title">
            {{ $sale->invoiceno ? 'TAX INVOICE' : 'RECEIPT' }}
        </div>
    </div>

    <!-- 2. META INFO -->
    <div class="meta-info">
        <div style="display:flex; justify-content:space-between;">
            <span><strong>Ref:</strong> {{ $sale->invoiceno ?? $sale->receiptno }}</span>
            <span><strong>Date:</strong> {{ $sale->created_at->format('d/m/Y H:i') }}</span>
        </div>
        
        <div class="divider"></div>
        
        <div>
            <strong>Customer:</strong>
            @if($sale->customer)
                {{ $sale->customer->customer_type === 'individual' 
                    ? $sale->customer->first_name.' '.$sale->customer->surname 
                    : $sale->customer->company_name }}
            @else 
                Walk-in Client 
            @endif
        </div>
    </div>

    <!-- 3. ITEMS TABLE -->
    <table>
        <thead>
            <tr>
                <th class="col-item">Item</th>
                <th class="col-qty">Qty</th>
                <th class="col-price">Price</th>
                <th class="col-total">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sale->items as $item)
            <tr>
                <td class="col-item">
                    <span class="item-name">{{ $item->item->name ?? 'Item' }}</span>
                </td>
                {{-- (float)+0 trick removes decimal points from whole numbers --}}
                <td class="col-qty">{{ (float)$item->quantity + 0 }}</td>
                <td class="col-price">{{ number_format($item->price, 0) }}</td>
                <td class="col-total">{{ number_format($item->price * $item->quantity, 0) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="divider-solid"></div>

    <!-- 4. TOTALS CALCULATION -->
    <div class="totals">
        <div class="totals-row">
            <span>Total Due</span>
            <span class="bold">{{ number_format($sale->totaldue, 2) }}</span>
        </div>
        
        <div class="totals-row">
            <span>Amount Paid</span>
            <span>{{ number_format($sale->totalpaid, 2) }}</span>
        </div>

        @if($sale->totalpaid >= $sale->totaldue)
            <div class="totals-row grand-total">
                <span>CHANGE</span>
                <span>{{ number_format($sale->totalpaid - $sale->totaldue, 2) }}</span>
            </div>
        @else
            <div class="totals-row grand-total">
                <span>BALANCE DUE</span>
                <span>{{ number_format($sale->totaldue - $sale->totalpaid, 2) }}</span>
            </div>
        @endif
    </div>

    <div class="divider"></div>

    <!-- 5. QR CODE (SVG FIXED) -->
    <div class="qr-section">
        {{-- 
           SOLVED: We use format('svg') here.
           This generates XML text instead of an image file. 
           It does NOT require the Imagick extension to be installed on your PC.
        --}}
        <img src="data:image/svg+xml;base64, {!! base64_encode(QrCode::format('svg')->size(200)->margin(0)->generate($sale->invoiceno ?? $sale->receiptno)) !!} ">        
        
    </div>

    <!-- 6. FOOTER -->
    <div class="footer">
        Thank you for your business!<br>
        Served by: {{ Auth::user()->name ?? 'System' }}
    </div>

    <!-- 7. FEED PADDING -->
    <div class="feed-padding">.</div>

</div>

</body>
</html>