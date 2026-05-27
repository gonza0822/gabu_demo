'use client';

import React, { ReactElement, useEffect, useMemo, useRef, useState } from "react";

type SearchableOption = {
    key: string;
    value: string;
};

export default function SearchableSelect({
    label,
    options,
    value,
    onChange,
    placeholder = "Buscar...",
    hasLabel = true,
    disabled = false,
    noResultsText = "Sin resultados",
}: {
    label: string;
    options: SearchableOption[];
    value?: string;
    onChange: (option: SearchableOption | null) => void;
    placeholder?: string;
    hasLabel?: boolean;
    disabled?: boolean;
    noResultsText?: string;
}): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedKey, setSelectedKey] = useState(value ?? "");

    useEffect(() => {
        setSelectedKey(value ?? "");
    }, [value]);

    useEffect(() => {
        const selected = options.find((option) => option.key === selectedKey);
        if (selected) setQuery(selected.value);
    }, [selectedKey, options]);

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const filteredOptions = useMemo(() => {
        const text = query.trim().toLowerCase();
        if (!text) return options;
        return options.filter((option) => option.value.toLowerCase().includes(text) || option.key.toLowerCase().includes(text));
    }, [options, query]);

    const labelClass = hasLabel ? "text-gabu-100 text-sm font-normal" : "";

    return (
        <div className={`flex flex-col gap-1 ${disabled ? "opacity-70" : ""}`} ref={containerRef}>
            {hasLabel ? <label className={labelClass}>{label}</label> : null}
            <div className="relative">
                <input
                    type="text"
                    disabled={disabled}
                    value={query}
                    placeholder={placeholder}
                    onFocus={() => {
                        if (!disabled) setIsOpen(true);
                    }}
                    onChange={(event) => {
                        const next = event.currentTarget.value;
                        setQuery(next);
                        setIsOpen(true);
                        if (selectedKey) {
                            setSelectedKey("");
                            onChange(null);
                        }
                    }}
                    className={`w-full rounded-md border border-gabu-900 bg-gabu-100 px-3 py-2 text-sm text-gabu-900 outline-none transition-colors focus:border-gabu-500 ${
                        disabled ? "cursor-not-allowed opacity-70" : ""
                    }`}
                />

                {isOpen ? (
                    <ul className="options-list absolute z-[1000] mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-gabu-900 bg-gabu-100 shadow-lg">
                        {filteredOptions.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-gabu-700">{noResultsText}</li>
                        ) : (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.key}
                                    className="cursor-pointer px-3 py-2 text-sm text-gabu-900 transition-colors hover:bg-gabu-300"
                                    onClick={() => {
                                        setSelectedKey(option.key);
                                        setQuery(option.value);
                                        setIsOpen(false);
                                        onChange(option);
                                    }}
                                >
                                    {option.value}
                                </li>
                            ))
                        )}
                    </ul>
                ) : null}
            </div>
        </div>
    );
}
