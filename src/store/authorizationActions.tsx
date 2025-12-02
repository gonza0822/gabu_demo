import clients from "@/config/clients.json";

export function getClients() : {client: string, dbName: string}[] {
    return clients.map(client => ({
        client: client.client,
        dbName: client.dbName
    }));
}