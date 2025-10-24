"use client";

import { Separator } from "@/components/ui/separator";
import { BlockquoteToolbar } from "@/components/toolbars/blockquote";
import { BoldToolbar } from "@/components/toolbars/bold";
import { BulletListToolbar } from "@/components/toolbars/bullet-list";
import { CodeToolbar } from "@/components/toolbars/code";
import { CodeBlockToolbar } from "@/components/toolbars/code-block";
import { HardBreakToolbar } from "@/components/toolbars/hard-break";
import { HorizontalRuleToolbar } from "@/components/toolbars/horizontal-rule";
import { ItalicToolbar } from "@/components/toolbars/italic";
import { OrderedListToolbar } from "@/components/toolbars/ordered-list";
// import { RedoToolbar } from "@/components/toolbars/redo";
import { StrikeThroughToolbar } from "@/components/toolbars/strikethrough";
import { ImageExtension } from "@/components/extensions/image";
import { ImagePlaceholder } from "@/components/extensions/image-placeholder";
import { ImagePlaceholderToolbar } from "@/components/toolbars/image-placeholder-toolbar";
import { ToolbarProvider } from "@/components/toolbars/toolbar-provider";
// import { UndoToolbar } from "@/components/toolbars/undo";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { processEditorImages } from "@/lib/editor-utils";
import { uploadImageToS3 as uploadToS3, cleanupRemovedImages } from "@/lib/s3-utils";

interface RTEProps {
	onChange?: (data: { html: string; json: any; text: string }) => void;
	initialContent?: any;
	showSubmitButton?: boolean;
	onImagesRemoved?: (count: number) => void; // Callback when images are deleted
}

// Upload image to S3 helper function
const uploadImageToS3 = async (base64Image: string): Promise<string | null> => {
	try {
		console.log(" Uploading image to S3...");
		const url = await uploadToS3(base64Image);
		console.log(" Image uploaded successfully:", url);
		return url;
	} catch (error: any) {
		console.error(" Upload failed:", error.message || error);
		return null;
	}
};

const createExtensions = (onImageUploadStart: () => void, onImageUploadEnd: () => void, onImageUploadError: (error: string) => void) => [
	StarterKit.configure({
		orderedList: {
			HTMLAttributes: {
				class: "list-decimal",
			},
		},
		bulletList: {
			HTMLAttributes: {
				class: "list-disc",
			},
		},
		code: {
			HTMLAttributes: {
				class: "bg-accent rounded-md p-1",
			},
		},
		horizontalRule: {
			HTMLAttributes: {
				class: "my-2",
			},
		},
		codeBlock: {
			HTMLAttributes: {
				class: "bg-primary text-primary-foreground p-2 text-sm rounded-md p-1",
			},
		},
		blockquote: {
			HTMLAttributes: {
				class: "text-accent p-2",
			},
		},
		heading: {
			levels: [1, 2, 3, 4],
			HTMLAttributes: {
				class: "tiptap-heading",
			},
		},
	}),
	ImageExtension,
	ImagePlaceholder.configure({
		onDrop: async (files, editor) => {
			onImageUploadStart();
			onImageUploadError("");
			
			for (const file of files) {
				try {
					// Convert file to base64
					const reader = new FileReader();
					const base64Promise = new Promise<string>((resolve) => {
						reader.onload = () => resolve(reader.result as string);
						reader.readAsDataURL(file);
					});
					
					const base64Image = await base64Promise;
					
					// Upload to S3
					const s3Url = await uploadImageToS3(base64Image);
					
					if (s3Url) {
						// Insert image with S3 URL
						editor.chain().focus().setImage({ src: s3Url }).run();
					} else {
						onImageUploadError("Failed to upload image to S3");
						// Fallback: insert base64 image
						editor.chain().focus().setImage({ src: base64Image }).run();
					}
				} catch (error) {
					console.error("Error processing image:", error);
					onImageUploadError("Error processing image");
				}
			}
			
			onImageUploadEnd();
		},
		onEmbed: async (url, editor) => {
			// Handle URL embeds - no need to upload, just insert
			editor.chain().focus().setImage({ src: url }).run();
		},
		allowedMimeTypes: {
			"image/*": [],
		},
		maxFiles: 5,
		maxSize: 10 * 1024 * 1024, // 10MB
	}),
];

