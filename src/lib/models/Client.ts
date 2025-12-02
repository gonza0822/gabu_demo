import { configPrisma } from "../prisma/prisma";
import clients from "@/config/clients.json";

class Client {
    client: string;

    constructor(client: string) {
        this.client = client
    };

    connect() {
        clients.forEach(clie => {
            if(clie.client === this.client){ 
                configPrisma(clie.dbUser, clie.dbPassword, clie.dbName, clie.dbHost)
            }
        })
    }
}

export default Client;