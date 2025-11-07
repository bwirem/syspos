<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dispatch Note - {{ $purchase->dispatch_number }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        .container { width: 100%; margin: 0 auto; }
        .header, .footer { text-align: center; }
        .header h1 { margin: 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        .details-grid div { padding: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .text-right { text-align: right; }
        .footer { margin-top: 40px; font-size: 10px; color: #777; }
        .signatures { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; }
        .signatures div { margin-top: 40px; border-top: 1px solid #000; padding-top: 5px; }
        .summary-section { margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $purchase->facilityoption->name ?? 'Facility Name' }}</h1>
            <p>Dispatch Note</p>
        </div>

        <table style="width:100%; margin-top: 20px;">
            <tr>
                <td style="width:50%;">
                    <strong>Supplier:</strong><br>
                    {{ $purchase->supplier->company_name ?? ($purchase->supplier->first_name . ' ' . $purchase->supplier->surname) }}<br>
                    {{ $purchase->supplier->address ?? '' }}<br>
                    {{ $purchase->supplier->phone ?? '' }}
                </td>
                <td style="width:50%; text-align:right;">
                    <strong>Dispatch No:</strong> {{ $purchase->dispatch_number }}<br>
                    <strong>PO No:</strong> {{ $purchase->id }}<br>
                    <strong>Date:</strong> {{ now()->format('d-M-Y') }}
                </td>
            </tr>
             <tr>
                <td style="padding-top:15px;">
                    <strong>Dispatched To:</strong><br>
                    <strong>Recipient:</strong> {{ $recipient_name }}<br>
                    <strong>Contact:</strong> {{ $recipient_contact }}
                </td>
            </tr>
        </table>


        <div class="summary-section">
            <h3 style="border-bottom: 1px solid #000; padding-bottom: 5px;">Items Dispatched</h3>
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
                @foreach($purchase->purchaseitems as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item->item->name }}</td>
                    <td class="text-right">{{ number_format($item->quantity, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

         @if($purchase->dispatch_remarks)
            <div style="margin-top: 20px;">
                <strong>Remarks:</strong>
                <p style="border: 1px solid #eee; padding: 10px;">{{ $purchase->dispatch_remarks }}</p>
            </div>
        @endif

        <table style="width:100%; margin-top:80px;">
            <tr>
                <td style="width:50%;">
                    <div style="border-top: 1px solid #000; padding-top: 5px;">Dispatched By (Signature)</div>
                </td>
                <td style="width:50%; text-align:right;">
                     <div style="display:inline-block; border-top: 1px solid #000; padding-top: 5px; text-align:left;">Received By (Signature)</div>
                </td>
            </tr>
        </table>

        <div class="footer">
            <p>Generated on {{ now()->format('Y-m-d H:i:s') }}</p>
        </div>
    </div>
</body>
</html>