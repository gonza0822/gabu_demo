'use client';

import React, { ReactElement, useRef, useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { Dispatch } from "@reduxjs/toolkit";
import { authorizationActions } from "@/store/authorizationSlice";
import { useRouter } from "next/navigation";
import { prefetchFixedAssetsBootstrap } from "@/lib/cache/fixedAssetsBootstrapCache";
import { prefetchHomeDashboard } from "@/lib/cache/homeDashboardCache";
import { formatApiErrorFromBody } from "@/lib/logger/apiError";

export default function LoginForm({ children, onLoginError, loginError } : { children : React.ReactNode, onLoginError: (message: string | null, isError: boolean) => void, loginError: { message: string | null, isError: boolean } }) : ReactElement {
    const isConnected : boolean = useSelector((state : RootState) => state.authorization.connected);
    const client : string = useSelector((state : RootState) => state.authorization.client);
    const [inputErrors, setInputErrors] = useState<{
        usernameError: boolean,
        passwordError: boolean
    }>({
        usernameError: false,
        passwordError: false    
    });

    const dispatch : Dispatch = useDispatch();
    const router = useRouter();

    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    async function handleLogin(e: React.MouseEvent){
        e.preventDefault();
        // Logic to handle login
        dispatch(authorizationActions.LogginIn({isLogging: true}));

        if(usernameRef.current!.value === '' || passwordRef.current!.value === ''){
            dispatch(authorizationActions.LogginIn({isLogging: false}));
            setInputErrors({
                usernameError: usernameRef.current!.value === '',
                passwordError: passwordRef.current!.value === ''
            });
            return;
        }

        const res = await fetch('/api/user',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userName: usernameRef.current?.value,
                password: passwordRef.current?.value,
                client: client
            }),
        })

        const data = await res.json();

        if(res.ok && data.user){
            void prefetchFixedAssetsBootstrap(client).catch(() => null);
            void prefetchHomeDashboard(client).catch(() => null);
            dispatch(authorizationActions.login({
                user: data.user,
                supervisor: !!data.supervisor,
            }));
            router.push('/home');
        } else {
            onLoginError(formatApiErrorFromBody(data, "Error al iniciar sesión"), true);
            dispatch(authorizationActions.LogginIn({isLogging: false}));
            console.log(data);
        }
    }

    function handleUsernameInput(){
        setInputErrors(previnputErrors => ({
            ...previnputErrors,
            usernameError: false
        }));
    }

    function handlePasswordInput(){
        setInputErrors(previnputErrors => ({
            ...previnputErrors,
            passwordError: false
        }));
    }

    return (
        <form className="flex w-full flex-1 flex-col gap-4 md:w-[50%] md:flex-none md:gap-2">
            <div className="md:hidden">
                <p className="text-lg font-semibold tracking-tight text-gabu-900">Iniciar sesión</p>
                <p className="mt-1 text-sm text-gabu-700">Ingresá con tu usuario de GABU</p>
            </div>
            {children}
            <Input label='Usuario' isLogin={true} disabled={!isConnected} type="text" ref={usernameRef} isError={inputErrors.usernameError} errorMessage={inputErrors.usernameError ? 'The username is required' : null} handleInput={handleUsernameInput}/>
            <Input label='Contraseña' isLogin={true} disabled={!isConnected} type="password" ref={passwordRef} isError={inputErrors.passwordError} errorMessage={inputErrors.passwordError ? 'The password is required' : null} handleInput={handlePasswordInput}/>
            <div className="mt-auto flex flex-col gap-3 md:mt-0 md:contents">
            {!isConnected ? (
                <p className="text-xs font-medium leading-relaxed text-gabu-700 md:hidden">Elegí una empresa para habilitar el ingreso</p>
            ) : null}
            <Button text='Ingresar' disabled={!isConnected} type="submit" handleClick={handleLogin} style="btn-register w-full min-h-12 bg-gabu-900 text-gabu-100 rounded-xl p-3 text-base font-semibold mt-0 hover:bg-gabu-700 transition-colors duration-200 cursor-pointer touch-manipulation md:min-h-0 md:rounded-md md:p-2 md:text-lg md:font-normal md:mt-7"/>
            </div>
        </form>
    );
}