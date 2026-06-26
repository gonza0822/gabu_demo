'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { navActions, type Menu } from "@/store/navSlice";
import { openPagesActions } from "@/store/openPagesSlice";
import Select from "@/components/ui/Select";
import Excel from "@/components/svg/Excel";
import HorizontalInput from "@/components/ui/HorizontalInput";
import HorizontalSelect from "@/components/ui/HorizontalSelect";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { AbmCabeceraData, AbmLibrosData } from "@/lib/models/fixedAssets/FixedAsset";
import Percentage from "@/components/svg/Percentage";
import Cross from "@/components/svg/Cross";
import {
    getCabeceraDataFromCache,
    getDatosGeneralesFromCache,
    getLibrosDataFromCache,
    getSelectedBienFromGrid,
    setCabeceraDataInCache,
    setDatosGeneralesInCache,
    setLibrosDataInCache,
} from "@/lib/cache/fixedAssetsBootstrapCache";
import { formatNumberEs } from "@/util/number/formatNumberEs";
import AssetChargesGrid from "@/components/fixedAssets/AssetChargesGrid";

type AbmDatosGeneralesData = {
    plants: { key: string; value: string }[];
    zonas: { key: string; value: string }[];
    costCenters: { key: string; value: string }[];
    defaultPlanta: string | null;
    defaultZona: string | null;
    defaultCencos: string | null;
};

const ArrowSvg = ({ open }: { open: boolean }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`absolute right-5 transform origin-center fill-current text-gabu-100 transition-all duration-150 ${open ? 'rotate-90' : '-rotate-90'}`}>
        <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
    </svg>
);

const NOTA_PREVIEW_MAX = 120;

function previewAnotaciones(text: string): string {
    const t = (text ?? '').trim();
    if (!t) return 'Sin anotaciones';
    if (t.length <= NOTA_PREVIEW_MAX) return t;
    return `${t.slice(0, NOTA_PREVIEW_MAX).trimEnd()}…`;
}

type FotoDraftPending = { kind: 'pending'; id: string; file: File; previewUrl: string };
type FotoDraftSaved = { kind: 'saved'; path: string };
type FotoDraftItem = FotoDraftPending | FotoDraftSaved;

function fotoDraftKey(item: FotoDraftItem): string {
    return item.kind === 'pending' ? item.id : item.path;
}

