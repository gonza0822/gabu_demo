import { getPrisma } from "@/lib/prisma/prisma";
import { PrismaClient } from '@/generated/prisma/client';
import { ConverFieldModel } from "@/generated/prisma/models";
import { ReOrderData } from "@/lib/models/tables/Table";

export type FixedAssets = {[key: string]: unknown};

export type FixedAssetsData = {
    fixedAssets: FixedAssets[];
    fieldsManage: ConverFieldModel[];
    /** Fecha inicio ejercicio desde parametros (idmoextra '01') para filtro bajas ejercicio actual */
    feciniEjercicio: string | null;
    /** Opciones de tipo de baja desde Interna donde Tipo = 'BAJA' */
    tipoBajaOptions: { key: string; value: string }[];
    /** Fecha proceso (MM/YYYY) desde parametros idmoextra='ml' para default de fecha de baja */
    fecproBajaDefault: string;
    /** Cuentas destino para transferencia (IdTipo != '0') */
    cuentasDestinoOptions: { key: string; value: string }[];
    /** Fecha proceso default para transferencia (mismo que baja) */
    fecproTransferenciaDefault: string;
};

export type AbmDatosGeneralesData = {
    plants: { key: string; value: string }[];
    zonas: { key: string; value: string }[];
    costCenters: { key: string; value: string }[];
    defaultPlanta: string | null;
    defaultZona: string | null;
    defaultCencos: string | null;
};

export type CabeceraFieldMeta = {
    idCampo: string;
    browNombre: string;
};

export type AbmCabeceraData = {
    fields: CabeceraFieldMeta[];
    unidadesNegocio: { key: string; value: string }[];
    cuentas:         { key: string; value: string }[];
    modelos:         { key: string; value: string }[];
    origenes:        { key: string; value: string }[];
    proyectos:       { key: string; value: string }[];
    situaciones:     { key: string; value: string }[];
    defaultUnegocio:  string | null;
    defaultActivo:    string | null;
    defaultModelo:    string | null;
    defaultOrigen:    string | null;
    defaultProyecto:  string | null;
    defaultSituacion: string | null;
};

export type LibroFieldMeta = {
    idCampo: string;
    browNombre: string;
};

export type LibroAccordionData = {
    prefijo: string;
    nombre: string;
    fields: LibroFieldMeta[];
};

/** Defaults per libro accordion (keyed by campo name, uppercased) */
export type LibroDefaults = {
    IDTIPOAMORTIZACION: string | null;
    IDINDACT:           string | null;
    IDCODAMO:           string | null;
    IDMONEDA:           string;
    FECORI:             string | null;
};

export type AbmLibrosData = {
    acordeones: LibroAccordionData[];
    cuentas:    { key: string; value: string }[];
    tipoAmor:   { key: string; value: string }[];
    indact:     { key: string; value: string }[];
    codamo:     { key: string; value: string }[];
    monedas:    { key: string; value: string }[];
    /** vidautil per { idMoextra, idActivo } → number of months */
    vidautil:   { idMoextra: string; idActivo: string; meses: number }[];
    /** Defaults per idMoextra (e.g. '01', '02') */
    defaultsByMoneda: Record<string, LibroDefaults>;
    /** Cotización por idMoextra desde Cotextranjera (fecha más cercana a hoy). En el frontend, MONEDALOCAL e impuestos usan 1. */
    cotizacionesByMoneda: Record<string, number>;
};

class FixedAsset {
        prisma : PrismaClient;
    
        constructor(client: string){
            this.prisma = getPrisma(client);
        }

        async getAll() : Promise<FixedAssetsData> {
            const [fieldsManage, fixedAssets, parametros01, parametrosMl, internaBajaRows, cuentasDestino] = await Promise.all([
                this.prisma.converField.findMany({
                    where: { IdTabla: 'actifijo' },
                    orderBy: { lisordencampos: 'asc' },
                }),
                this.prisma.$queryRaw<{ [key: string]: unknown}[]>`SELECT * FROM dbo.actifijo`,
                this.prisma.parametros.findUnique({
                    where: { idmoextra: '01' },
                    select: { fecini: true },
                }),
                this.prisma.parametros.findUnique({
                    where: { idmoextra: 'ml' },
                    select: { fecpro: true },
                }),
                this.prisma.interna.findMany({
                    where: { Tipo: 'BAJA' },
                    select: { IdInterno: true, Descripcion: true },
                    orderBy: { Orden: 'asc' },
                }),
                this.prisma.cuentas.findMany({
                    where: { OR: [{ IdTipo: { not: '0' } }, { IdTipo: null }] },
                    select: { IdActivo: true, Descripcion: true },
                }),
            ]);
            const feciniEjercicio = parametros01?.fecini ? parametros01.fecini.toISOString() : null;
            const fecproBajaDefault = parametrosMl?.fecpro
                ? `${String((parametrosMl.fecpro as Date).getMonth() + 1).padStart(2, '0')}/${(parametrosMl.fecpro as Date).getFullYear()}`
                : '';
            const serializedFieldsManage = fieldsManage.map(field => ({
                ...field,
                IdCampo: field.IdCampo.toLowerCase(),
            }));
            const tipoBajaOptions = internaBajaRows.map((r) => ({
                key: r.IdInterno ?? '',
                value: r.Descripcion ?? r.IdInterno ?? '',
            }));
            return {
                fixedAssets,
                fieldsManage: serializedFieldsManage,
                feciniEjercicio,
                tipoBajaOptions,
                fecproBajaDefault,
                cuentasDestinoOptions: cuentasDestino.map((r) => ({ key: r.IdActivo, value: r.Descripcion ?? r.IdActivo })),
                fecproTransferenciaDefault: fecproBajaDefault,
            };
        }

    async changeOrder(newOrder: ReOrderData): Promise<ConverFieldModel[]> {
        const updatedRecords: ConverFieldModel[] = [];

        for (const item of newOrder) {
            const updated = await this.prisma.converField.update({
                where: {
                    IdTabla_IdCampo: {
                        IdTabla: item.tableId,
                        IdCampo: item.fieldId,
                    }
                },
                data: { lisordencampos: item.order }
            });
            updatedRecords.push(updated);
        }

        return updatedRecords;
    }

    async getAllSimulacion() : Promise<FixedAssetsData> {
        const simulaRows = await this.prisma.moextra.findMany({
            where: { simula: true },
            select: { idMoextra: true },
            orderBy: { idMoextra: "asc" },
        });
        const simulaIds = simulaRows.map((row) => row.idMoextra);
        const [fieldsManage, fixedAssets, parametrosRows, internaBajaRows, cuentasDestino] = await Promise.all([
            this.prisma.converField.findMany({
                where: { IdTabla: 'simulacion' },
                orderBy: { lisordencampos: 'asc' },
            }),
            this.prisma.$queryRaw<{ [key: string]: unknown}[]>`SELECT * FROM dbo.simulacion`,
            this.prisma.parametros.findMany({
                where: { idmoextra: { in: simulaIds } },
                select: { fecini: true, fecpro: true },
                orderBy: { idmoextra: 'asc' },
            }),
            this.prisma.interna.findMany({
                where: { Tipo: 'BAJA' },
                select: { IdInterno: true, Descripcion: true },
                orderBy: { Orden: 'asc' },
            }),
            this.prisma.cuentas.findMany({
                where: { OR: [{ IdTipo: { not: '0' } }, { IdTipo: null }] },
                select: { IdActivo: true, Descripcion: true },
            }),
        ]);
        const parametroSim = parametrosRows[0];
        const feciniEjercicio = parametroSim?.fecini ? parametroSim.fecini.toISOString() : null;
        const fecproBajaDefault = parametroSim?.fecpro
            ? `${String((parametroSim.fecpro as Date).getMonth() + 1).padStart(2, '0')}/${(parametroSim.fecpro as Date).getFullYear()}`
            : '';
        const normalizedFieldsManage = fieldsManage.map(field => {
            const raw = field.IdCampo.toLowerCase();
            const normalized = raw.includes(".") ? raw.split(".").slice(1).join(".") : raw;
            return {
                ...field,
                IdCampo: normalized,
            };
        });
        const seenColumns = new Set<string>();
        const serializedFieldsManage = normalizedFieldsManage.filter((field) => {
            const key = field.IdCampo.toLowerCase();
            if (seenColumns.has(key)) return false;
            seenColumns.add(key);
            return true;
        });
        const tipoBajaOptions = internaBajaRows.map((r) => ({
            key: r.IdInterno ?? '',
            value: r.Descripcion ?? r.IdInterno ?? '',
        }));
        return {
            fixedAssets,
            fieldsManage: serializedFieldsManage,
            feciniEjercicio,
            tipoBajaOptions,
            fecproBajaDefault,
            cuentasDestinoOptions: cuentasDestino.map((r) => ({ key: r.IdActivo, value: r.Descripcion ?? r.IdActivo })),
            fecproTransferenciaDefault: fecproBajaDefault,
        };
    }

    /**
     * Actualiza listShow en ConverField para IdTabla 'actifijo'.
     * @param idCampo - Id del campo a mostrar u ocultar
     * @param listShow - true = mostrar, false = ocultar
     */
    async setListShow(idCampo: string, listShow: boolean): Promise<ConverFieldModel> {
        const updated = await this.prisma.converField.update({
            where: {
                IdTabla_IdCampo: {
                    IdTabla: 'actifijo',
                    IdCampo: idCampo,
                }
            },
            data: { listShow }
        });
        return updated;
    }

