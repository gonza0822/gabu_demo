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
import { getClients } from "@/store/authorizationActions";
import { authorizationActions } from "@/store/authorizationSlice";

export default function LoginContainer() : ReactElement {
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

    async function chooseOptionHandler(e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) {
        const target = e.target as HTMLSpanElement;

        if(ref.current){
            ref.current.textContent = target.textContent;
            
            const res = await fetch(`/api/user?client=${ref.current.textContent}`);

            const data = await res.json();

            if(!res.ok){
                setLoginError({
                    message: data.message,
                    isError: true
                });
            } else {
                dispatch(authorizationActions.clientConnect({
                    client: target.textContent || ''
                }));
            }
        }

    }

    const options : {key: string, value: string}[] = getClients().map(option => ({key: option.dbName, value: option.client}));

    return (
        <AnimatePresence mode="wait">
            <Alert message={loginError.message} type="error" show={loginError.isError && !isLogging}/>
            {!isLogging && (
                <motion.div className="w-[90%] h-[85%] rounded-3xl flex overflow-hidden" key="login-container" initial={{opacity: 1}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.5, ease: "easeInOut"}}>
                    <section className="h-full w-[50%] bg-gradient-to-b from-gabu-100 to-gabu-900 rounded-s-3xl p-[4rem] xl:p-[5rem] 2xl:p-[6rem]">
                        <img src="/assets/gabu_logo.png" alt="gabu_logo" className="mt-7 h-[30%]"/>
                        <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold mt-7 xl:mt-[3rem] text-gabu-100 whitespace-pre-line">Hola,
                        Bienvenido!</h1>
                        <p className="text-gabu-100 text-md xl:text-xl 2xl:text-2xl mt-4">Gestion y administracion de bienes de uso</p>
                    </section>
                    <section className="bg-gabu-100 h-full w-[50%] flex justify-center items-center">
                        <LoginForm onLoginError={handleLoginError} loginError={loginError}>
                            <Select label='Seleccione una empresa' options={options} isLogin={true} SelectPointer={SelectPointerLogin} defaultValue={client} chooseOptionHandler={chooseOptionHandler}/>
                        </LoginForm>
                    </section>
                </motion.div>
            )}
            {isLogging && (
                <motion.div className="fixed inset-0 flex items-center justify-center" key="loader" initial={{opacity: 0, y:200}} animate={{opacity: 1, y:0}} exit={{opacity: 0, y:200, transition: { type: "tween", duration: 0.6, ease:"easeInOut"}}} transition={{type: "spring", bounce: 0.7, duration: 0.6, ease: "easeInOut"}}>
                    <Loader/>
                </motion.div>
            )}
        </AnimatePresence>
    );
}