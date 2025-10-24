import RTE from "@/components/RTE";

export default function EditorPage() {
	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto py-10 px-4">
				<div className="max-w-5xl mx-auto space-y-6">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Rich Text Editor</h1>
						<p className="text-muted-foreground">
							A powerful TipTap-based editor with image support, formatting options, and more.
						</p>
					</div>
					<RTE />
				</div>
			</div>
		</div>
	);
}
