import "dotenv/config";
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '@/generated/prisma/client';

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
    };
}

export function getPrisma() {
  if(!prisma){
    const adapter = new PrismaMssql(sqlConfig)
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export function configPrisma(dbUser : string, dbPassword : string, dbName : string, server : string) {
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
      trustServerCertificate: true // change to true for local dev / self-signed certs
    }
  }
}