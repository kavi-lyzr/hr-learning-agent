"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  isRounded = true,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & { isRounded?: boolean }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden",
        isRounded ? "rounded-full" : "",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  isRounded = true,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image> & { isRounded?: boolean }) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", isRounded ? "rounded-full" : "", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  isRounded = true,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & { isRounded?: boolean }) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center",
        isRounded ? "rounded-full" : "",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
