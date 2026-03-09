import { getPrisma } from "../prisma/prisma";
import clients from "@/config/clients.json";

class Client {
    client: string;

    constructor(client: string) {
        this.client = client
    };

    async connect() {
        for (const clie of clients){
            if(clie.client === this.client){ 
                try {
                    const prisma = getPrisma(this.client)
                    const usuarios = await prisma.usuarios.findMany()
                } catch (err){
                    const message = err instanceof Error ? err.message : String(err);
                    console.error("Error de conexión:", err);
                    throw new Error(`Ocurrió un error al conectarse a la base de datos`)
                }
            }
        }
    }
}

export default Client;