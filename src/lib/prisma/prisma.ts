import "dotenv/config";
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '@/generated/prisma/client';
import clients from "@/config/clients.json";

let prisma: PrismaClient | null = null;
let sqlConfig:{
    user: string;
    password: string;
    database: string;
    server: string;
    pool: {
        max: number;
        min: number;
        idleTimeoutMillis: number;
    };
    options: {
        encrypt: boolean;
        trustServerCertificate: boolean;
        requestTimeout: number;
    };
}

export function getPrisma(client?: string) : PrismaClient {
  for (const clie of clients){
      if(clie.client === client){ 
          configPrisma(clie.dbUser, clie.dbPassword, clie.dbName, clie.dbHost);
      }
  }

  if(!prisma){
    try {
      const adapter = new PrismaMssql(sqlConfig)
      prisma = new PrismaClient({ adapter });
    } catch(err){
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error Prisma:", err);
      throw new Error(`Error al conectarse a la base de datos`)
    }
  }
  return prisma;
}

function configPrisma(dbUser : string, dbPassword : string, dbName : string, server : string) {
  sqlConfig = {
    user: dbUser,
    password: dbPassword,
    database: dbName,
    server: server,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: true, // for azure
      trustServerCertificate: true, // change to true for local dev / self-signed certs
      requestTimeout: 30000 // 30 segundos (default: 15000)
    }
  }
}