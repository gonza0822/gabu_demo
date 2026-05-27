import { ConverFieldModel } from "@/generated/prisma/models";
import { PrismaClient } from "@/generated/prisma/client";
import { getCorePrisma } from "@/lib/prisma/corePrisma";
import { getPrisma } from "@/lib/prisma/prisma";
import { ReOrderData } from "@/lib/models/tables/Table";
import FixedAsset from "@/lib/models/fixedAssets/FixedAsset";
import { findIdCencosByCodcia } from "@/util/costCenter/findIdCencosByCodcia";

export type InvestmentType = "projects" | "workOrders" | "charges";

export type InvestmentsData = {
    table: Record<string, unknown>[];
    fieldsManage: ConverFieldModel[];
    blockedChargeCompositeKeys?: string[];
};

export type TransferSupportData = {
    costCenters: { idCencos: string; codcia: string }[];
    existingAssets: { idCodigo: string; descripcion: string | null }[];
};

export type ChargesTransferMode = "new" | "improve";

export type ChargesTransferPayload = {
    selectedRows: Record<string, unknown>[];
    transferMode: ChargesTransferMode;
    selectedAssetId?: string | null;
};

export type ChargesTransferCurrency = "pesos" | "dolares";

export type ChargesTransferSimulationPayload = ChargesTransferPayload & {
    amountCurrency: ChargesTransferCurrency;
};

export type ChargesTransferResult = {
    ok: boolean;
    bienId: string;
    idCodigo: string;
    idSubien: string;
    idSubtra: string;
    idSufijo: string;
    relatedCharges: number;
};

const TABLE_ID_BY_TYPE: Record<InvestmentType, string> = {
    projects: "Proyectos",
    workOrders: "OTrabajo",
    charges: "cargosmagic",
};

class Investments {
    prisma: PrismaClient;
    corePrisma: PrismaClient;
    tableId: string;
    type: InvestmentType;
    client: string;

    constructor(client: string, type: InvestmentType) {
        this.client = client;
        this.prisma = getPrisma(client);
        this.corePrisma = getCorePrisma(client);
        this.type = type;
        this.tableId = TABLE_ID_BY_TYPE[type];
    }

    private getFieldValue(row: Record<string, unknown>, ...candidates: string[]): unknown {
        for (const candidate of candidates) {
            if (candidate in row) return row[candidate];
            const lower = candidate.toLowerCase();
            const key = Object.keys(row).find((k) => k.toLowerCase() === lower);
            if (key) return row[key];
        }
        return undefined;
    }

    private toTrimmedString(value: unknown): string {
        if (value == null) return "";
        return String(value).trim();
    }

    private toNumber(value: unknown): number {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
            const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        if (value && typeof value === "object" && !Array.isArray(value)) {
            const maybe = value as { s?: unknown; e?: unknown; d?: unknown };
            if (typeof maybe.s === "number" && typeof maybe.e === "number" && Array.isArray(maybe.d) && maybe.d.length > 0) {
                const digits = `${maybe.d[0]}${maybe.d.slice(1).map((chunk) => String(chunk).padStart(7, "0")).join("")}`;
                const coefficient = Number(digits);
                if (!Number.isFinite(coefficient)) return 0;
                const exponent = maybe.e - (digits.length - 1);
                return (maybe.s < 0 ? -1 : 1) * coefficient * Math.pow(10, exponent);
            }
        }
        return 0;
    }

    private toYyyymm(value: unknown): string {
        if (value == null) return "";
        if (value instanceof Date) {
            const year = value.getUTCFullYear();
            const month = String(value.getUTCMonth() + 1).padStart(2, "0");
            return `${year}${month}`;
        }
        const text = String(value).trim();
        if (!text) return "";
        if (/^\d{6}$/.test(text)) return text;
        if (/^\d{4}-\d{2}/.test(text)) return `${text.slice(0, 4)}${text.slice(5, 7)}`;
        const parsed = new Date(text);
        if (Number.isNaN(parsed.getTime())) return "";
        const year = parsed.getUTCFullYear();
        const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
        return `${year}${month}`;
    }

    private yyyymmToMmYyyy(value: string): string {
        const v = value.trim();
        if (!/^\d{6}$/.test(v)) return "";
        return `${v.slice(4, 6)}/${v.slice(0, 4)}`;
    }

