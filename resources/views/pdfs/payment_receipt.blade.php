<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Receipt - {{ $payment->receiptno }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        .container { width: 100%; margin: 0 auto; }
        .header, .footer { text-align: center; }
        
        /* Table Styles */
        .main-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .main-table th, .main-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        .main-table th { background-color: #f2f2f2; }
        
        /* Nested Table for Invoice Items */
        .nested-table { width: 95%; margin: 5px auto; border-collapse: collapse; background-color: #fafafa; }
        .nested-table th, .nested-table td { border: 1px solid #eee; padding: 4px; font-size: 11px; color: #555; }
        .nested-table th { background-color: #e9e9e9; }

        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        
        .totals-table { width: 50%; float: right; margin-top: 20px; border-collapse: collapse; }
        .totals-table td { padding: 5px; border: 1px solid #ddd; }
        .clearfix::after { content: ""; clear: both; display: table; }
    </style>
</head>
<body>
    <div class="container">
        {{-- HEADER (Facility Info) --}}
        <div class="header">
            <h2 style="margin:0;">{{ $facility->name ?? 'Facility Name' }}</h2>
            <p style="margin:2px;">{{ $facility->address ?? '' }} | {{ $facility->phone ?? '' }}</p>
            <h3 style="border-top:1px solid #ccc; border-bottom:1px solid #ccc; padding:5px; margin-top:10px;">PAYMENT RECEIPT</h3>
        </div>

        {{-- CUSTOMER INFO --}}
        <table style="width:100%; margin-top: 20px;">
            <tr>
                <td style="width:60%">
                    <strong>Received From:</strong><br>
                    {{ $payment->customer->first_name ?? '' }} {{ $payment->customer->surname ?? $payment->customer->company_name ?? 'Guest' }}
                </td>
                <td style="width:40%; text-align:right;">
                    <strong>Receipt No:</strong> {{ $payment->receiptno }}<br>
                    <strong>Date:</strong> {{ \Carbon\Carbon::parse($payment->transdate)->format('d-M-Y') }}
                </td>
            </tr>
        </table>

        {{-- INVOICE & DETAILS TABLE --}}
        <table class="main-table">
            <thead>
                <tr>
                    <th style="width: 40%;">Description / Invoice No</th>
                    <th style="width: 20%;" class="text-right">Total Due</th>
                    <th style="width: 20%;" class="text-right">Paid Now</th>
                    <th style="width: 20%;" class="text-right">Balance</th>
                </tr>
            </thead>
            <tbody>
                @foreach($payment->items as $paymentDetail)
                    {{-- 1. Main Row: The Invoice Payment Summary --}}
                    <tr style="background-color: #f9f9f9;">
                        <td class="text-bold">
                            Payment for Invoice #{{ $paymentDetail->invoiceno }}
                        </td>
                        <td class="text-right">{{ number_format($paymentDetail->totaldue, 2) }}</td>
                        <td class="text-right text-bold">{{ number_format($paymentDetail->totalpaid, 2) }}</td>
                        <td class="text-right">
                            {{-- Calculate remaining balance for this specific invoice --}}
                            {{ number_format($paymentDetail->totaldue - $paymentDetail->totalpaid, 2) }}
                        </td>
                    </tr>

                    {{-- 2. Nested Row: The Invoice Items --}}
                    @if($paymentDetail->invoice && $paymentDetail->invoice->items->count() > 0)
                    <tr>
                        <td colspan="4" style="padding: 0;">
                            <table class="nested-table">
                                <thead>
                                    <tr>
                                        <th style="width: 50%;">Item Name</th>
                                        <th style="width: 15%;" class="text-right">Qty</th>
                                        <th style="width: 15%;" class="text-right">Price</th>
                                        <th style="width: 20%;" class="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($paymentDetail->invoice->items as $lineItem)
                                    <tr>
                                        <td>{{ $lineItem->item->name ?? 'Unknown Item' }}</td>
                                        <td class="text-right">{{ number_format($lineItem->quantity, 0) }}</td>
                                        <td class="text-right">{{ number_format($lineItem->price, 2) }}</td>
                                        <td class="text-right">{{ number_format($lineItem->quantity * $lineItem->price, 2) }}</td>
                                    </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    @endif
                @endforeach
            </tbody>
        </table>

        {{-- TOTALS --}}
        <div class="clearfix">
            <table class="totals-table">
                <tr>
                    <td><strong>Total Amount Received</strong></td>
                    <td class="text-right"><strong>{{ number_format($payment->totalpaid, 2) }}</strong></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>Thank you for your business.</p>
        </div>
    </div>
</body>
</html>