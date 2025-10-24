"use client";

import { ImageIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToolbar } from "@/components/toolbars/toolbar-provider";

const ImageToolbar = React.forwardRef<
	HTMLButtonElement,
	React.ComponentPropsWithoutRef<"button">
>(({ className, onClick, children, ...props }, ref) => {
	const { editor } = useToolbar();

	const addImage = React.useCallback(() => {
		const url = window.prompt("Enter image URL:");

		if (url) {
			editor?.chain().focus().setImage({ src: url }).run();
		}
	}, [editor]);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className={cn("h-8 w-8", className)}
					onClick={(e) => {
						addImage();
						onClick?.(e);
					}}
					ref={ref}
					{...props}
				>
					{children || <ImageIcon className="h-4 w-4" />}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<span>Insert Image</span>
			</TooltipContent>
		</Tooltip>
	);
});

ImageToolbar.displayName = "ImageToolbar";

export { ImageToolbar };
