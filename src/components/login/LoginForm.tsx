'use client';

import React, { ReactElement, useRef, useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { Dispatch } from "@reduxjs/toolkit";
import { authorizationActions } from "@/store/authorizationSlice";
import { useRouter } from "next/navigation";

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

        if(res.ok && data.token){
            dispatch(authorizationActions.login({
                user: data.user,
                token: data.token,
            }));
            router.push('/home');
        } else {
            onLoginError(data.message, true);
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
        <form className="flex flex-col gap-2 w-[50%]">
            {children}
            <Input label='Usuario' isLogin={true} disabled={!isConnected} type="text" ref={usernameRef} isError={inputErrors.usernameError} errorMessage={inputErrors.usernameError ? 'The username is required' : null} handleInput={handleUsernameInput}/>
            <Input label='Contraseña' isLogin={true} disabled={!isConnected} type="password" ref={passwordRef} isError={inputErrors.passwordError} errorMessage={inputErrors.passwordError ? 'The password is required' : null} handleInput={handlePasswordInput}/>
            <Button text='Ingresar' isLogin={true} disabled={!isConnected} type="submit" handleClick={handleLogin}/>
        </form>
    );
}