<!DOCTYPE html>
<html lang="en">
<head>
    {{-- Calculate the Delivery Note Number --}}
    @php
        $originalRef = $sale->invoiceno ?? $sale->receiptno;
        // Replace 'INV' or 'REC' with 'DN'
        $deliveryNodeNumber = str_replace(['INV', 'REC'], 'DN', $originalRef);
    @endphp

    <meta charset="UTF-8">
    <title>Delivery Note - {{ $deliveryNodeNumber }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        .container { width: 100%; margin: 0 auto; }
        .header, .footer { text-align: center; }
        .header h1 { margin: 0; }
        
        /* Table Styles */
        .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        
        /* Default Left Alignment */
        .items-table th, .items-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        }
        .items-table th { background-color: #f2f2f2; }
        
        /* Specific Right Alignment Fix - Forces right align on specific columns */
        .items-table th.text-right, 
        .items-table td.text-right { 
            text-align: right; 
        }
        
        .footer { margin-top: 40px; font-size: 10px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    {{-- LEFT COLUMN: LOGO --}}
                    <td style="width: 30%; vertical-align: top; text-align: left; border: none; padding: 0;">
                        @if(!empty($facility->logo_path))
                            <img src="{{ storage_path('app/public/' . $facility->logo_path) }}" style="max-height: 80px; max-width: 150px;" alt="Logo">
                        @endif
                    </td>

                    {{-- RIGHT COLUMN: FACILITY DETAILS --}}
                    <td style="width: 70%; vertical-align: top; text-align: right; border: none; padding: 0;">
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
                    DELIVERY NOTE
                </h2>
            </div>
        </div>

        <table style="width:100%; margin-top: 20px;">
            <tr>
                <td style="width:50%; vertical-align: top; border: none;">
                    <strong>Delivered To:</strong><br>
                    @if($sale->customer)
                        @if($sale->customer->customer_type === 'individual')
                            {{ $sale->customer->first_name }} {{ $sale->customer->surname }}<br>
                        @else
                            {{ $sale->customer->company_name }}<br>
                        @endif
                        {{ $sale->customer->address ?? '' }}<br>
                        {{ $sale->customer->phone ?? '' }}
                    @else
                        Walk-in Customer
                    @endif
                </td>
                <td style="width:50%; text-align:right; vertical-align: top; border: none;">
                    {{-- UPDATED: Use the generated 'DN' number --}}
                    <strong>Dispatch No:</strong> {{ $deliveryNodeNumber }}<br>
                    <strong>Ref (Inv/Rec):</strong> {{ $originalRef }}<br>
                    <strong>Date:</strong> {{ $sale->created_at->format('d-M-Y') }}
                </td>
            </tr>
        </table>

        <div style="margin-top: 20px;">
            <h3 style="border-bottom: 1px solid #000; padding-bottom: 5px; font-size: 14px;">Items Delivered</h3>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Item Description</th>
                    <th class="text-right">Quantity</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sale->items as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item->item->name ?? 'N/A' }}</td>
                    <td class="text-right">{{ number_format($item->quantity, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <table style="width:100%; margin-top:80px;">
            <tr>
                <td style="width:50%; vertical-align: top; border: none;">
                    <div style="border-top: 1px solid #000; padding-top: 5px; width: 80%;">Issued By (Signature)</div>
                </td>
                <td style="width:50%; vertical-align: top; text-align:right; border: none;">
                     <div style="display:inline-block; border-top: 1px solid #000; padding-top: 5px; text-align:left; width: 80%;">Received By (Signature)</div>
                </td>
            </tr>
        </table>

        <div class="footer">
            <p>Generated on {{ now()->format('Y-m-d H:i:s') }}</p>
        </div>
    </div>
</body>
</html>