    /**
     * Datos para el formulario ABM — acordeón Cabecera: labels desde ConverField, opciones de selects y defaults.
     * En simulación: IdTabla `simulacion`, campos `cabecera.*` (igual que actifijo).
     */
    async getAbmCabeceraData(simulationOnly = false): Promise<AbmCabeceraData> {
        const cabeceraConverWhere = simulationOnly
            ? { IdTabla: 'simulacion', IdCampo: { startsWith: 'cabecera.' } }
            : { IdTabla: 'actifijo', IdCampo: { startsWith: 'cabecera.' } };

        const [converFields, defaultsRows, unidadesNegocio, cuentas, modelos, origenes, proyectos, situaciones] = await Promise.all([
            this.prisma.converField.findMany({
                where: cabeceraConverWhere,
                orderBy: { lisordencampos: 'asc' },
                select: { IdCampo: true, BrowNombre: true },
            }),
            this.prisma.defaults.findMany({ select: { idcampo: true, iddefault: true } }),
            this.prisma.uNegocio.findMany({ select: { IdUNegocio: true, Descripcion: true } }),
            this.prisma.cuentas.findMany({ where: { IdActivo: { not: '0' } }, select: { IdActivo: true, Descripcion: true } }),
            this.prisma.produccion.findMany({ select: { idModelo: true, descripcion: true } }),
            this.prisma.origenes.findMany({ select: { IdOrigen: true, Descripcion: true } }),
            this.prisma.proyectos.findMany({ select: { IdProyecto: true, Descripcion: true } }),
            this.prisma.situacion.findMany({ select: { idsituacion: true, descripcion: true } }),
        ]);

        const findDefault = (idcampo: string) =>
            defaultsRows.find((d) => d.idcampo.toLowerCase() === idcampo.toLowerCase())?.iddefault ?? null;

        const stripCabeceraSimPrefix = (idCampo: string) =>
            idCampo.replace(/^cabecera\./i, '');

        return {
            fields: converFields.map((f) => ({
                idCampo: stripCabeceraSimPrefix(f.IdCampo),
                browNombre: f.BrowNombre ?? f.IdCampo,
            })),
            unidadesNegocio: unidadesNegocio.map((r) => ({ key: r.IdUNegocio, value: r.Descripcion ?? r.IdUNegocio })),
            cuentas: cuentas.map((r) => ({ key: r.IdActivo, value: r.Descripcion ?? r.IdActivo })),
            modelos: modelos.map((r) => ({ key: r.idModelo, value: r.descripcion ?? r.idModelo })),
            origenes: origenes.map((r) => ({ key: r.IdOrigen, value: r.Descripcion ?? r.IdOrigen })),
            proyectos: proyectos.map((r) => ({ key: r.IdProyecto, value: r.Descripcion ?? r.IdProyecto })),
            situaciones: situaciones.map((r) => ({ key: r.idsituacion, value: r.descripcion ?? r.idsituacion })),
            defaultUnegocio: findDefault('idUnegocio'),
            defaultActivo: findDefault('idActivo'),
            defaultModelo: findDefault('idModelo'),
            defaultOrigen: findDefault('idOrigen'),
            defaultProyecto: findDefault('idProyecto'),
            defaultSituacion: null,
        };
    }

    /**
     * Datos para el formulario ABM — acordeones de Libros Contables: acordeones dinámicos desde ConverField
     * (prefijos distintos de 'cabecera'), nombres desde moextra, opciones compartidas de selects.
     */
    async getAbmLibrosData(simulationOnly = false): Promise<AbmLibrosData> {
        const LIBRO_CAMPOS = [
            'VALORI', 'IDACTIVO', 'IDTIPOAMORTIZACION', 'IDINDACT', 'IDTIPOPROCESO',
            'IDCODAMO', 'ESTCON', 'IDMONEDA', 'FECORI', 'FECDEP', 'FECFIN',
            'FECBASE', 'FECBAJ', 'TIPOBAJA', 'PRECIOVENTA', 'VIDAUTIL',
            'VIDATRANSCURRIDA', 'VIDARESTANTE', 'VALORRESIDUAL', 'INDICE',
            'FECPRO', 'CAMBIOEJERCICIO', 'FECDIAPROCESO',
        ];

        // SQL Server does not support mode:'insensitive', so we include both cases explicitly
        const campoCases = LIBRO_CAMPOS.flatMap((campo) => {
            const lower = campo.toLowerCase();
            const upper = campo.toUpperCase();
            const capitalized = upper.charAt(0) + lower.slice(1);
            const variants = [...new Set([upper, lower, capitalized])];
            return variants.map((v) => ({ IdCampo: { endsWith: `.${v}` } }));
        });

        const libroConverWhere = simulationOnly
            ? {
                IdTabla: 'simulacion',
                NOT: { IdCampo: { startsWith: 'cabecera.' } },
                OR: campoCases,
            }
            : {
                IdTabla: 'actifijo',
                NOT: { IdCampo: { startsWith: 'cabecera.' } },
                OR: campoCases,
            };

        const ctaVidautilPromise = simulationOnly
            ? Promise.resolve([])
            : this.prisma.ctaVidautil.findMany({
                where: { NOT: { idMoextra: { in: ['03', '3'] } } },
                select: { idMoextra: true, idActivo: true, vidautil: true },
            });

        const [converFields, moextraRows, cuentas, internaRows, monedas, parametrosRows, ctaVidautilRows, cotextranjeraRows] = await Promise.all([
            this.prisma.converField.findMany({
                where: libroConverWhere,
                orderBy: { lisordencampos: 'asc' },
                select: { IdCampo: true, BrowNombre: true },
            }),
            this.prisma.moextra.findMany({
                where: simulationOnly ? { simula: true } : undefined,
                select: { idMoextra: true, Descripcion: true, simula: true },
            }),
            this.prisma.cuentas.findMany({ where: { IdActivo: { not: '0' } }, select: { IdActivo: true, Descripcion: true } }),
            this.prisma.interna.findMany({
                where: { Tipo: { in: ['TIPAMOR', 'INDACT', 'CODAMO'] } },
                select: { IdInterno: true, Descripcion: true, Tipo: true },
            }),
            this.prisma.monedas.findMany({ select: { IdMoneda: true, Descripcion: true } }),
            this.prisma.parametros.findMany({
                where: simulationOnly ? { idmoextra: { in: ["03"] } } : undefined,
                select: { idmoextra: true, IdTipoAmortizacion: true, fecpro: true },
            }),
            ctaVidautilPromise,
            this.prisma.cotextranjera.findMany({
                where: simulationOnly ? { idMoextra: "03" } : undefined,
                select: { Fecha: true, idMoextra: true, cotizacion: true },
            }),
        ]);

        // Cotización por idMoextra: fecha más cercana a hoy. Se usa para todos los idMoextra (incl. 01=Dolares HB2).
        // Solo MONEDALOCAL e impuestos usan cotización 1 (pesos históricos) - se aplica en el frontend.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cotizacionesByMoneda: Record<string, number> = {};
        const byMoextra = new Map<string, typeof cotextranjeraRows>();
        for (const row of cotextranjeraRows) {
            if (!byMoextra.has(row.idMoextra)) byMoextra.set(row.idMoextra, []);
            byMoextra.get(row.idMoextra)!.push(row);
        }
        for (const [idMo, rows] of byMoextra.entries()) {
            const closest = rows.reduce((best, r) => {
                const diff = Math.abs((r.Fecha as Date).getTime() - today.getTime());
                if (!best || diff < best.diff) return { row: r, diff };
                return best;
            }, null as { row: (typeof rows)[0]; diff: number } | null);
            cotizacionesByMoneda[idMo] = closest?.row?.cotizacion ?? 1;
        }

        // Group ConverField by prefix
        const prefixMap = new Map<string, LibroFieldMeta[]>();
        for (const f of converFields) {
            const dotIdx = f.IdCampo.indexOf('.');
            if (dotIdx === -1) continue;
            const prefix = f.IdCampo.substring(0, dotIdx);
            const campo = f.IdCampo.substring(dotIdx + 1);
            if (!prefixMap.has(prefix)) prefixMap.set(prefix, []);
            prefixMap.get(prefix)!.push({
                    idCampo: campo,
                    browNombre: f.BrowNombre ?? campo,
                });
        }

        // Ensure VALORI is always first within each accordion
        for (const [, fields] of prefixMap.entries()) {
            const valoriIdx = fields.findIndex((f) => f.idCampo.toUpperCase() === 'VALORI');
            if (valoriIdx > 0) {
                const [valoriField] = fields.splice(valoriIdx, 1);
                fields.unshift(valoriField);
            }
        }

        // Build accordion name for each prefix
        const HARDCODED_NAMES: Record<string, string> = {
            MONEDALOCAL: 'Moneda Local',
            impuestos: 'Impuestos',
        };

        const acordeones: LibroAccordionData[] = [];
        if (simulationOnly) {
            const me03Prefix = Array.from(prefixMap.keys()).find((p) => /^ME03$/i.test(p));
            const anyMePrefix = Array.from(prefixMap.keys()).find((p) => /^ME\d+$/i.test(p));
            const templatePrefix = me03Prefix ?? anyMePrefix ?? null;
            const templateFields = templatePrefix ? (prefixMap.get(templatePrefix) ?? []) : [];
            const defaultFields: LibroFieldMeta[] = LIBRO_CAMPOS.map((campo) => ({
                idCampo: campo,
                browNombre: campo,
            }));
            const simMo = moextraRows.find((r) => r.idMoextra === "03");
            acordeones.push({
                prefijo: "ME03",
                nombre: simMo?.Descripcion?.trim() || "Simulacion",
                fields: templateFields.length > 0 ? templateFields : defaultFields,
            });
        } else {
            for (const [prefix, fields] of prefixMap.entries()) {
                let nombre: string;
                if (HARDCODED_NAMES[prefix]) {
                    nombre = HARDCODED_NAMES[prefix];
                } else {
                    // ME01 → idMoextra = '01'
                    const meMatch = prefix.match(/^ME(\d+)$/i);
                    if (meMatch) {
                        const idMo = meMatch[1].padStart(2, '0');
                        const moRow = moextraRows.find((r) => r.idMoextra === idMo);
                        nombre = moRow?.Descripcion ?? prefix;
                    } else {
                        nombre = prefix;
                    }
                }
                acordeones.push({ prefijo: prefix, nombre, fields });
            }
        }

        // Build shared option lists
        const tipoAmor = internaRows
            .filter((r) => r.Tipo === 'TIPAMOR')
            .map((r) => ({ key: r.IdInterno ?? '', value: r.Descripcion ?? r.IdInterno ?? '' }));
        const indact = internaRows
            .filter((r) => r.Tipo === 'INDACT')
            .map((r) => ({ key: r.IdInterno ?? '', value: r.Descripcion ?? r.IdInterno ?? '' }));
        const codamo = internaRows
            .filter((r) => r.Tipo === 'CODAMO')
            .map((r) => ({ key: r.IdInterno ?? '', value: r.Descripcion ?? r.IdInterno ?? '' }));

        // Default keys for INDACT (IdInterno='1') and CODAMO (IdInterno='1')
        const defaultIndactKey = internaRows.find((r) => r.Tipo === 'INDACT' && r.IdInterno === '1')?.IdInterno ?? indact[0]?.key ?? null;
        const defaultCodamoKey = internaRows.find((r) => r.Tipo === 'CODAMO' && r.IdInterno === '1')?.IdInterno ?? codamo[0]?.key ?? null;

        // Build defaults per idmoextra from parametros
        const defaultsByMoneda: Record<string, LibroDefaults> = {};
        for (const p of parametrosRows) {
            const fecpro = p.fecpro
                ? `${String((p.fecpro as Date).getMonth() + 1).padStart(2, '0')}/${(p.fecpro as Date).getFullYear()}`
                : null;
            defaultsByMoneda[p.idmoextra] = {
                IDTIPOAMORTIZACION: p.IdTipoAmortizacion ?? null,
                IDINDACT:           defaultIndactKey,
                IDCODAMO:           defaultCodamoKey,
                IDMONEDA:           p.idmoextra,
                FECORI:             fecpro,
            };
        }

        return {
            acordeones,
            cuentas: cuentas.map((r) => ({ key: r.IdActivo, value: r.Descripcion ?? r.IdActivo })),
            tipoAmor,
            indact,
            codamo,
            monedas: monedas.map((r) => ({ key: r.IdMoneda, value: r.Descripcion ?? r.IdMoneda })),
            vidautil: ctaVidautilRows.map((r) => ({
                idMoextra: r.idMoextra,
                idActivo:  r.idActivo,
                meses:     Math.round(r.vidautil ?? 0),
            })),
            defaultsByMoneda,
            cotizacionesByMoneda,
        };
    }

