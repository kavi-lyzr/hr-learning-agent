"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, Save, Loader2 } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onSave?: () => void;
  saving?: boolean;
  showSaveButton?: boolean;
  hasChanges?: boolean;
}

export function BreadcrumbNav({ 
  items, 
  onSave, 
  saving = false, 
  showSaveButton = false,
  hasChanges = false,
}: BreadcrumbNavProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1 overflow-hidden">
          {items.map((item, idx) => (
            <Fragment key={idx}>
              {idx > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              {item.href ? (
                <Link 
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium truncate">{item.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
        {showSaveButton && onSave && (
          <Button 
            onClick={onSave} 
            disabled={saving || !hasChanges} 
            size="sm"
            className="ml-4 flex-shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

