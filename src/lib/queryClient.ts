import { QueryClient } from '@tanstack/react-query';

// Create the default query client with the configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Default fetcher function for queries that don't need custom fetching logic
export const defaultQueryFn = async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<never> => {
  throw new Error(`Query must provide a queryFn (missing for key: ${JSON.stringify(queryKey)})`);
};

// API request function for mutations
export const apiRequest = async (url: string, options: RequestInit = {}): Promise<never> => {
  void url;
  void options;
  throw new Error('Use mockApi functions directly instead of apiRequest');
};