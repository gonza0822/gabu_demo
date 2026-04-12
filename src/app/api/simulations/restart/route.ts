import { NextResponse } from "next/server";
import FixedAsset from "@/lib/models/fixedAssets/FixedAsset";

/** Límite de runtime en hosts que lo respetan (p. ej. Vercel); el batch puede tardar varios minutos. */
export const maxDuration = 900;

type Body =
    | { petition: "GetLibros"; client: string }
    | { petition: "Reiniciar"; client: string; data: { idMoextra: string } };

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = (await request.json()) as Body;
        const { client, petition } = body;

        if (!client) {
            return NextResponse.json({ message: "Client is required", status: 400 }, { status: 400 });
        }

        const fixedAssetModel = new FixedAsset(client);

        if (petition === "GetLibros") {
            return NextResponse.json(await fixedAssetModel.getLibrosParaReinicioSimulacion());
        }

        if (petition === "Reiniciar") {
            const idMoextra = body.data?.idMoextra;
            if (!idMoextra || typeof idMoextra !== "string") {
                return NextResponse.json({ message: "idMoextra es requerido", status: 400 }, { status: 400 });
            }
            try {
                const result = await fixedAssetModel.reiniciarSimulacionDesdeLibro(idMoextra);
                return NextResponse.json(result);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return NextResponse.json({ message: msg, status: 400 }, { status: 400 });
            }
        }

        return NextResponse.json({ message: "Petición no reconocida", status: 400 }, { status: 400 });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ message: msg, status: 500 }, { status: 500 });
    }
}
