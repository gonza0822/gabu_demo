'use client';

import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Excel from "@/components/svg/Excel";
import HorizontalInput from "@/components/ui/HorizontalInput";
import HorizontalSelect from "@/components/ui/HorizontalSelect";
import type { AbmCabeceraData, AbmLibrosData } from "@/lib/models/fixedAssets/FixedAsset";
import Percentage from "@/components/svg/Percentage";

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

export default function AbmFixedAsset() : React.ReactElement {
    const client = useSelector((state: RootState) => state.authorization.client);
    const [datosGenerales, setDatosGenerales] = useState<AbmDatosGeneralesData | null>(null);
    const [datosGeneralesLoading, setDatosGeneralesLoading] = useState(true);
    const [cabeceraData, setCabeceraData] = useState<AbmCabeceraData | null>(null);
    const [cabeceraLoading, setCabeceraLoading] = useState(true);
    const [librosData, setLibrosData] = useState<AbmLibrosData | null>(null);
    const [librosLoading, setLibrosLoading] = useState(true);

    const fetchCabeceraData = useCallback(async () => {
        if (!client) return;
        setCabeceraLoading(true);
        try {
            const res = await fetch("/api/fixedAssets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetCabeceraFormData", client, data: {} }),
            });
            const data = await res.json();
            if (data && Array.isArray(data.fields)) {
                setCabeceraData(data);
            }
        } finally {
            setCabeceraLoading(false);
        }
    }, [client]);

    useEffect(() => {
        fetchCabeceraData();
    }, [fetchCabeceraData]);

    const fetchLibrosData = useCallback(async () => {
        if (!client) return;
        setLibrosLoading(true);
        try {
            const res = await fetch("/api/fixedAssets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetLibrosFormData", client, data: {} }),
            });
            const data = await res.json();
            if (data && Array.isArray(data.acordeones)) {
                setLibrosData(data);
            }
        } finally {
            setLibrosLoading(false);
        }
    }, [client]);

    useEffect(() => {
        fetchLibrosData();
    }, [fetchLibrosData]);

    const fetchDatosGenerales = useCallback(async () => {
        if (!client) return;
        setDatosGeneralesLoading(true);
        try {
            const [defaultsRes, plantasRes, zonasRes, cencosRes] = await Promise.all([
                fetch("/api/fixedAssets/defaults", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ petition: "Get", client, data: {} }),
                }),
                fetch("/api/fixedAssets/defaults", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ petition: "GetOptions", client, data: { idcampo: "idPlanta" } }),
                }),
                fetch("/api/fixedAssets/defaults", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ petition: "GetOptions", client, data: { idcampo: "idZona" } }),
                }),
                fetch("/api/fixedAssets/defaults", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ petition: "GetOptions", client, data: { idcampo: "idCencos" } }),
                }),
            ]);

            const defaultsData = await defaultsRes.json();
            const plantasData = await plantasRes.json();
            const zonasData = await zonasRes.json();
            const cencosData = await cencosRes.json();

            const defaultsRows = Array.isArray(defaultsData) ? defaultsData : [];
            const plants = Array.isArray(plantasData) ? plantasData : [];
            const zonas = Array.isArray(zonasData) ? zonasData : [];
            const costCenters = Array.isArray(cencosData) ? cencosData : [];

            const findDefault = (idcampo: string) =>
                defaultsRows.find((d: { idcampo: string }) => d.idcampo.toLowerCase() === idcampo.toLowerCase())?.iddefault ?? null;

            setDatosGenerales({
                plants,
                zonas,
                costCenters,
                defaultPlanta: findDefault("idPlanta"),
                defaultZona: findDefault("idZona"),
                defaultCencos: findDefault("idCencos"),
            });
        } finally {
            setDatosGeneralesLoading(false);
        }
    }, [client]);

    useEffect(() => {
        fetchDatosGenerales();
    }, [fetchDatosGenerales]);

    // Per-accordion reactive state for calculated fields
    const [librosFecori, setLibrosFecori] = useState<Record<string, string>>({});
    const [librosTipoAmor, setLibrosTipoAmor] = useState<Record<string, string>>({});
    const [librosVidautil, setLibrosVidautil] = useState<Record<string, string>>({});

    const [librosOpenPrefijo, setLibrosOpenPrefijo] = useState<string | null>(null);
    const cabeceraOpen = librosOpenPrefijo === 'cabecera';
    const [librosHorizontalTab, setLibrosHorizontalTab] = useState<Record<string, string>>({});
    const [valorOrigenGral, setValorOrigenGral] = useState('0');
    const [formKey, setFormKey] = useState(0);

    type DistribucionRow = { id: number; cencos: string; porcentaje: string };
    const [distribucionRows, setDistribucionRows] = useState<DistribucionRow[]>([]);
    const [ccostosOptions, setCcostosOptions] = useState<{ key: string; value: string }[]>([]);

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

    const [distribucionOpenId, setDistribucionOpenId] = useState<number | null>(null);

    const addDistribucionRow = () =>
        setDistribucionRows((prev) => [...prev, { id: Date.now(), cencos: ccostosOptions[0]?.key ?? '', porcentaje: '0' }]);

    const handleRevert = () => {
        setValorOrigenGral('0');
        setDistribucionRows([]);
        setDistribucionOpenId(null);
        // Re-initialize calculated fields from loaded data
        if (librosData) {
            const fecoriMap: Record<string, string> = {};
            const tipoAmorMap: Record<string, string> = {};
            const vidautilMap: Record<string, string> = {};
            const defaultActivo = cabeceraData?.defaultActivo ?? librosData.cuentas[0]?.key ?? '';
            librosData.acordeones.forEach((ac) => {
                const idMoneda = getLibroIdMoneda(ac.prefijo);
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
    };
    const [horizontalTabCabecera, setHorizontalTabCabecera] = useState<'distribucion' | 'notas' | 'fotos' | 'documentos' | 'tecnica'>('distribucion');

    const horizontalTabsCabecera = [
        { id: 'distribucion' as const, label: 'DISTRIBUCION' },
        { id: 'notas' as const, label: 'NOTAS' },
        { id: 'fotos' as const, label: 'FOTOS' },
        { id: 'documentos' as const, label: 'DOCUMENTOS' },
        { id: 'tecnica' as const, label: 'P. TECNICA' },
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
    const TIPOPROCESO_OPTIONS = [{ key: 'true', value: 'SI' }, { key: 'false', value: 'NO' }];

    const getLibroIdMoneda = (prefijo: string): string => {
        // MONEDALOCAL → '01', impuestos → '01', ME01 → '01', ME02 → '02', etc.
        if (prefijo.toUpperCase() === 'MONEDALOCAL' || prefijo.toLowerCase() === 'impuestos') return '01';
        const m = prefijo.match(/^ME(\d+)$/i);
        return m ? m[1].padStart(2, '0') : '01';
    };

    const getLibroDefault = (prefijo: string, idCampo: string): string | undefined => {
        if (!librosData) return undefined;
        const campoUp = idCampo.toUpperCase();
        const idMoneda = getLibroIdMoneda(prefijo);
        const defaults = librosData.defaultsByMoneda[idMoneda];

        const fecori   = librosFecori[prefijo]   ?? defaults?.FECORI ?? '';
        const tipoAmor = librosTipoAmor[prefijo]  ?? defaults?.IDTIPOAMORTIZACION ?? '';
        const vidautil = librosVidautil[prefijo]  ?? '';
        const fecdep   = fecori && tipoAmor ? calcFecdep(fecori, tipoAmor) : '';
        const fecfin   = fecdep && vidautil ? calcFecfin(fecdep, vidautil) : '';

        switch (campoUp) {
            case 'VALORI':              return '0';
            case 'IDACTIVO':            return cabeceraData?.defaultActivo ?? undefined;
            case 'IDTIPOAMORTIZACION':  return defaults?.IDTIPOAMORTIZACION ?? undefined;
            case 'IDINDACT':            return defaults?.IDINDACT ?? undefined;
            case 'IDTIPOPROCESO':       return 'true';
            case 'IDCODAMO':            return defaults?.IDCODAMO ?? undefined;
            case 'ESTCON':              return '0';
            case 'IDMONEDA':            return idMoneda;
            case 'FECORI':              return fecori || undefined;
            case 'FECDEP':              return fecdep || undefined;
            case 'FECFIN':              return fecfin || undefined;
            case 'VIDAUTIL':            return vidautil || undefined;
            case 'PRECIOVENTA':         return '0';
            case 'VIDATRANSCURRIDA':    return '0';
            case 'VIDARESTANTE':        return '0';
            case 'VALORRESIDUAL':       return '0';
            case 'INDICE':              return '0';
            default:                    return undefined;
        }
    };

    // Initialize reactive fields when librosData loads
    useEffect(() => {
        if (!librosData) return;
        const fecoriMap: Record<string, string> = {};
        const tipoAmorMap: Record<string, string> = {};
        const vidautilMap: Record<string, string> = {};
        const defaultActivo = cabeceraData?.defaultActivo ?? librosData.cuentas[0]?.key ?? '';
        librosData.acordeones.forEach((ac) => {
            const idMoneda = getLibroIdMoneda(ac.prefijo);
            const def = librosData.defaultsByMoneda[idMoneda];
            fecoriMap[ac.prefijo]   = def?.FECORI ?? '';
            tipoAmorMap[ac.prefijo] = def?.IDTIPOAMORTIZACION ?? '';
            // Find vidautil for this moneda + default activo from cabecera
            const vuRow = librosData.vidautil.find(
                (v) => v.idMoextra === idMoneda && v.idActivo === defaultActivo
            );
            vidautilMap[ac.prefijo] = vuRow ? String(vuRow.meses) : '';
        });
        setLibrosFecori(fecoriMap);
        setLibrosTipoAmor(tipoAmorMap);
        setLibrosVidautil(vidautilMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [librosData, cabeceraData]);

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

    /** Calculate FECFIN = FECDEP + vidautil months */
    const calcFecfin = (fecdep: string, vidautil: string): string => {
        const base = parseFecMMYYYY(fecdep);
        const meses = parseInt(vidautil, 10);
        if (!base || isNaN(meses)) return '';
        return formatFecMMYYYY(new Date(base.getFullYear(), base.getMonth() + meses, 1));
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

    return (
        <div className="flex flex-col w-full h-full">
            <div key={formKey} className="flex flex-col w-full h-full pl-10 pr-5 overflow-y-auto main-content">
                <div className="flex flex-col w-full rounded-xl bg-gabu-700 pb-5 pt-3 my-5">
                    <div className="flex w-full justify-center relative">
                        <p className="text-xl text-gabu-100">Datos generales</p>
                        <Excel style="absolute -right-5 mr-10 cursor-pointer h-6 w-6 fill-current text-gabu-300" onClick={() => {}} />
                    </div>
                    <div className="flex flex-col gap-1 w-full px-5 mb-5">
                        <Input
                            label="Descripcion"
                            hasLabel={true}
                            isLogin={false}
                            disabled={false}
                            type="text"
                            isError={false}
                            errorMessage={null}
                            variant="abm"
                        />
                    </div>
                    <div className="flex px-5 justify-between gap-4">
                        <div className="flex flex-shrink-0 flex-col gap-1 w-[25%]">
                            {datosGeneralesLoading ? (
                                <div className="h-10 bg-gabu-300 rounded-md animate-pulse" />
                            ) : (
                                <Select
                                    label="Planta"
                                    hasLabel={true}
                                    isLogin={false}
                                    variant="abm"
                                    options={datosGenerales?.plants ?? []}
                                    defaultValue={datosGenerales?.defaultPlanta ?? ""}
                                    chooseOptionHandler={selectOptionHandler}
                                />
                            )}
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1 w-[25%]">
                            {datosGeneralesLoading ? (
                                <div className="h-10 bg-gabu-300 rounded-md animate-pulse" />
                            ) : (
                                <Select
                                    label="Zona"
                                    hasLabel={true}
                                    isLogin={false}
                                    variant="abm"
                                    options={datosGenerales?.zonas ?? []}
                                    defaultValue={datosGenerales?.defaultZona ?? ""}
                                    chooseOptionHandler={selectOptionHandler}
                                />
                            )}
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1 w-[25%]">
                            {datosGeneralesLoading ? (
                                <div className="h-10 bg-gabu-300 rounded-md animate-pulse" />
                            ) : (
                                <Select
                                    label="Centro de costos"
                                    hasLabel={true}
                                    isLogin={false}
                                    variant="abm"
                                    options={datosGenerales?.costCenters ?? []}
                                    defaultValue={datosGenerales?.defaultCencos ?? ""}
                                    chooseOptionHandler={selectOptionHandler}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Cabecera accordion */}
                <div className="flex flex-col w-full">
                    <div className="flex flex-col w-full select-none bg-gabu-700 rounded-t-xl">
                        <div
                            className={`flex justify-center items-center transition-all duration-150 py-1.5 border-b-2 border-b-gabu-100 cursor-pointer sticky top-0 z-[10000] ${cabeceraOpen ? 'bg-gabu-700' : ''}`}
                            onClick={() => setLibrosOpenPrefijo((prev) => prev === 'cabecera' ? null : 'cabecera')}
                        >
                            <ArrowSvg open={cabeceraOpen} />
                            <p className="text-gabu-100 text-lg">Cabecera</p>
                        </div>
                        <div className={`grid transition-all duration-200 ease-linear bg-gabu-300 ${cabeceraOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                            {(cabeceraLoading || !cabeceraData) ? (
                                <div className="grid grid-cols-2 gap-x-5 gap-y-3 w-full py-7 px-10">
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <div key={i} className="h-7 bg-gabu-500 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                            <div className="grid grid-cols-2 gap-x-5 gap-y-3 w-full py-7 px-10">
                                {/* Col izquierda */}
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'iddescripcion')?.browNombre ?? 'Descripcion normalizada'}
                                    fieldId="IDDESCRIPCION"
                                    hasToBeProportional={false}
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idsituacion')?.browNombre ?? 'Situacion'}
                                    fieldId="IDSITUACION"
                                    options={cabeceraData.situaciones}
                                    defaultValue={cabeceraData.defaultSituacion ?? '00'}
                                    hasToBeProportional={false}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'cantidad')?.browNombre ?? 'Cantidad'}
                                    fieldId="CANTIDAD"
                                    hasToBeProportional={false}
                                    defaultValue="1"
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idfactura')?.browNombre ?? 'Factura'}
                                    fieldId="IDFACTURA"
                                    hasToBeProportional={false}
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idunegocio')?.browNombre ?? 'Unidad de negocio'}
                                    fieldId="IDUNEGOCIO"
                                    options={cabeceraData.unidadesNegocio}
                                    defaultValue={cabeceraData.defaultUnegocio ?? undefined}
                                    hasToBeProportional={false}
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
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idactivo')?.browNombre ?? 'Cta activo'}
                                    fieldId="IDACTIVO"
                                    options={cabeceraData.cuentas}
                                    defaultValue={cabeceraData.defaultActivo ?? undefined}
                                    hasToBeProportional={false}
                                    chooseOptionHandler={(e, ref) => {
                                        const li = e.currentTarget as HTMLLIElement;
                                        if (ref?.current) {
                                            ref.current.value = li.textContent || "";
                                            ref.current.dataset.key = li.dataset.key || "";
                                        }
                                    }}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'trfecactivo')?.browNombre ?? 'Fecha transf cuenta'}
                                    fieldId="TRFECACTIVO"
                                    hasToBeProportional={false}
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idmodelo')?.browNombre ?? 'Modelo'}
                                    fieldId="IDMODELO"
                                    options={cabeceraData.modelos}
                                    defaultValue={cabeceraData.defaultModelo ?? undefined}
                                    hasToBeProportional={false}
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
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idordencompra')?.browNombre ?? 'Orden de compra'}
                                    fieldId="IDORDENCOMPRA"
                                    hasToBeProportional={false}
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'trfecproyecto')?.browNombre ?? 'Fecha transf proyecto'}
                                    fieldId="TRFECPROYECTO"
                                    hasToBeProportional={false}
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idorigen')?.browNombre ?? 'Origen'}
                                    fieldId="IDORIGEN"
                                    options={cabeceraData.origenes}
                                    defaultValue={cabeceraData.defaultOrigen ?? undefined}
                                    hasToBeProportional={false}
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
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalInput
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'idproveedor')?.browNombre ?? 'Proveedor'}
                                    fieldId="IDPROVEEDOR"
                                    hasToBeProportional={false}
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'esencial')?.browNombre ?? 'Esencial'}
                                    fieldId="ESENCIAL"
                                    options={[{ key: '0', value: 'No' }, { key: '1', value: 'Si' }]}
                                    defaultValue="0"
                                    hasToBeProportional={false}
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
                                    defaultValue=""
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                />
                                <HorizontalSelect
                                    label={cabeceraData.fields?.find(f => f.idCampo.toLowerCase() === 'nuevo')?.browNombre ?? 'Nuevo'}
                                    fieldId="NUEVO"
                                    options={[{ key: '1', value: 'Si' }, { key: '0', value: 'No' }]}
                                    defaultValue="1"
                                    hasToBeProportional={false}
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
                                    options={cabeceraData.proyectos}
                                    defaultValue={cabeceraData.defaultProyecto ?? undefined}
                                    hasToBeProportional={false}
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
                                    defaultValue="0"
                                    isError={false}
                                    errorMessage={null}
                                    setErrors={() => {}}
                                    onValueChange={(val) => setValorOrigenGral(val)}
                                />
                            </div>
                            )}
                            <div className="flex mx-10 mb-7 min-w-0">
                                <div className="flex select-none bg-gabu-700 min-w-0 flex-1 items-stretch">
                                    {horizontalTabsCabecera.map((tab, idx) => (
                                        <React.Fragment key={tab.id}>
                                            <div
                                                className={`w-10 shrink-0 flex justify-center items-center overflow-hidden transition-all duration-150 border-r-2 border-r-gabu-100 cursor-pointer bg-gabu-700 ${idx === 0 ? 'rounded-l-xl' : ''}`}
                                                onClick={() => setHorizontalTabCabecera(tab.id)}
                                            >
                                                <p className="text-gabu-100 text-xs text-center py-1.5">{tab.label.split('').map((char, i) => <React.Fragment key={i}>{char}{i < tab.label.length - 1 && <br />}</React.Fragment>)}</p>
                                            </div>
                                            <div className={`overflow-hidden transition-[width,flex] duration-200 ease-linear bg-gabu-100 min-w-0 ${horizontalTabCabecera === tab.id ? 'flex-1' : 'w-0'} ${idx === horizontalTabsCabecera.length - 1 ? 'rounded-r-xl' : ''}`}>
                                                <div className="w-full p-5 min-h-[260px] flex flex-col justify-center" style={{ display: horizontalTabCabecera === tab.id ? '' : 'none' }}>
                                                    {tab.id === 'distribucion' && (
                                                        <div className="flex flex-col gap-2">
                                                            {distribucionRows.map((row) => (
                                                                <div key={row.id} className="flex gap-2 items-center">
                                                                    <div className="relative h-8 w-1/2 bg-gabu-300 rounded-md border border-gabu-900">
                                                                        <div
                                                                            className="bg-gabu-300 h-full flex justify-between items-center cursor-pointer px-3 rounded-md"
                                                                            onClick={() => setDistribucionOpenId((prev) => prev === row.id ? null : row.id)}
                                                                        >
                                                                            <span className="text-sm text-gabu-900 truncate">
                                                                                {ccostosOptions.find((o) => o.key === row.cencos)?.value ?? row.cencos}
                                                                            </span>
                                                                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`fill-current text-gabu-900 transition-transform duration-300 shrink-0 ${distribucionOpenId === row.id ? 'rotate-90' : '-rotate-90'}`}>
                                                                                <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
                                                                            </svg>
                                                                        </div>
                                                                        <ul className={`w-full rounded-b-md absolute z-50 font-normal cursor-pointer bg-gabu-300 overflow-y-auto border-x border-b border-gabu-900 transition-all duration-200 ease-linear ${distribucionOpenId === row.id ? 'max-h-32' : 'max-h-0 border-0'}`}>
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
                                                                    <div className="flex rounded-md border border-gabu-900 items-center h-8 bg-gabu-300 w-1/2">
                                                                        <input
                                                                            type="number"
                                                                            className="appearance-none focus:outline-none text-gabu-900 h-full px-3 w-[85%] bg-transparent"
                                                                            value={row.porcentaje}
                                                                            onChange={(e) => setDistribucionRows((prev) =>
                                                                                prev.map((r) => r.id === row.id ? { ...r, porcentaje: e.target.value } : r)
                                                                            )}
                                                                        />
                                                                        <div className="flex border-l border-l-gabu-900 justify-center items-center w-[15%] h-full">
                                                                            <Percentage />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div
                                                                className="flex rounded-md h-8 bg-gabu-700 items-center justify-center hover:bg-gabu-500 transition-all duration-150 cursor-pointer mt-1"
                                                                onClick={addDistribucionRow}
                                                            >
                                                                <p className="text-gabu-100">Agregar centro de costo</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {tab.id === 'notas' && (
                                                        <div className="w-full border border-gabu-900 rounded-lg">
                                                            <div className="text-center text-gabu-700 w-full p-5">
                                                                Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                                                            </div>
                                                            <button className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-b-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150">Ver nota completa</button>
                                                        </div>
                                                    )}
                                                    {tab.id === 'fotos' && (
                                                        <div className="flex justify-around items-center gap-3">
                                                            <div className="h-40 w-40 bg-gabu-300 rounded-lg" />
                                                            <div className="flex flex-col gap-3 w-[70%]">
                                                                <button className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150">Agregar foto</button>
                                                                <button className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150">Cambiar foto</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(tab.id === 'documentos' || tab.id === 'tecnica') && (
                                                        <div className="flex justify-around items-center gap-3">
                                                            <div className="border border-gabu-900 rounded-lg">
                                                                <div className="flex items-center justify-center bg-gabu-300 overflow-hidden h-40 w-40" />
                                                                <button className="w-full bg-gabu-700 text-gabu-100 text-sm py-2 hover:bg-gabu-500 cursor-pointer">Ver {tab.id === 'documentos' ? 'documento' : 'plantilla'}</button>
                                                            </div>
                                                            <div className="flex flex-col gap-3 w-[70%]">
                                                                <button className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150">Agregar {tab.id === 'documentos' ? 'documento' : 'plantilla'}</button>
                                                                <button className="w-full bg-gabu-700 text-center py-2 text-gabu-100 rounded-lg cursor-pointer hover:bg-gabu-500 transition-all duration-150">Cambiar {tab.id === 'documentos' ? 'documento' : 'plantilla'}</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
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
                                        className="flex justify-center items-center transition-all duration-150 py-1.5 border-b-2 border-b-gabu-100 cursor-pointer sticky top-0 z-[10000] bg-gabu-700"
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
                                                            disabled={isDisabled}
                                                            onValueChange={campoUp === 'IDTIPOAMORTIZACION' ? (key) => {
                                                                setLibrosTipoAmor((prev) => ({ ...prev, [acordeon.prefijo]: key }));
                                                            } : undefined}
                                                        />
                                                    );
                                                }
                                                return (
                                                    <HorizontalInput
                                                        key={field.idCampo}
                                                        label={field.browNombre}
                                                        fieldId={`${acordeon.prefijo}.${field.idCampo}`}
                                                        defaultValue={isReactive ? undefined : defaultVal}
                                                        fixedValue={isReactive ? (defaultVal ?? '') : undefined}
                                                        hasToBeProportional={isFullWidth}
                                                        colSpan={isFullWidth ? 'col-span-2' : undefined}
                                                        disabled={isDisabled}
                                                        isError={false}
                                                        errorMessage={null}
                                                        setErrors={() => {}}
                                                        onValueChange={campoUp === 'FECORI' ? (val) => {
                                                            setLibrosFecori((prev) => ({ ...prev, [acordeon.prefijo]: val }));
                                                        } : campoUp === 'VIDAUTIL' ? (val) => {
                                                            setLibrosVidautil((prev) => ({ ...prev, [acordeon.prefijo]: val }));
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
                                                                    return (
                                                                        <HorizontalInput
                                                                            key={fieldId}
                                                                            label={label}
                                                                            fieldId={fieldId}
                                                                            fixedValue={isVrepoe ? valorOrigenGral : '0'}
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
            <div className="sticky w-full h-15 bg-gabu-500 border-2 border-gabu-900 flex justify-end gap-5 p-3">
                <button onClick={handleRevert} className="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300 border border-gabu-900">Revertir</button>
                <button className="font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300 border border-gabu-900">Guardar bien</button>
            </div>
        </div>
    );
}
