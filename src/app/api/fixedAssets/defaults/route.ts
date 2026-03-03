import { NextResponse } from "next/server";
import Defaults, { type DefaultRow, type OptionItem } from "@/lib/models/Defaults";

export type ErrorResponse = { message: string; status: number };

type DefaultsField = { IdCampo: string; BrowNombre: string | null };

type UserPostRequest =
    | { petition: "Get"; client: string; data: {} }
    | { petition: "GetOptions"; client: string; data: { idcampo: string } }
    | { petition: "GetDefaultsFields"; client: string; data: {} }
    | { petition: "Update"; client: string; data: { idcampo: string; iddefault: string | null } };

export async function POST(
    request: Request
): Promise<NextResponse<DefaultRow[] | OptionItem[] | DefaultRow | DefaultsField[] | ErrorResponse>> {
    try {
        const { client, petition, data } = (await request.json()) as UserPostRequest;
        if (!client) {
            return NextResponse.json({ message: "Client is required", status: 400 }, { status: 400 });
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
                    return NextResponse.json(
                        { message: "idcampo is required", status: 400 },
                        { status: 400 }
                    );
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
        if (err instanceof Error) {
            console.log(err);
            return NextResponse.json({ message: err.message, status: 500 }, { status: 500 });
        }
        return NextResponse.json({ message: "Error desconocido", status: 500 }, { status: 500 });
    }
}
