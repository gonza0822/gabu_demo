'use client';

import { RootState } from "@/store";
import { ReactElement, ReactNode, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../ui/Loader";
import Select from '@/components/ui/Select'
import SelectPointerLogin from '@/components/svg/SelectPointerLogin';
import LoginForm from '@/components/login/LoginForm';
import { motion, AnimatePresence } from "motion/react";
import Alert from "@/components/ui/Alert";
import { formatApiErrorFromBody } from "@/lib/logger/apiError";
import { getClients } from "@/store/authorizationActions";
import { authorizationActions } from "@/store/authorizationSlice";

export default function LoginContainer({ alertMessage } : { alertMessage: string | null }) : ReactElement {
    const isLogging : boolean = useSelector((state : RootState) => state.authorization.isLogging);
    const client : string = useSelector((state : RootState) => state.authorization.client);
    const dispatch = useDispatch();

    const [loginError, setLoginError] = useState<{
        message: string | null,
        isError: boolean
    }>({
        message: null,
        isError: false
    });

    function handleLoginError(message: string | null, isError: boolean) {
        setLoginError({
            message: message,
            isError: isError
        });
    }

    useEffect(() => {
        if(alertMessage){
            setLoginError({
                message: alertMessage,
                isError: true
            });
        }
    }, [alertMessage]);

    async function chooseOptionHandler(e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) {
        const target = e.target as HTMLSpanElement;

        if(ref.current){
            ref.current.textContent = target.textContent;
            
            const res = await fetch(`/api/user?client=${ref.current.textContent}`);

            const data = await res.json();

            if(!res.ok || (data.status && data.status === 500)){
                setLoginError({
                    message: formatApiErrorFromBody(data, "Error al conectar con el cliente"),
                    isError: true
                });
            } else {
                try {
                    window.localStorage.setItem("gabu-client", target.textContent || "");
                } catch {
                    /* noop */
                }
                dispatch(authorizationActions.clientConnect({
                    client: target.textContent || ''
                }));
            }
        }

    }

    const options : {key: string, value: string}[] = getClients().map(option => ({key: option.dbName, value: option.client}));

    return (
        <AnimatePresence mode="wait">
            <Alert message={loginError.message} type="error" show={loginError.isError && !isLogging} key="alert"/>
            {!isLogging && (
                <motion.div className="flex h-full w-full flex-col overflow-y-auto overscroll-contain rounded-none md:h-[85%] md:w-[90%] md:flex-row md:overflow-hidden md:rounded-3xl" key="login-container" initial={{opacity: 1}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.5, ease: "easeInOut"}}>
                    <section className="flex w-full shrink-0 flex-col justify-end bg-gabu-900 px-7 pb-6 pt-[max(2.25rem,env(safe-area-inset-top))] md:h-full md:w-[50%] md:justify-start md:rounded-s-3xl md:bg-gradient-to-b md:from-gabu-100 md:to-gabu-900 md:p-[4rem] xl:p-[5rem] 2xl:p-[6rem]">
                        <div className="w-fit rounded-2xl bg-gabu-100 p-2.5 md:contents">
                            <img src="/assets/gabu_logo.png" alt="GABU" className="h-14 w-auto object-contain md:mt-7 md:h-[30%]"/>
                        </div>
                        <h1 className="mt-5 text-[1.75rem] font-bold leading-tight text-gabu-100 whitespace-pre-line md:mt-7 md:text-4xl xl:mt-[3rem] xl:text-5xl 2xl:text-6xl">Hola,
                        Bienvenido!</h1>
                        <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-gabu-300 md:mt-4 md:max-w-none md:text-md md:text-gabu-100 xl:text-xl 2xl:text-2xl">Gestion y administracion de bienes de uso</p>
                    </section>
                    <section className="flex w-full flex-1 flex-col justify-start rounded-t-[1.75rem] bg-gabu-100 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_40px_rgba(7,23,57,0.35)] md:h-full md:w-[50%] md:items-center md:justify-center md:rounded-none md:p-0 md:shadow-none">
                        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gabu-300 md:hidden" aria-hidden="true" />
                        <LoginForm onLoginError={handleLoginError} loginError={loginError}>
                            <Select label='Seleccione una empresa' options={options} isLogin={true} defaultValue={client} chooseOptionHandler={chooseOptionHandler}/>
                        </LoginForm>
                    </section>
                </motion.div>
            )}
            {isLogging && (
                <Loader msg="Validando usuario..." key="loader"/>
            )}
        </AnimatePresence>
    );
}