    /**
     * Datos para el formulario ABM - Datos generales: opciones de Plantas, Zonas, CCostos y valores por defecto desde defaults.
     */
    async getAbmDatosGenerales(): Promise<AbmDatosGeneralesData> {
        const [plantas, zonas, cCostos, defaultsRows] = await Promise.all([
            this.prisma.plantas.findMany({ select: { IdPlanta: true, Descripcion: true } }),
            this.prisma.zonas.findMany({ select: { idZona: true, descripcion: true } }),
            this.prisma.cCostos.findMany({ select: { IdCencos: true, Descripcion: true } }),
            this.prisma.defaults.findMany({ select: { idcampo: true, iddefault: true } }),
        ]);

        const findDefault = (idcampo: string) =>
            defaultsRows.find((d) => d.idcampo.toLowerCase() === idcampo.toLowerCase())?.iddefault ?? null;

        return {
            plants: plantas.map((r) => ({
                key: r.IdPlanta,
                value: (r.Descripcion ?? r.IdPlanta) ?? "",
            })),
            zonas: zonas.map((r) => ({
                key: r.idZona,
                value: (r.descripcion ?? r.idZona) ?? "",
            })),
            costCenters: cCostos.map((r) => ({
                key: r.IdCencos,
                value: (r.Descripcion ?? r.IdCencos) ?? "",
            })),
            defaultPlanta: findDefault("idPlanta"),
            defaultZona: findDefault("idZona"),
            defaultCencos: findDefault("idCencos"),
        };
    }

    async getCCostosOptions(): Promise<{ key: string; value: string }[]> {
        const rows = await this.prisma.cCostos.findMany({
            select: { IdCencos: true, Descripcion: true },
            orderBy: { IdCencos: 'asc' },
        });
        return rows.map((r) => ({
            key: r.IdCencos,
            value: (r.Descripcion ?? r.IdCencos) ?? "",
        }));
    }

    /** Obtiene el próximo idCodigo desde seteos, suma 1, pad 6 chars. idSubien=000, idSubtra=0, idSufijo=0 */
    async getNextIdCodigo(): Promise<{ idCodigo: string; idSubien: string; idSubtra: string; idSufijo: string }> {
        const seteo = await this.prisma.seteos.findFirst({ select: { idcodigo: true } });
        const current = seteo?.idcodigo ? parseInt(seteo.idcodigo, 10) : 0;
        const next = isNaN(current) ? 1 : current + 1;
        const idCodigo = String(next).padStart(6, '0');
        return { idCodigo, idSubien: '000', idSubtra: '0', idSufijo: '0' };
    }

    /** Guarda bien: cabecera + distribucion + libros, actualiza seteos (salvo alta agregado) */
    async addBien(data: {
        datosGenerales: { descripcion: string; idPlanta?: string; idZona?: string; idCencos?: string };
        distribucion: { idCencos: string; porcentaje: number }[];
        cabecera: Record<string, string | number | boolean | null | undefined>;
        libros?: Record<string, Record<string, string>>;
        /** Para alta agregado: id del bien origen (idCodigo-idSubien-idSubtra-idSufijo). Se mantiene idCodigo, idSubien = max+1 */
        altaAgregadoBienId?: string;
    }): Promise<{ idCodigo: string; idSubien: string }> {
        return this.prisma.$transaction(async (tx) => {
            let idCodigo: string;
            let idSubien: string;
            const idSubtra = '0';
            const idSufijo = '0';

            if (data.altaAgregadoBienId) {
                const parts = data.altaAgregadoBienId.split('-');
                if (parts.length < 2) throw new Error('altaAgregadoBienId inválido');
                idCodigo = parts[0];
                const existing = await tx.cabecera.findMany({
                    where: { idCodigo },
                    select: { idSubien: true },
                });
                const maxSubien = existing.length
                    ? Math.max(...existing.map((r) => parseInt(r.idSubien ?? '0', 10) || 0))
                    : 0;
                idSubien = String(maxSubien + 1).padStart(3, '0');
            } else {
                const seteo = await tx.seteos.findFirst({ select: { idcodigo: true, Id: true } });
                const current = seteo?.idcodigo ? parseInt(seteo.idcodigo, 10) : 0;
                const next = isNaN(current) ? 1 : current + 1;
                idCodigo = String(next).padStart(6, '0');
                idSubien = '000';
            }

            const dg = data.datosGenerales;
            const cab = data.cabecera;

            const trim = (s: string | null | undefined, max: number): string | null => {
                if (s == null || s === '') return null;
                const t = String(s).trim();
                return t ? t.slice(0, max) : null;
            };

            const parseMmYyyy = (s: string): Date | null => {
                const m = String(s || '').match(/^(\d{1,2})[\/\-](\d{4})$/);
                if (!m) return null;
                return new Date(Number(m[2]), Number(m[1]) - 1, 1);
            };

            await tx.cabecera.create({
                data: {
                    idCodigo,
                    idSubien,
                    idSubtra,
                    idSufijo,
                    descripcion: dg.descripcion || null,
                    idPlanta: trim(dg.idPlanta, 5),
                    idZona: trim(dg.idZona, 15),
                    idCencos: trim(dg.idCencos, 5),
                    idDescripcion: trim(cab.idDescripcion as string, 6),
                    cantidad: cab.cantidad != null ? Number(cab.cantidad) : null,
                    idSituacion: trim(cab.idSituacion as string, 2),
                    idFactura: trim(cab.idFactura as string, 30),
                    idUnegocio: trim(cab.idUnegocio as string, 6),
                    identificacion: trim(cab.identificacion as string, 15),
                    idActivo: trim(cab.idActivo as string, 15),
                    trFecActivo: parseMmYyyy(String(cab.trFecActivo ?? '')) ?? null,
                    idModelo: trim(cab.idModelo as string, 5),
                    tridActivo: trim(cab.tridActivo as string, 15),
                    idOrdenCompra: trim(cab.idOrdenCompra as string, 50),
                    trFecProyecto: parseMmYyyy(String(cab.trFecProyecto ?? '')) ?? null,
                    idOrigen: trim(cab.idOrigen as string, 2),
                    idProveedor: trim(cab.idProveedor as string, 15),
                    escencial: cab.escencial === true || cab.escencial === 'true',
                    idFabricante: trim(cab.idFabricante as string, 50),
                    nuevo: cab.nuevo === true || cab.nuevo === 'true',
                    idProyecto: trim(cab.idProyecto as string, 8),
                    tridProyecto: trim(cab.tridProyecto as string, 8),
                    trFecUNegocio: parseMmYyyy(String(cab.trFecUNegocio ?? '')) ?? null,
                    tridUNegocio: trim(cab.tridUNegocio as string, 5),
                },
            });

            const distByCencos = new Map<string, number>();
            for (const d of data.distribucion) {
                const idCencos = trim(d.idCencos, 5);
                if (!idCencos) continue;
                const pct = parseFloat(String(d.porcentaje)) || 0;
                distByCencos.set(idCencos, (distByCencos.get(idCencos) ?? 0) + pct);
            }
            for (const [idCencos, porcentaje] of distByCencos) {
                await tx.distribucion.create({
                    data: {
                        idCodigo,
                        idsubien: idSubien,
                        idsubtra: idSubtra,
                        idsufijo: idSufijo,
                        idCencos,
                        porcentaje,
                    },
                });
            }

            const parseMmYyyyLibro = (s: string): Date | null => {
                const m = String(s || '').match(/^(\d{1,2})[\/\-](\d{4})$/);
                if (!m) return null;
                return new Date(Number(m[2]), Number(m[1]) - 1, 1);
            };

            const getIdMoneda = (prefijo: string): string => {
                const up = prefijo.toUpperCase();
                if (up === 'MONEDALOCAL' || prefijo.toLowerCase() === 'impuestos') return '01';
                const me = up.match(/^ME(\d+)$/);
                return me ? me[1].padStart(2, '0') : '01';
            };

            const valNum = (s: string | undefined): number | null => {
                const n = parseFloat(String(s ?? '').replace(',', '.'));
                return isNaN(n) ? null : n;
            };
            const normalizeYyyyMm = (s: string | undefined): string | null => {
                const v = String(s ?? '').trim();
                const direct = v.match(/^(\d{4})(\d{2})$/);
                if (direct) return `${direct[1]}${direct[2]}`;
                const mmYyyy = v.match(/^(\d{1,2})[\/\-](\d{4})$/);
                if (mmYyyy) return `${mmYyyy[2]}${mmYyyy[1].padStart(2, '0')}`;
                return null;
            };
            const fieldNum = (fields: Record<string, string>, key: string): number | null =>
                valNum(fields[key] ?? fields[key.toUpperCase()]);
            const subCol = (fields: Record<string, string>, key: string, fallback: number): number =>
                fieldNum(fields, key) ?? fallback;
            const libros = data.libros ?? {};
            for (const [prefijo, fields] of Object.entries(libros)) {
                if (!fields || Object.keys(fields).length === 0) continue;
                const valoriForValidation = valNum(fields['VALORI']);
                if (!(valoriForValidation != null && valoriForValidation > 0)) {
                    throw new Error(`No se puede dar de alta un bien con VALORI en 0 para ${prefijo}`);
                }
                const idActivoSource = cab.idActivo ?? fields['IDACTIVO'];
                const idActivo = trim(idActivoSource == null ? null : String(idActivoSource), 15);
                const idMoneda = (trim(fields['IDMONEDA'], 2) ?? getIdMoneda(prefijo)).slice(0, 2);
                const valori = valNum(fields['VALORI']) ?? 0;
                const row: Record<string, unknown> = {
                    idCodigo,
                    idSubien,
                    idSubtra,
                    idSufijo,
                    idActivo: idActivo || null,
                    idMoneda,
                    idTipoAmortizacion: trim(fields['IDTIPOAMORTIZACION'], 2),
                    idIndact: trim(fields['IDINDACT'], 1),
                    idCodamo: trim(fields['IDCODAMO'], 1),
                    idTipoProceso: (() => {
                        const v = String(fields['IDTIPOPROCESO'] ?? '').toLowerCase();
                        return (v === '1' || v === 'true' || v === 'si') ? '1' : '0';
                    })(),
                    Estcon: trim(fields['ESTCON'], 1),
                    FecOri: parseMmYyyyLibro(fields['FECORI'] ?? '') ?? null,
                    FecDep: parseMmYyyyLibro(fields['FECDEP'] ?? '') ?? null,
                    Fecfin: parseMmYyyyLibro(fields['FECFIN'] ?? '') ?? null,
                    vidaUtil: fieldNum(fields, 'VIDAUTIL'),
                    vidaTranscurrida: fieldNum(fields, 'VIDATRANSCURRIDA') ?? 0,
                    vidaRestante: fieldNum(fields, 'VIDARESTANTE') ?? 0,
                    indice: fieldNum(fields, 'INDICE') ?? 1,
                    FecPro: normalizeYyyyMm(fields['FECPRO']) ?? normalizeYyyyMm(fields['FECORI']) ?? null,
                    Valori: valNum(fields['VALORI']) ?? null,
                    valgra21: 0,
                    valgra105: 0,
                    valnogra: 0,
                    valiva21: 0,
                    valiva105: 0,
                    VrepoeReferencial: subCol(fields, 'VrepoeReferencial', valori),
                    AmafieReferencial: subCol(fields, 'AmafieReferencial', 0),
                    AmefieReferencial: subCol(fields, 'AmefieReferencial', 0),
                    AmpefeReferencial: subCol(fields, 'AmpefeReferencial', 0),
                    VrepoeAnterior: subCol(fields, 'VrepoeAnterior', valori),
                    AmafieAnterior: subCol(fields, 'AmafieAnterior', 0),
                    AmefieAnterior: subCol(fields, 'AmefieAnterior', 0),
                    AmpefeAnterior: subCol(fields, 'AmpefeAnterior', 0),
                    VrepoeActual: subCol(fields, 'VrepoeActual', valori),
                    AmafieActual: subCol(fields, 'AmafieActual', 0),
                    AmefieActual: subCol(fields, 'AmefieActual', 0),
                    AmpefeActual: subCol(fields, 'AmpefeActual', 0),
                    VrepoeCierreAnterior: subCol(fields, 'VrepoeCierreAnterior', 0),
                    AmafieCierreAnterior: subCol(fields, 'AmafieCierreAnterior', 0),
                    AmefieCierreAnterior: subCol(fields, 'AmefieCierreAnterior', 0),
                    AmpefeCierreAnterior: subCol(fields, 'AmpefeCierreAnterior', 0),
                };
                const modelName = this.prefijoToModel(prefijo);
                const model = this.getModelFromRecord(
                    tx as unknown as Record<string, { create: (arg: { data: Record<string, unknown> }) => Promise<unknown> }>,
                    modelName
                );
                if (model?.create) await model.create({ data: row });
            }

            if (!data.altaAgregadoBienId) {
                const seteo = await tx.seteos.findFirst({ select: { Id: true } });
                if (seteo?.Id != null) {
                    await tx.seteos.update({
                        where: { Id: seteo.Id },
                        data: { idcodigo: idCodigo },
                    });
                } else {
                    await tx.seteos.create({
                        data: { Id: 1, idcodigo: idCodigo, sonido: false },
                    });
                }
            }

            return { idCodigo, idSubien };
        }, { timeout: 30000 });
    }

