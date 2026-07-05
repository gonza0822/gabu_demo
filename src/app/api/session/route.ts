import { NextResponse } from "next/server";
import { deleteSessionStore, setSessionStore, getSessionValue } from "@/lib/session/sessionStore";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";

type ErrorResponse = {
    message: string,
    status: number,
    requestId?: string,
}

type SessionGetResponse = {
    sessionExists: boolean
}

const ROUTE = '/api/session';

export async function GET(request: Request) : Promise<NextResponse<SessionGetResponse | ErrorResponse>> {
    const requestId = createRequestId();

    try {
        const params = new URL(request.url)
        const isInSession : string | null = params.searchParams.get("isInSession");

        if(isInSession){
            const token = await getSessionValue("token");
            if(token){
                return NextResponse.json({
                    sessionExists: true
                });
            } else {
                await setSessionStore("alertMessage", "Tu sesion caducó, por favor inicia sesión nuevamente.", 10);

                return NextResponse.json({
                    sessionExists: false
                });
            }

        } else {
            throw new Error("Paremetros invalidos.");
        }
    } catch(err) {
        const loggedId = await logApiError({ route: ROUTE, err, petition: 'GET', requestId });
        if(err instanceof Error){
            return errorJson(err.message, 500, loggedId);
        }

        return errorJson('Error desconocido en el servidor.', 500, loggedId);
    }

}
