'use client';

import React, { useEffect, useState, useCallback } from "react";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Cross from "../svg/Cross";
import Button from "../ui/Button";

export type FilterValues = {
    cuenta: string;
    centroCosto: string;
    planta: string;
    unidadNegocio: string;
    ubicacion: string;
    baja: string;
    origen: string;
};

const FILTER_LABELS: { key: keyof FilterValues; label: string }[] = [
    { key: 'cuenta', label: 'Cuenta' },
    { key: 'centroCosto', label: 'Centro de costo' },
    { key: 'planta', label: 'Planta' },
    { key: 'unidadNegocio', label: 'Unidad de negocio' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'baja', label: 'Baja' },
    { key: 'origen', label: 'Origen' },
];

const BAJA_OPTIONS = [
    { key: '', value: 'Todas' },
    { key: 'bajas-ejercicio', value: 'Bajas ejercicio actual' },
    { key: 'con-baja', value: 'Con baja' },
    { key: 'solo-activos', value: 'Solo activos' },
];

type ApiTableItem = { [key: string]: unknown };
type FilterOptionsState = {
    cuenta: { key: string; value: string }[];
    centroCosto: { key: string; value: string }[];
    planta: { key: string; value: string }[];
    unidadNegocio: { key: string; value: string }[];
    ubicacion: { key: string; value: string }[];
    origen: { key: string; value: string }[];
};

const filterOptionsCache = new Map<string, FilterOptionsState>();

function buildOptions(
    table: ApiTableItem[] | undefined,
    idKey: string,
    descKey: string,
    emptyLabel: string
): { key: string; value: string }[] {
    if (!table?.length) return [{ key: '', value: emptyLabel }];
    const opts = table.map((row) => ({
        key: String(row[idKey] ?? ''),
        value: String(row[descKey] ?? row[idKey] ?? ''),
    }));
    return [{ key: '', value: emptyLabel }, ...opts];
}

export default function FilterModal({
    isOpen,
    onClose,
    client,
    onApply,
    initialFilters,
}: {
    isOpen: boolean;
    onClose: () => void;
    client: string;
    onApply: (filters: FilterValues) => void;
    initialFilters?: Partial<FilterValues>;
}) {
    const [filters, setFilters] = useState<FilterValues>({
        cuenta: '',
        centroCosto: '',
        planta: '',
        unidadNegocio: '',
        ubicacion: '',
        baja: '',
        origen: '',
    });

    const [options, setOptions] = useState<FilterOptionsState>({
        cuenta: [{ key: '', value: 'Todas' }],
        centroCosto: [{ key: '', value: 'Todos' }],
        planta: [{ key: '', value: 'Todas' }],
        unidadNegocio: [{ key: '', value: 'Todas' }],
        ubicacion: [{ key: '', value: 'Todas' }],
        origen: [{ key: '', value: 'Todos' }],
    });

    const fetchOptions = useCallback(async () => {
        const cached = filterOptionsCache.get(client);
        if (cached) {
            setOptions(cached);
            return;
        }
        const base = { method: 'POST' as const, headers: { 'Content-Type': 'application/json' as const } };
        const body = (petition: string) => JSON.stringify({ petition, client, data: {} });

        const [accountsRes, costCenterRes, plantRes, businessUnitRes, geoRes, procedenceRes] = await Promise.all([
            fetch('/api/tables/accounts', { ...base, body: body('Get') }).then((r) => r.json()),
            fetch('/api/tables/costCenter', { ...base, body: body('Get') }).then((r) => r.json()),
            fetch('/api/tables/plant', { ...base, body: body('Get') }).then((r) => r.json()),
            fetch('/api/tables/businessUnit', { ...base, body: body('Get') }).then((r) => r.json()),
            fetch('/api/tables/geographicLocation', { ...base, body: body('Get') }).then((r) => r.json()),
            fetch('/api/tables/procedence', { ...base, body: body('Get') }).then((r) => r.json()),
        ]);

        const accountsTable = (accountsRes as { table?: ApiTableItem[] })?.table;
        const cuentasFiltradas = accountsTable?.filter(
            (row) => row.IdTipo != null && Number(row.IdTipo) !== 0
        );

        const nextOptions: FilterOptionsState = {
            cuenta: buildOptions(cuentasFiltradas, 'IdActivo', 'Descripcion', 'Todas'),
            centroCosto: buildOptions((costCenterRes as { table?: ApiTableItem[] })?.table, 'IdCencos', 'Descripcion', 'Todos'),
            planta: buildOptions((plantRes as { table?: ApiTableItem[] })?.table, 'IdPlanta', 'Descripcion', 'Todas'),
            unidadNegocio: buildOptions((businessUnitRes as { table?: ApiTableItem[] })?.table, 'IdUNegocio', 'Descripcion', 'Todas'),
            ubicacion: buildOptions((geoRes as { table?: ApiTableItem[] })?.table, 'idZona', 'descripcion', 'Todas'),
            origen: buildOptions((procedenceRes as { table?: ApiTableItem[] })?.table, 'IdOrigen', 'Descripcion', 'Todos'),
        };
        filterOptionsCache.set(client, nextOptions);
        setOptions(nextOptions);
    }, [client]);

    useEffect(() => {
        if (isOpen && client) fetchOptions();
    }, [isOpen, client, fetchOptions]);

    useEffect(() => {
        if (initialFilters) setFilters((prev) => ({ ...prev, ...initialFilters }));
    }, [initialFilters]);

    const handleSelect = (filterKey: keyof FilterValues) => (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => {
        const key = (e.currentTarget.dataset.key ?? '').trim();
        const value = e.currentTarget.textContent ?? '';
        if (ref.current) {
            ref.current.textContent = value;
            ref.current.dataset.key = key;
        }
        setFilters((prev) => ({ ...prev, [filterKey]: key }));
    };

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const getOptionsFor = (key: keyof FilterValues) => {
        if (key === 'baja') return BAJA_OPTIONS;
        return options[key] ?? [{ key: '', value: 'Todas' }];
    };

    const getDefaultValueFor = (key: keyof FilterValues) => {
        const v = filters[key];
        const opts = getOptionsFor(key);
        return opts.some((o) => o.key === v) ? v : opts[0]?.key ?? '';
    };

    return (
        <Modal
            isOpen={isOpen}
            style="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gabu-700 border border-gabu-900 shadow-xl p-6 max-w-4xl w-[90vw] relative"
        >
            <div className="flex justify-end border-b border-gabu-500 pb-4 mb-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded hover:bg-gabu-500 transition-colors"
                    aria-label="Cerrar"
                >
                    <Cross style="h-6 w-6 fill-current text-gabu-100 cursor-pointer" onClick={onClose} />
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
                {FILTER_LABELS.map(({ key, label }) => (
                    <Select
                        key={key}
                        label={label}
                        hasLabel={true}
                        isLogin={false}
                        variant="filterModal"
                        options={getOptionsFor(key)}
                        defaultValue={getDefaultValueFor(key)}
                        chooseOptionHandler={handleSelect(key)}
                    />
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gabu-500">
                <Button
                    text="Cerrar"
                    type="button"
                    handleClick={onClose}
                    style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                />
                <Button
                    text="Aplicar filtro"
                    type="button"
                    handleClick={handleApply}
                    style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300 px-4 py-2"
                />
            </div>
        </Modal>
    );
}
