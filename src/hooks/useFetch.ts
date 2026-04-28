'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type UseFetchConfig<T> = {
    initialData?: T | null;
    skipInitialFetch?: boolean;
    onData?: (data: T) => void;
};

export function useFetch<T>(url: string, options?: RequestInit, config?: UseFetchConfig<T>) {
    const onDataRef = useRef(config?.onData);
    onDataRef.current = config?.onData;
    const skipInitialRef = useRef(!!config?.skipInitialFetch);
    const hasInitialRef = useRef(config?.initialData != null);
    skipInitialRef.current = !!config?.skipInitialFetch;
    hasInitialRef.current = config?.initialData != null;

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
            onDataRef.current?.(result);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [url, options]);

    useEffect(() => {
        if (skipInitialRef.current && hasInitialRef.current) return;
        fetchData();
    }, [fetchData]);

    return { data, loading, error, setData, refetch: fetchData };
}