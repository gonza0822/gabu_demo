import { NextResponse } from "next/server";
import { ParametrosModel } from "@/generated/prisma/models";
import Parameters from "@/lib/models/Parameters";

export type ErrorResponse = { message: string; status: number };

type ParametrosEditable = {
    idmoextra: string;
    fecini?: string | null;
    fecpro?: string | null;
    fecant?: string | null;
    procesa?: boolean;
    IdTipoAmortizacion?: string | null;
    alterna?: boolean;
    /** Si true, viene de "parámetros de simulación": permite editar idmoextra 03. */
    simulationOnly?: boolean;
};

type ParametrosField = { IdCampo: string; BrowNombre: string | null };

type MoextraItem = { idMoextra: string; Descripcion: string | null };

type UserPostRequest =
    | { petition: "Get"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "GetTipAmor"; client: string; data: {} }
    | { petition: "GetParametrosFields"; client: string; data: {} }
    | { petition: "GetMoextra"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "Update"; client: string; data: ParametrosEditable };

export async function POST(
    request: Request
): Promise<NextResponse<Omit<ParametrosModel, "fecrev">[] | ParametrosModel | { key: string; value: string }[] | ParametrosField[] | MoextraItem[] | ErrorResponse>> {
    try {
        const { client, petition, data } = (await request.json()) as UserPostRequest;
        const parametersModel = new Parameters(client, "00");

        switch (petition) {
            case "Get":
                if (data?.simulationOnly) {
                    return NextResponse.json(await parametersModel.getAllBySimula(true));
                }
                return NextResponse.json(await parametersModel.getAllExcept("03"));
            case "GetTipAmor": {
                const list = await parametersModel.getTipAmorOptions();
                return NextResponse.json(
                    list.map((item) => ({
                        key: item.IdInterno ?? "",
                        value: item.Descripcion ?? "",
                    }))
                );
            }
            case "GetParametrosFields":
                return NextResponse.json(await parametersModel.getParametrosFields());
            case "GetMoextra":
                return NextResponse.json(await parametersModel.getMoextra(Boolean(data?.simulationOnly)));
            case "Update": {
                const payload = data as ParametrosEditable;
                if (payload.idmoextra === "03" && !payload.simulationOnly) {
                    return NextResponse.json(
                        { message: "No se puede editar el registro con idmoextra 03", status: 400 },
                        { status: 400 }
                    );
                }
                const updateData: {
                    fecini?: Date | null;
                    fecpro?: Date | null;
                    fecant?: Date | null;
                    procesa?: boolean;
                    IdTipoAmortizacion?: string | null;
                    alterna?: boolean;
                } = {};
                if (payload.fecini !== undefined) updateData.fecini = payload.fecini ? new Date(payload.fecini) : null;
                if (payload.fecpro !== undefined) updateData.fecpro = payload.fecpro ? new Date(payload.fecpro) : null;
                if (payload.fecant !== undefined) updateData.fecant = payload.fecant ? new Date(payload.fecant) : null;
                if (payload.procesa !== undefined) updateData.procesa = payload.procesa;
                if (payload.IdTipoAmortizacion !== undefined) updateData.IdTipoAmortizacion = payload.IdTipoAmortizacion;
                if (payload.alterna !== undefined) updateData.alterna = payload.alterna;
                const updated = await parametersModel.update(payload.idmoextra, updateData);
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