function parseLocalizedNumber(value: unknown): number {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

/** Formatea un número para mostrar al cargar datos (no usar mientras el usuario escribe). */
function formatNumericFieldDisplay(value: unknown, fractionDigits = 2): string {
    return formatNumberEs(parseLocalizedNumber(value), fractionDigits, fractionDigits);
}

const SelectArrowSvg = () => (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-900 -rotate-90 transition-transform duration-300 select-pointer">
        <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
    </svg>
);

function FieldInput({ label, className = "" }: { label: string; className?: string }) {
    return (
        <div className={`flex rounded-xl border border-gabu-900 items-center h-7 overflow-hidden ${className}`}>
            <label className="text-sm text-gabu-900 whitespace-nowrap p-2 w-[30%]">{label}</label>
            <input type="text" className="bg-gabu-100 text-gabu-700 w-[70%] h-full border-l border-l-gabu-900 focus:outline-none px-1" />
        </div>
    );
}

function FieldSelect({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex rounded-xl border border-gabu-900 items-center h-7">
            <label className="text-sm text-gabu-900 whitespace-nowrap p-2 w-[30%]">{label}</label>
            <div className="relative h-full w-[70%]">
                <div className="bg-gabu-100 h-full flex justify-between items-center cursor-pointer px-3 rounded-r-xl border-l border-l-gabu-700">
                    <span className="text-sm text-gabu-700">{value}</span>
                    <SelectArrowSvg />
                </div>
            </div>
        </div>
    );
}

function HorizontalTabPanel({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex rounded-lg border border-gabu-900 items-center h-8 overflow-hidden">
            <label className="text-gabu-100 whitespace-nowrap p-2 w-[25%] bg-gabu-700">{label}</label>
            <p className="bg-gabu-300 text-gabu-700 w-[75%] h-full text-end font-semibold text-sm p-1.5">{children}</p>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectOptionHandler = (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<any>) => {
    const li = e.currentTarget;
    if (ref?.current) {
        if ('value' in ref.current) {
            ref.current.value = li.textContent || "";
        } else {
            ref.current.textContent = li.textContent || "";
        }
        ref.current.dataset.key = li.dataset.key || "";
    }
};

type AbmFixedAssetProps = { bienId?: string; consultMode?: boolean; cloneMode?: boolean; altaAgregadoMode?: boolean; simulationOnly?: boolean };

function shouldFetchBienDataFromApi(data: Record<string, unknown> | null, simulationOnly: boolean): boolean {
    if (!data) return true;
    // La grilla de simulación no trae el mismo shape que GetBienById (libros, distribución, aliases); siempre refrescar.
    if (simulationOnly) return true;
    // La fila de la grilla ya contiene muchos campos de cabecera/libros; solo pedimos DB
    // cuando faltan datos extendidos necesarios para edición completa (ej: distribución detallada).
    const hasDistribucion = Array.isArray(data._distribucion);
    const hasAnotaciones = typeof data._anotaciones === 'string';
    const hasFoto = '_fotos' in data || '_foto' in data;
    return !hasDistribucion || !hasAnotaciones || !hasFoto;
}

export default function AbmFixedAsset({ bienId, consultMode: consultModeProp, cloneMode, altaAgregadoMode, simulationOnly = false }: AbmFixedAssetProps) : React.ReactElement {
    const router = useRouter();
    const pathname = usePathname();
    const consultMode = Boolean(consultModeProp || pathname.includes("/consult/"));
    const dispatch = useDispatch();
    const client = useSelector((state: RootState) => state.authorization.client);
    const cacheClientKey = simulationOnly ? `${client}::simulacion` : client;
    const clientMenu = useSelector((state: RootState) => state.nav.find((m: Menu) => m.client === client));
    const [datosGenerales, setDatosGenerales] = useState<AbmDatosGeneralesData | null>(null);
    const [datosGeneralesLoading, setDatosGeneralesLoading] = useState(true);
    const [cabeceraData, setCabeceraData] = useState<AbmCabeceraData | null>(null);
    const [cabeceraLoading, setCabeceraLoading] = useState(true);
    const [librosData, setLibrosData] = useState<AbmLibrosData | null>(null);
    const [bienData, setBienData] = useState<{ [key: string]: unknown } | null>(null);
    const [bienDataLoading, setBienDataLoading] = useState(false);
    const [cabeceraInitialValues, setCabeceraInitialValues] = useState<Record<string, string>>({});
    const [librosLoading, setLibrosLoading] = useState(true);

    const fetchCabeceraData = useCallback(async () => {
        if (!client) return;
        setCabeceraLoading(true);
        try {
            const cachedCabecera = getCabeceraDataFromCache(cacheClientKey);
            if (cachedCabecera) {
                setCabeceraData(cachedCabecera);
                return;
            }
            const res = await fetch("/api/fixedAssets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetCabeceraFormData", client, data: { simulationOnly } }),
            });
            const data = await res.json();
            if (data && Array.isArray(data.fields)) {
                setCabeceraData(data);
                setCabeceraDataInCache(cacheClientKey, data);
            }
        } finally {
            setCabeceraLoading(false);
        }
    }, [cacheClientKey, client, simulationOnly]);

    useEffect(() => {
        fetchCabeceraData();
    }, [fetchCabeceraData]);

    const fetchLibrosData = useCallback(async () => {
        if (!client) return;
        setLibrosLoading(true);
        try {
            const cachedLibros = getLibrosDataFromCache(cacheClientKey);
            if (cachedLibros) {
                setLibrosData(cachedLibros);
                return;
            }
            const res = await fetch("/api/fixedAssets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetLibrosFormData", client, data: { simulationOnly } }),
            });
            const data = await res.json();
            if (data && Array.isArray(data.acordeones)) {
                setLibrosData(data);
                setLibrosDataInCache(cacheClientKey, data);
            }
        } finally {
            setLibrosLoading(false);
        }
    }, [cacheClientKey, client, simulationOnly]);

    useEffect(() => {
        fetchLibrosData();
    }, [fetchLibrosData]);

    const rowHasUsableValue = (v: unknown): boolean =>
        v !== undefined && v !== null && v !== '';

    const getRowVal = useCallback((row: { [key: string]: unknown }, key: string): unknown => {
        const r = row;
        const lower = key.toLowerCase();
        const tries = [
            key,
            key.toLowerCase(),
            key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
            key.toUpperCase(),
            `cabecera.${key}`,
            `cabecera.${key.toLowerCase()}`,
        ];
        for (const k of tries) {
            const val = r[k];
            if (rowHasUsableValue(val)) return val;
        }
        const matchedKey = Object.keys(r).find((k) => {
            const val = r[k];
            if (!rowHasUsableValue(val)) return false;
            const kl = k.toLowerCase();
            return (
                kl === lower ||
                kl.endsWith('.' + lower) ||
                kl.endsWith('_' + lower) ||
                kl.endsWith('.' + key.toLowerCase())
            );
        });
        return matchedKey != null ? r[matchedKey] : undefined;
    }, [simulationOnly]);

    const fetchBienData = useCallback(async () => {
        if (!client || !bienId) return;
        const cachedFromGrid = getSelectedBienFromGrid(cacheClientKey, bienId);
        if (cachedFromGrid) {
            setBienData(cachedFromGrid);
            if (!shouldFetchBienDataFromApi(cachedFromGrid, simulationOnly)) return;
        }
        setBienDataLoading(true);
        try {
            const res = await fetch("/api/fixedAssets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetBienData", client, data: { bienId, simulationOnly } }),
            });
            const data = await res.json();
            if (
                res.ok &&
                data &&
                typeof data === 'object' &&
                !('message' in data && 'status' in data)
            ) {
                setBienData(data as { [key: string]: unknown });
            }
        } finally {
            setBienDataLoading(false);
        }
    }, [cacheClientKey, client, bienId, simulationOnly]);

    useEffect(() => {
        if (bienId) fetchBienData();
    }, [bienId, fetchBienData]);

    const fetchDatosGenerales = useCallback(async () => {
        if (!client) return;
        setDatosGeneralesLoading(true);
        try {
            const cachedDatosGenerales = getDatosGeneralesFromCache(cacheClientKey);
            if (cachedDatosGenerales) {
                setDatosGenerales(cachedDatosGenerales);
                return;
            }

            const res = await fetch("/api/fixedAssets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetFormData", client, data: {} }),
            });
            const data = await res.json();
            if (data && Array.isArray(data.plants) && Array.isArray(data.zonas) && Array.isArray(data.costCenters)) {
                setDatosGenerales(data);
                setDatosGeneralesInCache(cacheClientKey, data);
            }
        } finally {
            setDatosGeneralesLoading(false);
        }
    }, [cacheClientKey, client]);

    useEffect(() => {
        fetchDatosGenerales();
    }, [fetchDatosGenerales]);

    useEffect(() => {
        if (datosGenerales && !bienId) {
            setDatosPlanta((p) => p || (datosGenerales.defaultPlanta ?? ''));
            setDatosZona((z) => z || (datosGenerales.defaultZona ?? ''));
            setDatosCencos((c) => c || (datosGenerales.defaultCencos ?? ''));
        }
    }, [datosGenerales, bienId]);

    // Per-accordion reactive state for calculated fields
    const [librosFecori, setLibrosFecori] = useState<Record<string, string>>({});
    const [librosTipoAmor, setLibrosTipoAmor] = useState<Record<string, string>>({});
    const [librosVidautil, setLibrosVidautil] = useState<Record<string, string>>({});
    const [librosValori, setLibrosValori] = useState<Record<string, string>>({});
    /** Texto visible en inputs VALORI; se formatea solo al cargar/revertir, no al escribir. */
    const [librosValoriDraft, setLibrosValoriDraft] = useState<Record<string, string>>({});

    const [librosOpenPrefijo, setLibrosOpenPrefijo] = useState<string | null>(null);
    const cabeceraOpen = librosOpenPrefijo === 'cabecera';
    const [cabeceraCuenta, setCabeceraCuenta] = useState<string>('');
    const [librosHorizontalTab, setLibrosHorizontalTab] = useState<Record<string, string>>({});
    const [valorOrigenGral, setValorOrigenGral] = useState(() => formatNumericFieldDisplay(0));
    const [formKey, setFormKey] = useState(0);

    const [descripcion, setDescripcion] = useState('');
    const [datosPlanta, setDatosPlanta] = useState('');
    const [datosZona, setDatosZona] = useState('');
    const [datosCencos, setDatosCencos] = useState('');

    const formRef = useRef<HTMLFormElement>(null);
    const cabeceraValuesRef = useRef<Record<string, string>>({});

    const [accordionErrors, setAccordionErrors] = useState<Record<string, string[]>>({});
    const [saveError, setSaveError] = useState<string | null>(null);

    const getCabeceraFieldError = useCallback((fieldId: string) => {
        const errs = accordionErrors['cabecera'] ?? [];
        const m = errs.find((e) => e.includes(`en ${fieldId} `) || e.includes(`en ${fieldId} (`));
        return m ? 'Formato MM/YYYY' : null;
    }, [accordionErrors]);

    const getLibroFieldError = useCallback((prefijo: string, idCampo: string) => {
        const errs = accordionErrors[prefijo] ?? [];
        const up = idCampo.toUpperCase();
        const m = errs.find((e) => e.startsWith(`${up}:`) || e.startsWith(`${up} `));
        if (!m) return null;
        const idx = m.indexOf(':');
        return idx >= 0 ? m.slice(idx + 1).trim() : m;
    }, [accordionErrors]);

    const clearCabeceraFieldError = useCallback((fieldId: string) => {
        setAccordionErrors((prev) => {
            const list = (prev['cabecera'] ?? []).filter((e) => !e.includes(`en ${fieldId} `) && !e.includes(`en ${fieldId} (`));
            if (list.length === 0) {
                const next = { ...prev };
                delete next['cabecera'];
                return next;
            }
            return { ...prev, cabecera: list };
        });
    }, []);

    const clearLibroFieldError = useCallback((prefijo: string, idCampo: string) => {
        const up = idCampo.toUpperCase();
        setAccordionErrors((prev) => {
            const list = (prev[prefijo] ?? []).filter((e) => !e.startsWith(`${up}:`) && !e.startsWith(`${up} `));
            if (list.length === 0) {
                const next = { ...prev };
                delete next[prefijo];
                return next;
            }
            return { ...prev, [prefijo]: list };
        });
    }, []);
    const [saving, setSaving] = useState(false);

    const MM_YYYY_REGEX = /^(0?[1-9]|1[0-2])[\/\-](\d{4})$/;

    type DistribucionRow = { id: number; cencos: string; porcentaje: string };
    const [distribucionRows, setDistribucionRows] = useState<DistribucionRow[]>([]);
    const [ccostosOptions, setCcostosOptions] = useState<{ key: string; value: string }[]>([]);
    const [anotaciones, setAnotaciones] = useState('');
    const initialAnotacionesRef = useRef('');
    const [notaModalOpen, setNotaModalOpen] = useState(false);
    const [notaModalDraft, setNotaModalDraft] = useState('');
    const [savedFotosPaths, setSavedFotosPaths] = useState<string[]>([]);
    const savedFotosSnapshotRef = useRef<string[]>([]);
    const [pendingFotoAdds, setPendingFotoAdds] = useState<FotoDraftPending[]>([]);
    const [pendingFotoDeletes, setPendingFotoDeletes] = useState<string[]>([]);
    const [fotoVersion, setFotoVersion] = useState(0);
    const [fotoError, setFotoError] = useState<string | null>(null);
    const [fotoModalOpen, setFotoModalOpen] = useState(false);
    const [fotoModalItem, setFotoModalItem] = useState<FotoDraftItem | null>(null);
    const fotoInputRef = useRef<HTMLInputElement>(null);
    const fotosFetchIdRef = useRef(0);
    const pendingFotoAddsRef = useRef<FotoDraftPending[]>([]);

    useEffect(() => {
        pendingFotoAddsRef.current = pendingFotoAdds;
    }, [pendingFotoAdds]);

    useEffect(() => () => {
        pendingFotoAddsRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    }, []);

    /** Hidrata formulario desde bienData (debe ir después de los useState que actualiza). */
    useEffect(() => {
        if (!bienData || !cabeceraData || !librosData) return;
        const r = bienData;
        const gv = (key: string) => {
            const v = getRowVal(r, key);
            return v != null ? String(v) : '';
        };
        const formatDate = (val: unknown): string => {
            if (val == null || val === '') return '';
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                }
            }
            return String(val);
        };
        setDescripcion(altaAgregadoMode ? `Adicional ${gv('descripcion')}`.trim() : gv('descripcion'));
        setDatosPlanta(gv('idPlanta'));
        setDatosZona(gv('idZona'));
        setDatosCencos(gv('idCencos'));
        const activo = gv('idActivo');
        if (activo) setCabeceraCuenta(activo);
        const initial: Record<string, string> = {
            IDDESCRIPCION: gv('idDescripcion'),
            IDSITUACION: gv('idSituacion'),
            CANTIDAD: gv('cantidad') || '1',
            IDFACTURA: gv('idFactura'),
            IDUNEGOCIO: gv('idUnegocio'),
            IDENTIFICACION: gv('identificacion'),
            IDACTIVO: activo,
            TRFECACTIVO: formatDate(getRowVal(r, 'trFecActivo')),
            IDMODELO: gv('idModelo'),
            TRIDACTIVO: gv('tridActivo'),
            IDORDENCOMPRA: gv('idOrdenCompra'),
            TRFECPROYECTO: formatDate(getRowVal(r, 'trFecProyecto')),
            IDORIGEN: gv('idOrigen'),
            TRFECUNEGOCIO: formatDate(getRowVal(r, 'trFecUNegocio')),
            IDPROVEEDOR: gv('idProveedor'),
            ESENCIAL: (getRowVal(r, 'escencial') === true || getRowVal(r, 'escencial') === 'true') ? '1' : '0',
            IDFABRICANTE: gv('idFabricante'),
            NUEVO: (getRowVal(r, 'nuevo') === true || getRowVal(r, 'nuevo') === 'true') ? '1' : '0',
            IDPROYECTO: gv('idProyecto'),
        };
        cabeceraValuesRef.current = initial;
        setCabeceraInitialValues(initial);
        const dist = (r._distribucion as { idCencos: string; porcentaje: number }[]) ?? [];
        if (dist.length > 0) {
            setDistribucionRows(dist.map((d, i) => ({
                id: Date.now() + i,
                cencos: d.idCencos ?? '',
                porcentaje: formatNumericFieldDisplay(d.porcentaje ?? 0),
            })));
        }
        const rawAnot = r._anotaciones;
        const initialAnot = typeof rawAnot === 'string' ? rawAnot : '';
        initialAnotacionesRef.current = initialAnot;
        setAnotaciones(initialAnot);
        const rawVal = altaAgregadoMode ? 0 : parseLocalizedNumber(getRowVal(r, 'Valori') ?? getRowVal(r, 'valori') ?? 0);
        setValorOrigenGral(formatNumericFieldDisplay(isNaN(rawVal) ? 0 : rawVal));
        const fecoriMap: Record<string, string> = {};
        const tipoAmorMap: Record<string, string> = {};
        const vidautilMap: Record<string, string> = {};
        const valoriMap: Record<string, string> = {};
        const valoriDraftMap: Record<string, string> = {};
        const tryLibroVal = (prefijo: string, campo: string): unknown => {
            const fallbacks = simulationOnly
                ? [
                    `${prefijo}.${campo}`,
                    `${prefijo.toLowerCase()}.${campo}`,
                    `${prefijo.toUpperCase()}.${campo.toUpperCase()}`,
                    `me03.${campo}`,
                    `ME03.${campo}`,
                    `me01.${campo}`,
                    campo,
                    campo.toUpperCase(),
                ]
                : [`${prefijo}.${campo}`, `${prefijo.toLowerCase()}.${campo}`, `me01.${campo}`, campo, campo.toUpperCase()];
            for (const k of fallbacks) {
                const v = getRowVal(r, k);
                if (rowHasUsableValue(v)) return v;
            }
            return undefined;
        };
        const getIdMonedaForPrefijo = (prefijo: string): string => {
            if (prefijo.toUpperCase() === 'MONEDALOCAL' || prefijo.toLowerCase() === 'impuestos') return '01';
            const m = prefijo.match(/^ME(\d+)$/i);
            return m ? m[1].padStart(2, '0') : '01';
        };
        librosData.acordeones.forEach((ac) => {
            const vFec = tryLibroVal(ac.prefijo, 'FecOri');
            const vTipo = tryLibroVal(ac.prefijo, 'idTipoAmortizacion');
            const vVu = tryLibroVal(ac.prefijo, 'vidaUtil');
            const vVal = tryLibroVal(ac.prefijo, 'Valori');
            if (cloneMode || altaAgregadoMode) {
                const fecPro = librosData.defaultsByMoneda[getIdMonedaForPrefijo(ac.prefijo)]?.FECORI ?? '';
                if (fecPro) fecoriMap[ac.prefijo] = fecPro;
            } else if (vFec != null && vFec !== '') {
                fecoriMap[ac.prefijo] = formatDate(vFec);
            }
            if (vTipo != null && vTipo !== '') tipoAmorMap[ac.prefijo] = String(vTipo);
            if (vVu != null && vVu !== '') vidautilMap[ac.prefijo] = String(vVu);
            if (altaAgregadoMode) {
                valoriMap[ac.prefijo] = '0';
                valoriDraftMap[ac.prefijo] = '0';
            } else if (rowHasUsableValue(vVal) || (typeof vVal === 'number' && !Number.isNaN(vVal))) {
                const num = parseLocalizedNumber(vVal);
                const raw = isNaN(num) ? '0' : String(num);
                valoriMap[ac.prefijo] = raw;
                valoriDraftMap[ac.prefijo] = valorConCotizacion(raw, ac.prefijo);
            }
        });
        setLibrosFecori((prev) => ({ ...prev, ...fecoriMap }));
        setLibrosTipoAmor((prev) => ({ ...prev, ...tipoAmorMap }));
        setLibrosVidautil((prev) => ({ ...prev, ...vidautilMap }));
        setLibrosValori((prev) => ({ ...prev, ...valoriMap }));
        setLibrosValoriDraft((prev) => ({ ...prev, ...valoriDraftMap }));
        setFormKey((k) => k + 1);
    }, [bienData, cabeceraData, librosData, getRowVal, cloneMode, altaAgregadoMode, simulationOnly]);

    const fetchCCostos = useCallback(async () => {
        if (!client) return;
        try {
            const res = await fetch("/api/fixedAssets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetCCostosOptions", client, data: {} }),
            });
            const data = await res.json();
            if (Array.isArray(data)) setCcostosOptions(data);
        } catch { /* silent */ }
    }, [client]);

    useEffect(() => { fetchCCostos(); }, [fetchCCostos]);

    const fetchFotos = useCallback(async () => {
        if (!client || !bienId || cloneMode || altaAgregadoMode) return;
        const fetchId = ++fotosFetchIdRef.current;
        try {
            const params = new URLSearchParams({ client, bienId, list: '1' });
            const res = await fetch(`/api/fixedAssets/foto?${params.toString()}`);
            const data = await res.json();
            if (fetchId !== fotosFetchIdRef.current) return;
            if (res.ok && Array.isArray(data.fotos)) {
                const paths = (data.fotos as unknown[]).filter(
                    (p): p is string => typeof p === 'string' && p.trim() !== ''
                );
                setSavedFotosPaths(paths);
                savedFotosSnapshotRef.current = paths;
                setPendingFotoAdds((prev) => {
                    prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                    return [];
                });
                setPendingFotoDeletes([]);
                setFotoVersion((v) => v + 1);
            }
        } catch {
            /* silent */
        }
    }, [client, bienId, cloneMode, altaAgregadoMode]);

    useEffect(() => {
        void fetchFotos();
    }, [fetchFotos]);

    const [distribucionOpenId, setDistribucionOpenId] = useState<number | null>(null);

    const addDistribucionRow = () => {
        setDistribucionRows((prev) => {
            if (prev.length >= 4) return prev;
            return [...prev, { id: Date.now(), cencos: ccostosOptions[0]?.key ?? '', porcentaje: '0' }];
        });
    };

    const removeDistribucionRow = (id: number) => {
        setDistribucionRows((prev) => prev.filter((r) => r.id !== id));
    };

    const updateDistribucionPorcentaje = (id: number, newVal: string) => {
        setDistribucionRows((prev) =>
            prev.map((r) => r.id === id ? { ...r, porcentaje: newVal } : r)
        );
    };

    const distribucionSum = distribucionRows.reduce((s, r) => s + parseLocalizedNumber(r.porcentaje), 0);
    const distribucionInvalid = distribucionRows.length > 0 && Math.abs(distribucionSum - 100) > 0.01;
    const cencosKeys = distribucionRows.map((r) => r.cencos).filter(Boolean);
    const distribucionDuplicateCencos = cencosKeys.length !== new Set(cencosKeys).size;

    const setCabeceraValue = (fieldId: string, key: string) => {
        cabeceraValuesRef.current[fieldId] = key;
    };

    const resetFotoDraft = useCallback(() => {
        pendingFotoAddsRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setPendingFotoAdds([]);
        setPendingFotoDeletes([]);
        if (cloneMode || altaAgregadoMode || !bienId) {
            setSavedFotosPaths([]);
            savedFotosSnapshotRef.current = [];
        } else {
            setSavedFotosPaths([...savedFotosSnapshotRef.current]);
        }
        setFotoError(null);
        setFotoModalOpen(false);
        setFotoModalItem(null);
    }, [bienId, cloneMode, altaAgregadoMode]);

    const fotoDisplayItems = useMemo((): FotoDraftItem[] => {
        const deletes = new Set(pendingFotoDeletes);
        const saved = savedFotosPaths
            .filter((p) => !deletes.has(p))
            .map((path): FotoDraftSaved => ({ kind: 'saved', path }));
        return [...saved, ...pendingFotoAdds];
    }, [savedFotosPaths, pendingFotoDeletes, pendingFotoAdds]);

    const syncFotosWithServer = useCallback(async (targetBienId: string): Promise<string | null> => {
        if (!client) return 'Cliente no disponible';
        fotosFetchIdRef.current += 1;
        try {
            for (const path of pendingFotoDeletes) {
                const params = new URLSearchParams({ client, bienId: targetBienId, path });
                const res = await fetch(`/api/fixedAssets/foto?${params.toString()}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok || !data?.ok) {
                    return (data?.message as string | undefined) ?? 'Error al eliminar una foto';
                }
            }
            for (const item of pendingFotoAdds) {
                const form = new FormData();
                form.append('client', client);
                form.append('bienId', targetBienId);
                form.append('file', item.file);
                const res = await fetch('/api/fixedAssets/foto', { method: 'POST', body: form });
                const data = await res.json();
                if (!res.ok || !data?.ok) {
                    return (data?.message as string | undefined) ?? 'Error al guardar una foto';
                }
            }
            pendingFotoAddsRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
            setPendingFotoAdds([]);
            setPendingFotoDeletes([]);
            const params = new URLSearchParams({ client, bienId: targetBienId, list: '1' });
            const res = await fetch(`/api/fixedAssets/foto?${params.toString()}`);
            const data = await res.json();
            if (res.ok && Array.isArray(data.fotos)) {
                const paths = (data.fotos as unknown[]).filter(
                    (p): p is string => typeof p === 'string' && p.trim() !== ''
                );
                setSavedFotosPaths(paths);
                savedFotosSnapshotRef.current = paths;
                setFotoVersion((v) => v + 1);
            }
            return null;
        } catch {
            return 'Error al guardar las fotos';
        }
    }, [client, pendingFotoDeletes, pendingFotoAdds]);

    const handleRevert = useCallback(() => {
        setValorOrigenGral(formatNumericFieldDisplay(0));
        setAnotaciones(initialAnotacionesRef.current);
        resetFotoDraft();
        void fetchFotos();
        setNotaModalOpen(false);
        setNotaModalDraft('');
        setDistribucionRows([]);
        setDistribucionOpenId(null);
        setLibrosValori({});
        setLibrosValoriDraft({});
        const defaultActivo = cabeceraData?.defaultActivo ?? librosData?.cuentas[0]?.key ?? '';
        setCabeceraCuenta(defaultActivo);
        if (librosData) {
            const getIdMoneda = (p: string) => {
                const up = p.toUpperCase();
                if (up === 'MONEDALOCAL' || p.toLowerCase() === 'impuestos') return '01';
                const m = p.match(/^ME(\d+)$/i);
                return m ? m[1].padStart(2, '0') : '01';
            };
            const fecoriMap: Record<string, string> = {};
            const tipoAmorMap: Record<string, string> = {};
            const vidautilMap: Record<string, string> = {};
            librosData.acordeones.forEach((ac) => {
                const idMoneda = getIdMoneda(ac.prefijo);
                const def = librosData.defaultsByMoneda[idMoneda];
                fecoriMap[ac.prefijo]   = def?.FECORI ?? '';
                tipoAmorMap[ac.prefijo] = def?.IDTIPOAMORTIZACION ?? '';
                const vuRow = librosData.vidautil.find(
                    (v) => v.idMoextra === idMoneda && v.idActivo === defaultActivo
                );
                vidautilMap[ac.prefijo] = vuRow ? String(vuRow.meses) : '';
            });
            setLibrosFecori(fecoriMap);
            setLibrosTipoAmor(tipoAmorMap);
            setLibrosVidautil(vidautilMap);
        }
        setFormKey((k) => k + 1);
    }, [cabeceraData?.defaultActivo, librosData, fetchFotos, resetFotoDraft]);

    const handleGuardar = useCallback(async () => {
        if (!client) return;
        const errors: Record<string, string[]> = {};
        const dgDesc = descripcion.trim();
        if (!dgDesc) {
            errors['datosGenerales'] = ['La descripción no puede estar vacía'];
        }
        const dateFields = ['TRFECACTIVO', 'TRFECPROYECTO', 'TRFECUNEGOCIO'];
        const cabeceraEls = formRef.current?.querySelectorAll<HTMLInputElement>(
            '[name="IDDESCRIPCION"], [name="CANTIDAD"], [name="IDFACTURA"], [name="IDENTIFICACION"], [name="TRFECACTIVO"], [name="TRIDACTIVO"], [name="IDORDENCOMPRA"], [name="TRFECPROYECTO"], [name="TRFECUNEGOCIO"], [name="IDPROVEEDOR"], [name="IDFABRICANTE"], [name="IDSITUACION"], [name="IDUNEGOCIO"], [name="IDACTIVO"], [name="IDMODELO"], [name="IDORIGEN"], [name="ESENCIAL"], [name="NUEVO"], [name="IDPROYECTO"]'
        );
        const cabErrors: string[] = [];
        cabeceraEls?.forEach((el) => {
            const name = el.getAttribute('name') || '';
            if (dateFields.includes(name)) {
                const v = (el.value || '').trim();
                if (v && !MM_YYYY_REGEX.test(v)) cabErrors.push(`Fecha inválida en ${name} (use MM/YYYY)`);
            }
        });
        if (cabErrors.length) errors['cabecera'] = cabErrors;

        const libroDateFields = ['FECORI', 'FECDEP', 'FECFIN'];
        librosData?.acordeones.forEach((ac) => {
            const libErrors: string[] = [];
            ac.fields.forEach((f) => {
                const campoUp = f.idCampo.toUpperCase();
                const fieldId = `${ac.prefijo}.${f.idCampo}`;
                const inp = formRef.current?.querySelector<HTMLInputElement>(`[name="${fieldId}"]`);
                if (inp) {
                    const v = (inp.value || '').trim();
                    if (libroDateFields.includes(campoUp) && v && !MM_YYYY_REGEX.test(v)) {
                        libErrors.push(`${campoUp}: formato MM/YYYY`);
                    }
                }
            });
            if (libErrors.length) errors[ac.prefijo] = libErrors;
        });

        const distSum = distribucionRows.reduce((s, r) => s + parseLocalizedNumber(r.porcentaje), 0);
        if (distribucionRows.length > 0 && Math.abs(distSum - 100) > 0.01) {
            setSaveError('El conjunto de la distribución tiene que ser un 100%');
            setAccordionErrors(errors);
            return;
        }
        const cencosKeys = distribucionRows.map((r) => r.cencos).filter(Boolean);
        const cencosSet = new Set(cencosKeys);
        if (cencosKeys.length !== cencosSet.size) {
            setSaveError('Hay un centro de costo que se repite en la distribución');
            setAccordionErrors(errors);
            return;
        }

        setAccordionErrors(errors);
        setSaveError(null);
        if (Object.keys(errors).length > 0) return;

        setSaving(true);
        try {
            const cabMap: Record<string, string> = {
                IDDESCRIPCION: 'idDescripcion', IDSITUACION: 'idSituacion', CANTIDAD: 'cantidad', IDFACTURA: 'idFactura',
                IDUNEGOCIO: 'idUnegocio', IDENTIFICACION: 'identificacion', IDACTIVO: 'idActivo', TRFECACTIVO: 'trFecActivo',
                IDMODELO: 'idModelo', TRIDACTIVO: 'tridActivo', IDORDENCOMPRA: 'idOrdenCompra', TRFECPROYECTO: 'trFecProyecto',
                IDORIGEN: 'idOrigen', TRFECUNEGOCIO: 'trFecUNegocio', IDPROVEEDOR: 'idProveedor', ESENCIAL: 'escencial',
                IDFABRICANTE: 'idFabricante', NUEVO: 'nuevo', IDPROYECTO: 'idProyecto', TRIDPROYECTO: 'tridProyecto',
                TRIDUNEGOCIO: 'tridUNegocio',
            };
            const toCabKey = (n: string) => cabMap[n] ?? n.charAt(0).toLowerCase() + n.slice(1);
            const cab: Record<string, string | number | boolean | null> = {};
            cabeceraEls?.forEach((el) => {
                const n = el.getAttribute('name') || '';
                cab[toCabKey(n)] = el.value ?? '';
            });
            Object.entries(cabeceraValuesRef.current).forEach(([k, v]) => { cab[toCabKey(k)] = v; });
            cab.idActivo = cabeceraCuenta || (cab.idActivo as string) || '';

            const subAccordionBases = ['Vrepoe', 'Amafie', 'Amefie', 'Ampefe'] as const;
            const subAccordionSuffixes = ['Referencial', 'Anterior', 'Actual', 'CierreAnterior'] as const;
            const libros: Record<string, Record<string, string>> = {};
            librosData?.acordeones.forEach((ac) => {
                const row: Record<string, string> = {};
                ac.fields.forEach((f) => {
                    const fieldId = `${ac.prefijo}.${f.idCampo}`;
                    const inp = formRef.current?.querySelector<HTMLInputElement>(`[name="${fieldId}"]`);
                    if (inp) row[f.idCampo.toUpperCase()] = (inp.value ?? '').trim();
                });
                const draftVal = librosValoriDraft[ac.prefijo];
                if (draftVal !== undefined && draftVal !== '') {
                    const valInLibroCurrency = parseLocalizedNumber(draftVal);
                    row['VALORI'] = (Math.round(valInLibroCurrency * 100) / 100).toFixed(2);
                }
                for (const base of subAccordionBases) {
                    for (const suffix of subAccordionSuffixes) {
                        const fieldId = `${ac.prefijo}.${base}${suffix}`;
                        const inp = formRef.current?.querySelector<HTMLInputElement>(`[name="${fieldId}"]`);
                        if (inp) {
                            const v = (inp.value ?? '').trim();
                            row[`${base}${suffix}`] = v;
                        }
                    }
                }
                libros[ac.prefijo] = row;
            });

            const isAddFlow = !bienId || cloneMode || altaAgregadoMode;
            if (isAddFlow) {
                const nextErrors: Record<string, string[]> = { ...errors };
                let hasValoriError = false;
                Object.entries(libros).forEach(([prefijo, fields]) => {
                    const valoriNum = parseLocalizedNumber(fields['VALORI'] ?? '');
                    if (!(valoriNum !== 0)) {
                        const prev = nextErrors[prefijo] ?? [];
                        if (!prev.some((e) => e.startsWith('VALORI:'))) {
                            nextErrors[prefijo] = [...prev, 'VALORI: no puede ser 0'];
                            hasValoriError = true;
                        }
                    }
                });
                if (hasValoriError) {
                    setAccordionErrors(nextErrors);
                    setSaveError(null);
                    setSaving(false);
                    return;
                }
            }

            const payload = {
                datosGenerales: {
                    descripcion: dgDesc,
                    idPlanta: datosPlanta || undefined,
                    idZona: datosZona || undefined,
                    idCencos: datosCencos || undefined,
                },
                distribucion: distribucionRows.map((r) => ({
                    idCencos: r.cencos || '',
                    porcentaje: parseLocalizedNumber(r.porcentaje),
                })),
                cabecera: cab,
                libros,
                anotaciones,
            };
            const petition = (bienId && !cloneMode && !altaAgregadoMode) ? 'Update' : 'Add';
            const res = await fetch('/api/fixedAssets/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    petition,
                    client,
                    data: (bienId && !cloneMode && !altaAgregadoMode)
                        ? { bienId, ...payload }
                        : altaAgregadoMode && bienId
                        ? { ...payload, altaAgregadoBienId: bienId }
                        : payload,
                }),
            });
            const data = await res.json();
            if (data?.ok) {
                setSaveError(null);
                setAccordionErrors({});
                const hasFotoChanges = pendingFotoAdds.length > 0 || pendingFotoDeletes.length > 0;
                if (!bienId || cloneMode || altaAgregadoMode) {
                    const newBienId = (data?.bienId ?? (data?.idCodigo ? `${data.idCodigo}-${data?.idSubien ?? '000'}-0-0` : undefined)) as string | undefined;
                    if (hasFotoChanges && newBienId) {
                        const fotoErr = await syncFotosWithServer(newBienId);
                        if (fotoErr) {
                            setSaveError(fotoErr);
                            return;
                        }
                    }
                    setDescripcion('');
                    setDatosPlanta(datosGenerales?.defaultPlanta ?? '');
                    setDatosZona(datosGenerales?.defaultZona ?? '');
                    setDatosCencos(datosGenerales?.defaultCencos ?? '');
                    initialAnotacionesRef.current = '';
                    handleRevert();
                    if (client && newBienId) {
                        const tableName = simulationOnly ? `AbmSimulationFixedAssetConsult-${newBienId}` : `AbmFixedAssetConsult-${newBienId}`;
                        const path = simulationOnly ? `/simulations/consult/${newBienId}` : `/fixedAssets/consult/${newBienId}`;
                        // Cerrar el tab actual (alta pura, clonar o alta agregado) al abrir el de consulta
                        if (clientMenu) {
                            const menuId = clientMenu.menu.findIndex((menu) => menu.submenu.some((s) => s.path === pathname));
                            const submenuId = menuId >= 0 ? clientMenu.menu[menuId].submenu.findIndex((s) => s.path === pathname) : -1;
                            const currentSubmenu = menuId >= 0 && submenuId >= 0 ? clientMenu.menu[menuId].submenu[submenuId] : null;
                            if (currentSubmenu) {
                                dispatch(navActions.closePage({ client, submenuId, menuId }));
                                dispatch(openPagesActions.removeOpenPage({ page: currentSubmenu.table }));
                            }
                        }
                        dispatch(navActions.addDynamicSubmenu({
                            client,
                            path,
                            submenuTitle: `Consultar bien ${newBienId}`,
                            table: tableName,
                            hiddenFromSidebar: true,
                        }));
                        dispatch(openPagesActions.addOpenPage({ page: tableName }));
                        router.push(path);
                    }
                } else if (bienId && hasFotoChanges) {
                    const fotoErr = await syncFotosWithServer(bienId);
                    if (fotoErr) {
                        setSaveError(fotoErr);
                        return;
                    }
                }
                if (bienId && !cloneMode && !altaAgregadoMode) {
                    initialAnotacionesRef.current = anotaciones;
                }
            } else {
                const rawMsg = data?.message || 'Error al guardar';
                const friendlyMsg = res.status >= 500 || /Invalid|invocation|Transaction|timeout|ETIMEOUT/i.test(String(rawMsg))
                    ? 'Error al guardar. Por favor intente nuevamente.'
                    : rawMsg;
                setSaveError(friendlyMsg);
            }
        } finally {
            setSaving(false);
        }
    }, [client, clientMenu, pathname, descripcion, datosPlanta, datosZona, datosCencos, distribucionRows, cabeceraCuenta, datosGenerales, librosData, librosValoriDraft, handleRevert, bienId, cloneMode, altaAgregadoMode, dispatch, router, simulationOnly, anotaciones, pendingFotoAdds, pendingFotoDeletes, syncFotosWithServer]);

    const openNotaModal = useCallback(() => {
        setNotaModalDraft(anotaciones);
        setNotaModalOpen(true);
    }, [anotaciones]);

    const closeNotaModal = useCallback(() => {
        setNotaModalOpen(false);
        setNotaModalDraft('');
    }, []);

    const applyNotaModal = useCallback(() => {
        if (consultMode) return;
        setAnotaciones(notaModalDraft);
        closeNotaModal();
    }, [consultMode, notaModalDraft, closeNotaModal]);

    const canEditFotos = Boolean(client && !consultMode);

    const buildFotoUrl = useCallback((relativePath: string, download = false) => {
        if (!client || !bienId) return '';
        const params = new URLSearchParams({
            client,
            bienId,
            path: relativePath,
            v: String(fotoVersion),
        });
        if (download) params.set('download', '1');
        return `/api/fixedAssets/foto?${params.toString()}`;
    }, [client, bienId, fotoVersion]);

    const getFotoDisplayUrl = useCallback((item: FotoDraftItem, download = false) => {
        if (item.kind === 'pending') return item.previewUrl;
        return buildFotoUrl(item.path, download);
    }, [buildFotoUrl]);

    const triggerFotoPicker = useCallback(() => {
        if (!canEditFotos) return;
        setFotoError(null);
        const input = fotoInputRef.current;
        if (!input) return;
        input.value = '';
        input.click();
    }, [canEditFotos]);

    const openFotoModal = useCallback((item: FotoDraftItem) => {
        setFotoModalItem(item);
        setFotoModalOpen(true);
    }, []);

    const closeFotoModal = useCallback(() => {
        setFotoModalOpen(false);
        setFotoModalItem(null);
    }, []);

    const downloadFotoItem = useCallback((item: FotoDraftItem) => {
        const fileName = item.kind === 'pending'
            ? item.file.name
            : (item.path.split('/').pop() ?? 'foto');
        const url = getFotoDisplayUrl(item, item.kind === 'saved');
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }, [getFotoDisplayUrl]);

    const handleFotoSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length || !canEditFotos) {
            e.target.value = '';
            return;
        }
        setFotoError(null);
        const additions: FotoDraftPending[] = Array.from(files).map((file) => ({
            kind: 'pending',
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            file,
            previewUrl: URL.createObjectURL(file),
        }));
        setPendingFotoAdds((prev) => [...prev, ...additions]);
        e.target.value = '';
    }, [canEditFotos]);

    const handleDeleteFotoItem = useCallback((item: FotoDraftItem) => {
        if (!canEditFotos) return;
        setFotoError(null);
        if (item.kind === 'pending') {
            URL.revokeObjectURL(item.previewUrl);
            setPendingFotoAdds((prev) => prev.filter((p) => p.id !== item.id));
        } else {
            setPendingFotoDeletes((prev) => (prev.includes(item.path) ? prev : [...prev, item.path]));
        }
        if (fotoModalItem && fotoDraftKey(fotoModalItem) === fotoDraftKey(item)) {
            closeFotoModal();
        }
    }, [canEditFotos, fotoModalItem, closeFotoModal]);

    const [horizontalTabCabecera, setHorizontalTabCabecera] = useState<'distribucion' | 'notas' | 'fotos' | 'documentos' | 'tecnica'>('distribucion');

    const horizontalTabsCabecera = [
        { id: 'distribucion' as const, label: 'DISTRIBUCION' },
        { id: 'notas' as const, label: 'NOTAS' },
        { id: 'fotos' as const, label: 'FOTOS' },
        { id: 'documentos' as const, label: 'DOCUMENTOS' },
        { id: 'tecnica' as const, label: 'CARGOS' },
    ];

    const librosHorizontalTabs = [
        { id: 'referenciales', label: 'REFERENCIALES' },
        { id: 'anteriores', label: 'ANTERIORES' },
        { id: 'actualizado', label: 'ACTUALIZADO' },
        { id: 'cierre', label: 'CIERRE ANT' },
    ];

    const toggleLibroOpen = (prefijo: string) =>
        setLibrosOpenPrefijo((prev) => (prev === prefijo ? null : prefijo));

    const getLibroTab = (prefijo: string) => librosHorizontalTab[prefijo] ?? 'referenciales';
    const setLibroTab = (prefijo: string, tab: string) =>
        setLibrosHorizontalTab((prev) => ({ ...prev, [prefijo]: tab }));

    const ESTCON_OPTIONS = [{ key: '0', value: 'NUEVO' }, { key: '1', value: 'USADO' }];
    const TIPOPROCESO_OPTIONS = [{ key: '1', value: 'SI' }, { key: '0', value: 'NO' }];

    const getLibroIdMoneda = (prefijo: string): string => {
        // MONEDALOCAL → '01', impuestos → '01', ME01 → '01', ME02 → '02', etc.
        if (prefijo.toUpperCase() === 'MONEDALOCAL' || prefijo.toLowerCase() === 'impuestos') return '01';
        const m = prefijo.match(/^ME(\d+)$/i);
        return m ? m[1].padStart(2, '0') : '01';
    };

    /** Cotización para un prefijo: MONEDALOCAL/impuestos = 1 (pesos históricos), resto = Cotextranjera */
    const getCotizacion = (prefijo: string): number => {
        const up = prefijo.toUpperCase();
        if (up === 'MONEDALOCAL' || prefijo.toLowerCase() === 'impuestos') return 1;
        return librosData?.cotizacionesByMoneda?.[getLibroIdMoneda(prefijo)] ?? 1;
    };

    /** Muestra valor / cotizacion. MONEDALOCAL/impuestos cot=1; ME01/ME02... dividen por cot de Cotextranjera */
    const valorConCotizacion = (valor: string, prefijo: string): string => {
        const num = parseLocalizedNumber(valor);
        const cot = getCotizacion(prefijo);
        return cot !== 0 ? formatNumberEs(num / cot, 2, 2) : formatNumberEs(num, 2, 2);
    };

    const mmYyyyToYyyyMm = (value: string): string => {
        const m = String(value ?? '').match(/^(\d{1,2})[\/\-](\d{4})$/);
        if (!m) return '';
        const mm = m[1].padStart(2, '0');
        const yyyy = m[2];
        return `${yyyy}${mm}`;
    };

    const getLibroDefault = (prefijo: string, idCampo: string): string | undefined => {
        if (!librosData) return undefined;
        const campoUp = idCampo.toUpperCase();
        const idMoneda = getLibroIdMoneda(prefijo);
        const defaults = librosData.defaultsByMoneda[idMoneda];

        const fecori   = librosFecori[prefijo]   ?? defaults?.FECORI ?? '';
        const fecproYyyyMm = mmYyyyToYyyyMm(defaults?.FECORI ?? '');
        const tipoAmor = librosTipoAmor[prefijo]  ?? defaults?.IDTIPOAMORTIZACION ?? '';
        const vidautil = librosVidautil[prefijo]  ?? '';
        const fecdep   = fecori && tipoAmor ? calcFecdep(fecori, tipoAmor) : '';
        const fecfin   = fecdep && vidautil && String(vidautil).trim() !== '0' ? calcFecfin(fecdep, vidautil) : '';

        const rawValori = librosValori[prefijo];
        const rawValoriNum = rawValori !== undefined && rawValori !== ''
            ? parseLocalizedNumber(rawValori)
            : parseLocalizedNumber(valorOrigenGral || '0'); // raw = valor en pesos
        switch (campoUp) {
            case 'VALORI':              return valorConCotizacion(String(rawValoriNum), prefijo);
            case 'IDACTIVO':            return cabeceraCuenta || (cabeceraData?.defaultActivo ?? undefined);
            case 'IDTIPOAMORTIZACION':  return defaults?.IDTIPOAMORTIZACION ?? undefined;
            case 'IDINDACT':            return defaults?.IDINDACT ?? undefined;
            case 'IDTIPOPROCESO':       return '1';
            case 'IDCODAMO':            return defaults?.IDCODAMO ?? undefined;
            case 'ESTCON':              return '0';
            case 'IDMONEDA':            return idMoneda;
            case 'FECORI':              return fecori || undefined;
            case 'FECDEP':              return fecdep || undefined;
            case 'FECFIN':              return fecfin || undefined;
            case 'VIDAUTIL':            return vidautil || undefined;
            case 'FECPRO': {
                // En altas (alta pura / clonar / alta agregado) usar fecpro de parámetros en formato YYYYMM.
                if (!bienData || cloneMode || altaAgregadoMode) return fecproYyyyMm || undefined;
                const fromBien = getRowVal(bienData, `${prefijo}.FECPRO`) ?? getRowVal(bienData, `${prefijo.toLowerCase()}.fecpro`) ?? getRowVal(bienData, 'FECPRO');
                if (fromBien != null && String(fromBien).trim() !== '') return String(fromBien);
                return fecproYyyyMm || undefined;
            }
            case 'PRECIOVENTA':         return '0';
            case 'VIDATRANSCURRIDA':    return '0';
            case 'VIDARESTANTE':        return '0';
            case 'VALORRESIDUAL':       return '0';
            case 'INDICE': {
                // En altas (alta pura / clonar / alta agregado) el default de índice es 1.
                if (!bienData || cloneMode || altaAgregadoMode) return '1';
                const fromBien = getRowVal(bienData, `${prefijo}.INDICE`) ?? getRowVal(bienData, `${prefijo.toLowerCase()}.indice`) ?? getRowVal(bienData, 'INDICE');
                if (fromBien != null && String(fromBien).trim() !== '') return String(fromBien);
                return '1';
            }
            default:                    return undefined;
        }
    };

    // Initialize cabeceraCuenta when data loads (only on first load when empty)
    useEffect(() => {
        const def = cabeceraData?.defaultActivo ?? librosData?.cuentas?.[0]?.key ?? '';
        if (def && cabeceraCuenta === '') setCabeceraCuenta(def);
    }, [cabeceraData?.defaultActivo, librosData?.cuentas, cabeceraCuenta]);

    // Initialize reactive fields when librosData loads; update vida util when cabeceraCuenta changes
    // Skip when bienData exists - the bienData effect populates libros from API; this would overwrite
    useEffect(() => {
        if (!librosData || bienData) return;
        const fecoriMap: Record<string, string> = {};
        const tipoAmorMap: Record<string, string> = {};
        const vidautilMap: Record<string, string> = {};
        const valoriMap: Record<string, string> = {};
        const valoriDraftMap: Record<string, string> = {};
        const activoToUse = cabeceraCuenta || cabeceraData?.defaultActivo ?? librosData.cuentas[0]?.key ?? '';
        librosData.acordeones.forEach((ac) => {
            const idMoneda = getLibroIdMoneda(ac.prefijo);
            const def = librosData.defaultsByMoneda[idMoneda];
            fecoriMap[ac.prefijo]   = def?.FECORI ?? '';
            tipoAmorMap[ac.prefijo] = def?.IDTIPOAMORTIZACION ?? '';
            const vuRow = librosData.vidautil.find(
                (v) => v.idMoextra === idMoneda && v.idActivo === activoToUse
            );
            vidautilMap[ac.prefijo] = vuRow ? String(vuRow.meses) : '';
            const valGral = parseLocalizedNumber(valorOrigenGral || '0');
            const raw = String(valGral);
            valoriMap[ac.prefijo] = raw;
            valoriDraftMap[ac.prefijo] = valorConCotizacion(raw, ac.prefijo);
        });
        setLibrosFecori(fecoriMap);
        setLibrosTipoAmor(tipoAmorMap);
        setLibrosVidautil(vidautilMap);
        setLibrosValori(valoriMap);
        setLibrosValoriDraft(valoriDraftMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [librosData, cabeceraData, cabeceraCuenta, bienData]);

    /** Parse MM/YYYY string into a Date (day=1) or null */
    const parseFecMMYYYY = (val: string): Date | null => {
        if (!val) return null;
        const m = val.match(/^(\d{1,2})[\/\-](\d{4})$/);
        if (!m) return null;
        return new Date(Number(m[2]), Number(m[1]) - 1, 1);
    };

    /** Format a Date to MM/YYYY */
    const formatFecMMYYYY = (d: Date): string =>
        `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    /** Calculate FECDEP from FECORI and tipoAmor key */
    const calcFecdep = (fecori: string, tipoAmorKey: string): string => {
        const base = parseFecMMYYYY(fecori);
        if (!base) return '';
        const mes = base.getMonth(); // 0-based
        const anio = base.getFullYear();
        switch (tipoAmorKey) {
            case '1': return formatFecMMYYYY(base);                                          // Mes de alta
            case '2': return formatFecMMYYYY(new Date(anio, mes + 1, 1));                    // Mes siguiente
            case '3': return formatFecMMYYYY(new Date(anio, Math.floor(mes / 3) * 3, 1));   // Trimestre de alta
            case '4': return formatFecMMYYYY(new Date(anio, Math.floor(mes / 3) * 3 + 3, 1)); // Trim siguiente
            case '5': return formatFecMMYYYY(new Date(anio, 0, 1));                          // Año de alta
            case '6': return formatFecMMYYYY(new Date(anio + 1, 0, 1));                      // Año siguiente
            default:  return formatFecMMYYYY(base);
        }
    };

    /** FECFIN = FECDEP + (vidautil - 1) meses (el mes de inicio se cuenta dentro de vida útil) */
    const calcFecfin = (fecdep: string, vidautil: string): string => {
        const base = parseFecMMYYYY(fecdep);
        const meses = parseInt(vidautil, 10);
        if (!base || isNaN(meses)) return '';
        return formatFecMMYYYY(new Date(base.getFullYear(), base.getMonth() + meses - 1, 1));
    };

    const getLibroFieldOptions = (idCampo: string): { key: string; value: string }[] | null => {
        if (!librosData) return null;
        switch (idCampo.toUpperCase()) {
            case 'IDACTIVO': return librosData.cuentas;
            case 'IDTIPOAMORTIZACION': return librosData.tipoAmor;
            case 'IDINDACT': return librosData.indact;
            case 'IDTIPOPROCESO': return TIPOPROCESO_OPTIONS;
            case 'IDCODAMO': return librosData.codamo;
            case 'ESTCON': return ESTCON_OPTIONS;
            case 'IDMONEDA': return librosData.monedas;
            default: return null;
        }
    };

    const LIBRO_SELECT_FIELDS = new Set(['IDACTIVO', 'IDTIPOAMORTIZACION', 'IDINDACT', 'IDTIPOPROCESO', 'IDCODAMO', 'ESTCON', 'IDMONEDA']);
    const LIBRO_DISABLED_FIELDS = new Set(['FECBASE', 'FECBAJ', 'TIPOBAJA', 'PRECIOVENTA', 'VIDATRANSCURRIDA', 'VIDARESTANTE', 'VALORRESIDUAL', 'INDICE', 'FECPRO', 'CAMBIOEJERCICIO', 'FECDIAPROCESO']);

    /** En simulación, etiquetas desde ConverField (IdTabla simulacion, cabecera.*) — BrowNombre. */
    const cabFieldLabel = useCallback(
        (campo: string, fallback: string) => {
            if (!simulationOnly || !cabeceraData?.fields) return fallback;
            const lc = campo.toLowerCase();
            const hit = cabeceraData.fields.find((f) => f.idCampo.toLowerCase() === lc);
            return (hit?.browNombre && String(hit.browNombre).trim()) || fallback;
        },
        [simulationOnly, cabeceraData]
    );

    return (
        <>
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); if (!consultMode) handleGuardar(); }} className="flex h-full min-h-0 w-full flex-col">
            <input
                ref={fotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp"
                multiple
                className="hidden"
                onChange={handleFotoSelected}
            />
            <div key={formKey} className="main-content flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto pl-10 pr-5">
                <div className="flex flex-col w-full rounded-xl bg-gabu-700 pb-5 pt-3 my-5">
                    <div className="flex w-full justify-center relative">
                        <p className="text-xl text-gabu-100">Datos generales</p>
                        <Excel style="absolute -right-5 mr-10 cursor-pointer h-6 w-6 fill-current text-gabu-300" onClick={() => {}} />
                    </div>
                    <div className="flex flex-col gap-1 w-full px-5 mb-5 relative">
                        <label className="text-gabu-100 text-xs font-normal">{cabFieldLabel('descripcion', 'Descripcion')}</label>
                        <textarea
                            rows={1}
                            readOnly={consultMode}
                            className={`desc-textarea bg-gabu-100 rounded-md font-normal px-1.5 py-0.5 text-gabu-700 w-full outline-none focus:outline-none focus:ring-0 resize-none overflow-y-auto max-h-[7.5rem] ${consultMode ? 'bg-gabu-300' : ''} ${accordionErrors['datosGenerales']?.length ? 'border-2 border-gabu-error' : ''}`}
                            placeholder=""
                            autoComplete="off"
                            value={descripcion}
                            onChange={(e) => {
                                setDescripcion(e.target.value);
                                if (accordionErrors['datosGenerales']?.length) setAccordionErrors((prev) => ({ ...prev, datosGenerales: [] }));
                            }}
                            ref={(el) => {
                                if (!el) return;
                                el.style.height = 'auto';
                                const h = el.scrollHeight;
                                el.style.height = `${Math.min(Math.max(h, 24), 120)}px`;
                            }}
                            onInput={(e) => {
                                const ta = e.currentTarget;
                                ta.style.height = 'auto';
                                const h = ta.scrollHeight;
                                ta.style.height = `${Math.min(Math.max(h, 24), 120)}px`;
                            }}
                            onPaste={(e) => requestAnimationFrame(() => {
                                const ta = e.currentTarget;
                                ta.style.height = 'auto';
                                const h = ta.scrollHeight;
                                ta.style.height = `${Math.min(Math.max(h, 24), 120)}px`;
                            })}
                        />
                        {accordionErrors['datosGenerales']?.length ? (
                            <div className="absolute left-5 right-5 top-[calc(100%+6px)] flex z-30">
                                <div className="relative bg-gabu-error rounded-lg px-3 py-2 shadow-sm">
                                    <span className="absolute left-3 -top-1.5 w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid var(--color-gabu-error)' }} aria-hidden />
                                    <p className="text-gabu-100 text-sm">{accordionErrors['datosGenerales'][0]}</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div className={`flex px-5 justify-between gap-4 ${consultMode ? 'pointer-events-none opacity-90' : ''}`}>
                        <div className="flex flex-shrink-0 flex-col gap-1 w-[25%]">
                            {datosGeneralesLoading ? (
                                <div className="h-10 bg-gabu-300 rounded-md animate-pulse" />
                            ) : (
                                <Select
                                    label={cabFieldLabel('idPlanta', 'Planta')}
                                    hasLabel={true}
                                    isLogin={false}
                                    variant="abm"
                                    options={datosGenerales?.plants ?? []}
                                    defaultValue={datosPlanta || (datosGenerales?.defaultPlanta ?? "")}
                                    chooseOptionHandler={(e, ref) => {
                                        selectOptionHandler(e, ref);
                                        setDatosPlanta((e.currentTarget as HTMLLIElement).dataset.key ?? '');
                                    }}
                                />
                            )}
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1 w-[25%]">
                            {datosGeneralesLoading ? (
                                <div className="h-10 bg-gabu-300 rounded-md animate-pulse" />
                            ) : (
                                <Select
                                    label={cabFieldLabel('idZona', 'Zona')}
                                    hasLabel={true}
                                    isLogin={false}
                                    variant="abm"
                                    options={datosGenerales?.zonas ?? []}
                                    defaultValue={datosZona || (datosGenerales?.defaultZona ?? "")}
                                    chooseOptionHandler={(e, ref) => {
                                        selectOptionHandler(e, ref);
                                        setDatosZona((e.currentTarget as HTMLLIElement).dataset.key ?? '');
                                    }}
                                />
                            )}
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1 w-[25%]">
                            {datosGeneralesLoading ? (
                                <div className="h-10 bg-gabu-300 rounded-md animate-pulse" />
                            ) : (
                                <Select
                                    label={cabFieldLabel('idCencos', 'Centro de costos')}
                                    hasLabel={true}
                                    isLogin={false}
                                    variant="abm"
                                    options={datosGenerales?.costCenters ?? []}
                                    defaultValue={datosCencos || (datosGenerales?.defaultCencos ?? "")}
                                    chooseOptionHandler={(e, ref) => {
                                        selectOptionHandler(e, ref);
                                        setDatosCencos((e.currentTarget as HTMLLIElement).dataset.key ?? '');
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Cabecera accordion */}
                <div className="flex w-full min-w-0 max-w-full flex-col">
                    <div className="flex w-full min-w-0 select-none flex-col rounded-t-xl bg-gabu-700">
                        <div
                            className={`flex justify-center items-center transition-all duration-150 py-1.5 border-b-2 border-b-gabu-100 cursor-pointer sticky top-0 z-[10000] rounded-t-xl ${cabeceraOpen ? 'bg-gabu-700' : ''} ${accordionErrors['cabecera']?.length ? 'border-2 border-gabu-error' : ''}`}
                            onClick={() => setLibrosOpenPrefijo((prev) => prev === 'cabecera' ? null : 'cabecera')}
                        >
                            <ArrowSvg open={cabeceraOpen} />
                            <p className="text-gabu-100 text-lg">Cabecera</p>
                        </div>
                        <div className={`grid min-w-0 transition-all duration-200 ease-linear bg-gabu-300 ${cabeceraOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="min-w-0 overflow-hidden">
                            {(cabeceraLoading || !cabeceraData) ? (
                                <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-x-5 gap-y-3 py-7 px-10 [&>*]:min-w-0">
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <div key={i} className="h-7 bg-gabu-500 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                            <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-x-5 gap-y-3 py-7 px-10 [&>*]:min-w-0">
                                {/* Col izquierda */}
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'iddescripcion')?.browNombre ?? 'Descripcion normalizada'}
                                    fieldId="IDDESCRIPCION"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.IDDESCRIPCION ?? ""}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    disabled={consultMode}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idsituacion')?.browNombre ?? 'Situacion'}
                                    fieldId="IDSITUACION"
                                    options={cabeceraData.situaciones}
                                    defaultValue={cabeceraInitialValues.IDSITUACION ?? cabeceraData.defaultSituacion ?? '00'}
                                    hasToBeProportional={false}
                                    disabled={consultMode}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                    onValueChange={(key) => setCabeceraValue('IDSITUACION', key)}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'cantidad')?.browNombre ?? 'Cantidad'}
                                    fieldId="CANTIDAD"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.CANTIDAD ?? "1"}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    disabled={consultMode}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idfactura')?.browNombre ?? 'Factura'}
                                    fieldId="IDFACTURA"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.IDFACTURA ?? ""}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    disabled={consultMode}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idunegocio')?.browNombre ?? 'Unidad de negocio'}
                                    fieldId="IDUNEGOCIO"
                                    onValueChange={(key) => setCabeceraValue('IDUNEGOCIO', key)}
                                    options={cabeceraData.unidadesNegocio}
                                    defaultValue={cabeceraInitialValues.IDUNEGOCIO ?? cabeceraData.defaultUnegocio ?? undefined}
                                    hasToBeProportional={false}
                                    disabled={consultMode}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'identificacion')?.browNombre ?? 'Identificacion'}
                                    fieldId="IDENTIFICACION"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.IDENTIFICACION ?? ""}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    disabled={consultMode}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idactivo')?.browNombre ?? 'Cta activo'}
                                    fieldId="IDACTIVO"
                                    options={cabeceraData.cuentas}
                                    defaultValue={cabeceraInitialValues.IDACTIVO ?? (cabeceraCuenta ?? cabeceraData?.defaultActivo ?? undefined)}
                                    hasToBeProportional={false}
                                    disabled={consultMode}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                    onValueChange={(key) => { setCabeceraCuenta(key); setCabeceraValue('IDACTIVO', key); }}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'trfecactivo')?.browNombre ?? 'Fecha transf cuenta'}
                                    fieldId="TRFECACTIVO"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.TRFECACTIVO ?? ""}
                                    isError={!!getCabeceraFieldError('TRFECACTIVO')}
                                    errorMessage={getCabeceraFieldError('TRFECACTIVO')}
                                    setErrors={() => clearCabeceraFieldError('TRFECACTIVO')}
                                    disabled={consultMode}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idmodelo')?.browNombre ?? 'Modelo'}
                                    fieldId="IDMODELO"
                                    onValueChange={(key) => setCabeceraValue('IDMODELO', key)}
                                    options={cabeceraData.modelos}
                                    defaultValue={cabeceraInitialValues.IDMODELO ?? cabeceraData.defaultModelo ?? undefined}
                                    hasToBeProportional={false}
                                    disabled={consultMode}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'tridactivo')?.browNombre ?? 'Cuenta transf cuenta'}
                                    fieldId="TRIDACTIVO"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.TRIDACTIVO ?? ""}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    disabled={consultMode}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idordencompra')?.browNombre ?? 'Orden de compra'}
                                    fieldId="IDORDENCOMPRA"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.IDORDENCOMPRA ?? ""}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    disabled={consultMode}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'trfecproyecto')?.browNombre ?? 'Fecha transf proyecto'}
                                    fieldId="TRFECPROYECTO"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.TRFECPROYECTO ?? ""}
                                    isError={!!getCabeceraFieldError('TRFECPROYECTO')}
                                    errorMessage={getCabeceraFieldError('TRFECPROYECTO')}
                                    setErrors={() => clearCabeceraFieldError('TRFECPROYECTO')}
                                    disabled={consultMode}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idorigen')?.browNombre ?? 'Origen'}
                                    fieldId="IDORIGEN"
                                    onValueChange={(key) => setCabeceraValue('IDORIGEN', key)}
                                    options={cabeceraData.origenes}
                                    defaultValue={cabeceraInitialValues.IDORIGEN ?? cabeceraData.defaultOrigen ?? undefined}
                                    hasToBeProportional={false}
                                    disabled={consultMode}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'trfecunegocio')?.browNombre ?? 'Fecha transf U negocio'}
                                    fieldId="TRFECUNEGOCIO"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.TRFECUNEGOCIO ?? ""}
                                    isError={!!getCabeceraFieldError('TRFECUNEGOCIO')}
                                    errorMessage={getCabeceraFieldError('TRFECUNEGOCIO')}
                                    setErrors={() => clearCabeceraFieldError('TRFECUNEGOCIO')}
                                    disabled={consultMode}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idproveedor')?.browNombre ?? 'Proveedor'}
                                    fieldId="IDPROVEEDOR"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.IDPROVEEDOR ?? ""}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    disabled={consultMode}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'esencial')?.browNombre ?? 'Esencial'}
                                    fieldId="ESENCIAL"
                                    onValueChange={(key) => setCabeceraValue('ESENCIAL', key)}
                                    options={[{ key: '0', value: 'No' }, { key: '1', value: 'Si' }]}
                                    defaultValue={cabeceraInitialValues.ESENCIAL ?? "0"}
                                    hasToBeProportional={false}
                                    disabled={consultMode}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idfabricante')?.browNombre ?? 'Fabricante'}
                                    fieldId="IDFABRICANTE"
                                    hasToBeProportional={false}
                                    defaultValue={cabeceraInitialValues.IDFABRICANTE ?? ""}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    disabled={consultMode}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'nuevo')?.browNombre ?? 'Nuevo'}
                                    fieldId="NUEVO"
                                    onValueChange={(key) => setCabeceraValue('NUEVO', key)}
                                    options={[{ key: '1', value: 'Si' }, { key: '0', value: 'No' }]}
                                    defaultValue={cabeceraInitialValues.NUEVO ?? "1"}
                                    hasToBeProportional={false}
                                    disabled={consultMode}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idproyecto')?.browNombre ?? 'Proyecto'}
                                    fieldId="IDPROYECTO"
                                    onValueChange={(key) => setCabeceraValue('IDPROYECTO', key)}
                                    options={cabeceraData.proyectos}
                                    defaultValue={cabeceraInitialValues.IDPROYECTO ?? cabeceraData.defaultProyecto ?? undefined}
                                    hasToBeProportional={false}
                                    disabled={consultMode}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                />
                                <HorizontalInput
                                    label="Valor de origen general"
                                    fieldId="VALORORIGENGRAL"
                                    hasToBeProportional={false}
                                    value={valorOrigenGral}
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    onValueChange={(val) => setValorOrigenGral(val)}
                                    inputType="text"
                                    disabled={consultMode}
                                />
                            </div>
                            )}
                            <div className="mx-10 mb-7 flex w-full min-w-0 max-w-[calc(100%-5rem)] overflow-hidden">
                                <div className="flex min-w-0 w-full max-w-full flex-1 select-none items-stretch overflow-hidden bg-gabu-700">
                                    {horizontalTabsCabecera.map((tab, idx) => (
                                        <React.Fragment key={tab.id}>
                                            <div
                                                className={`w-10 shrink-0 flex justify-center items-center overflow-hidden transition-all duration-150 border-r-2 border-r-gabu-100 cursor-pointer bg-gabu-700 ${idx === 0 ? 'rounded-l-xl' : ''}`}
                                                onClick={() => setHorizontalTabCabecera(tab.id)}
                                            >
                                                <p className="text-gabu-100 text-xs text-center py-1.5">{tab.label.split('').map((char, i) => <React.Fragment key={i}>{char}{i < tab.label.length - 1 && <br />}</React.Fragment>)}</p>
                                            </div>
                                            <div
                                                className={`${
                                                    horizontalTabCabecera === tab.id
                                                        ? "min-w-0 flex-1 max-w-full overflow-hidden"
                                                        : "w-0 min-w-0 max-w-0 overflow-hidden"
                                                } transition-[width,flex] duration-200 ease-linear bg-gabu-100 ${idx === horizontalTabsCabecera.length - 1 ? "rounded-r-xl" : ""}`}
                                            >
                                                {horizontalTabCabecera === tab.id ? (
                                                <div
                                                    className={`flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden ${
                                                        tab.id === "tecnica"
                                                            ? "flex h-[200px] max-h-[200px] min-h-[200px] flex-col overflow-hidden px-4 py-3"
                                                            : "min-h-[260px] justify-center p-5"
                                                    }`}
                                                >
                                                    {tab.id === 'distribucion' && (
                                                        <div className={`flex flex-col gap-2 ${(distribucionInvalid || distribucionDuplicateCencos) ? 'rounded-md border-2 border-gabu-error p-2' : ''}`}>
                                                            {distribucionInvalid && (
                                                                <p className="text-sm text-gabu-error">
                                                                    Suma: {formatNumberEs(distribucionSum, 1, 1)}% — El conjunto de la distribución tiene que ser un 100%
                                                                </p>
                                                            )}
                                                            {distribucionDuplicateCencos && (
                                                                <p className="text-sm text-gabu-error">
                                                                    Hay un centro de costo que se repite en la distribución
                                                                </p>
                                                            )}
                                                            {distribucionRows.map((row) => (
                                                                <div key={row.id} className={`flex gap-2 items-center ${distribucionOpenId === row.id ? 'relative z-[10002]' : ''} ${consultMode ? 'pointer-events-none' : ''}`}>
                                                                    <div className={`relative h-8 flex-1 min-w-0 rounded-md border border-gabu-900 ${consultMode ? 'bg-gabu-500' : 'bg-gabu-300'}`}>
                                                                        <div
                                                                            className={`h-full flex justify-between items-center px-3 rounded-md ${consultMode ? 'bg-gabu-500' : 'bg-gabu-300 cursor-pointer'}`}
                                                                            onClick={() => setDistribucionOpenId((prev) => prev === row.id ? null : row.id)}
                                                                        >
                                                                            <span className="text-sm text-gabu-900 truncate">
                                                                                {ccostosOptions.find((o) => o.key === row.cencos)?.value ?? row.cencos}
                                                                            </span>
                                                                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`fill-current text-gabu-900 transition-transform duration-300 shrink-0 ${distribucionOpenId === row.id ? 'rotate-90' : '-rotate-90'}`}>
                                                                                <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                                                            </svg>
                                                                        </div>
                                                                        <ul className={`w-full rounded-b-md absolute z-[10001] font-normal cursor-pointer bg-gabu-300 overflow-y-auto border-x border-b border-gabu-900 transition-all duration-200 ease-linear ${distribucionOpenId === row.id ? 'max-h-32' : 'max-h-0 border-0'}`}>
                                                                            {ccostosOptions.map((opt) => (
                                                                                <li
                                                                                    key={opt.key}
                                                                                    className="text-sm hover:bg-gabu-100 transition-all duration-300 px-3 py-0.5 text-gabu-900"
                                                                                    onClick={() => {
                                                                                        setDistribucionRows((prev) =>
                                                                                            prev.map((r) => r.id === row.id ? { ...r, cencos: opt.key } : r)
                                                                                        );
                                                                                        setDistribucionOpenId(null);
                                                                                    }}
                                                                                >
                                                                                    {opt.value}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                    <div className="flex rounded-md border border-gabu-900 items-center h-8 bg-gabu-300 flex-1 min-w-0">
                                                                        <input
                                                                            type="text"
                                                                            readOnly={consultMode}
                                                                            className={`appearance-none focus:outline-none text-gabu-900 h-full px-3 w-[85%] bg-transparent ${consultMode ? 'bg-gabu-500' : ''}`}
                                                                            value={row.porcentaje}
                                                                            onChange={(e) => !consultMode && updateDistribucionPorcentaje(row.id, e.target.value)}
                                                                        />
                                                                        <div className="flex border-l border-l-gabu-900 justify-center items-center w-[15%] h-full">
                                                                            <Percentage />
                                                                        </div>
                                                                    </div>
                                                                    {!consultMode && (
                                                                    <div
                                                                        className="shrink-0 w-7 h-7 rounded-full bg-gabu-700 flex items-center justify-center cursor-pointer hover:bg-gabu-500 transition-colors"
                                                                        onClick={() => removeDistribucionRow(row.id)}
                                                                    >
                                                                        <Cross
                                                                            style="h-4 w-4 fill-current text-gabu-100"
                                                                            onClick={() => {}}
                                                                        />
                                                                    </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {!consultMode && (
                                                            <div
                                                                className={`flex rounded-md h-8 bg-gabu-700 items-center justify-center hover:bg-gabu-500 transition-all duration-150 cursor-pointer mt-1 ${distribucionRows.length >= 4 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                                                onClick={addDistribucionRow}
                                                            >
                                                                <p className="text-gabu-100">Agregar centro de costo</p>
                                                            </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {tab.id === 'notas' && (
                                                        <div className="w-full border border-gabu-900 rounded-lg overflow-hidden">
                                                            <div
                                                                className={`text-center w-full p-5 select-none whitespace-pre-wrap break-words ${
                                                                    anotaciones.trim() ? 'text-gabu-700' : 'text-gabu-500 italic'
                                                                }`}
                                                                aria-readonly
                                                            >
                                                                {previewAnotaciones(anotaciones)}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-b-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150"
                                                                onClick={openNotaModal}
                                                            >
                                                                Ver nota completa
                                                            </button>
                                                        </div>
                                                    )}
                                                    {tab.id === 'fotos' && (
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex flex-wrap gap-3 items-start max-h-52 overflow-y-auto pr-1">
                                                                {fotoDisplayItems.length > 0 ? (
                                                                    fotoDisplayItems.map((item) => (
                                                                        <button
                                                                            key={fotoDraftKey(item)}
                                                                            type="button"
                                                                            className="group relative h-28 w-28 bg-gabu-300 rounded-lg border border-gabu-900 overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-gabu-700 transition-all"
                                                                            onClick={() => openFotoModal(item)}
                                                                            title="Ver foto"
                                                                        >
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img
                                                                                src={getFotoDisplayUrl(item)}
                                                                                alt="Foto del bien"
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                            {item.kind === 'pending' && (
                                                                                <span className="absolute top-1 right-1 bg-gabu-700/90 text-gabu-100 text-[9px] px-1 rounded">
                                                                                    Borrador
                                                                                </span>
                                                                            )}
                                                                            <span className="absolute inset-x-0 bottom-0 bg-gabu-900/70 text-gabu-100 text-[10px] py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                Ver
                                                                            </span>
                                                                        </button>
                                                                    ))
                                                                ) : (
                                                                    <div className="h-28 w-28 bg-gabu-300 rounded-lg border border-gabu-900 flex items-center justify-center shrink-0">
                                                                        <span className="text-xs text-gabu-500 px-2 text-center">Sin fotos</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                {canEditFotos && (
                                                                    <button
                                                                        type="button"
                                                                        className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150"
                                                                        onClick={triggerFotoPicker}
                                                                    >
                                                                        Agregar foto
                                                                    </button>
                                                                )}
                                                                {canEditFotos && (pendingFotoAdds.length > 0 || pendingFotoDeletes.length > 0) && (
                                                                    <p className="text-xs text-gabu-500 text-center">
                                                                        Los cambios en fotos se guardan al pulsar Guardar bien
                                                                    </p>
                                                                )}
                                                                {consultMode && fotoDisplayItems.length === 0 && (
                                                                    <p className="text-sm text-gabu-500 text-center">Sin fotos</p>
                                                                )}
                                                            </div>
                                                            {fotoError && (
                                                                <p className="text-sm text-gabu-error text-center">{fotoError}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {tab.id === "documentos" && (
                                                        <div className="flex justify-around items-center gap-3">
                                                            <div className="border border-gabu-900 rounded-lg">
                                                                <div className="flex items-center justify-center bg-gabu-300 overflow-hidden h-40 w-40" />
                                                                <button type="button" className="w-full bg-gabu-700 text-gabu-100 text-sm py-2 hover:bg-gabu-500 cursor-pointer">Ver documento</button>
                                                            </div>
                                                            <div className="flex flex-col gap-3 w-[70%]">
                                                                <button type="button" className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150">Agregar documento</button>
                                                                <button type="button" className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150">Cambiar documento</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {tab.id === "tecnica" && (
                                                        <AssetChargesGrid
                                                            client={client}
                                                            bienId={bienId}
                                                            enabled
                                                        />
                                                    )}
                                                </div>
                                                ) : null}
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div></div>
                    </div>

                    {/* Libros contables accordions — dynamic */}
                    {(librosLoading || !librosData) ? (
                        <div className="flex flex-col w-full gap-2 px-10 py-5">
                            {[1, 2].map((i) => (
                                <div key={i} className="animate-pulse h-9 w-full rounded-xl bg-gabu-500 opacity-40" />
                            ))}
                        </div>
                    ) : (
                        librosData.acordeones.map((acordeon, aIdx) => {
                            const isOpen = librosOpenPrefijo === acordeon.prefijo;
                            const activeTab = getLibroTab(acordeon.prefijo);
                            const isLast = aIdx === librosData.acordeones.length - 1;
                            return (
                                <div key={acordeon.prefijo} className={`flex flex-col w-full select-none bg-gabu-700 ${isLast ? 'mb-10 rounded-b-xl' : ''}`}>
                                    <div
                                        className={`flex justify-center items-center transition-all duration-150 py-1.5 border-b-2 border-b-gabu-100 cursor-pointer sticky top-0 z-[10000] bg-gabu-700 rounded-t-xl ${accordionErrors[acordeon.prefijo]?.length ? 'border-2 border-gabu-error' : ''}`}
                                        onClick={() => toggleLibroOpen(acordeon.prefijo)}
                                    >
                                        <ArrowSvg open={isOpen} />
                                        <p className="text-gabu-100 text-lg">{acordeon.nombre}</p>
                                    </div>
                                    <div className={`overflow-hidden transition-all duration-200 ease-linear bg-gabu-300 ${isOpen ? 'max-h-[1200px]' : 'max-h-0'}`}>
                                        <div className="grid grid-cols-2 gap-x-5 gap-y-3 w-full py-7 px-10">
                                            {acordeon.fields.map((field) => {
                                                const campoUp = field.idCampo.toUpperCase();
                                                const isDisabled = LIBRO_DISABLED_FIELDS.has(campoUp);
                                                const isFullWidth = campoUp === 'VALORI';
                                                const isValori = campoUp === 'VALORI';
                                                const isReactive = campoUp === 'FECDEP' || campoUp === 'FECFIN';
                                                const defaultVal = getLibroDefault(acordeon.prefijo, field.idCampo);
                                                if (LIBRO_SELECT_FIELDS.has(campoUp)) {
                                                    const opts = getLibroFieldOptions(field.idCampo) ?? [];
                                                    return (
                                                        <HorizontalSelect
                                                            key={field.idCampo}
                                                            label={field.browNombre}
                                                            fieldId={`${acordeon.prefijo}.${field.idCampo}`}
                                                            options={opts}
                                                            defaultValue={defaultVal}
                                                            hasToBeProportional={isFullWidth}
                                                            colSpan={isFullWidth ? 'col-span-2' : undefined}
                                                            chooseOptionHandler={selectOptionHandler}
                                                            disabled={consultMode || isDisabled}
                                                            selectedRow={campoUp === 'IDACTIVO' ? cabeceraCuenta : undefined}
                                                            onValueChange={campoUp === 'IDTIPOAMORTIZACION' ? (key) => {
                                                                setLibrosTipoAmor((prev) => ({ ...prev, [acordeon.prefijo]: key }));
                                                            } : campoUp === 'IDACTIVO' ? (key) => {
                                                                setCabeceraCuenta(key);
                                                            } : undefined}
                                                        />
                                                    );
                                                }
                                                return (
                                                    <HorizontalInput
                                                        key={field.idCampo}
                                                        label={field.browNombre}
                                                        fieldId={`${acordeon.prefijo}.${field.idCampo}`}
                                                        defaultValue={isReactive || isValori ? undefined : defaultVal}
                                                        fixedValue={isReactive ? (defaultVal ?? '') : undefined}
                                                        value={isValori ? (librosValoriDraft[acordeon.prefijo] ?? '') : undefined}
                                                        hasToBeProportional={isFullWidth}
                                                        colSpan={isFullWidth ? 'col-span-2' : undefined}
                                                        disabled={consultMode || isDisabled}
                                                        isError={!!getLibroFieldError(acordeon.prefijo, field.idCampo)}
                                                        errorMessage={getLibroFieldError(acordeon.prefijo, field.idCampo)}
                                                        setErrors={() => clearLibroFieldError(acordeon.prefijo, field.idCampo)}
                                                        inputType="text"
                                                        onValueChange={campoUp === 'FECORI' ? (val) => {
                                                            setLibrosFecori((prev) => ({ ...prev, [acordeon.prefijo]: val }));
                                                        } : campoUp === 'VIDAUTIL' ? (val) => {
                                                            setLibrosVidautil((prev) => ({ ...prev, [acordeon.prefijo]: val }));
                                                        } : campoUp === 'VALORI' ? (val) => {
                                                            setLibrosValoriDraft((prev) => ({ ...prev, [acordeon.prefijo]: val }));
                                                        } : undefined}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="flex mx-10 mb-7 min-w-0">
                                            <div className="flex select-none bg-gabu-700 min-w-0 flex-1 items-stretch">
                                                {librosHorizontalTabs.map((tab, idx) => (
                                                    <React.Fragment key={`${acordeon.prefijo}-${tab.id}`}>
                                                        <div
                                                            className={`w-10 flex justify-center items-center overflow-hidden transition-all duration-150 border-r-2 border-r-gabu-100 cursor-pointer bg-gabu-700 ${idx === 0 ? 'rounded-l-xl' : ''}`}
                                                            onClick={() => setLibroTab(acordeon.prefijo, tab.id)}
                                                        >
                                                            <p className="text-gabu-100 text-xs text-center py-1.5">{tab.label.split('').map((char, i) => <React.Fragment key={i}>{char}{i < tab.label.length - 1 && <br />}</React.Fragment>)}</p>
                                                        </div>
                                                        <div className={`overflow-hidden transition-[width,flex] duration-200 ease-linear bg-gabu-100 min-w-0 ${activeTab === tab.id ? 'flex-1' : 'w-0'} ${idx === librosHorizontalTabs.length - 1 ? 'rounded-r-xl' : ''}`}>
                                                            <div className="flex flex-col w-full p-7 gap-3 min-h-[260px] justify-center" style={{ display: activeTab === tab.id ? '' : 'none' }}>
                                                                {[
                                                                    { label: 'Valor actual', base: 'Vrepoe', isVrepoe: true },
                                                                    { label: 'Amort. acumulada',  base: 'Amafie',  isVrepoe: false },
                                                                    { label: 'Amort. ejercicio',  base: 'Amefie',  isVrepoe: false },
                                                                    { label: 'Amort. periodo',    base: 'Ampefe',  isVrepoe: false },
                                                                ].map(({ label, base, isVrepoe }) => {
                                                                    const suffixMap: Record<string, string> = {
                                                                        referenciales: 'Referencial',
                                                                        anteriores:    'Anterior',
                                                                        actualizado:   'Actual',
                                                                        cierre:        'CierreAnterior',
                                                                    };
                                                                    const fieldSuffix = suffixMap[tab.id] ?? 'Referencial';
                                                                    const fieldId = `${acordeon.prefijo}.${base}${fieldSuffix}`;
                                                                    const fixedVal = (() => {
                                                                        if (isVrepoe) {
                                                                            const draft = librosValoriDraft[acordeon.prefijo];
                                                                            if (draft !== undefined && draft !== '') return draft;
                                                                            if (cloneMode || altaAgregadoMode) {
                                                                                return valorConCotizacion(valorOrigenGral || '0', acordeon.prefijo);
                                                                            }
                                                                            const fromBien = bienId && bienData ? getRowVal(bienData, fieldId) : undefined;
                                                                            if (fromBien != null && fromBien !== '') {
                                                                                const num = parseLocalizedNumber(fromBien);
                                                                                return !isNaN(num) ? formatNumberEs(num, 2, 2) : '0';
                                                                            }
                                                                            return '0';
                                                                        }
                                                                        const fromBien = bienId && bienData ? getRowVal(bienData, fieldId) : undefined;
                                                                        if (fromBien != null && fromBien !== '') {
                                                                            const num = parseLocalizedNumber(fromBien);
                                                                            return !isNaN(num) ? formatNumberEs(num, 2, 2) : '0';
                                                                        }
                                                                        return '0';
                                                                    })();
                                                                    return (
                                                                        <HorizontalInput
                                                                            key={fieldId}
                                                                            label={label}
                                                                            fieldId={fieldId}
                                                                            fixedValue={fixedVal}
                                                                            hasToBeProportional={false}
                                                                            disabled={true}
                                                                            isError={false}
                                                                            errorMessage={null}
                                                                            setErrors={() => {}}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            <Alert message={saveError} type="error" show={!!saveError} onClose={() => setSaveError(null)} />
            {!consultMode && (
            <div className="sticky w-full h-15 bg-gabu-500 border-2 border-gabu-900 flex justify-end gap-5 p-3">
                <button type="button" onClick={handleRevert} className="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300 border border-gabu-900">Revertir</button>
                <button type="submit" disabled={saving} className="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300 border border-gabu-900 disabled:opacity-70 disabled:cursor-not-allowed">
                    {saving ? 'Guardando…' : 'Guardar bien'}
                </button>
            </div>
            )}
        </form>
        <Modal
            isOpen={notaModalOpen}
            style="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-xl bg-gabu-700 border border-gabu-900 shadow-xl p-4 w-[min(92vw,56rem)] h-[min(85vh,40rem)] max-h-[85vh] relative z-[10010]"
        >
            <div className="flex shrink-0 justify-between items-center border-b border-gabu-500 pb-3 mb-3">
                <p className="text-lg text-gabu-100 font-medium">Nota completa</p>
                <button
                    type="button"
                    onClick={closeNotaModal}
                    className="p-1 rounded hover:bg-gabu-500 transition-colors"
                    aria-label="Cerrar"
                >
                    <Cross style="h-6 w-6 fill-current text-gabu-100 cursor-pointer" onClick={closeNotaModal} />
                </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
                <textarea
                    className={`min-h-0 flex-1 w-full rounded-lg border border-gabu-900 p-3 text-gabu-900 resize-none focus:outline-none ${
                        consultMode ? 'bg-gabu-500 cursor-default' : 'bg-gabu-100'
                    }`}
                    value={notaModalDraft}
                    readOnly={consultMode}
                    onChange={(e) => !consultMode && setNotaModalDraft(e.target.value)}
                    placeholder="Escriba aquí la anotación del bien…"
                />
            </div>
            <div className="flex shrink-0 justify-end gap-3 pt-3 mt-3 border-t border-gabu-500">
                <Button
                    text="Cerrar"
                    type="button"
                    handleClick={closeNotaModal}
                    style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                />
                {!consultMode && (
                    <Button
                        text="Aceptar"
                        type="button"
                        handleClick={applyNotaModal}
                        style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-500 cursor-pointer transition-colors duration-300 px-4 py-2"
                    />
                )}
            </div>
        </Modal>
        <Modal
            isOpen={fotoModalOpen}
            style="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-xl bg-gabu-700 border border-gabu-900 shadow-xl p-4 w-[min(96vw,52rem)] max-h-[92vh] relative z-[10010]"
        >
            <div className="flex shrink-0 justify-between items-center border-b border-gabu-500 pb-3 mb-3">
                <p className="text-lg text-gabu-100 font-medium">Foto del bien</p>
                <button
                    type="button"
                    onClick={closeFotoModal}
                    className="p-1 rounded hover:bg-gabu-500 transition-colors"
                    aria-label="Cerrar"
                >
                    <Cross style="h-6 w-6 fill-current text-gabu-100 cursor-pointer" onClick={closeFotoModal} />
                </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden">
                {fotoModalItem && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={getFotoDisplayUrl(fotoModalItem)}
                        alt="Foto del bien ampliada"
                        className="max-h-[min(70vh,40rem)] max-w-full object-contain rounded-lg border border-gabu-900 bg-gabu-900/20"
                    />
                )}
            </div>
            <div className="flex shrink-0 justify-end gap-3 pt-3 mt-3 border-t border-gabu-500 flex-wrap">
                {fotoModalItem && (
                    <Button
                        text="Descargar"
                        type="button"
                        handleClick={() => downloadFotoItem(fotoModalItem)}
                        style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                    />
                )}
                {canEditFotos && fotoModalItem && (
                    <Button
                        text="Eliminar"
                        type="button"
                        handleClick={() => handleDeleteFotoItem(fotoModalItem)}
                        style="font-normal text-gabu-100 bg-gabu-error rounded-md hover:opacity-90 cursor-pointer transition-colors duration-300 px-4 py-2"
                    />
                )}
                <Button
                    text="Cerrar"
                    type="button"
                    handleClick={closeFotoModal}
                    style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-500 cursor-pointer transition-colors duration-300 px-4 py-2"
                />
            </div>
        </Modal>
        </>
    );
}
