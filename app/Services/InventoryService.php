<?php

namespace App\Services;

use App\Models\BILProductControl;
use App\Models\BILProductExpiryDates;
use App\Models\BILProductTransactions;
use App\Models\IVIssue;
use App\Models\IVReceive;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    const TRANSACTION_TYPE_ISSUE = 'Issue';
    const TRANSACTION_TYPE_RECEIVE = 'Receive';

    /**
     * Handles the logic for issuing stock.
     */
    public function issue(
        int $fromStoreId,
        int $toEntityId,
        string $toEntityType,
        string $toEntityDescription,
        array $items,
        ?string $deliveryNo = '',
        ?string $expiryDate = null
    ): void {
        $transDate = Carbon::now();

        // Create the main IVIssue record
        $issue = IVIssue::create([
            'transdate' => $transDate,
            'delivery_no' => $deliveryNo,
            'fromstore_id' => $fromStoreId,
            'tostore_id' => $toEntityId,
            'tostore_type' => $toEntityType,
            'total' => collect($items)->sum(fn($item) => $item['quantity'] * $item['price']),
            'stage' => 4, // Completed
            'user_id' => Auth::id(),
        ]);

        foreach ($items as $item) {
            $this->updateStockLevelsOnIssue($fromStoreId, $item, $expiryDate);

            $this->createTransaction(
                $transDate,
                $toEntityId,
                $toEntityDescription,
                $item,
                self::TRANSACTION_TYPE_ISSUE,
                $deliveryNo,
                $expiryDate,
                $fromStoreId,
                null
            );

            // Create associated IVIssueItem
            $issue->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ]);
        }
    }

    /**
     * Handles the logic for receiving stock.
     */
    public function receive(
        int $toStoreId,
        int $fromEntityId,
        string $fromEntityType,
        string $fromEntityDescription,
        array $items,
        ?string $deliveryNo = '',
        ?string $expiryDate = null
    ): void {
        $transDate = Carbon::now();        

        foreach ($items as $item) {
            $this->updateStockLevelsOnReceive($toStoreId, $item, $expiryDate);

            $this->createTransaction(
                $transDate,
                $fromEntityId,
                $fromEntityDescription,
                $item,
                self::TRANSACTION_TYPE_RECEIVE,
                $deliveryNo,
                $expiryDate,
                null,
                $toStoreId
            );           
        }
    }

    private function updateStockLevelsOnIssue(int $storeId, array $item, ?string $expiryDate): void
    {
        if ($expiryDate) {
            $productExpiry = BILProductExpiryDates::where('store_id', $storeId)
                ->where('product_id', $item['product_id'])
                ->where('expirydate', $expiryDate)
                ->first();

            if ($productExpiry) {
                $productExpiry->decrement('quantity', $item['quantity']);
                if ($productExpiry->quantity <= 0) {
                    $productExpiry->delete();
                }
            }
        }

        $productControl = BILProductControl::firstOrCreate(['product_id' => $item['product_id']]);
        $productControl->decrement('qty_' . $storeId, $item['quantity']);
    }
    
    private function updateStockLevelsOnReceive(int $storeId, array $item, ?string $expiryDate): void
    {
        if ($expiryDate) {
            BILProductExpiryDates::updateOrCreate(
                [
                    'store_id' => $storeId,
                    'product_id' => $item['product_id'],
                    'expirydate' => $expiryDate,
                ],
                ['quantity' => DB::raw('quantity + ' . $item['quantity'])]
            );
        }

        $productControl = BILProductControl::firstOrCreate(['product_id' => $item['product_id']]);
        $productControl->increment('qty_' . $storeId, $item['quantity']);
    }


    private function createTransaction(
        Carbon $transDate,
        int $sourceCode,
        string $sourceDescription,
        array $item,
        string $transType,
        ?string $reference,
        ?string $expiryDate,
        ?int $fromStoreId,
        ?int $toStoreId
    ): void {
        $transactionData = [
            'transdate' => $transDate,
            'sourcecode' => $sourceCode,
            'sourcedescription' => $sourceDescription,
            'product_id' => $item['product_id'],
            'expirydate' => $expiryDate,
            'reference' => $reference,
            'transprice' => $item['price'],
            'transtype' => $transType,
            'transdescription' => "{$transType}d " . ($transType === self::TRANSACTION_TYPE_RECEIVE ? 'from' : 'to') . ": {$sourceDescription}",
            'user_id' => Auth::id(),
        ];

        if ($fromStoreId) {
            $transactionData['qtyout_' . $fromStoreId] = $item['quantity'];
        }

        if ($toStoreId) {
            $transactionData['qtyin_' . $toStoreId] = $item['quantity'];
        }

        BILProductTransactions::create($transactionData);
    }

    public function createReceiveRecord(
        int $toStoreId,
        int $fromEntityId,
        string $fromEntityType,
        array $items,
        string $deliveryNo,
        int $stage, // This parameter makes the method flexible
        ?string $remarks = null // Optional remarks
    ): IVReceive {
        $receive = null; // Initialize to be accessible outside the transaction closure

        DB::transaction(function () use (&$receive, $toStoreId, $fromEntityId, $fromEntityType, $items,$deliveryNo, $stage, $remarks) {
            $calculatedTotal = collect($items)->sum(fn($item) => $item['quantity'] * $item['price']);

            // 1. Create the main IVReceive record
            $receive = IVReceive::create([
                'delivery_no'   => $deliveryNo,
                'transdate'      => Carbon::now(),
                'tostore_id'     => $toStoreId,
                'fromstore_id'   => $fromEntityId,
                'fromstore_type' => $fromEntityType,
                'total'          => $calculatedTotal,
                'stage'          => $stage, // Use the stage passed into the method
                'remarks'        => $remarks,
                'user_id'        => Auth::id(),
            ]);

            // 2. Prepare and create all associated items
            $itemsToCreate = collect($items)->map(fn($item) => [
                // Use 'item_id' if coming from a form, or 'product_id' if internal
                'product_id' => $item['item_id'] ?? $item['product_id'],
                'quantity'   => $item['quantity'],
                'price'      => $item['price'],
            ])->all();
            
            $receive->receiveitems()->createMany($itemsToCreate);
        });

        return $receive; // Return the created model
    }    

}