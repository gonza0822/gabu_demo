import { NextResponse } from "next/server";
import Defaults, { type DefaultRow, type OptionItem } from "@/lib/models/Defaults";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";

export type ErrorResponse = { message: string; status: number; requestId?: string };

const ROUTE = "/api/fixedAssets/defaults";

type DefaultsField = { IdCampo: string; BrowNombre: string | null };

type UserPostRequest =
    | { petition: "Get"; client: string; data: Record<string, never> }
    | { petition: "GetOptions"; client: string; data: { idcampo: string } }
    | { petition: "GetDefaultsFields"; client: string; data: Record<string, never> }
    | { petition: "Update"; client: string; data: { idcampo: string; iddefault: string | null } };

export async function POST(
    request: Request
): Promise<NextResponse<DefaultRow[] | OptionItem[] | DefaultRow | DefaultsField[] | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | undefined;
    let petition: string | undefined;

    try {
        const body = (await request.json()) as UserPostRequest;
        client = body.client;
        petition = body.petition;
        const { data } = body;
        if (!client) {
            return errorJson("Client is required", 400, requestId);
        }
        const defaultsModel = new Defaults(client);

        switch (petition) {
            case "Get":
                return NextResponse.json(await defaultsModel.getAll());
            case "GetOptions": {
                const payload = data as { idcampo: string };
                return NextResponse.json(await defaultsModel.getOptions(payload.idcampo ?? ""));
            }
            case "GetDefaultsFields":
                return NextResponse.json(await defaultsModel.getDefaultsFields());
            case "Update": {
                const payload = data as { idcampo: string; iddefault: string | null };
                if (payload.idcampo == null || payload.idcampo === "") {
                    return errorJson("idcampo is required", 400, requestId);
                }
                const updated = await defaultsModel.update(
                    payload.idcampo,
                    payload.iddefault ?? null
                );
                return NextResponse.json(updated);
            }
            default:
                throw new Error("Petición desconocida");
        }
    } catch (err) {
        const loggedId = await logApiError({ route: ROUTE, err, client, petition, requestId });
        if (err instanceof Error) {
            return errorJson(err.message, 500, loggedId);
        }
        return errorJson("Error desconocido", 500, loggedId);
    }
}