    private sqlLiteral(value: unknown): string {
        if (value === null || value === undefined) return "NULL";
        if (typeof value === "boolean") return value ? "1" : "0";
        if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
        if (value instanceof Date) {
            const iso = value.toISOString().replace("T", " ").slice(0, 23);
            return `'${iso}'`;
        }
        return `N'${String(value).replace(/'/g, "''")}'`;
    }

    private normalizeForJson(value: unknown): unknown {
        if (typeof value === "bigint") return value.toString();
        if (value instanceof Date) return value;
        if (Array.isArray(value)) return value.map((item) => this.normalizeForJson(item));
        if (value && typeof value === "object") {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
                out[k] = this.normalizeForJson(v);
            }
            return out;
        }
        return value;
    }

    private normalizeChargeKeyPart(value: unknown): string {
        if (value == null) return "";
        if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
        if (typeof value === "string") {
            const text = value.trim();
            if (!text) return "";
            const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
            if (/^-?\d+(\.\d+)?$/.test(normalized)) {
                return String(Math.trunc(Number(normalized)));
            }
            return text;
        }
        const asNumber = this.toNumber(value);
        if (Number.isFinite(asNumber)) return String(Math.trunc(asNumber));
        return this.toTrimmedString(value);
    }

    private buildChargeCompositeKey(nrocbt: unknown, idArticulo: unknown): string | null {
        const nrocbtKey = this.normalizeChargeKeyPart(nrocbt);
        const idArticuloKey = this.normalizeChargeKeyPart(idArticulo);
        if (!nrocbtKey || !idArticuloKey) return null;
        return `${nrocbtKey}::${idArticuloKey}`;
    }

    private buildFieldsFromRows(
        rows: Record<string, unknown>[],
        fieldsFromDb: ConverFieldModel[]
    ): ConverFieldModel[] {
        const sampleRow = rows[0];
        if (!sampleRow) return fieldsFromDb;

        const rowKeys = Object.keys(sampleRow);
        const fieldsByExactId = new Map<string, ConverFieldModel>();
        for (const field of fieldsFromDb) {
            fieldsByExactId.set(field.IdCampo, field);
        }

        const generated = rowKeys.map((key, index) => {
            const mapped = fieldsByExactId.get(key);
            const browNombre =
                this.type === "workOrders" && key === "cdobra"
                    ? "Cd. obra"
                    : key;
            return {
                IdTabla: this.tableId,
                IdCampo: key,
                BrowNombre: browNombre,
                browformat: mapped?.browformat ?? null,
                listShow: mapped?.listShow ?? true,
                lisordencampos: mapped?.lisordencampos ?? index,
                idIdioma: mapped?.idIdioma ?? null,
                idusuario: mapped?.idusuario ?? null,
            } as ConverFieldModel;
        });

        return generated.sort(
            (a, b) => (a.lisordencampos ?? Number.MAX_SAFE_INTEGER) - (b.lisordencampos ?? Number.MAX_SAFE_INTEGER)
        );
    }

    private async getRows(): Promise<Record<string, unknown>[]> {
        if (this.type === "projects") {
            return this.corePrisma.$queryRawUnsafe<Record<string, unknown>[]>(
                `SELECT * FROM [dbo].[TBLDATOSOBRAS]`
            );
        }
        if (this.type === "workOrders") {
            return this.corePrisma.$queryRawUnsafe<Record<string, unknown>[]>(
                `SELECT
                    b.*,
                    o.[cdObra] AS cdobra
                 FROM [dbo].[TBLBUDGETOBRAS] b
                 LEFT JOIN [PROD_CORE].[dbo].[TBLDATOSOBRAS] o ON o.[idObra] = b.[idObra]`
            );
        }
        return this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM [dbo].[cargosmagic] ORDER BY [cdobra] ASC, [feccbt] ASC`
        );
    }

    async getAll(): Promise<InvestmentsData> {
        const blockedChargeRowsPromise =
            this.type === "charges"
                ? this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
                      `SELECT DISTINCT nrocbt, IDArticulo FROM dbo.relacargoactivo WHERE nrocbt IS NOT NULL AND IDArticulo IS NOT NULL`
                  )
                : Promise.resolve([]);

        const [table, fieldsFromDb, blockedChargeRows] = await Promise.all([
            this.getRows(),
            this.prisma.converField.findMany({
                where: { IdTabla: this.tableId },
                orderBy: { lisordencampos: "asc" },
            }),
            blockedChargeRowsPromise,
        ]);

        const fieldsManage =
            this.type === "charges" ? fieldsFromDb : this.buildFieldsFromRows(table, fieldsFromDb);

        const normalizedTable = table.map((row) => this.normalizeForJson(row) as Record<string, unknown>);
        const blockedChargeCompositeKeys =
            this.type === "charges"
                ? Array.from(
                      new Set(
                          blockedChargeRows
                              .map((row) =>
                                  this.buildChargeCompositeKey(
                                      row.nrocbt,
                                      row.IDArticulo ?? row.idArticulo ?? row.idarticulo
                                  )
                              )
                              .filter((key): key is string => Boolean(key))
                      )
                  )
                : undefined;

        return { table: normalizedTable, fieldsManage, blockedChargeCompositeKeys };
    }

    /** Cargos vinculados a un bien vía relacargoactivo (subacordeón ABM). */
    async getChargesByBienId(bienId: string): Promise<Pick<InvestmentsData, "table" | "fieldsManage">> {
        const parts = bienId.split("-").map((p) => p.trim());
        const idCodigo = parts[0] ?? "";
        const idSubien = parts[1] ?? "000";
        const idSubtra = parts[2] ?? "0";
        const idSufijo = parts[3] ?? "0";
        if (!idCodigo) throw new Error("bienId inválido");

        const [table, fieldsFromDb] = await Promise.all([
            this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
                `SELECT c.*
                 FROM dbo.cargosmagic c
                 INNER JOIN dbo.relacargoactivo r
                    ON r.nrocbt = c.nrocbt AND r.IDArticulo = c.IDArticulo
                 WHERE r.idcodigo = ${this.sqlLiteral(idCodigo)}
                   AND r.idsubien = ${this.sqlLiteral(idSubien)}
                   AND r.idsubtra = ${this.sqlLiteral(idSubtra)}
                   AND r.idsufijo = ${this.sqlLiteral(idSufijo)}
                 ORDER BY c.cdobra ASC, c.feccbt ASC`
            ),
            this.prisma.converField.findMany({
                where: { IdTabla: TABLE_ID_BY_TYPE.charges },
                orderBy: { lisordencampos: "asc" },
            }),
        ]);

        return {
            table: table.map((row) => this.normalizeForJson(row) as Record<string, unknown>),
            fieldsManage: fieldsFromDb,
        };
    }

    async getTransferSupportData(simulationOnly = false): Promise<TransferSupportData> {
        const cabeceraRowsPromise = simulationOnly
            ? this.prisma.$queryRawUnsafe<Array<{ idCodigo: string | null; descripcion: string | null }>>(
                  `SELECT idCodigo, descripcion FROM dbo.cabesimu WHERE idSubien = '000' ORDER BY idCodigo ASC`
              )
            : this.prisma.cabecera.findMany({
                  where: { idSubien: "000" },
                  select: { idCodigo: true, descripcion: true },
                  orderBy: { idCodigo: "asc" },
              });

        const [costCentersRows, cabeceraRows] = await Promise.all([
            this.prisma.cCostos.findMany({
                select: { IdCencos: true, codcia: true },
                orderBy: { IdCencos: "asc" },
            }),
            cabeceraRowsPromise,
        ]);

        const dedupAssets = new Map<string, string | null>();
        for (const row of cabeceraRows) {
            const key = String(row.idCodigo ?? "").trim();
            if (!key || dedupAssets.has(key)) continue;
            dedupAssets.set(key, row.descripcion ?? null);
        }

        return {
            costCenters: costCentersRows.map((row) => ({
                idCencos: row.IdCencos ?? "",
                codcia: row.codcia ?? "",
            })),
            existingAssets: Array.from(dedupAssets.entries()).map(([idCodigo, descripcion]) => ({
                idCodigo,
                descripcion,
            })),
        };
    }

    async transferChargesToFixedAsset(payload: ChargesTransferPayload): Promise<ChargesTransferResult> {
        if (this.type !== "charges") throw new Error("Transferencia de cargos sólo disponible para type=charges");
        const selectedRows = payload.selectedRows ?? [];
        if (selectedRows.length === 0) throw new Error("No hay cargos seleccionados");

        const first = selectedRows[0] as Record<string, unknown>;
        const codcta = this.toTrimmedString(this.getFieldValue(first, "codcta"));
        const cdobra = this.toTrimmedString(this.getFieldValue(first, "cdobra"));
        const cdcuenta = this.toTrimmedString(this.getFieldValue(first, "cdcuenta"));
        const chargeCodcia = this.getFieldValue(first, "codcia", "CODCIA");
        const periodYyyymm = this.toYyyymm(this.getFieldValue(first, "feccbt"));
        const fecOri = this.yyyymmToMmYyyy(periodYyyymm);
        if (!periodYyyymm || !fecOri) throw new Error("No se pudo obtener período feccbt válido");

        const dsarticulos = Array.from(
            new Set(
                selectedRows
                    .map((row) => this.toTrimmedString(this.getFieldValue(row as Record<string, unknown>, "dsarticulo")))
                    .filter((v) => v !== "")
            )
        );
        const dsobra = this.toTrimmedString(this.getFieldValue(first, "DSOBRA", "dsobra"));
        const descripcion = dsarticulos.length === 1 ? dsarticulos[0] : dsobra;

        const totalPesos = selectedRows.reduce(
            (acc, row) => acc + this.toNumber(this.getFieldValue(row as Record<string, unknown>, "importePesos", "importepesos")),
            0
        );
        const totalDolares = selectedRows.reduce(
            (acc, row) => acc + this.toNumber(this.getFieldValue(row as Record<string, unknown>, "importeDolares", "importedolares")),
            0
        );

        const [costCenters] = await Promise.all([
            this.prisma.cCostos.findMany({ select: { IdCencos: true, codcia: true } }),
        ]);
        const fixedAssetForClient = new FixedAsset(this.client);

        const matchingCostCenter = findIdCencosByCodcia(
            costCenters.map((row) => ({ idCencos: row.IdCencos, codcia: row.codcia })),
            chargeCodcia
        );

        const [datosGenerales, cabeceraData, parametrosRows] = await Promise.all([
            fixedAssetForClient.getAbmDatosGenerales(),
            fixedAssetForClient.getAbmCabeceraData(false),
            this.prisma.parametros.findMany({
                where: { idmoextra: "ml" },
                select: { idmoextra: true, fecpro: true, IdTipoAmortizacion: true },
            }),
        ]);

        const parametrosMl = parametrosRows.find((p) => (p.idmoextra ?? "").toLowerCase() === "ml");
        const fecproCabecera = parametrosMl?.fecpro ? this.toYyyymm(parametrosMl.fecpro) : "";
        if (!fecproCabecera) {
            throw new Error("No se encontró fecpro válido en parámetros para idmoextra='ml'");
        }
        const defaultTipoAmortizacionMl = this.toTrimmedString(parametrosMl?.IdTipoAmortizacion) || "1";

        const librosMonedaPesos: Record<string, string> = {
            IDACTIVO: codcta,
            IDTIPOAMORTIZACION: defaultTipoAmortizacionMl,
            IDINDACT: "1",
            IDTIPOPROCESO: "",
            IDCODAMO: "1",
            ESTCON: "1",
            IDMONEDA: "01",
            FECORI: fecOri,
            FECPRO: fecproCabecera,
            VALORI: String(totalPesos),
            precioVenta: "0",
            vidaUtil: "0",
            valorResidual: "0",
            VrepoeReferencial: String(totalPesos),
            VrepoeAnterior: String(totalPesos),
            VrepoeActual: String(totalPesos),
            VrepoeCierreAnterior: String(totalPesos),
            AmafieReferencial: "0",
            AmefieReferencial: "0",
            AmpefeReferencial: "0",
            AmafieAnterior: "0",
            AmefieAnterior: "0",
            AmpefeAnterior: "0",
            AmafieActual: "0",
            AmefieActual: "0",
            AmpefeActual: "0",
            AmafieCierreAnterior: "0",
            AmefieCierreAnterior: "0",
            AmpefeCierreAnterior: "0",
            valgra21: "0",
            valgra105: "0",
            valnogra: "0",
            valiva21: "0",
            valiva105: "0",
        };

        const librosMe01: Record<string, string> = {
            ...librosMonedaPesos,
            VALORI: String(totalDolares),
            VrepoeReferencial: String(totalDolares),
            VrepoeAnterior: String(totalDolares),
            VrepoeActual: String(totalDolares),
            VrepoeCierreAnterior: String(totalDolares),
        };

        const altaAgregadoBienId =
            payload.transferMode === "improve"
                ? `${this.toTrimmedString(payload.selectedAssetId ?? "")}-000-0-0`
                : undefined;
        if (payload.transferMode === "improve" && !this.toTrimmedString(payload.selectedAssetId ?? "")) {
            throw new Error("Debe seleccionar el bien base para generar una mejora");
        }

        const createResult = await fixedAssetForClient.addBien({
            datosGenerales: {
                descripcion: descripcion || "SIN DESCRIPCION",
                idPlanta: datosGenerales.defaultPlanta ?? undefined,
                idZona: datosGenerales.defaultZona ?? undefined,
                idCencos: matchingCostCenter ?? datosGenerales.defaultCencos ?? undefined,
            },
            // En transferencia de cargos no se debe insertar en Distribucion.
            distribucion: [],
            cabecera: {
                idDescripcion: "",
                cantidad: 1,
                idUnegocio: cabeceraData.defaultUnegocio ?? "",
                idActivo: codcta,
                idZona: datosGenerales.defaultZona ?? "",
                idPlanta: datosGenerales.defaultPlanta ?? "",
                idCencos: matchingCostCenter ?? datosGenerales.defaultCencos ?? "",
                idModelo: cabeceraData.defaultModelo ?? "",
                idOrdenCompra: "",
                idOrigen: "A",
                idProveedor: "",
                idFabricante: "",
                idProyecto: cdobra,
                idSituacion: cdcuenta,
                idFactura: "",
                identificacion: "",
                plidPoliza: "",
                plFecini: "",
                plFecfin: "",
                plidNaturaleza: "",
                plidPrima: "",
                plarticulo: "",
                trFecActivo: "",
                tridActivo: "",
                trFecCencos: "",
                tridCencos: "",
                trFecProyecto: "",
                tridProyecto: "",
                trFecUNegocio: "",
                tridUNegocio: "",
                trFecEmpresa: "",
                tridEmpresa: "",
                marcaSeleccion: false,
                escencial: false,
                nuevo: false,
                fecpro: fecproCabecera,
            },
            libros: {
                MONEDALOCAL: librosMonedaPesos,
                IMPUESTOS: { ...librosMonedaPesos },
                ME02: { ...librosMonedaPesos },
                ME01: librosMe01,
            },
            altaAgregadoBienId,
        });

        if (payload.transferMode === "improve") {
            await this.prisma.$executeRawUnsafe(
                `UPDATE dbo.usSeteos
                 SET altamejoras = COALESCE(altamejoras, 0) + 1`
            );
        }

        const idCodigo = createResult.idCodigo;
        const idSubien = createResult.idSubien;
        const idSubtra = "0";
        const idSufijo = "0";
        const fectra = new Date();
        const insertedRelaKeys = new Set<string>();

        for (const row of selectedRows) {
            const r = row as Record<string, unknown>;
            const nrocbtRaw = this.getFieldValue(r, "nrocbt");
            const idArticuloRaw = this.getFieldValue(r, "IDArticulo", "idArticulo");
            const nrocbtNum = Math.trunc(this.toNumber(nrocbtRaw));
            const idArticuloNum = Math.trunc(this.toNumber(idArticuloRaw));
            if (!Number.isFinite(nrocbtNum) || !Number.isFinite(idArticuloNum) || nrocbtNum === 0 || idArticuloNum === 0) {
                throw new Error(
                    `No se pudo insertar relacargoactivo: nrocbt o IDArticulo inválido (nrocbt=${String(nrocbtRaw)}, IDArticulo=${String(
                        idArticuloRaw
                    )})`
                );
            }
            const relaKey = `${nrocbtNum}::${idArticuloNum}`;
            if (insertedRelaKeys.has(relaKey)) continue;
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO dbo.relacargoactivo (nrocbt, IDArticulo, idcodigo, idsubien, idsubtra, idsufijo, fectra)
                 VALUES (${this.sqlLiteral(nrocbtNum)}, ${this.sqlLiteral(idArticuloNum)}, ${this.sqlLiteral(idCodigo)}, ${this.sqlLiteral(idSubien)}, ${this.sqlLiteral(idSubtra)}, ${this.sqlLiteral(idSufijo)}, ${this.sqlLiteral(fectra)})`
            );
            insertedRelaKeys.add(relaKey);
        }

        return {
            ok: true,
            bienId: `${idCodigo}-${idSubien}-${idSubtra}-${idSufijo}`,
            idCodigo,
            idSubien,
            idSubtra,
            idSufijo,
            relatedCharges: selectedRows.length,
        };
    }

    async transferChargesToSimulation(payload: ChargesTransferSimulationPayload): Promise<ChargesTransferResult> {
        if (this.type !== "charges") throw new Error("Transferencia de cargos sólo disponible para type=charges");
        const selectedRows = payload.selectedRows ?? [];
        if (selectedRows.length === 0) throw new Error("No hay cargos seleccionados");

        const first = selectedRows[0] as Record<string, unknown>;
        const codcta = this.toTrimmedString(this.getFieldValue(first, "codcta"));
        const cdobra = this.toTrimmedString(this.getFieldValue(first, "cdobra"));
        const cdcuenta = this.toTrimmedString(this.getFieldValue(first, "cdcuenta"));
        const chargeCodcia = this.getFieldValue(first, "codcia", "CODCIA");
        const periodYyyymm = this.toYyyymm(this.getFieldValue(first, "feccbt"));
        const fecOri = this.yyyymmToMmYyyy(periodYyyymm);
        if (!periodYyyymm || !fecOri) throw new Error("No se pudo obtener período feccbt válido");

        const dsarticulos = Array.from(
            new Set(
                selectedRows
                    .map((row) => this.toTrimmedString(this.getFieldValue(row as Record<string, unknown>, "dsarticulo")))
                    .filter((v) => v !== "")
            )
        );
        const dsobra = this.toTrimmedString(this.getFieldValue(first, "DSOBRA", "dsobra"));
        const descripcion = dsarticulos.length === 1 ? dsarticulos[0] : dsobra;

        const totalPesos = selectedRows.reduce(
            (acc, row) => acc + this.toNumber(this.getFieldValue(row as Record<string, unknown>, "importePesos", "importepesos")),
            0
        );
        const totalDolares = selectedRows.reduce(
            (acc, row) => acc + this.toNumber(this.getFieldValue(row as Record<string, unknown>, "importeDolares", "importedolares")),
            0
        );
        const selectedAmount = payload.amountCurrency === "dolares" ? totalDolares : totalPesos;

        const [costCenters] = await Promise.all([
            this.prisma.cCostos.findMany({ select: { IdCencos: true, codcia: true } }),
        ]);
        const fixedAssetForClient = new FixedAsset(this.client);

        const matchingCostCenter = findIdCencosByCodcia(
            costCenters.map((row) => ({ idCencos: row.IdCencos, codcia: row.codcia })),
            chargeCodcia
        );

        const [datosGenerales, cabeceraData, parametrosRows] = await Promise.all([
            fixedAssetForClient.getAbmDatosGenerales(),
            fixedAssetForClient.getAbmCabeceraData(true),
            this.prisma.parametros.findMany({
                where: { idmoextra: "03" },
                select: { idmoextra: true, fecpro: true, IdTipoAmortizacion: true },
            }),
        ]);

        const parametrosSim = parametrosRows.find((p) => (p.idmoextra ?? "").toLowerCase() === "03");
        const fecproCabecera = parametrosSim?.fecpro ? this.toYyyymm(parametrosSim.fecpro) : "";
        if (!fecproCabecera) {
            throw new Error("No se encontró fecpro válido en parámetros para idmoextra='03'");
        }
        const defaultTipoAmortizacion = this.toTrimmedString(parametrosSim?.IdTipoAmortizacion) || "1";

        const librosMe03: Record<string, string> = {
            IDACTIVO: codcta,
            IDTIPOAMORTIZACION: defaultTipoAmortizacion,
            IDINDACT: "1",
            IDTIPOPROCESO: "",
            IDCODAMO: "1",
            ESTCON: "1",
            IDMONEDA: payload.amountCurrency === "dolares" ? "02" : "01",
            FECORI: fecOri,
            FECPRO: fecproCabecera,
            VALORI: String(selectedAmount),
            precioVenta: "0",
            vidaUtil: "0",
            valorResidual: "0",
            VrepoeReferencial: String(selectedAmount),
            VrepoeAnterior: String(selectedAmount),
            VrepoeActual: String(selectedAmount),
            VrepoeCierreAnterior: String(selectedAmount),
            AmafieReferencial: "0",
            AmefieReferencial: "0",
            AmpefeReferencial: "0",
            AmafieAnterior: "0",
            AmefieAnterior: "0",
            AmpefeAnterior: "0",
            AmafieActual: "0",
            AmefieActual: "0",
            AmpefeActual: "0",
            AmafieCierreAnterior: "0",
            AmefieCierreAnterior: "0",
            AmpefeCierreAnterior: "0",
            valgra21: "0",
            valgra105: "0",
            valnogra: "0",
            valiva21: "0",
            valiva105: "0",
        };

        const altaAgregadoBienId =
            payload.transferMode === "improve"
                ? `${this.toTrimmedString(payload.selectedAssetId ?? "")}-000-0-0`
                : undefined;
        if (payload.transferMode === "improve" && !this.toTrimmedString(payload.selectedAssetId ?? "")) {
            throw new Error("Debe seleccionar el bien base para generar mejora en simulación");
        }

        const createResult = await fixedAssetForClient.addBien({
            simulationOnly: true,
            datosGenerales: {
                descripcion: descripcion || "SIN DESCRIPCION",
                idPlanta: datosGenerales.defaultPlanta ?? undefined,
                idZona: datosGenerales.defaultZona ?? undefined,
                idCencos: matchingCostCenter ?? datosGenerales.defaultCencos ?? undefined,
            },
            distribucion: [],
            cabecera: {
                idDescripcion: "",
                cantidad: 1,
                idUnegocio: cabeceraData.defaultUnegocio ?? "",
                idActivo: codcta,
                idZona: datosGenerales.defaultZona ?? "",
                idPlanta: datosGenerales.defaultPlanta ?? "",
                idCencos: matchingCostCenter ?? datosGenerales.defaultCencos ?? "",
                idModelo: cabeceraData.defaultModelo ?? "",
                idOrdenCompra: "",
                idOrigen: "A",
                idProveedor: "",
                idFabricante: "",
                idProyecto: cdobra,
                idSituacion: cdcuenta,
                idFactura: "",
                identificacion: "",
                plidPoliza: "",
                plFecini: "",
                plFecfin: "",
                plidNaturaleza: "",
                plidPrima: "",
                plarticulo: "",
                trFecActivo: "",
                tridActivo: "",
                trFecCencos: "",
                tridCencos: "",
                trFecProyecto: "",
                tridProyecto: "",
                trFecUNegocio: "",
                tridUNegocio: "",
                trFecEmpresa: "",
                tridEmpresa: "",
                marcaSeleccion: false,
                escencial: false,
                nuevo: false,
                fecpro: fecproCabecera,
            },
            libros: {
                ME03: librosMe03,
            },
            altaAgregadoBienId,
        });

        const idCodigo = createResult.idCodigo;
        const idSubien = createResult.idSubien;
        const idSubtra = "0";
        const idSufijo = "0";

        return {
            ok: true,
            bienId: `${idCodigo}-${idSubien}-${idSubtra}-${idSufijo}`,
            idCodigo,
            idSubien,
            idSubtra,
            idSufijo,
            relatedCharges: selectedRows.length,
        };
    }

    async setListShow(fieldId: string, listShow: boolean): Promise<ConverFieldModel> {
        return this.prisma.converField.upsert({
            where: {
                IdTabla_IdCampo: {
                    IdTabla: this.tableId,
                    IdCampo: fieldId,
                },
            },
            update: { listShow },
            create: {
                IdTabla: this.tableId,
                IdCampo: fieldId,
                BrowNombre: fieldId,
                browformat: null,
                listShow,
                lisordencampos: null,
                idIdioma: null,
                idusuario: null,
            },
        });
    }

    async changeOrder(newOrder: ReOrderData): Promise<ConverFieldModel[]> {
        const updatedRecords: ConverFieldModel[] = [];
        for (const item of newOrder) {
            const updated = await this.prisma.converField.update({
                where: {
                    IdTabla_IdCampo: {
                        IdTabla: item.tableId,
                        IdCampo: item.fieldId,
                    },
                },
                data: { lisordencampos: item.order },
            });
            updatedRecords.push(updated);
        }
        return updatedRecords;
    }
}

export default Investments;