    /** Resuelve el modelo desde tx/prisma usando la clave que Prisma genera (camelCase: ME01→mE01, MONEDALOCAL→mONEDALOCAL) */
    private getModelFromRecord<T>(record: Record<string, T>, modelName: string): T | undefined {
        const prismaKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        return record[modelName] ?? record[modelName.toLowerCase()] ?? record[prismaKey];
    }

    /** Prefijo ConverField -> nombre modelo Prisma (para libros) */
    private prefijoToModel(prefijo: string): string {
        const p = prefijo.toLowerCase();
        if (p === 'monedalocal') return 'MONEDALOCAL';
        if (p === 'impuestos') return 'impuestos';
        const impu = p.match(/^impu(\d+)$/);
        if (impu) return `impu${impu[1]}`;
        const me = p.match(/^me(\d+)$/);
        if (me) return `ME${me[1]}`; // Preservar "01","02" etc (no usar parseInt: "01"→1→"ME1" no existe)
        const mol = p.match(/^mol(\d+)$/);
        if (mol) return `MOLO${mol[1].padStart(2, '0')}`;
        return prefijo;
    }

    /** Convierte un registro a objeto plano; fechas a ISO string */
    private toPlainRow(row: Record<string, unknown>): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
            out[k] = v instanceof Date ? v.toISOString() : v;
        }
        return out;
    }

    /** Sufijo de columna (minúsculas) → campo cabecera Prisma */
    private simulacionSuffixToCabeceraField(suffixLower: string): string | null {
        const m: Record<string, string> = {
            descripcion: 'descripcion',
            idplanta: 'idPlanta',
            idzona: 'idZona',
            idcencos: 'idCencos',
            iddescripcion: 'idDescripcion',
            idunegocio: 'idUnegocio',
            cantidad: 'cantidad',
            idactivo: 'idActivo',
            idsituacion: 'idSituacion',
            idfactura: 'idFactura',
            identificacion: 'identificacion',
            idmodelo: 'idModelo',
            idorigen: 'idOrigen',
            idproveedor: 'idProveedor',
            idfabricante: 'idFabricante',
            idproyecto: 'idProyecto',
            idordencompra: 'idOrdenCompra',
            trfecactivo: 'trFecActivo',
            tridactivo: 'tridActivo',
            trfecproyecto: 'trFecProyecto',
            tridproyecto: 'tridProyecto',
            trfecunegocio: 'trFecUNegocio',
            tridunegocio: 'tridUNegocio',
            escencial: 'escencial',
            nuevo: 'nuevo',
        };
        return m[suffixLower] ?? null;
    }

    /**
     * Vista simulación: columnas de dbo.simulacion (cabecera.*, me03.*, Expr*, etc.) → shape del ABM.
     * Prioriza siempre valores no vacíos de la vista sobre cabecera/ME en `out` (la grilla y la vista suelen ser la fuente de verdad).
     */
    private hydrateFromSimulacionVistaRow(out: Record<string, unknown>, simRow: Record<string, unknown>): void {
        const plain = this.toPlainRow(simRow);
        const usable = (val: unknown): boolean => {
            if (val == null) return false;
            if (typeof val === 'number') return !Number.isNaN(val);
            if (typeof val === 'string') return val.trim() !== '';
            return true;
        };
        /** Sobrescribe si `val` aporta dato útil */
        const setPrefer = (field: string, val: unknown) => {
            if (!usable(val)) return;
            out[field] = val;
        };
        for (const [rawK, v] of Object.entries(plain)) {
            if (!usable(v)) continue;
            const k = rawK.replace(/^\[+|\]+$/g, '').trim();
            setPrefer(k, v);

            const lastDot = k.lastIndexOf('.');
            if (lastDot >= 0) {
                const prefix = k.slice(0, lastDot);
                const rest = k.slice(lastDot + 1);
                const restLower = rest.toLowerCase();
                const mePart = prefix.match(/^me0?(\d+)$/i);
                if (mePart) {
                    const n = mePart[1].padStart(2, '0');
                    const prefijo = `ME${n}`;
                    setPrefer(`${prefijo}.${rest}`, v);
                    setPrefer(`${prefix.toLowerCase()}.${rest}`, v);
                } else {
                    const mapped = this.simulacionSuffixToCabeceraField(restLower);
                    if (mapped) setPrefer(mapped, v);
                    setPrefer(rest, v);
                }
            }

            const lastUs = k.lastIndexOf('_');
            if (lastUs >= 0 && !k.includes('.')) {
                const tail = k.slice(lastUs + 1).toLowerCase();
                const mapped = this.simulacionSuffixToCabeceraField(tail);
                if (mapped) setPrefer(mapped, v);
            }
        }

        /* Pasada por clave normalizada: SQL/vistas con distinto casing o alias */
        for (const [rawK, v] of Object.entries(plain)) {
            if (!usable(v)) continue;
            const kl = rawK.replace(/^\[+|\]+$/g, '').trim().toLowerCase();
            if ((kl === 'descripcion' || kl.endsWith('.descripcion') || /(^|[._])descripcion$/.test(kl)) && !kl.includes('iddescripcion')) {
                setPrefer('descripcion', v);
            }
            if (kl === 'valori' || kl.endsWith('.valori') || /(^|[._])valori$/.test(kl)) {
                setPrefer('Valori', v);
                setPrefer('VALORI', v);
                setPrefer('ME03.Valori', v);
                setPrefer('me03.Valori', v);
                setPrefer('me03.valori', v);
            }
        }
    }

    /** Obtiene un bien por id desde cabecera, distribucion y tablas de libros */
    async getBienById(bienId: string, options?: { simulationOnly?: boolean }): Promise<{ [key: string]: unknown } | null> {
        const simulationOnly = options?.simulationOnly ?? false;
        const parts = bienId.split('-');
        if (parts.length < 4) return null;
        const [idCodigo, idSubien = '000', idSubtra = '0', idSufijo = '0'] = parts;
        const sidSubien = idSubien.padStart(3, '0');
        const whereCab = { idCodigo, idSubien: sidSubien, idSubtra, idSufijo };

        const simRowsPromise = simulationOnly
            ? this.prisma.$queryRaw<Record<string, unknown>[]>`
                SELECT * FROM dbo.simulacion
                WHERE idCodigo = ${idCodigo} AND idSubien = ${sidSubien} AND idSubtra = ${idSubtra} AND idSufijo = ${idSufijo}
            `
            : Promise.resolve([] as Record<string, unknown>[]);

        const cabeceraPromise: Promise<Record<string, unknown> | null> = simulationOnly
            ? this.prisma.$queryRaw<Record<string, unknown>[]>`
                SELECT TOP 1 * FROM dbo.cabesimu
                WHERE idCodigo = ${idCodigo} AND idSubien = ${sidSubien} AND idSubtra = ${idSubtra} AND idSufijo = ${idSufijo}
            `.then((rows) => rows[0] ?? null)
            : this.prisma.cabecera.findUnique({
                where: { idCodigo_idSubien_idSubtra_idSufijo: whereCab },
            }).then((row) => row as unknown as Record<string, unknown> | null);

        const [cabecera, simRows] = await Promise.all([
            cabeceraPromise,
            simRowsPromise,
        ]);
        const simRow = simRows[0];

        if (!cabecera) {
            if (!simulationOnly || !simRow) return null;
            const out: Record<string, unknown> = {
                idCodigo,
                idSubien: sidSubien,
                idSubtra,
                idSufijo,
            };
            this.hydrateFromSimulacionVistaRow(out, simRow as Record<string, unknown>);
            const distribucion = await this.prisma.distribucion.findMany({
                where: { idCodigo, idsubien: sidSubien, idsubtra: idSubtra, idsufijo: idSufijo },
                select: { idCencos: true, porcentaje: true },
            });
            out._distribucion = distribucion;
            const converFields = await this.prisma.converField.findMany({
                where: {
                    IdTabla: 'simulacion',
                    NOT: { IdCampo: { startsWith: 'cabecera.' } },
                },
                select: { IdCampo: true },
            });
            let prefixes = [...new Set(converFields.map((f) => {
                const idx = f.IdCampo.indexOf('.');
                return idx >= 0 ? f.IdCampo.substring(0, idx) : null;
            }).filter(Boolean))] as string[];
            if (!prefixes.some((p) => /^me03$/i.test(p))) prefixes = [...prefixes, 'ME03'];
            const idActivo = (out.idActivo as string | null | undefined) ?? null;
            for (const prefijo of prefixes) {
                const modelName = this.prefijoToModel(prefijo);
                const model = this.getModelFromRecord(this.prisma as unknown as Record<string, { findMany: (arg: { where: object }) => Promise<unknown[]> }>, modelName);
                if (!model?.findMany) continue;
                const needsIdActivoInWhere = /^impu/i.test(prefijo);
                const where: Record<string, unknown> = { idCodigo, idSubien: sidSubien, idSubtra, idSufijo };
                if (needsIdActivoInWhere && idActivo) (where as Record<string, unknown>).idActivo = idActivo;
                const rows = await model.findMany({ where });
                const row = rows[0] as Record<string, unknown> | undefined;
                if (row) {
                    const plain = this.toPlainRow(row);
                    for (const [k, v] of Object.entries(plain)) {
                        if (k === 'idCodigo' || k === 'idSubien' || k === 'idSubtra' || k === 'idSufijo') continue;
                        out[`${prefijo}.${k}`] = v;
                        out[`${prefijo.toLowerCase()}.${k}`] = v;
                    }
                }
            }
            if (simulationOnly && simRow && typeof simRow === 'object') {
                this.hydrateFromSimulacionVistaRow(out, simRow as Record<string, unknown>);
            }
            return out;
        }

        const out: Record<string, unknown> = this.toPlainRow(cabecera as Record<string, unknown>);

        const distribucion = await this.prisma.distribucion.findMany({
            where: { idCodigo, idsubien: sidSubien, idsubtra: idSubtra, idsufijo: idSufijo },
            select: { idCencos: true, porcentaje: true },
        });
        out._distribucion = distribucion;

        if (simulationOnly && simRow && typeof simRow === 'object') {
            this.hydrateFromSimulacionVistaRow(out, simRow as Record<string, unknown>);
        }

        const converFields = await this.prisma.converField.findMany({
            where: simulationOnly
                ? { IdTabla: 'simulacion', NOT: { IdCampo: { startsWith: 'cabecera.' } } }
                : { IdTabla: 'actifijo', NOT: { IdCampo: { startsWith: 'cabecera.' } } },
            select: { IdCampo: true },
        });
        let prefixes = [...new Set(converFields.map((f) => {
            const idx = f.IdCampo.indexOf('.');
            return idx >= 0 ? f.IdCampo.substring(0, idx) : null;
        }).filter(Boolean))] as string[];
        if (simulationOnly && !prefixes.some((p) => /^me03$/i.test(p))) {
            prefixes = [...prefixes, 'ME03'];
        }

        const idActivo = (cabecera.idActivo as string | null | undefined) ?? (out.idActivo as string | null | undefined) ?? null;
        for (const prefijo of prefixes) {
            const modelName = this.prefijoToModel(prefijo);
            const model = this.getModelFromRecord(this.prisma as unknown as Record<string, { findMany: (arg: { where: object }) => Promise<unknown[]> }>, modelName);
            if (!model?.findMany) continue;
            /** Solo impu* incluye idActivo en la PK; en ME* filtrar por idActivo puede ocultar la única fila del libro. */
            const needsIdActivoInWhere = /^impu/i.test(prefijo);
            const where: Record<string, unknown> = { idCodigo, idSubien: sidSubien, idSubtra, idSufijo };
            if (needsIdActivoInWhere && idActivo) (where as Record<string, unknown>).idActivo = idActivo;
            const rows = await model.findMany({ where });
            const row = rows[0] as Record<string, unknown> | undefined;
            if (row) {
                const plain = this.toPlainRow(row);
                for (const [k, v] of Object.entries(plain)) {
                    if (k === 'idCodigo' || k === 'idSubien' || k === 'idSubtra' || k === 'idSufijo') continue;
                    out[`${prefijo}.${k}`] = v;
                    out[`${prefijo.toLowerCase()}.${k}`] = v;
                }
            }
        }

        if (simulationOnly && simRow && typeof simRow === 'object') {
            this.hydrateFromSimulacionVistaRow(out, simRow as Record<string, unknown>);
        }

        return out;
    }

    /** Actualiza un bien existente (cabecera, distribucion, libros) */
    async updateBien(
        bienId: string,
        data: {
            datosGenerales: { descripcion: string; idPlanta?: string; idZona?: string; idCencos?: string };
            distribucion: { idCencos: string; porcentaje: number }[];
            cabecera: Record<string, string | number | boolean | null | undefined>;
            libros?: Record<string, Record<string, string>>;
        }
    ): Promise<{ ok: boolean }> {
        const parts = bienId.split('-');
        if (parts.length < 4) throw new Error('bienId inválido');
        const [idCodigo, idSubien = '000', idSubtra = '0', idSufijo = '0'] = parts;
        const sidSubien = idSubien.padStart(3, '0');

        return this.prisma.$transaction(async (tx) => {
            const trim = (s: string | null | undefined, max: number): string | null => {
                if (s == null || s === '') return null;
                const t = String(s).trim();
                return t ? t.slice(0, max) : null;
            };
            const parseMmYyyy = (s: string): Date | null => {
                const m = String(s || '').match(/^(\d{1,2})[\/\-](\d{4})$/);
                if (!m) return null;
                return new Date(Number(m[2]), Number(m[1]) - 1, 1);
            };

            const dg = data.datosGenerales;
            const cab = data.cabecera;

            await tx.cabecera.update({
                where: {
                    idCodigo_idSubien_idSubtra_idSufijo: { idCodigo, idSubien: sidSubien, idSubtra, idSufijo },
                },
                data: {
                    descripcion: dg.descripcion || null,
                    idPlanta: trim(dg.idPlanta, 5),
                    idZona: trim(dg.idZona, 15),
                    idCencos: trim(dg.idCencos, 5),
                    idDescripcion: trim(cab.idDescripcion as string, 6),
                    cantidad: cab.cantidad != null ? Number(cab.cantidad) : null,
                    idSituacion: trim(cab.idSituacion as string, 2),
                    idFactura: trim(cab.idFactura as string, 30),
                    idUnegocio: trim(cab.idUnegocio as string, 6),
                    identificacion: trim(cab.identificacion as string, 15),
                    idActivo: trim(cab.idActivo as string, 15),
                    trFecActivo: parseMmYyyy(String(cab.trFecActivo ?? '')) ?? null,
                    idModelo: trim(cab.idModelo as string, 5),
                    tridActivo: trim(cab.tridActivo as string, 15),
                    idOrdenCompra: trim(cab.idOrdenCompra as string, 50),
                    trFecProyecto: parseMmYyyy(String(cab.trFecProyecto ?? '')) ?? null,
                    idOrigen: trim(cab.idOrigen as string, 2),
                    idProveedor: trim(cab.idProveedor as string, 15),
                    escencial: cab.escencial === true || cab.escencial === 'true',
                    idFabricante: trim(cab.idFabricante as string, 50),
                    nuevo: cab.nuevo === true || cab.nuevo === 'true',
                    idProyecto: trim(cab.idProyecto as string, 8),
                    tridProyecto: trim(cab.tridProyecto as string, 8),
                    trFecUNegocio: parseMmYyyy(String(cab.trFecUNegocio ?? '')) ?? null,
                    tridUNegocio: trim(cab.tridUNegocio as string, 5),
                },
            });

            await tx.distribucion.deleteMany({
                where: { idCodigo, idsubien: sidSubien, idsubtra: idSubtra, idsufijo: idSufijo },
            });
            for (const d of data.distribucion) {
                const idCencos = trim(d.idCencos, 5);
                if (!idCencos) continue;
                await tx.distribucion.create({
                    data: {
                        idCodigo,
                        idsubien: sidSubien,
                        idsubtra: idSubtra,
                        idsufijo: idSufijo,
                        idCencos,
                        porcentaje: parseFloat(String(d.porcentaje)) || 0,
                    },
                });
            }

            const parseMmYyyyLibro = (s: string): Date | null => {
                const m = String(s || '').match(/^(\d{1,2})[\/\-](\d{4})$/);
                if (!m) return null;
                return new Date(Number(m[2]), Number(m[1]) - 1, 1);
            };
            const getIdMoneda = (prefijo: string): string => {
                const up = prefijo.toUpperCase();
                if (up === 'MONEDALOCAL' || prefijo.toLowerCase() === 'impuestos') return '01';
                const me = up.match(/^ME(\d+)$/);
                return me ? me[1].padStart(2, '0') : '01';
            };

            const valNumUpdate = (s: string | undefined): number | null => {
                const n = parseFloat(String(s ?? '').replace(',', '.'));
                return isNaN(n) ? null : n;
            };
            const normalizeYyyyMmUpdate = (s: string | undefined): string | null => {
                const v = String(s ?? '').trim();
                const direct = v.match(/^(\d{4})(\d{2})$/);
                if (direct) return `${direct[1]}${direct[2]}`;
                const mmYyyy = v.match(/^(\d{1,2})[\/\-](\d{4})$/);
                if (mmYyyy) return `${mmYyyy[2]}${mmYyyy[1].padStart(2, '0')}`;
                return null;
            };
            const fieldNumUpdate = (fields: Record<string, string>, key: string): number | null =>
                valNumUpdate(fields[key] ?? fields[key.toUpperCase()]);
            const subColUpdate = (fields: Record<string, string>, key: string, fallback: number): number =>
                fieldNumUpdate(fields, key) ?? fallback;
            const libros = data.libros ?? {};
            for (const [prefijo, fields] of Object.entries(libros)) {
                if (!fields || Object.keys(fields).length === 0) continue;
                const idActivoSource = cab.idActivo ?? fields['IDACTIVO'];
                const idActivo = trim(idActivoSource == null ? null : String(idActivoSource), 15);
                const idMoneda = (trim(fields['IDMONEDA'], 2) ?? getIdMoneda(prefijo)).slice(0, 2);
                const valori = valNumUpdate(fields['VALORI']) ?? 0;
                const subAccordionCols = {
                    VrepoeReferencial: subColUpdate(fields, 'VrepoeReferencial', valori),
                    AmafieReferencial: subColUpdate(fields, 'AmafieReferencial', 0),
                    AmefieReferencial: subColUpdate(fields, 'AmefieReferencial', 0),
                    AmpefeReferencial: subColUpdate(fields, 'AmpefeReferencial', 0),
                    VrepoeAnterior: subColUpdate(fields, 'VrepoeAnterior', valori),
                    AmafieAnterior: subColUpdate(fields, 'AmafieAnterior', 0),
                    AmefieAnterior: subColUpdate(fields, 'AmefieAnterior', 0),
                    AmpefeAnterior: subColUpdate(fields, 'AmpefeAnterior', 0),
                    VrepoeActual: subColUpdate(fields, 'VrepoeActual', valori),
                    AmafieActual: subColUpdate(fields, 'AmafieActual', 0),
                    AmefieActual: subColUpdate(fields, 'AmefieActual', 0),
                    AmpefeActual: subColUpdate(fields, 'AmpefeActual', 0),
                    VrepoeCierreAnterior: subColUpdate(fields, 'VrepoeCierreAnterior', 0),
                    AmafieCierreAnterior: subColUpdate(fields, 'AmafieCierreAnterior', 0),
                    AmefieCierreAnterior: subColUpdate(fields, 'AmefieCierreAnterior', 0),
                    AmpefeCierreAnterior: subColUpdate(fields, 'AmpefeCierreAnterior', 0),
                };
                const rowData: Record<string, unknown> = {
                    idCodigo,
                    idSubien: sidSubien,
                    idSubtra,
                    idSufijo,
                    idActivo: idActivo || null,
                    idMoneda,
                    idTipoAmortizacion: trim(fields['IDTIPOAMORTIZACION'], 2),
                    idIndact: trim(fields['IDINDACT'], 1),
                    idCodamo: trim(fields['IDCODAMO'], 1),
                    idTipoProceso: (() => {
                        const v = String(fields['IDTIPOPROCESO'] ?? '').toLowerCase();
                        return (v === '1' || v === 'true' || v === 'si') ? '1' : '0';
                    })(),
                    Estcon: trim(fields['ESTCON'], 1),
                    FecOri: parseMmYyyyLibro(fields['FECORI'] ?? '') ?? null,
                    FecDep: parseMmYyyyLibro(fields['FECDEP'] ?? '') ?? null,
                    Fecfin: parseMmYyyyLibro(fields['FECFIN'] ?? '') ?? null,
                    vidaUtil: fieldNumUpdate(fields, 'VIDAUTIL'),
                    vidaTranscurrida: fieldNumUpdate(fields, 'VIDATRANSCURRIDA') ?? 0,
                    vidaRestante: fieldNumUpdate(fields, 'VIDARESTANTE') ?? 0,
                    indice: fieldNumUpdate(fields, 'INDICE') ?? 1,
                    FecPro: normalizeYyyyMmUpdate(fields['FECPRO']) ?? normalizeYyyyMmUpdate(fields['FECORI']) ?? null,
                    Valori: valNumUpdate(fields['VALORI']) ?? null,
                    valgra21: 0,
                    valgra105: 0,
                    valnogra: 0,
                    valiva21: 0,
                    valiva105: 0,
                    ...subAccordionCols,
                };
                const modelName = this.prefijoToModel(prefijo);
                const model = this.getModelFromRecord(
                    tx as unknown as Record<string, { updateMany: (arg: { where: object; data: object }) => Promise<{ count: number }>; create: (arg: { data: object }) => Promise<unknown> }>,
                    modelName
                );
                if (!model) continue;
                const hasIdActivoInPk = /^impu|^me\d/i.test(prefijo);
                const where: Record<string, unknown> = { idCodigo, idSubien: sidSubien, idSubtra, idSufijo };
                if (hasIdActivoInPk && idActivo) (where as Record<string, unknown>).idActivo = idActivo;
                const updateData = { ...rowData };
                delete (updateData as Record<string, unknown>).idCodigo;
                delete (updateData as Record<string, unknown>).idSubien;
                delete (updateData as Record<string, unknown>).idSubtra;
                delete (updateData as Record<string, unknown>).idSufijo;
                if (hasIdActivoInPk) delete (updateData as Record<string, unknown>).idActivo;
                const result = await model.updateMany({ where, data: updateData });
                if (result.count === 0 && model.create) {
                    await model.create({ data: rowData });
                }
            }

            return { ok: true };
        }, { timeout: 30000 });
    }

    /** Campos de valor de libros a los que se aplica el porcentaje (60% / 40%). Solo valores contables, no vidaUtil, etc. */
    private static LIBRO_VALUE_FIELDS = [
        'Valori',
        'VrepoeReferencial', 'AmafieReferencial', 'AmefieReferencial', 'AmpefeReferencial',
        'VrepoeAnterior', 'AmafieAnterior', 'AmefieAnterior', 'AmpefeAnterior',
        'VrepoeActual', 'AmafieActual', 'AmefieActual', 'AmpefeActual',
        'VrepoeCierreAnterior', 'AmafieCierreAnterior', 'AmefieCierreAnterior', 'AmpefeCierreAnterior',
    ] as const;

    /** Baja bienes: retira total o parcialmente los bienes seleccionados */
    async bajaBienes(params: {
        selectedAssets: FixedAssets[];
        fechaBaja: string;
        tipoBaja: string;
        precioVenta: string;
        porcentajeBaja: string;
    }): Promise<{ ok: boolean }> {
        const { selectedAssets, fechaBaja, tipoBaja, precioVenta, porcentajeBaja } = params;
        if (!selectedAssets || selectedAssets.length === 0) {
            throw new Error('No hay bienes seleccionados');
        }
        const pct = parseFloat(porcentajeBaja.replace(',', '.')) || 100;
        const precioNum = parseFloat(precioVenta.replace(',', '.')) || 0;

        const parseMmYyyy = (s: string): Date | null => {
            const m = String(s || '').match(/^(\d{1,2})[\/\-](\d{4})$/);
            if (!m) return null;
            return new Date(Number(m[2]), Number(m[1]) - 1, 1);
        };
        const fecBajDate = parseMmYyyy(fechaBaja);
        if (!fecBajDate) throw new Error('Fecha de baja inválida. Use formato MM/YYYY.');
        const tipoBajaVal = tipoBaja.trim() || null;

        const getBienId = (row: FixedAssets): string => {
            const r = row as Record<string, unknown>;
            const getVal = (key: string) => {
                let v = r[key] ?? r[key.toLowerCase()];
                if (v == null || v === '') v = r[`cabecera.${key}`] ?? r[`cabecera.${key.toLowerCase()}`];
                return String(v ?? '').trim();
            };
            const parts = ['idCodigo', 'idSubien', 'idSubtra', 'idSufijo'].map(getVal);
            return parts.join('-');
        };

        const hasFecBaj = (row: FixedAssets): boolean => {
            const r = row as Record<string, unknown>;
            const keys = ['monedalocal.FecBaj', 'me01.FecBaj', 'me01.fecbaj', 'impuestos.FecBaj', 'FecBaj', 'fecbaj'];
            for (const k of keys) {
                const v = r[k];
                if (v != null && v !== '') return true;
            }
            const fecbajKey = Object.keys(r).find((k) => k.toLowerCase().includes('fecbaj'));
            if (fecbajKey != null) {
                const v = r[fecbajKey];
                if (v != null && v !== '') return true;
            }
            return false;
        };

        return this.prisma.$transaction(async (tx) => {
            const converFields = await tx.converField.findMany({
                where: { IdTabla: 'actifijo', NOT: { IdCampo: { startsWith: 'cabecera.' } } },
                select: { IdCampo: true },
            });
            const prefixesFromConver = [...new Set(converFields.map((f) => {
                const idx = f.IdCampo.indexOf('.');
                return idx >= 0 ? f.IdCampo.substring(0, idx) : null;
            }).filter(Boolean))] as string[];
            const prefixes = [...new Set([...prefixesFromConver, 'ME01', 'ME02'])];

            for (const asset of selectedAssets) {
                if (hasFecBaj(asset)) continue;
                const bienId = getBienId(asset);
                const parts = bienId.split('-');
                if (parts.length < 4) continue;
                const [idCodigo, idSubien = '000', idSubtra = '0', idSufijo = '0'] = parts;
                const sidSubien = idSubien.padStart(3, '0');

                if (pct >= 100) {
                    const updateData = { FecBaj: fecBajDate, TipoBaja: tipoBajaVal, precioVenta: precioNum };
                    const where = { idCodigo, idSubien: sidSubien, idSubtra, idSufijo };
                    for (const prefijo of prefixes) {
                        const modelName = this.prefijoToModel(prefijo);
                        const txRecord = tx as unknown as Record<string, { updateMany?: (arg: { where: object; data: object }) => Promise<{ count: number }> }>;
                        const model = this.getModelFromRecord(txRecord, modelName);
                        if (!model?.updateMany) continue;
                        await model.updateMany({ where, data: updateData });
                    }
                } else {
                    const factorBaja = pct / 100;
                    const factorResto = 1 - factorBaja;

                    /** Guardar filas ORIGINALES por prefijo (para crear el bien nuevo con el % de baja) */
                    const originalRowsByPrefix = new Map<string, Record<string, unknown>[]>();

                    for (const prefijo of prefixes) {
                        const modelName = this.prefijoToModel(prefijo);
                        const model = this.getModelFromRecord(tx as unknown as Record<string, {
                            findMany: (arg: { where: object }) => Promise<unknown[]>;
                            updateMany: (arg: { where: object; data: object }) => Promise<{ count: number }>;
                            create: (arg: { data: object }) => Promise<unknown>;
                        }>, modelName);
                        if (!model?.findMany || !model?.updateMany) continue;
                        const where: Record<string, unknown> = { idCodigo, idSubien: sidSubien, idSubtra, idSufijo };
                        const rows = await model.findMany({ where }) as Record<string, unknown>[];
                        if (rows.length === 0) continue;

                        originalRowsByPrefix.set(prefijo, rows);

                        // Bien original: se queda con el % que NO se da de baja (factorResto); sin FecBaj/TipoBaja/precioVenta
                        const updateData: Record<string, unknown> = {};
                        for (const f of FixedAsset.LIBRO_VALUE_FIELDS) {
                            const v = rows[0][f] ?? rows[0][f.toLowerCase()];
                            if (typeof v === 'number' && !isNaN(v)) {
                                updateData[f] = Math.round(v * factorResto * 1e6) / 1e6;
                            }
                        }
                        await model.updateMany({ where, data: updateData });
                    }

                    const cabecera = await tx.cabecera.findUnique({
                        where: { idCodigo_idSubien_idSubtra_idSufijo: { idCodigo, idSubien: sidSubien, idSubtra, idSufijo } },
                    });
                    if (!cabecera) continue;

                    const maxSufijo = await tx.cabecera.findMany({
                        where: { idCodigo, idSubien: sidSubien, idSubtra },
                        select: { idSufijo: true },
                    });
                    const maxVal = maxSufijo.reduce((m, r) => Math.max(m, parseInt(String(r.idSufijo ?? '0'), 10) || 0), 0);
                    const newSufijo = String(maxVal + 1);

                    const cabData = cabecera as unknown as Record<string, unknown>;
                    const { idCodigo: _, idSubien: __, idSubtra: ___, idSufijo: ____, ...cabRest } = cabData;
                    await tx.cabecera.create({
                        data: { ...cabRest, idCodigo, idSubien: sidSubien, idSubtra, idSufijo: newSufijo } as Parameters<typeof tx.cabecera.create>[0]['data'],
                    });

                    const distribucion = await tx.distribucion.findMany({
                        where: { idCodigo, idsubien: sidSubien, idsubtra: idSubtra, idsufijo: idSufijo },
                    });
                    for (const d of distribucion) {
                        await tx.distribucion.create({
                            data: {
                                idCodigo,
                                idsubien: sidSubien,
                                idsubtra: idSubtra,
                                idsufijo: newSufijo,
                                idCencos: d.idCencos,
                                porcentaje: d.porcentaje,
                            },
                        });
                    }

                    for (const prefijo of prefixes) {
                        const modelName = this.prefijoToModel(prefijo);
                        const model = this.getModelFromRecord(tx as unknown as Record<string, {
                            findMany: (arg: { where: object }) => Promise<unknown[]>;
                            create: (arg: { data: object }) => Promise<unknown>;
                        }>, modelName);
                        if (!model?.create) continue;
                        const rows = originalRowsByPrefix.get(prefijo);
                        if (!rows || rows.length === 0) continue;
                        for (const row of rows) {
                            const newRow: Record<string, unknown> = {};
                            for (const [k, v] of Object.entries(row)) {
                                if (['idCodigo', 'idSubien', 'idSubtra', 'idSufijo'].includes(k)) continue;
                                if (k === 'idSufijo') {
                                    newRow.idSufijo = newSufijo;
                                    continue;
                                }
                                if (k === 'FecBaj') {
                                    newRow[k] = fecBajDate;
                                    continue;
                                }
                                if (k === 'TipoBaja') {
                                    newRow[k] = tipoBajaVal;
                                    continue;
                                }
                                if (k === 'precioVenta') {
                                    newRow[k] = precioNum;
                                    continue;
                                }
                                if (FixedAsset.LIBRO_VALUE_FIELDS.includes(k as typeof FixedAsset.LIBRO_VALUE_FIELDS[number])) {
                                    const num = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
                                    newRow[k] = isNaN(num) ? v : Math.round(num * factorBaja * 1e6) / 1e6;
                                } else {
                                    newRow[k] = v;
                                }
                            }
                            newRow.idCodigo = idCodigo;
                            newRow.idSubien = sidSubien;
                            newRow.idSubtra = idSubtra;
                            newRow.idSufijo = newSufijo;
                            await model.create({ data: newRow });
                        }
                    }
                }
            }
            return { ok: true };
        }, { timeout: 60000 });
    }

    /** Transferencia de bienes: actualiza cuenta (idActivo) y aplica porcentaje en valores de libros */
    async transferBienes(params: {
        selectedAssets: FixedAssets[];
        fechaTransferencia: string;
        cuentaDestino: string;
        porcentajeTransferencia: string;
    }): Promise<{ ok: boolean }> {
        const { selectedAssets, fechaTransferencia, cuentaDestino, porcentajeTransferencia } = params;
        if (!selectedAssets || selectedAssets.length === 0) {
            throw new Error('No hay bienes seleccionados');
        }
        const cuentaDestinoVal = String(cuentaDestino ?? '').trim();
        if (!cuentaDestinoVal) throw new Error('Cuenta destino requerida');
        const pct = parseFloat(porcentajeTransferencia.replace(',', '.')) || 100;

        const parseMmYyyy = (s: string): Date | null => {
            const m = String(s || '').match(/^(\d{1,2})[\/\-](\d{4})$/);
            if (!m) return null;
            return new Date(Number(m[2]), Number(m[1]) - 1, 1);
        };
        const trFecActivoDate = parseMmYyyy(fechaTransferencia);
        if (!trFecActivoDate) throw new Error('Fecha de transferencia inválida. Use formato MM/YYYY.');

        const getBienId = (row: FixedAssets): string => {
            const r = row as Record<string, unknown>;
            const getVal = (key: string) => {
                let v = r[key] ?? r[key.toLowerCase()];
                if (v == null || v === '') v = r[`cabecera.${key}`] ?? r[`cabecera.${key.toLowerCase()}`];
                return String(v ?? '').trim();
            };
            const parts = ['idCodigo', 'idSubien', 'idSubtra', 'idSufijo'].map(getVal);
            return parts.join('-');
        };

        return this.prisma.$transaction(async (tx) => {
            const converFields = await tx.converField.findMany({
                where: { IdTabla: 'actifijo', NOT: { IdCampo: { startsWith: 'cabecera.' } } },
                select: { IdCampo: true },
            });
            const prefixesFromConver = [...new Set(converFields.map((f) => {
                const idx = f.IdCampo.indexOf('.');
                return idx >= 0 ? f.IdCampo.substring(0, idx) : null;
            }).filter(Boolean))] as string[];
            const prefixes = [...new Set([...prefixesFromConver, 'ME01', 'ME02'])];

            for (const asset of selectedAssets) {
                const bienId = getBienId(asset);
                const parts = bienId.split('-');
                if (parts.length < 4) continue;
                const [idCodigo, idSubien = '000', idSubtra = '0', idSufijo = '0'] = parts;
                const sidSubien = idSubien.padStart(3, '0');
                const where = { idCodigo, idSubien: sidSubien, idSubtra, idSufijo };

                const cabecera = await tx.cabecera.findUnique({
                    where: { idCodigo_idSubien_idSubtra_idSufijo: { idCodigo, idSubien: sidSubien, idSubtra, idSufijo } },
                });
                if (!cabecera) continue;
                const idActivoOriginal = (cabecera.idActivo ?? '').trim();

                if (pct >= 100) {
                    await tx.cabecera.updateMany({
                        where,
                        data: {
                            tridActivo: idActivoOriginal || null,
                            idActivo: cuentaDestinoVal,
                            trFecActivo: trFecActivoDate,
                        },
                    });
                    const updateData = { idActivo: cuentaDestinoVal };
                    for (const prefijo of prefixes) {
                        const modelName = this.prefijoToModel(prefijo);
                        const txRecord = tx as unknown as Record<string, { updateMany?: (arg: { where: object; data: object }) => Promise<{ count: number }> }>;
                        const model = this.getModelFromRecord(txRecord, modelName);
                        if (!model?.updateMany) continue;
                        const modelWhere = { ...where } as Record<string, unknown>;
                        const hasIdActivo = /^impu|^me\d/i.test(prefijo);
                        if (hasIdActivo && idActivoOriginal) (modelWhere as Record<string, unknown>).idActivo = idActivoOriginal;
                        await model.updateMany({ where: modelWhere, data: updateData });
                    }
                } else {
                    const factorTransfer = pct / 100;
                    const factorResto = 1 - factorTransfer;

                    const originalRowsByPrefix = new Map<string, Record<string, unknown>[]>();
                    for (const prefijo of prefixes) {
                        const modelName = this.prefijoToModel(prefijo);
                        const model = this.getModelFromRecord(tx as unknown as Record<string, {
                            findMany: (arg: { where: object }) => Promise<unknown[]>;
                            updateMany: (arg: { where: object; data: object }) => Promise<{ count: number }>;
                            create: (arg: { data: object }) => Promise<unknown>;
                        }>, modelName);
                        if (!model?.findMany || !model?.updateMany) continue;
                        const modelWhere: Record<string, unknown> = { ...where };
                        const hasIdActivo = /^impu|^me\d/i.test(prefijo);
                        if (hasIdActivo && idActivoOriginal) modelWhere.idActivo = idActivoOriginal;
                        const rows = await model.findMany({ where: modelWhere }) as Record<string, unknown>[];
                        if (rows.length === 0) continue;

                        originalRowsByPrefix.set(prefijo, rows);

                        const updateData: Record<string, unknown> = {};
                        for (const f of FixedAsset.LIBRO_VALUE_FIELDS) {
                            const v = rows[0][f] ?? rows[0][f.toLowerCase()];
                            if (typeof v === 'number' && !isNaN(v)) {
                                (updateData as Record<string, unknown>)[f] = Math.round(v * factorResto * 1e6) / 1e6;
                            }
                        }
                        await model.updateMany({ where: modelWhere, data: updateData });
                    }

                    await tx.cabecera.updateMany({
                        where,
                        data: {
                            tridActivo: null,
                            trFecActivo: null,
                        },
                    });

                    const maxSubtra = await tx.cabecera.findMany({
                        where: { idCodigo, idSubien: sidSubien, idSufijo },
                        select: { idSubtra: true },
                    });
                    const maxVal = maxSubtra.reduce((m, r) => Math.max(m, parseInt(String(r.idSubtra ?? '0'), 10) || 0), 0);
                    const newIdSubtra = String(maxVal + 1);

                    const cabData = cabecera as unknown as Record<string, unknown>;
                    const { idCodigo: _1, idSubien: _2, idSubtra: _3, idSufijo: _4, ...cabRest } = cabData;
                    await tx.cabecera.create({
                        data: {
                            ...cabRest,
                            idCodigo,
                            idSubien: sidSubien,
                            idSubtra: newIdSubtra,
                            idSufijo,
                            idActivo: cuentaDestinoVal,
                            tridActivo: idActivoOriginal || null,
                            trFecActivo: trFecActivoDate,
                        } as Parameters<typeof tx.cabecera.create>[0]['data'],
                    });

                    const distribucion = await tx.distribucion.findMany({
                        where: { idCodigo, idsubien: sidSubien, idsubtra: idSubtra, idsufijo: idSufijo },
                    });
                    for (const d of distribucion) {
                        await tx.distribucion.create({
                            data: {
                                idCodigo,
                                idsubien: sidSubien,
                                idsubtra: newIdSubtra,
                                idsufijo: idSufijo,
                                idCencos: d.idCencos,
                                porcentaje: d.porcentaje,
                            },
                        });
                    }

                    for (const prefijo of prefixes) {
                        const modelName = this.prefijoToModel(prefijo);
                        const model = this.getModelFromRecord(tx as unknown as Record<string, { create: (arg: { data: object }) => Promise<unknown> }>, modelName);
                        if (!model?.create) continue;
                        const rows = originalRowsByPrefix.get(prefijo);
                        if (!rows || rows.length === 0) continue;
                        const hasIdActivo = /^impu|^me\d/i.test(prefijo);
                        for (const row of rows) {
                            const newRow: Record<string, unknown> = {};
                            for (const [k, v] of Object.entries(row)) {
                                if (['idCodigo', 'idSubien', 'idSubtra', 'idSufijo'].includes(k)) continue;
                                if (k === 'idSubtra') {
                                    newRow.idSubtra = newIdSubtra;
                                    continue;
                                }
                                if (k === 'idActivo') {
                                    newRow[k] = cuentaDestinoVal;
                                    continue;
                                }
                                if (k === 'FecBaj' || k === 'TipoBaja' || k === 'precioVenta') {
                                    newRow[k] = null;
                                    continue;
                                }
                                if (FixedAsset.LIBRO_VALUE_FIELDS.includes(k as typeof FixedAsset.LIBRO_VALUE_FIELDS[number])) {
                                    const num = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
                                    newRow[k] = isNaN(num) ? v : Math.round(num * factorTransfer * 1e6) / 1e6;
                                } else {
                                    newRow[k] = v;
                                }
                            }
                            newRow.idCodigo = idCodigo;
                            newRow.idSubien = sidSubien;
                            newRow.idSubtra = newIdSubtra;
                            newRow.idSufijo = idSufijo;
                            if (hasIdActivo) newRow.idActivo = cuentaDestinoVal;
                            await model.create({ data: newRow });
                        }
                    }
                }
            }
            return { ok: true };
        }, { timeout: 60000 });
    }
    private static fecproDateToYyyyMm(d: Date): string {
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    /**
     * Libros origen para reinicio: siempre moneda local (ml → MONEDALOCAL) aunque en moextra tenga simula = true;
     * más los ME## con simula = false (excl. 03).
     */
    async getLibrosParaReinicioSimulacion(): Promise<{ idMoextra: string; Descripcion: string | null }[]> {
        const prismaRec = this.prisma as unknown as Record<string, unknown>;
        const out: { idMoextra: string; Descripcion: string | null }[] = [];

        if (this.getModelFromRecord(prismaRec, 'MONEDALOCAL')) {
            const mlRow =
                (await this.prisma.moextra.findUnique({ where: { idMoextra: 'ml' } })) ??
                (await this.prisma.moextra.findUnique({ where: { idMoextra: 'ML' } }));
            out.push({
                idMoextra: mlRow?.idMoextra ?? 'ml',
                Descripcion: mlRow?.Descripcion ?? null,
            });
        }

        const rows = await this.prisma.moextra.findMany({
            where: {
                simula: false,
                NOT: { idMoextra: '03' },
            },
            select: { idMoextra: true, Descripcion: true },
            orderBy: { idMoextra: 'asc' },
        });
        for (const r of rows) {
            const id = (r.idMoextra ?? '').trim();
            if (!id || id.toLowerCase() === 'ml') continue;
            if (/^\d{2}$/.test(id) && this.getModelFromRecord(prismaRec, `ME${id}`)) {
                out.push({ idMoextra: r.idMoextra ?? id, Descripcion: r.Descripcion });
            }
        }

        out.sort((a, b) => {
            const am = (a.idMoextra ?? '').toLowerCase() === 'ml' ? 0 : 1;
            const bm = (b.idMoextra ?? '').toLowerCase() === 'ml' ? 0 : 1;
            if (am !== bm) return am - bm;
            return (a.idMoextra ?? '').localeCompare(b.idMoextra ?? '', undefined, { numeric: true });
        });
        return out;
    }

    /**
     * Nombre de tabla SQL Server para libro origen (lista blanca; evita inyección).
     * Solo MONEDALOCAL o ME## distinto de ME03.
     */
    private sqlMeSourceTableName(sourceIdMoextra: string, isMl: boolean): string {
        if (isMl) return 'MONEDALOCAL';
        const pad = sourceIdMoextra.trim().padStart(2, '0');
        if (pad === '03') throw new Error('Elija un libro distinto del 03 (simulación).');
        if (!/^ME\d{2}$/.test(`ME${pad}`)) throw new Error('Código de libro inválido.');
        return `ME${pad}`;
    }

    /**
     * Reinicia simulación: vacía ME03 y cabesimu, copia cabecera → cabesimu y el libro elegido (MONEDALOCAL / ME01 / ME02 / …) → ME03.
     * Requiere tabla dbo.cabesimu alineada en columnas con cabecera y ME03 alineado con la tabla origen (SELECT *).
     */
    async reiniciarSimulacionDesdeLibro(sourceIdMoextra: string): Promise<{ ok: true; bienesActualizados: number }> {
        const trimmed = sourceIdMoextra.trim();
        const isMl = trimmed.toLowerCase() === 'ml';

        const prismaRec = this.prisma as unknown as Record<string, unknown>;
        /** No usar getModelFromRecord('cabesimu'): el cliente Prisma a veces no se regeneró y no expone el delegado. */
        const cabeSimuRows = await this.prisma.$queryRawUnsafe<{ n: number }[]>(
            "SELECT 1 AS n WHERE OBJECT_ID(N'dbo.cabesimu', N'U') IS NOT NULL"
        );
        if (!cabeSimuRows.length) {
            throw new Error(
                'No existe la tabla dbo.cabesimu en esta base. Verifique el nombre (p. ej. dbo.CabeSimu) y el esquema, o ejecute npx prisma generate tras agregar el modelo.'
            );
        }
        if (isMl) {
            if (!this.getModelFromRecord(prismaRec, 'MONEDALOCAL')) {
                throw new Error('No existe tabla MONEDALOCAL para moneda local.');
            }
        } else {
            const mo = await this.prisma.moextra.findUnique({ where: { idMoextra: trimmed } });
            if (!mo || mo.simula !== false) {
                throw new Error('Libro no válido o pertenece a simulación (simula debe ser falso).');
            }
            const srcPad = trimmed.padStart(2, '0');
            if (!this.getModelFromRecord(prismaRec, `ME${srcPad}`)) {
                throw new Error('No existe tabla de libro para el código elegido.');
            }
        }

        const srcTable = this.sqlMeSourceTableName(trimmed, isMl);

        /**
         * ME03 antes que cabesimu por posibles FKs. Un solo batch (adaptador Prisma+MSSQL).
         */
        const restartBatch = `
BEGIN TRY
BEGIN TRANSACTION;
DELETE FROM dbo.ME03;
DELETE FROM dbo.cabesimu;
INSERT INTO dbo.cabesimu SELECT * FROM dbo.cabecera;
INSERT INTO dbo.ME03 SELECT * FROM dbo.[${srcTable}];
COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH
`;

        await this.prisma.$executeRawUnsafe(restartBatch);

        const cntRows = await this.prisma.$queryRawUnsafe<{ cnt: bigint }[]>(`
SELECT COUNT_BIG(1) AS cnt FROM dbo.cabesimu
        `);
        const bienesActualizados = Number(cntRows[0]?.cnt ?? 0);

        return { ok: true, bienesActualizados };
    }

    /** Baja física: elimina el bien completo de la base de datos (cabecera, distribucion, todos los libros) */
    async bajaFisica(bienId: string): Promise<{ ok: boolean }> {
        const parts = bienId.split('-');
        if (parts.length < 4) throw new Error('bienId inválido');
        const [idCodigo, idSubien = '000', idSubtra = '0', idSufijo = '0'] = parts;
        const sidSubien = idSubien.padStart(3, '0');

        return this.prisma.$transaction(async (tx) => {
            const cabecera = await tx.cabecera.findUnique({
                where: { idCodigo_idSubien_idSubtra_idSufijo: { idCodigo, idSubien: sidSubien, idSubtra, idSufijo } },
            });
            if (!cabecera) throw new Error(`Bien ${bienId} no encontrado`);

            const converFields = await tx.converField.findMany({
                where: { IdTabla: 'actifijo', NOT: { IdCampo: { startsWith: 'cabecera.' } } },
                select: { IdCampo: true },
            });
            const prefixesFromConver = [...new Set(converFields.map((f) => {
                const idx = f.IdCampo.indexOf('.');
                return idx >= 0 ? f.IdCampo.substring(0, idx) : null;
            }).filter(Boolean))] as string[];
            const prefixes = [...new Set([...prefixesFromConver, 'ME01', 'ME02'])];

            const where = { idCodigo, idSubien: sidSubien, idSubtra, idSufijo };

            for (const prefijo of prefixes) {
                const modelName = this.prefijoToModel(prefijo);
                const model = this.getModelFromRecord(
                    tx as unknown as Record<string, { deleteMany?: (arg: { where: object }) => Promise<unknown> }>,
                    modelName
                );
                if (!model?.deleteMany) continue;
                await model.deleteMany({ where });
            }

            await tx.distribucion.deleteMany({
                where: { idCodigo, idsubien: sidSubien, idsubtra: idSubtra, idsufijo: idSufijo },
            });

            await tx.cabecera.delete({
                where: { idCodigo_idSubien_idSubtra_idSufijo: { idCodigo, idSubien: sidSubien, idSubtra, idSufijo } },
            });

            return { ok: true };
        }, { timeout: 30000 });
    }
}

export default FixedAsset;