<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice - {{ $sale->invoiceno ?? $sale->receiptno }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        .container { width: 100%; margin: 0 auto; }
        .header, .footer { text-align: center; }
        .header h1 { margin: 0; }
        
        /* Table Styles */
        .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        
        /* General cell style - Defaults to Left */
        .items-table th, .items-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        } 
        .items-table th { background-color: #f2f2f2; }
        
        /* --- THE FIX IS HERE --- */
        /* We target the table cell specifically so this rule wins */
        .items-table th.text-right,
        .items-table td.text-right { 
            text-align: right; 
        }
        
        /* Helper for the Totals table */
        .totals-table td.text-right { text-align: right; }

        .footer { margin-top: 40px; font-size: 10px; color: #777; }
        .totals-table { width: 40%; float: right; margin-top: 20px; border-collapse: collapse; }
        .totals-table td { padding: 5px; border: 1px solid #ddd; }
        .clearfix::after { content: ""; clear: both; display: table; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    {{-- LEFT COLUMN: LOGO --}}
                    <td style="width: 30%; vertical-align: top; text-align: left; border: none;">
                        @if(!empty($facility->logo_path))
                            <img src="{{ storage_path('app/public/' . $facility->logo_path) }}" style="max-height: 80px; max-width: 150px;" alt="Logo">
                        @endif
                    </td>

                    {{-- RIGHT COLUMN: FACILITY DETAILS --}}
                    <td style="width: 70%; vertical-align: top; text-align: right; border: none;">
                        <h1 style="margin: 0; font-size: 20px; color: #333;">{{ $facility->name ?? 'Facility Name' }}</h1>
                        
                        <p style="margin: 5px 0; font-size: 11px; line-height: 1.4; color: #555;">
                            {{ $facility->address ?? '' }}<br>
                            @if($facility->phone) Tel: {{ $facility->phone }} @endif
                            @if($facility->email) | Email: {{ $facility->email }} @endif
                            @if($facility->website) <br>Web: {{ $facility->website }} @endif
                        </p>

                        @if($facility->tin)
                            <div style="margin-top: 5px; font-size: 11px; font-weight: bold;">
                                TIN: {{ $facility->tin }}
                                @if($facility->vrn) | VRN: {{ $facility->vrn }} @endif
                            </div>
                        @endif
                    </td>
                </tr>
            </table>

            <div style="text-align: center; border-top: 2px solid #eee; border-bottom: 2px solid #eee; padding: 8px 0; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                    {{ $sale->invoiceno ? 'TAX INVOICE' : 'CASH RECEIPT' }}
                </h2>
            </div>
        </div>

        <table style="width:100%; margin-top: 20px;">
            <tr>
                <td style="width:50%; vertical-align: top; border: none;">
                    <strong>Bill To:</strong><br>
                    @if($sale->customer)
                        @if($sale->customer->customer_type === 'individual')
                            {{ $sale->customer->first_name }} {{ $sale->customer->surname }}<br>
                        @else
                            {{ $sale->customer->company_name }}<br>
                        @endif
                        {{ $sale->customer->phone ?? '' }}<br>
                        {{ $sale->customer->email ?? '' }}
                    @else
                        Walk-in Customer
                    @endif
                </td>
                <td style="width:50%; text-align:right; vertical-align: top; border: none;">
                    <strong>Ref No:</strong> {{ $sale->invoiceno ?? $sale->receiptno }}<br>
                    <strong>Date:</strong> {{ $sale->created_at->format('d-M-Y') }}<br>
                    <strong>Currency:</strong> {{ $sale->currency_code }}
                </td>
            </tr>
        </table>

        {{-- ITEMS TABLE --}}
        <table class="items-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Item Description</th>                    
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sale->items as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item->item->name ?? 'N/A' }}</td>
                    {{-- Class matches CSS rule .items-table td.text-right --}}
                    <td class="text-right">{{ number_format($item->price, 2) }}</td>
                    <td class="text-right">{{ number_format($item->quantity, 2) }}</td>
                    <td class="text-right">{{ number_format($item->price * $item->quantity, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="clearfix">
            <table class="totals-table">
                <tr>
                    <td><strong>Total Due</strong></td>
                    <td class="text-right">{{ number_format($sale->totaldue, 2) }}</td>
                </tr>
                <tr>
                    <td><strong>Amount Paid</strong></td>
                    <td class="text-right">{{ number_format($sale->totalpaid, 2) }}</td>
                </tr>
                <tr>
                    <td><strong>Balance</strong></td>
                    <td class="text-right">{{ number_format($sale->totaldue - $sale->totalpaid, 2) }}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on {{ now()->format('Y-m-d H:i:s') }}</p>
        </div>
    </div>
</body>
</html>