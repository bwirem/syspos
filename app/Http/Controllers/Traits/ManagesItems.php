<?php

namespace App\Http\Controllers\Traits;

use Illuminate\Database\Eloquent\Model;

trait ManagesItems
{
    /**
     * Synchronizes related items for a parent model (Create, Update, Delete).
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
                // CHANGE: Use the new helper method
                $parent->$relationshipName()->find($item['id'])->update(
                    $this->mapItemData($item)
                );
            }
        }
        
        // 3. Create new items
        foreach ($newItemsData as $item) {
            // CHANGE: Use the new helper method
            $parent->$relationshipName()->create(
                $this->mapItemData($item)
            );
        }
    }

    /**
     * Maps incoming item data to the correct database columns.
     */
    private function mapItemData(array $item): array
    {
        $mappedData = [
            'product_id' => $item['item_id'] ?? $item['product_id'],
            'price' => $item['price'] ?? 0,
        ];

        if (array_key_exists('quantity', $item)) {
            $mappedData['quantity'] = $item['quantity'];
        }

        if (array_key_exists('countedqty', $item)) {
            $mappedData['countedqty'] = $item['countedqty'];
        }
        
        if (array_key_exists('expectedqty', $item)) {
            $mappedData['expectedqty'] = $item['expectedqty'];
        }

        return $mappedData;
    }
}