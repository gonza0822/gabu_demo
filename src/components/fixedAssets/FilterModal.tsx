'use client';

import React, { useEffect, useState, useCallback } from "react";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Cross from "../svg/Cross";
import Button from "../ui/Button";
import { areFiltersEqual, EMPTY_FILTERS, hasActiveFilters, type FilterValues, type SavedFilterRow } from "@/lib/fixedAssets/filterValues";

export type { FilterValues };
export { EMPTY_FILTERS, hasActiveFilters };

const FILTER_LABELS: { key: keyof FilterValues; label: string }[] = [
    { key: 'cuenta', label: 'Cuenta' },
    { key: 'centroCosto', label: 'Centro de costo' },
    { key: 'planta', label: 'Planta' },
    { key: 'unidadNegocio', label: 'Unidad de negocio' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'baja', label: 'Altas y bajas' },
    { key: 'origen', label: 'Origen' },
];

const BAJA_OPTIONS = [
    { key: '', value: 'Todas' },
    { key: 'altas-ejercicio', value: 'Altas ejercicio actual' },
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
    initialSavedFilterId = "",
    allowSavedFilters = true,
}: {
    isOpen: boolean;
    onClose: () => void;
    client: string;
    onApply: (filters: FilterValues, savedFilterId: string) => void;
    initialFilters?: Partial<FilterValues>;
    initialSavedFilterId?: string;
    allowSavedFilters?: boolean;
}) {
    const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
    const [savedFilters, setSavedFilters] = useState<SavedFilterRow[]>([]);
    const [selectedSavedId, setSelectedSavedId] = useState("");
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
    const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
    const [duplicateFilter, setDuplicateFilter] = useState<SavedFilterRow | null>(null);

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

    const fetchSavedFilters = useCallback(async () => {
        if (!allowSavedFilters || !client) return;
        const res = await fetch("/api/fixedAssets/savedFilters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ petition: "List", client, data: {} }),
        });
        const data = await res.json() as SavedFilterRow[] | { message?: string };
        if (!res.ok || !Array.isArray(data)) return;
        setSavedFilters(data);
    }, [allowSavedFilters, client]);

    useEffect(() => {
        if (isOpen && client) fetchOptions();
    }, [isOpen, client, fetchOptions]);

    useEffect(() => {
        if (isOpen && allowSavedFilters) fetchSavedFilters();
    }, [isOpen, allowSavedFilters, fetchSavedFilters]);

    useEffect(() => {
        if (!isOpen) return;
        setFilters({
            ...EMPTY_FILTERS,
            ...initialFilters,
        });
        setSelectedSavedId(initialSavedFilterId);
        setIsSaveOpen(false);
        setIsDeleteOpen(false);
        setIsOverwriteOpen(false);
        setIsDuplicateOpen(false);
        setDuplicateFilter(null);
        setSaveName("");
        setSaveError(null);
    }, [isOpen, initialFilters, initialSavedFilterId]);

    const handleSelect = (filterKey: keyof FilterValues) => (e: React.MouseEvent<HTMLLIElement>) => {
        const key = (e.currentTarget.dataset.key ?? "").trim();
        setSelectedSavedId("");
        setFilters((prev) => {
            if (key === "") {
                return { ...prev, [filterKey]: [] };
            }
            const current = prev[filterKey];
            const next = current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key];
            return { ...prev, [filterKey]: next };
        });
    };

    const handleSavedSelect = (e: React.MouseEvent<HTMLLIElement>) => {
        const key = (e.currentTarget.dataset.key ?? "").trim();
        if (!key) {
            setSelectedSavedId("");
            return;
        }
        const saved = savedFilters.find((row) => String(row.id) === key);
        if (!saved) return;
        setFilters({ ...EMPTY_FILTERS, ...saved.filtros });
        setSelectedSavedId(key);
    };

    const handleApply = () => {
        onApply(filters, selectedSavedId);
        onClose();
    };

    const getOptionsFor = (key: keyof FilterValues) => {
        if (key === 'baja') return BAJA_OPTIONS;
        return options[key] ?? [{ key: '', value: 'Todas' }];
    };

    const canSave = hasActiveFilters(filters);
    const selectedSaved = savedFilters.find((row) => String(row.id) === selectedSavedId);
    const savedSelectOptions = [
        { key: "", value: "Sin filtro" },
        ...savedFilters.map((row) => ({ key: String(row.id), value: row.nombre })),
    ];

    function findSavedByName(nombre: string): SavedFilterRow | undefined {
        const trimmed = nombre.trim();
        return savedFilters.find((row) => row.nombre.trim() === trimmed);
    }

    function findSavedBySameFilters(excludeId?: number): SavedFilterRow | undefined {
        return savedFilters.find((row) => {
            if (excludeId != null && row.id === excludeId) return false;
            return areFiltersEqual(row.filtros, filters);
        });
    }

    async function persistSave() {
        const nombre = saveName.trim();
        setIsSaving(true);
        setSaveError(null);
        try {
            const res = await fetch("/api/fixedAssets/savedFilters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "Save",
                    client,
                    data: { nombre, filtros: filters },
                }),
            });
            const data = await res.json() as SavedFilterRow | { message?: string };
            if (!res.ok || !("id" in data)) {
                if (res.status === 409) {
                    const existingByName = findSavedByName(nombre);
                    const duplicate = findSavedBySameFilters(existingByName?.id);
                    if (duplicate) {
                        setDuplicateFilter(duplicate);
                        setIsDuplicateOpen(true);
                        setIsOverwriteOpen(false);
                        return;
                    }
                }
                setSaveError(("message" in data && data.message) ? data.message : "No se pudo guardar el filtro.");
                setIsOverwriteOpen(false);
                return;
            }
            await fetchSavedFilters();
            setSelectedSavedId(String(data.id));
            setIsOverwriteOpen(false);
            setIsSaveOpen(false);
            setSaveName("");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSave() {
        const nombre = saveName.trim();
        if (!nombre) {
            setSaveError("Ingresá un nombre.");
            return;
        }
        setSaveError(null);
        const existingByName = findSavedByName(nombre);
        const duplicate = findSavedBySameFilters(existingByName?.id);
        if (duplicate) {
            setDuplicateFilter(duplicate);
            setIsDuplicateOpen(true);
            return;
        }
        if (existingByName) {
            setIsOverwriteOpen(true);
            return;
        }
        await persistSave();
    }

    function useExistingDuplicate() {
        if (!duplicateFilter) return;
        setFilters({ ...EMPTY_FILTERS, ...duplicateFilter.filtros });
        setSelectedSavedId(String(duplicateFilter.id));
        setIsDuplicateOpen(false);
        setDuplicateFilter(null);
        setIsOverwriteOpen(false);
        setIsSaveOpen(false);
        setSaveName("");
        setSaveError(null);
    }

    async function handleDelete() {
        if (!selectedSaved) return;
        setIsDeleting(true);
        try {
            const res = await fetch("/api/fixedAssets/savedFilters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "Delete",
                    client,
                    data: { id: selectedSaved.id },
                }),
            });
            if (!res.ok) return;
            await fetchSavedFilters();
            setSelectedSavedId("");
            setIsDeleteOpen(false);
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            style="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gabu-700 border border-gabu-900 shadow-xl p-6 max-w-4xl w-[90vw] relative"
        >
            <div className="relative">
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
                        multiple
                        options={getOptionsFor(key)}
                        selectedKeys={filters[key]}
                        chooseOptionHandler={handleSelect(key)}
                    />
                ))}
                {allowSavedFilters ? (
                    <Select
                        label="Filtros guardados"
                        hasLabel={true}
                        isLogin={false}
                        variant="filterModal"
                        options={savedSelectOptions}
                        defaultValue={selectedSavedId}
                        chooseOptionHandler={handleSavedSelect}
                    />
                ) : null}
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-gabu-500">
                {allowSavedFilters ? (
                    <div className="flex gap-3">
                        <Button
                            text="Guardar filtro"
                            type="button"
                            disabled={!canSave}
                            handleClick={() => {
                                if (!canSave) return;
                                setSaveName(selectedSaved?.nombre ?? "");
                                setSaveError(null);
                                setIsOverwriteOpen(false);
                                setIsDuplicateOpen(false);
                                setDuplicateFilter(null);
                                setIsSaveOpen(true);
                            }}
                            style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300 px-4 py-2"
                        />
                        <Button
                            text="Eliminar"
                            type="button"
                            disabled={!selectedSaved}
                            handleClick={() => {
                                if (!selectedSaved) return;
                                setIsDeleteOpen(true);
                            }}
                            style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                        />
                    </div>
                ) : <div />}
                <div className="flex gap-3">
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
            </div>

            {isSaveOpen ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-gabu-900/60">
                    <div className="w-full max-w-sm rounded-xl border border-gabu-500 bg-gabu-700 p-5 shadow-xl">
                        <p className="mb-3 text-gabu-100 text-base font-medium">Nombre</p>
                        <input
                            type="text"
                            value={saveName}
                            maxLength={80}
                            onChange={(e) => setSaveName(e.target.value)}
                            className="w-full rounded-lg border-0 bg-gabu-100 px-4 py-1.5 text-sm text-gabu-700 outline-none"
                            autoFocus
                        />
                        {saveError ? <p className="mt-2 text-sm text-gabu-error">{saveError}</p> : null}
                        <div className="mt-4 flex justify-end gap-3">
                            <Button
                                text="Cerrar"
                                type="button"
                                handleClick={() => {
                                    setIsOverwriteOpen(false);
                                    setIsDuplicateOpen(false);
                                    setDuplicateFilter(null);
                                    setIsSaveOpen(false);
                                }}
                                style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                            />
                            <Button
                                text={isSaving ? "Guardando…" : "Guardar"}
                                type="button"
                                disabled={isSaving}
                                handleClick={() => { void handleSave(); }}
                                style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300 px-4 py-2"
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            {isDuplicateOpen && duplicateFilter ? (
                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-gabu-900/60">
                    <div className="w-full max-w-sm rounded-xl border border-gabu-500 bg-gabu-700 p-5 shadow-xl">
                        <p className="text-gabu-100 text-base">
                            Ya existe un filtro con estos mismos criterios: “{duplicateFilter.nombre}”. Usalo desde Filtros guardados para no crear uno repetido.
                        </p>
                        <div className="mt-4 flex justify-end gap-3">
                            <Button
                                text="Cerrar"
                                type="button"
                                handleClick={() => {
                                    setIsDuplicateOpen(false);
                                    setDuplicateFilter(null);
                                }}
                                style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                            />
                            <Button
                                text="Usar ese filtro"
                                type="button"
                                handleClick={useExistingDuplicate}
                                style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300 px-4 py-2"
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            {isOverwriteOpen ? (
                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-gabu-900/60">
                    <div className="w-full max-w-sm rounded-xl border border-gabu-500 bg-gabu-700 p-5 shadow-xl">
                        <p className="text-gabu-100 text-base">
                            El filtro “{saveName.trim()}” ya existe y va a ser editado. ¿Querés actualizarlo?
                        </p>
                        <div className="mt-4 flex justify-end gap-3">
                            <Button
                                text="Cerrar"
                                type="button"
                                handleClick={() => setIsOverwriteOpen(false)}
                                style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                            />
                            <Button
                                text={isSaving ? "Actualizando…" : "Actualizar"}
                                type="button"
                                disabled={isSaving}
                                handleClick={() => { void persistSave(); }}
                                style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300 px-4 py-2"
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            {isDeleteOpen && selectedSaved ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-gabu-900/60">
                    <div className="w-full max-w-sm rounded-xl border border-gabu-500 bg-gabu-700 p-5 shadow-xl">
                        <p className="text-gabu-100 text-base">¿Eliminar el filtro “{selectedSaved.nombre}”?</p>
                        <div className="mt-4 flex justify-end gap-3">
                            <Button
                                text="Cerrar"
                                type="button"
                                handleClick={() => setIsDeleteOpen(false)}
                                style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                            />
                            <Button
                                text={isDeleting ? "Eliminando…" : "Eliminar"}
                                type="button"
                                disabled={isDeleting}
                                handleClick={() => { void handleDelete(); }}
                                style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300 px-4 py-2"
                            />
                        </div>
                    </div>
                </div>
            ) : null}
            </div>
        </Modal>
    );
}
