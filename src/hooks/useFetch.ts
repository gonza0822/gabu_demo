'use client';

import { useState, useEffect, useCallback } from 'react';

type UseFetchConfig<T> = {
    initialData?: T | null;
    skipInitialFetch?: boolean;
    onData?: (data: T) => void;
};

export function useFetch<T>(url: string, options?: RequestInit, config?: UseFetchConfig<T>) {
    const [data, setData] = useState<T | null>(config?.initialData ?? null);
    const [loading, setLoading] = useState<boolean>(!(config?.skipInitialFetch && config?.initialData != null));
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
            const result: T = await response.json();
            setData(result);
            config?.onData?.(result);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [url, options, config]);

    useEffect(() => {
        if (config?.skipInitialFetch && config?.initialData != null) return;
        fetchData();
    }, [fetchData, config]);

    return { data, loading, error, setData, refetch: fetchData };
}