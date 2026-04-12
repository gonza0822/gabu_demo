import "dotenv/config";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@/generated/prisma/client";
import clients from "@/config/clients.json";

const CORE_DB_NAME = "PROD_CORE";

const prismaByClient = new Map<string, PrismaClient>();

function buildSqlConfig(client: string) {
    const cfg = clients.find((c) => c.client === client);
    if (!cfg) {
        throw new Error(`No se encontro configuracion de cliente para '${client}'`);
    }

    return {
        user: cfg.dbUser,
        password: cfg.dbPassword,
        database: CORE_DB_NAME,
        server: cfg.dbHost,
        port: cfg.dbPort ?? 1433,
        connectionTimeout: 120000,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
        options: {
            encrypt: true,
            trustServerCertificate: true,
            requestTimeout: 300000,
        },
    };
}

export function getCorePrisma(client: string): PrismaClient {
    const key = (client || "").trim();
    if (!key) throw new Error("Cliente requerido para conexion a PROD_CORE");

    const existing = prismaByClient.get(key);
    if (existing) return existing;

    const adapter = new PrismaMssql(buildSqlConfig(key));
    const prisma = new PrismaClient({ adapter });
    prismaByClient.set(key, prisma);
    return prisma;
}
