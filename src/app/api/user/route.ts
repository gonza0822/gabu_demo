import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import { NextResponse } from 'next/server';

type UserPostRequest = {
    userName: string,
    password: string,
    client: string
}

type UserPostResponse = {
    token: string,
    user: string
}

type ErrorResponse = {
    message: string,
    status: number
}

export async function POST(request: Request) : Promise<NextResponse<UserPostResponse | ErrorResponse>> {
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { userName, password, client } : UserPostRequest = await request.json();

        if(!userName || !password){
            throw new Error("Por favor intruduzca el usuario y contraseña.");
        } else {
            const user : User = new User(userName, password, client);

            const loginRes : { result : boolean, token : string} = await user.login();

            if(loginRes.result){
                return  NextResponse.json({
                    token: loginRes.token,
                    user: userName
                })
            } else {
                throw new Error("Credenciales invalidas para el cliente "+client+".");
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

            client.connect();
            
            return NextResponse.json(true);
        } else {
            throw new Error("No se eligio un cliente");
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

