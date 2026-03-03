import { NextResponse } from "next/server";
import { deleteSessionStore, setSessionStore, getSessionValue } from "@/lib/session/sessionStore";
import { th } from "motion/react-client";

type ErrorResponse = {
    message: string,
    status: number
}

type SessionGetResponse = {
    sessionExists: boolean
}

export async function GET(request: Request) : Promise<NextResponse<SessionGetResponse | ErrorResponse>> {
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
        if(err instanceof Error){
            return NextResponse.json({
                message: err.message,
                status: 500
            })
        }

        return NextResponse.json({
            message: 'Error desconocido en el servidor.',
            status: 500
        });
    }

}