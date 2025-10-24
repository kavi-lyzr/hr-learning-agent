"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RTE from "@/components/RTE";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video, Eye } from "lucide-react";
import { processEditorImages } from "@/lib/editor-utils";

type ContentType = "text" | "video" | null;

interface TranscriptSnippet {
	text: string;
	start: number;
	duration: number;
}

interface ModuleData {
	title: string;
	duration: string;
	contentType: ContentType;
	status: string;
	description: any;
	videoUrl?: string;
	videoId?: string;
	transcript?: TranscriptSnippet[];
	articleContent?: any;
}

export default function ModulePage() {
	const [moduleData, setModuleData] = useState<ModuleData>({
		title: "",
		duration: "",
		contentType: null,
		status: "draft",
		description: null,
		transcript: [],
	});

	const [youtubeUrl, setYoutubeUrl] = useState("");
	const [loadingTranscript, setLoadingTranscript] = useState(false);
	const [transcriptError, setTranscriptError] = useState("");
	const [editableTranscript, setEditableTranscript] = useState<TranscriptSnippet[]>([]);

	const extractVideoId = (url: string): string | null => {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
			/youtube\.com\/embed\/([^&\n?#]+)/,
		];

		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match) return match[1];
		}
		return null;
	};

	const fetchTranscript = async () => {
		const videoId = extractVideoId(youtubeUrl);
		if (!videoId) {
			setTranscriptError("Invalid YouTube URL");
			return;
		}

		setLoadingTranscript(true);
		setTranscriptError("");

		try {
			const response = await fetch(`/api/transcript?videoId=${videoId}`);
			if (!response.ok) throw new Error("Failed to fetch transcript");

			const data = await response.json();
			setEditableTranscript(data.snippets);
			setModuleData((prev) => ({
				...prev,
				videoId,
				videoUrl: youtubeUrl,
				transcript: data.snippets,
			}));
		} catch (error) {
			setTranscriptError(
				error instanceof Error ? error.message : "Failed to load transcript"
			);
		} finally {
			setLoadingTranscript(false);
		}
	};

	const handleTranscriptEdit = (index: number, newText: string) => {
		setEditableTranscript((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], text: newText };
			return updated;
		});
	};

	const handleSave = async () => {
		try {
			// Process images in description if it exists
			let processedDescription = moduleData.description;
			if (moduleData.description) {
				console.log("📤 Processing images in description...");
				processedDescription = await processEditorImages(moduleData.description);
				console.log("✅ Description images processed");
			}

			// Process images in article content if it exists
			let processedArticleContent = moduleData.articleContent;
			if (moduleData.articleContent) {
				console.log("📤 Processing images in article content...");
				processedArticleContent = await processEditorImages(moduleData.articleContent);
				console.log("✅ Article content images processed");
			}

			const finalData = {
				...moduleData,
				description: processedDescription,
				articleContent: processedArticleContent,
				transcript: moduleData.contentType === "video" ? editableTranscript : undefined,
			};
			
			console.log("💾 Saving module data:", finalData);
			alert("✅ Module data processed and logged to console. All images uploaded to S3. Check console for details.");
		} catch (error) {
			console.error("❌ Error saving module:", error);
			alert("❌ Error processing module data. Check console for details.");
		}
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto py-10 px-4">
				<div className="max-w-6xl mx-auto space-y-6">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Create Module</h1>
						<p className="text-muted-foreground">
							Configure your module with content, description, and settings
						</p>
					</div>

					<Tabs defaultValue="content" className="space-y-6">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="content">Content Editor</TabsTrigger>
							<TabsTrigger value="preview">
								<Eye className="mr-2 h-4 w-4" />
								Preview
							</TabsTrigger>
						</TabsList>

						<TabsContent value="content" className="space-y-6">
							{/* Chapter Information */}
							<Card>
								<CardHeader>
									<CardTitle>Chapter Information</CardTitle>
									<CardDescription>
										Basic chapter details and configuration
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-sm font-medium">Chapter Title</label>
											<Input
												placeholder="Introduction to Leadership"
												value={moduleData.title}
												onChange={(e) =>
													setModuleData((prev) => ({
														...prev,
														title: e.target.value,
													}))
												}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium">Duration</label>
											<Input
												placeholder="12 min"
												value={moduleData.duration}
												onChange={(e) =>
													setModuleData((prev) => ({
														...prev,
														duration: e.target.value,
													}))
												}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-medium">
											Content Types (select one or more)
										</label>
										<div className="flex gap-2">
											<Button
												variant={
													moduleData.contentType === "text"
														? "default"
														: "outline"
												}
												onClick={() =>
													setModuleData((prev) => ({
														...prev,
														contentType: "text",
													}))
												}
												className="flex-1"
											>
												<FileText className="mr-2 h-4 w-4" />
												Text/Article
											</Button>
											<Button
												variant={
													moduleData.contentType === "video"
														? "default"
														: "outline"
												}
												onClick={() =>
													setModuleData((prev) => ({
														...prev,
														contentType: "video",
													}))
												}
												className="flex-1"
											>
												<Video className="mr-2 h-4 w-4" />
												YouTube Video
											</Button>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-medium">Status</label>
										<Select
											value={moduleData.status}
											onValueChange={(value: string) =>
												setModuleData((prev) => ({ ...prev, status: value }))
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="draft">Draft</SelectItem>
												<SelectItem value="published">Published</SelectItem>
												<SelectItem value="archived">Archived</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-medium">Description</label>
										<div className="border rounded-md">
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
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Chapter Content */}
							<Card>
								<CardHeader>
									<CardTitle>Chapter Content</CardTitle>
									<CardDescription>
										Upload and manage your chapter content
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{!moduleData.contentType && (
										<div className="text-center py-12 text-muted-foreground">
											<p>Please select a content type above to continue</p>
										</div>
									)}

									{/* YouTube Video Upload */}
									{moduleData.contentType === "video" && (
										<div className="space-y-4">
											<div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
												<Video className="h-5 w-5 text-blue-600 mt-0.5" />
												<div className="flex-1">
													<h4 className="font-medium text-sm">YouTube Video</h4>
													<p className="text-xs text-muted-foreground">
														Enter YouTube URL to load video and transcript
													</p>
												</div>
											</div>

											<div className="space-y-2">
												<label className="text-sm font-medium">YouTube URL</label>
												<div className="flex gap-2">
													<Input
														placeholder="https://www.youtube.com/watch?v=..."
														value={youtubeUrl}
														onChange={(e) => setYoutubeUrl(e.target.value)}
													/>
													<Button
														onClick={fetchTranscript}
														disabled={loadingTranscript || !youtubeUrl}
													>
														{loadingTranscript ? "Loading..." : "Load"}
													</Button>
												</div>
												{transcriptError && (
													<p className="text-sm text-destructive">
														{transcriptError}
													</p>
												)}
											</div>

											{moduleData.videoId && (
												<div className="space-y-4">
													{/* Video Preview */}
													<div className="aspect-video rounded-lg overflow-hidden bg-black">
														<iframe
															width="100%"
															height="100%"
															src={`https://www.youtube.com/embed/${moduleData.videoId}`}
															title="YouTube video player"
															frameBorder="0"
															allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
															allowFullScreen
														></iframe>
													</div>

													{/* Transcript Editor */}
													{editableTranscript.length > 0 && (
														<div className="space-y-2">
															<div className="flex items-center justify-between">
																<label className="text-sm font-medium">
																	Transcript ({editableTranscript.length}{" "}
																	segments)
																</label>
																<Button variant="outline" size="sm">
																	Auto-sync
																</Button>
															</div>
															<div className="border rounded-md p-4 max-h-[500px] overflow-y-auto space-y-2">
																{editableTranscript.map((snippet, index) => {
																	const minutes = Math.floor(snippet.start / 60);
																	const seconds = Math.floor(
																		snippet.start % 60
																	);
																	const timeStamp = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

																	return (
																		<div
																			key={index}
																			className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-accent transition-colors rounded-r"
																		>
																			<div className="flex items-start gap-4">
																				<span className="text-sm font-mono text-blue-600 font-semibold min-w-[60px]">
																					{timeStamp}
																				</span>
																				<textarea
																					className="flex-1 bg-transparent border-none outline-none resize-none min-h-[40px] leading-relaxed"
																					value={snippet.text}
																					onChange={(e) =>
																						handleTranscriptEdit(
																							index,
																							e.target.value
																						)
																					}
																					aria-label={`Edit transcript at ${timeStamp}`}
																				/>
																			</div>
																		</div>
																	);
																})}
															</div>
														</div>
													)}
												</div>
											)}
										</div>
									)}

									{/* Text/Article Editor */}
									{moduleData.contentType === "text" && (
										<div className="space-y-4">
											<div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
												<FileText className="h-5 w-5 text-green-600 mt-0.5" />
												<div className="flex-1">
													<h4 className="font-medium text-sm">
														Text/Article Content
													</h4>
													<p className="text-xs text-muted-foreground">
														Write or paste your article content with rich
														formatting
													</p>
												</div>
											</div>

											<div className="space-y-2">
												<label className="text-sm font-medium">
													Article Content
												</label>
												<RTE 
													onChange={(data) => {
														setModuleData((prev) => ({
															...prev,
															articleContent: data.json,
														}));
													}}
													showSubmitButton={false}
													onImagesRemoved={(count) => {
														console.log(`🗑️ ${count} image(s) removed from article content`);
													}}
												/>
											</div>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Save Button */}
							<div className="flex justify-end gap-2">
								<Button variant="outline">Cancel</Button>
								<Button onClick={handleSave} size="lg">
									Save Module
								</Button>
							</div>
						</TabsContent>

						<TabsContent value="preview" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle>Module Preview</CardTitle>
									<CardDescription>
										See how your module will appear to learners
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* Preview Header */}
									<div className="space-y-2 pb-4 border-b">
										<div className="flex items-start justify-between">
											<div className="space-y-1">
												<h2 className="text-2xl font-bold">
													{moduleData.title || "Untitled Module"}
												</h2>
												<p className="text-sm text-muted-foreground">
													{moduleData.duration || "No duration set"}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<span
													className={`px-3 py-1 rounded-full text-xs font-medium ${
														moduleData.status === "published"
															? "bg-green-100 text-green-800"
															: moduleData.status === "draft"
																? "bg-yellow-100 text-yellow-800"
																: "bg-gray-100 text-gray-800"
													}`}
												>
													{moduleData.status.charAt(0).toUpperCase() +
														moduleData.status.slice(1)}
												</span>
											</div>
										</div>
									</div>

									{/* Preview Content Type Badge */}
									<div className="flex items-center gap-2">
										{moduleData.contentType === "video" && (
											<div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium">
												<Video className="h-4 w-4" />
												Video Content
											</div>
										)}
										{moduleData.contentType === "text" && (
											<div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-md text-sm font-medium">
												<FileText className="h-4 w-4" />
												Text Content
											</div>
										)}
									</div>

									{/* Video Preview */}
									{moduleData.contentType === "video" && moduleData.videoId && (
										<div className="space-y-4">
											<div className="aspect-video rounded-lg overflow-hidden bg-black">
												<iframe
													width="100%"
													height="100%"
													src={`https://www.youtube.com/embed/${moduleData.videoId}`}
													title="YouTube video player"
													frameBorder="0"
													allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
													allowFullScreen
												></iframe>
											</div>

											{editableTranscript.length > 0 && (
												<div className="space-y-2">
													<h3 className="font-semibold">Transcript</h3>
													<div className="border rounded-md p-4 max-h-[400px] overflow-y-auto space-y-2 bg-muted/30">
														{editableTranscript.map((snippet, index) => {
															const minutes = Math.floor(snippet.start / 60);
															const seconds = Math.floor(snippet.start % 60);
															const timeStamp = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

															return (
																<div
																	key={index}
																	className="border-l-4 border-blue-500 pl-4 py-2"
																>
																	<div className="flex items-start gap-4">
																		<span className="text-sm font-mono text-blue-600 font-semibold min-w-[60px]">
																			{timeStamp}
																		</span>
																		<p className="flex-1 leading-relaxed text-sm">
																			{snippet.text}
																		</p>
																	</div>
																</div>
															);
														})}
													</div>
												</div>
											)}
										</div>
									)}

									{/* Empty State */}
									{!moduleData.contentType && (
										<div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
											<p>No content added yet</p>
											<p className="text-sm">
												Add content in the editor tab to see preview
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