const defaultContent = `
<h2 class="tiptap-heading">Shot taken in Kashmir 📸</h2>
<p>Try interacting with the image below or add your own!</p>
`;

const StarterKitExample = ({ 
	onChange, 
	initialContent, 
	showSubmitButton = true,
	onImagesRemoved 
}: RTEProps) => {
	const [submittedData, setSubmittedData] = useState<{
		html: string;
		json: any;
		text: string;
	} | null>(null);
	const [uploadingImages, setUploadingImages] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const isProcessingRef = useRef(false);
	const previousContentRef = useRef<any>(null);

	const extensions = createExtensions(
		() => setUploadingImages(true),
		() => setUploadingImages(false),
		(error: string) => setUploadError(error || null)
	);

	const editor = useEditor({
		extensions,
		content: initialContent || defaultContent,
		immediatelyRender: false,
		onUpdate: ({ editor }) => {
			// Call onChange whenever content changes
			if (onChange) {
				const data = {
					html: editor.getHTML(),
					json: editor.getJSON(),
					text: editor.getText(),
				};
				onChange(data);
			}
		},
	});

	// Process images on mount and whenever content changes
	useEffect(() => {
		if (!editor || isProcessingRef.current) return;

		const processImages = async () => {
			const json = editor.getJSON();
			let hasChanges = false;

			// Check if there are any base64 images
			const hasBase64 = JSON.stringify(json).includes("data:image");
			if (!hasBase64) return;

			isProcessingRef.current = true;
			setUploadingImages(true);
			setUploadError(null);

			try {
				// Use the helper function to process all images
				const processedJson = await processEditorImages(json);
				
				// Check if any changes were made
				if (JSON.stringify(processedJson) !== JSON.stringify(json)) {
					hasChanges = true;
					editor.commands.setContent(processedJson);
					console.log(" All images processed successfully");
				}
			} catch (error) {
				console.error(" Error processing images:", error);
				setUploadError("Failed to process images");
			}

			setUploadingImages(false);
			isProcessingRef.current = false;
		};

		// Debounce the processing to avoid multiple simultaneous uploads
		const timeoutId = setTimeout(processImages, 500);
		return () => clearTimeout(timeoutId);
	}, [editor]);

	// Track and cleanup removed images
	useEffect(() => {
		if (!editor) return;

		const handleUpdate = async () => {
			const currentContent = editor.getJSON();

			// If we have previous content, check for removed images
			if (previousContentRef.current) {
				try {
					const deletedCount = await cleanupRemovedImages(
						previousContentRef.current,
						currentContent
					);

					if (deletedCount > 0) {
						console.log(` Cleaned up ${deletedCount} removed images from S3`);
						if (onImagesRemoved) {
							onImagesRemoved(deletedCount);
						}
					}
				} catch (error) {
					console.error(" Error cleaning up images:", error);
				}
			}

			// Update previous content reference
			previousContentRef.current = currentContent;
		};

		// Listen to editor updates with debounce
		const timeoutId = setTimeout(handleUpdate, 1000);
		return () => clearTimeout(timeoutId);
	}, [editor?.state.doc, onImagesRemoved]);

	const handleSubmit = () => {
		if (!editor) return;

		const data = {
			html: editor.getHTML(),
			json: editor.getJSON(),
			text: editor.getText(),
		};

		setSubmittedData(data);
		console.log("Editor Content:", data);
	};

	if (!editor) {
		return null;
	}
	return (
		<div className="space-y-4">
			<div className="border w-full relative rounded-md overflow-hidden pb-3">
				{/* Upload Status */}
				{uploadingImages && (
					<div className="absolute top-2 right-2 z-30 bg-blue-500 text-white px-3 py-1 rounded-md text-xs flex items-center gap-2 shadow-lg">
						<Loader2 className="h-3 w-3 animate-spin" />
						Uploading images to S3...
					</div>
				)}
				{uploadError && (
					<div className="absolute top-2 right-2 z-30 bg-red-500 text-white px-3 py-1 rounded-md text-xs">
						{uploadError}
					</div>
				)}
				
				<div className="flex w-full items-center py-2 px-2 justify-between border-b  sticky top-0 left-0 bg-background z-20">
					<ToolbarProvider editor={editor}>
						<div className="flex items-center gap-2">	
							{/* <RedoToolbar /> */}
							{/* <Separator orientation="vertical" className="h-7" /> */}
							<BoldToolbar />
							<ItalicToolbar />
							<StrikeThroughToolbar />
							<Separator orientation="vertical" className="h-7" />
							<BulletListToolbar />
							<OrderedListToolbar />
							<Separator orientation="vertical" className="h-7" />
							<CodeToolbar />
							<CodeBlockToolbar />
							<Separator orientation="vertical" className="h-7" />
							<ImagePlaceholderToolbar />
							<HorizontalRuleToolbar />
							<BlockquoteToolbar />
							<HardBreakToolbar />
						</div>
					</ToolbarProvider>
				</div>
				<div
					onClick={() => {
						editor?.chain().focus().run();
					}}
					className="cursor-text min-h-[18rem] bg-background"
				>
					<EditorContent className="outline-none" editor={editor} />
				</div>
			</div>

			{/* Submit Button */}
			{showSubmitButton && (
				<div className="flex justify-end">
					<Button onClick={handleSubmit} size="lg">
						Submit & View Data
					</Button>
				</div>
			)}

			{/* Display Submitted Data */}
			{showSubmitButton && submittedData && (
				<div className="space-y-4 border rounded-lg p-6 bg-muted/50">
					<h3 className="text-lg font-semibold">Editor Content (Ready for Backend)</h3>

					{/* HTML Format */}
					<div className="space-y-2">
						<h4 className="font-medium text-sm text-muted-foreground">HTML Format:</h4>
						<pre className="bg-background p-4 rounded-md overflow-x-auto text-xs border">
							<code>{submittedData.html}</code>
						</pre>
					</div>

					{/* JSON Format */}
					<div className="space-y-2">
						<h4 className="font-medium text-sm text-muted-foreground">
							JSON Format (Recommended for Storage):
						</h4>
						<pre className="bg-background p-4 rounded-md overflow-x-auto text-xs border">
							<code>{JSON.stringify(submittedData.json, null, 2)}</code>
						</pre>
					</div>

					{/* Plain Text */}
					<div className="space-y-2">
						<h4 className="font-medium text-sm text-muted-foreground">Plain Text:</h4>
						<pre className="bg-background p-4 rounded-md overflow-x-auto text-xs border">
							<code>{submittedData.text}</code>
						</pre>
					</div>

					{/* Backend Integration Guide */}
					<div className="mt-6 p-4 bg-primary/10 rounded-md border border-primary/20">
						<h4 className="font-semibold mb-2">💡 Backend Integration Guide:</h4>
						<ul className="text-sm space-y-1 list-disc list-inside">
							<li>
								<strong>Store JSON format</strong> - Most flexible, preserves all formatting and structure
							</li>
							<li>
								<strong>Store HTML format</strong> - If you need to render directly without TipTap
							</li>
							<li>
								<strong>Store both</strong> - JSON for editing, HTML for display (recommended)
							</li>
						</ul>
					</div>
				</div>
			)}
		</div>
	);
};

export default StarterKitExample;