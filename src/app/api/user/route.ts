import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import { NextResponse } from 'next/server';
import { deleteSessionStore, setSessionStore } from '@/lib/session/sessionStore';

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
    status: number
}

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

export async function POST(request: Request) : Promise<NextResponse<UserPostResponse | ErrorResponse>> {
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { userName, password, client } : UserPostRequest = await request.json();

        if(!userName || !password){
            throw new Error("Por favor intruduzca el usuario y contraseña.");
        } else {
            const user : User = new User(userName, password, client);

            const loginRes = await user.login();

            if(loginRes.result){
                await setSessionStore('token', loginRes.token, loginRes.expirationSeconds);

                return  NextResponse.json({
                    user: userName,
                    supervisor: loginRes.supervisor,
                })
            } else {
                throw new Error(getLoginErrorMessage(loginRes.reason, client));
            }
        }
    } catch(err){
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

export async function GET(request: Request) : Promise<NextResponse<boolean | ErrorResponse>> {
    try {
        const params = new URL(request.url)
        const clientName = params.searchParams.get("client");
        
        if(clientName){
            const client = new Client(clientName);

            await client.connect();
            
            return NextResponse.json(true);
        }
        
        if(params.searchParams.get("closeSession")){
            await deleteSessionStore('token');
            return NextResponse.json(true);
        }
        
        throw new Error("No se eligio un cliente");
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

