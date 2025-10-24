# S3 Image Cleanup Implementation

## Overview
This implementation ensures that when users remove or replace images in the rich text editor, the corresponding images are automatically deleted from S3 to prevent orphaned files and unnecessary storage costs.

## Architecture

### 1. API Routes

#### `/api/delete-image` (DELETE)
- Deletes a single image from S3
- Accepts either S3 URL or key
- Returns success status and deleted key

**Usage:**
```typescript
await fetch("/api/delete-image", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://bucket.s3.region.amazonaws.com/key" })
});
```

#### `/api/delete-image` (POST)
- Batch deletes multiple images from S3
- Accepts array of URLs or keys
- Returns detailed results for each deletion

**Usage:**
```typescript
await fetch("/api/delete-image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ urls: ["url1", "url2", "url3"] })
});
```

### 2. Utility Functions (`src/lib/s3-utils.ts`)

#### `deleteImageFromS3(url: string): Promise<boolean>`
Deletes a single image from S3.

#### `batchDeleteImages(urls: string[]): Promise<{succeeded, failed, results}>`
Deletes multiple images in one batch operation.

#### `findRemovedImages(oldContent: any, newContent: any): string[]`
Compares two editor contents and identifies which S3 images were removed.

#### `cleanupRemovedImages(oldContent: any, newContent: any): Promise<number>`
Automatically finds and deletes removed images, returns count of deleted images.

### 3. RTE Component (`src/components/RTE.tsx`)

#### Automatic Image Tracking
- Maintains `previousContentRef` to track editor state
- Debounced cleanup check (1 second after changes)
- Compares previous and current content
- Automatically deletes orphaned S3 images

#### Props
```typescript
interface RTEProps {
  onChange?: (data: { html: string; json: any; text: string }) => void;
  initialContent?: any;
  showSubmitButton?: boolean;
  onImagesRemoved?: (count: number) => void; // Callback when images are deleted
}
```

#### How It Works
1. User edits content in the editor
2. After 1 second of inactivity, cleanup check runs
3. Compares previous content with current content
4. Identifies removed S3 images
5. Batch deletes them from S3
6. Calls `onImagesRemoved` callback with count
7. Updates `previousContentRef` for next comparison

### 4. Image Extension (`src/components/extensions/image.tsx`)

#### Manual Delete Button
When user clicks "Delete Image" button:
1. Checks if image is an S3 URL (not external URL or base64)
2. Deletes image from S3 immediately
3. Removes image node from editor

```typescript
onClick={async () => {
  // Delete from S3 if it's an S3 URL
  const src = node.attrs.src;
  if (src && isS3Url(src)) {
    console.log("🗑️ Deleting image from S3:", src);
    await deleteImageFromS3(src);
  }
  // Remove from editor
  deleteNode();
}}
```

### 5. Module Page (`src/app/module/page.tsx`)

Both RTE instances (Description and Article Content) now have cleanup callbacks:

```typescript
<RTE 
  onChange={(data) => {
    setModuleData((prev) => ({
      ...prev,
      description: data.json,
    }));
  }}
  showSubmitButton={false}
  onImagesRemoved={(count) => {
    console.log(`🗑️ ${count} image(s) removed from description`);
  }}
/>
```

## Workflow Examples

### Scenario 1: User Replaces an Image
1. User has image A in the editor (stored in S3)
2. User drags and drops image B to replace image A
3. Image B is uploaded to S3
4. After 1 second, cleanup detects image A is no longer in content
5. Image A is deleted from S3
6. Console logs: "🗑️ 1 image(s) removed from description"

### Scenario 2: User Deletes Multiple Images
1. User has 3 images in the editor
2. User selects all and deletes
3. After 1 second, cleanup detects 3 removed images
4. Batch delete API is called with all 3 URLs
5. All 3 images are deleted from S3
6. Console logs: "🗑️ 3 image(s) removed from article content"

### Scenario 3: User Clicks Delete Button
1. User hovers over an image
2. User clicks the trash icon in the dropdown menu
3. Image is immediately deleted from S3
4. Image is removed from editor
5. Console logs: "🗑️ Deleting image from S3: [url]"

## Key Features

✅ **Automatic Cleanup** - No manual intervention needed
✅ **Debounced** - Prevents excessive API calls (1 second delay)
✅ **Batch Operations** - Efficient deletion of multiple images
✅ **Smart Detection** - Only deletes S3 images, not external URLs
✅ **Manual Override** - Delete button provides immediate cleanup
✅ **Error Handling** - Graceful failures with detailed logging
✅ **Console Feedback** - Clear visibility of all operations

## Important Notes

1. **Only S3 Images Are Deleted**: External URLs and base64 images are not affected
2. **Debounce Period**: 1 second delay prevents cleanup during rapid editing
3. **Previous Content Tracking**: First edit won't trigger cleanup (no previous state)
4. **Batch Efficiency**: Multiple deletions are batched into single API call
5. **Non-Blocking**: Cleanup happens asynchronously, doesn't block user

## Testing Checklist

- [ ] Upload an image, then delete it → Image should be removed from S3
- [ ] Upload an image, replace it with another → Old image should be removed from S3
- [ ] Upload multiple images, delete all → All images should be removed from S3
- [ ] Use external image URL → Should NOT attempt S3 deletion
- [ ] Click "Delete Image" button → Image should be removed immediately
- [ ] Check console logs → Should see cleanup messages
- [ ] Verify S3 bucket → Orphaned images should not accumulate

## Environment Variables Required

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
```

## Future Enhancements

1. **Undo Support**: Keep deleted images for 24 hours before permanent deletion
2. **Bulk Cleanup**: Admin tool to find and remove all orphaned images
3. **Usage Analytics**: Track storage usage and cleanup statistics
4. **Soft Delete**: Move to "trash" folder instead of immediate deletion
5. **Image Optimization**: Compress images before upload to save storage
