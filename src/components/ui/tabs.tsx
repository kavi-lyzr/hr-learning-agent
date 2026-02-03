"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({
    opacity: 0,
  })

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current
    if (!list) return

    const activeTrigger = list.querySelector<HTMLButtonElement>(
      '[data-state="active"]'
    )
    if (!activeTrigger) {
      setIndicatorStyle({ opacity: 0 })
      return
    }

    const listRect = list.getBoundingClientRect()
    const triggerRect = activeTrigger.getBoundingClientRect()
    
    setIndicatorStyle({
      left: `${triggerRect.left - listRect.left}px`,
      width: `${triggerRect.width}px`,
      opacity: 1,
    })
  }, [])

  React.useEffect(() => {
    const list = listRef.current
    if (!list) return

    // Initial update
    updateIndicator()

    // Update on resize
    const resizeObserver = new ResizeObserver(() => {
      updateIndicator()
    })
    resizeObserver.observe(list)

    // Watch for tab changes via attribute mutations
    const observer = new MutationObserver(() => {
      updateIndicator()
    })
    observer.observe(list, {
      attributes: true,
      attributeFilter: ['data-state'],
      subtree: true,
    })

    // Also listen for click events as a fallback
    const handleClick = () => {
      // Small delay to let Radix update the state
      setTimeout(updateIndicator, 0)
    }
    list.addEventListener('click', handleClick)

    return () => {
      resizeObserver.disconnect()
      observer.disconnect()
      list.removeEventListener('click', handleClick)
    }
  }, [updateIndicator])

  return (
    <TabsPrimitive.List
      ref={(node) => {
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
        listRef.current = node
      }}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-12 w-fit items-center justify-center rounded-full p-[3px] dark:bg-foreground/5 relative",
        className
      )}
      {...props}
    >
      <span
        className="absolute h-[calc(100%-6px)] rounded-full bg-primary pointer-events-none z-0"
        style={{
          ...indicatorStyle,
          transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-in-out',
        }}
      />
      {children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-primary/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-full border border-transparent px-3 md:px-6 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 relative z-10",
        // Lighter hover for inactive tabs (both themes)
        "hover:bg-accent dark:hover:bg-accent",
        // Remove background from active state - sliding indicator handles it
        "data-[state=active]:bg-transparent",
        // Remove hover effect on active tab in dark theme
        "dark:data-[state=active]:hover:bg-transparent",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
