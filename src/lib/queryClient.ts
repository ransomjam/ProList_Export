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
export const defaultQueryFn = async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<any> => {
  // Since this app uses mockApi, we don't need a default fetcher
  throw new Error('Query must provide a queryFn');
};

// API request function for mutations
export const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  // Since this app uses mockApi, we don't need a real API request function
  // This is here to match the development guidelines expectations
  throw new Error('Use mockApi functions directly instead of apiRequest');
};