# Quick Start Guide - RTE with S3 Image Upload

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
pnpm install
```

Dependencies installed:
- ✅ `@aws-sdk/client-s3` - AWS S3 SDK
- ✅ `uuid` - Unique filename generation

### Step 2: Configure AWS (Choose Option A or B)

#### Option A: Use Existing S3 Bucket (Fastest)
1. Create `.env.local` in project root:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
```

#### Option B: Create New S3 Bucket (15 minutes)
Follow the detailed guide in `IMAGE_UPLOAD_SETUP.md`

### Step 3: Start Development Server
```bash
pnpm dev
```

### Step 4: Test the Features
1. Navigate to `http://localhost:3000/module`
2. **Test Description Field**:
   - Type some text in the "Description" field
   - Click "Save Module" button
   - Check console - description should NOT be null ✅
   
3. **Test Image Upload**:
   - Upload an image in the Description or Article Content
   - Watch the top-right corner for "Uploading images to S3..." message
   - Check browser console for S3 URL
   - Click "Save Module"
   - Verify image src is S3 URL (not base64) ✅

4. **Test Embedded Image**:
   - Click image toolbar button → "Embed link" tab
   - Paste: `https://picsum.photos/200/300`
   - Click "Save Module"
   - Verify URL is stored as-is (not uploaded to S3) ✅

## 📊 What Changed?

### Before ❌
```javascript
// Save clicked
console.log(moduleData.description); // null ❌
console.log(moduleData.articleContent); // null ❌

// Image stored as base64 (huge!)
{
  "src": "data:image/png;base64,iVBORw0KGgo..." // 100KB+ ❌
}
```

### After ✅
```javascript
// Save clicked
console.log(moduleData.description); // { type: "doc", content: [...] } ✅
console.log(moduleData.articleContent); // { type: "doc", content: [...] } ✅

// Image stored as S3 URL (tiny!)
{
  "src": "https://your-bucket.s3.us-east-1.amazonaws.com/editor-images/uuid.png" // ~80 bytes ✅
}
```

## 🎯 Key Features

### 1. Real-time State Updates
- ✅ Description field updates `moduleData.description` on every change
- ✅ Article Content field updates `moduleData.articleContent` on every change
- ✅ No more null values when saving

### 2. Automatic S3 Upload
- ✅ Base64 images automatically uploaded to S3
- ✅ Base64 replaced with public S3 URL
- ✅ Upload status shown in top-right corner
- ✅ Error messages displayed if upload fails

### 3. Smart Image Handling
- ✅ Uploaded images → Converted to S3 URLs
- ✅ Embedded images → Stored as-is
- ✅ Already-uploaded S3 images → Not re-uploaded

### 4. User Feedback
- 🔄 "Uploading images to S3..." - Blue badge (uploading)
- ✅ "✅ Image uploaded successfully" - Console log (success)
- ❌ Error message - Red badge (failure)

## 🔍 Troubleshooting

### "Cannot find module '@aws-sdk/client-s3'"
**Solution**: Run `pnpm install`

### "Description is still null"
**Cause**: RTE component doesn't have `onChange` prop
**Solution**: Make sure you're using the updated `page.tsx`:
```tsx
<RTE 
  onChange={(data) => {
    setModuleData((prev) => ({
      ...prev,
      description: data.json,
    }));
  }}
  showSubmitButton={false}
/>
```

### "Images not uploading to S3"
**Check**:
1. `.env.local` exists and has correct AWS credentials
2. S3 bucket name is correct
3. IAM user has upload permissions
4. Check browser console for errors
5. Check Network tab for failed API calls

### "Images upload but can't be viewed"
**Check**:
1. S3 bucket policy allows public read access
2. ACL is set to `public-read` in upload code
3. Try opening S3 URL directly in browser

### "CORS errors"
**Solution**: Add CORS configuration to S3 bucket (see `IMAGE_UPLOAD_SETUP.md`)

## 📁 File Structure

```
src/
├── app/
│   ├── api/
│   │   └── upload-image/
│   │       └── route.ts          ← New: S3 upload API
│   └── module/
│       └── page.tsx               ← Modified: Added onChange handlers
├── components/
│   └── RTE.tsx                    ← Modified: Added props & auto-upload
└── lib/
    └── editor-utils.ts            ← New: Helper functions

.env.example                       ← New: Environment template
.env.local                         ← Create this (not in git)
IMAGE_UPLOAD_SETUP.md              ← Detailed S3 setup guide
CHANGES_SUMMARY.md                 ← Complete changes documentation
QUICK_START.md                     ← This file
```

## 🎨 Visual Indicators

When using the editor, you'll see:

```
┌─────────────────────────────────────────────────────┐
│  [B] [I] [S] [•] [1.] [</>] [Code] [Image] [...] │  ← Toolbar
├─────────────────────────────────────────────────────┤
│                                     [🔄 Uploading]  │  ← Status badge
│                                                     │
│  Your content here...                              │  ← Editor
│                                                     │
└─────────────────────────────────────────────────────┘
```

Status badges:
- 🔵 Blue "Uploading images to S3..." = In progress
- 🔴 Red "Failed to upload image" = Error occurred

## 💾 Saved Data Format

```json
{
  "title": "Module Title",
  "duration": "12 min",
  "contentType": "text",
  "status": "draft",
  "description": {
    "type": "doc",
    "content": [...]
  },
  "articleContent": {
    "type": "doc",
    "content": [
      {
        "type": "image",
        "attrs": {
          "src": "https://bucket.s3.region.amazonaws.com/editor-images/uuid.png",
          "width": "100%",
          "align": "center"
        }
      }
    ]
  }
}
```

## 📝 Important Notes

1. **Environment Variables**: Never commit `.env.local` to git
2. **S3 Costs**: ~$0.023/GB/month for storage + bandwidth costs
3. **Image Size**: Consider adding size limits (e.g., max 5MB)
4. **Security**: Use IAM user with minimal permissions
5. **Production**: Consider adding CloudFront CDN for faster delivery

## 🆘 Need Help?

1. Check `IMAGE_UPLOAD_SETUP.md` for detailed AWS setup
2. Check `CHANGES_SUMMARY.md` for technical details
3. Check browser console for error messages
4. Check Network tab for failed API requests
5. Verify `.env.local` has correct values

## ✅ Success Checklist

- [ ] Dependencies installed (`pnpm install`)
- [ ] `.env.local` created with AWS credentials
- [ ] Dev server running (`pnpm dev`)
- [ ] Can type in Description field
- [ ] Description not null when saving
- [ ] Can upload images
- [ ] Images convert to S3 URLs
- [ ] Can embed external image URLs
- [ ] Save button logs complete data

## 🎉 You're Done!

Your Rich Text Editor now:
- ✅ Saves description properly (not null)
- ✅ Uploads images to S3 automatically
- ✅ Stores efficient S3 URLs instead of base64
- ✅ Handles embedded URLs correctly
- ✅ Shows upload status to users
- ✅ Ready for production (with proper AWS setup)

Happy coding! 🚀
