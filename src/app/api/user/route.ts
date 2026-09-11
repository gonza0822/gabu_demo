import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import { NextResponse } from 'next/server';
import { deleteSessionStore, setSessionStore } from '@/lib/session/sessionStore';
import { createRequestId, errorJson, logApiError } from '@/lib/logger';

type UserPostRequest = {
    userName: string,
    password: string,
    client: string
}

type UserPostResponse = {
    user: string,
    supervisor: boolean
}

type ErrorResponse = {
    message: string,
    status: number,
    requestId?: string,
}

const ROUTE = '/api/user';

function getLoginErrorMessage(
    reason: "connection_error" | "invalid_credentials" | "invalid_response" | "expired",
    client: string
): string {
    switch (reason) {
        case "connection_error":
            return "No se pudo conectar con el servicio de autenticación. Verifique que esté en ejecución.";
        case "invalid_response":
            return "El servicio de autenticación devolvió una respuesta inválida.";
        case "expired":
            return "La sesión devuelta por el servicio de autenticación ya expiró.";
        default:
            return "Credenciales invalidas para el cliente " + client + ".";
    }
}

/** Errores esperados del login: no se loguean ni llevan requestId. */
function isExpectedLoginFailure(
    reason: "connection_error" | "invalid_credentials" | "invalid_response" | "expired"
): reason is "invalid_credentials" {
    return reason === "invalid_credentials";
}

export async function POST(request: Request) : Promise<NextResponse<UserPostResponse | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | undefined;

    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const body : UserPostRequest = await request.json();
        client = body.client;
        const { userName, password } = body;

        if(!userName || !password){
            return errorJson("Por favor intruduzca el usuario y contraseña.", 400);
        }

        const user : User = new User(userName, password, client);
        const loginRes = await user.login();

        if(loginRes.result){
            await setSessionStore('token', loginRes.token, loginRes.expirationSeconds);
            await setSessionStore('user', userName.trim(), loginRes.expirationSeconds);
            await setSessionStore('client', client, loginRes.expirationSeconds);

            return  NextResponse.json({
                user: userName,
                supervisor: loginRes.supervisor,
            })
        }

        const message = getLoginErrorMessage(loginRes.reason, client);

        if (isExpectedLoginFailure(loginRes.reason)) {
            return errorJson(message, 401);
        }

        const loggedId = await logApiError({
            route: ROUTE,
            err: new Error(message),
            client,
            petition: 'POST',
            requestId,
            extra: { reason: loginRes.reason },
        });
        return errorJson(message, 500, loggedId);
    } catch(err){
        const loggedId = await logApiError({ route: ROUTE, err, client, petition: 'POST', requestId });
        if(err instanceof Error){
            return errorJson(err.message, 500, loggedId);
        }

        return errorJson('Error desconocido en el servidor.', 500, loggedId);
    }
}

export async function GET(request: Request) : Promise<NextResponse<boolean | ErrorResponse>> {
    const requestId = createRequestId();
    let clientName: string | null = null;

    try {
        const params = new URL(request.url)
        clientName = params.searchParams.get("client");
        
        if(clientName){
            const client = new Client(clientName);

            await client.connect();
            
            return NextResponse.json(true);
        }
        
        if(params.searchParams.get("closeSession")){
            await deleteSessionStore('token');
            await deleteSessionStore('user');
            await deleteSessionStore('client');
            await deleteSessionStore('menu');
            return NextResponse.json(true);
        }
        
        throw new Error("No se eligio un cliente");
    } catch(err) {
        const loggedId = await logApiError({
            route: ROUTE,
            err,
            client: clientName ?? undefined,
            petition: 'GET',
            requestId,
        });
        if(err instanceof Error){
            return errorJson(err.message, 500, loggedId);
        }

        return errorJson('Error desconocido en el servidor.', 500, loggedId);
    }

}
