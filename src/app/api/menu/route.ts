import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Menu } from '@/store/navSlice';
import { cookies } from 'next/headers';
import { setSessionStore, getSessionValue } from '@/lib/session/sessionStore';
import LZString from 'lz-string';

type ErrorResponse = {
    message: string,
    status: number
}

type PostResponse = {
    success: boolean
}

export async function POST(request: Request) : Promise<NextResponse<PostResponse | ErrorResponse>> {
    try {
        const token = await getSessionValue("token");
        if(!token){
            return NextResponse.json({
                message: "No autorizado",
                status: 401
            });
        }

        const menuJson : string = await request.text();

        await setSessionStore("menu", LZString.compressToBase64(menuJson), 60 * 60 * 24);
        
        return NextResponse.json({ success: true });
    } catch (err) {

        return NextResponse.json({
            message: "Error guardando el menu",
            status: 500
        });
    }
}

export async function GET() : Promise<NextResponse<Menu | ErrorResponse>> {
    try {
        const compressedMenu : string | null = await getSessionValue("menu");

        if(compressedMenu){
            const menuJson : string | null = LZString.decompressFromBase64(compressedMenu) || null;
            if(menuJson){
                const menu : Menu = JSON.parse(menuJson);
                return NextResponse.json(menu);
            } else {
                throw new Error("Error al descomprimir el menu.");
            } 
        } else {
            throw new Error("No se encontro el menu en la sesion.");
        }
    } catch (err) {

        return NextResponse.json({
            message: "Error obteniendo el menu",
            status: 500
        });
    }
}