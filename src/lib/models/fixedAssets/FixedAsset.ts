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
};

class FixedAsset {
        prisma : PrismaClient;
    
        constructor(client: string){
            this.prisma = getPrisma(client);
        }

        async getAll() : Promise<FixedAssetsData> {
            const fieldsManage : ConverFieldModel[] = await this.prisma.converField.findMany({
                where: {
                    IdTabla: 'actifijo',
                },
                orderBy: {
                    lisordencampos: 'asc'
                }
            });
            const fixedAssets = await this.prisma.$queryRaw<{ [key: string]: unknown}[]>`SELECT * FROM dbo.actifijo`;
            const parametros01 = await this.prisma.parametros.findUnique({
                where: { idmoextra: '01' },
                select: { fecini: true },
            });
            const feciniEjercicio = parametros01?.fecini ? parametros01.fecini.toISOString() : null;
            const serializedFieldsManage = fieldsManage.map(field => {{
                return {
                    ...field,
                    IdCampo: field.IdCampo.toLowerCase(),
                };
            }});
            return {
                fixedAssets,
                fieldsManage: serializedFieldsManage,
                feciniEjercicio,
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
     */
    async getAbmCabeceraData(): Promise<AbmCabeceraData> {
        const [converFields, defaultsRows, unidadesNegocio, cuentas, modelos, origenes, proyectos, situaciones] = await Promise.all([
            this.prisma.converField.findMany({
                where: { IdTabla: 'actifijo', IdCampo: { startsWith: 'cabecera.' } },
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

        return {
            fields: converFields.map((f) => ({
                idCampo: f.IdCampo.replace(/^cabecera\./i, ''),
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
    async getAbmLibrosData(): Promise<AbmLibrosData> {
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

        const [converFields, moextraRows, cuentas, internaRows, monedas, parametrosRows, ctaVidautilRows] = await Promise.all([
            this.prisma.converField.findMany({
                where: {
                    IdTabla: 'actifijo',
                    NOT: { IdCampo: { startsWith: 'cabecera.' } },
                    OR: campoCases,
                },
                orderBy: { lisordencampos: 'asc' },
                select: { IdCampo: true, BrowNombre: true },
            }),
            this.prisma.moextra.findMany({ select: { idMoextra: true, Descripcion: true } }),
            this.prisma.cuentas.findMany({ where: { IdActivo: { not: '0' } }, select: { IdActivo: true, Descripcion: true } }),
            this.prisma.interna.findMany({
                where: { Tipo: { in: ['TIPAMOR', 'INDACT', 'CODAMO'] } },
                select: { IdInterno: true, Descripcion: true, Tipo: true },
            }),
            this.prisma.monedas.findMany({ select: { IdMoneda: true, Descripcion: true } }),
            this.prisma.parametros.findMany({ select: { idmoextra: true, IdTipoAmortizacion: true, fecpro: true } }),
            this.prisma.ctaVidautil.findMany({ select: { idMoextra: true, idActivo: true, vidautil: true } }),
        ]);

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
}

export default FixedAsset;