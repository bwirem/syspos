<?php

namespace App\Http\Controllers\Traits;

use Illuminate\Database\Eloquent\Model;

trait ManagesItems
{
    /**
     * Synchronizes related items for a parent model (Create, Update, Delete).
     *
     * @param Model $parent The parent model (e.g., Requisition, Receive).
     * @param array $itemsData The array of item data from the request.
     * @param string $relationshipName The name of the items relationship on the parent model.
     */
    protected function syncItems(Model $parent, array $itemsData, string $relationshipName): void
    {
        $existingItemIds = [];
        $newItemsData = [];

        foreach ($itemsData as $item) {
            if (!empty($item['id'])) {
                $existingItemIds[] = $item['id'];
            } else {
                $newItemsData[] = $item;
            }
        }

        // 1. Delete items that were removed
        $parent->$relationshipName()->whereNotIn('id', $existingItemIds)->delete();

        // 2. Update existing items
        foreach ($itemsData as $item) {
            if (!empty($item['id'])) {
                $parent->$relationshipName()->find($item['id'])->update([
                    'product_id' => $item['item_id'] ?? $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    // Add other fields like 'countedqty' if they exist, using null coalesce
                    'countedqty' => $item['countedqty'] ?? null,
                    'expectedqty' => $item['expectedqty'] ?? null,
                ]);
            }
        }
        
        // 3. Create new items
        foreach ($newItemsData as $item) {
            $parent->$relationshipName()->create([
                'product_id' => $item['item_id'] ?? $item['product_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                // Add other fields
                'countedqty' => $item['countedqty'] ?? null,
                'expectedqty' => $item['expectedqty'] ?? null,
            ]);
        }
    }
}