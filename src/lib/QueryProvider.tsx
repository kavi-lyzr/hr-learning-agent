"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

// Default options for React Query
// - Stale time: How long data is considered fresh (no refetch)
// - GC time: How long unused data stays in cache
// - Retry: Number of retries on failure
const defaultQueryClientOptions = {
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
            gcTime: 1000 * 60 * 30, // 30 minutes - cache lifetime
            retry: 2, // Retry twice on failure
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
            refetchOnWindowFocus: false, // Don't refetch on window focus for smoother UX
            refetchOnReconnect: true, // Refetch when network reconnects
        },
        mutations: {
            retry: 1, // Retry mutations once
        },
    },
};

interface QueryProviderProps {
    children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    // Create client inside component to avoid sharing state between requests
    const [queryClient] = useState(() => new QueryClient(defaultQueryClientOptions));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
