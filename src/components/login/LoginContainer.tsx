'use client';

import { RootState } from "@/store";
import { ReactElement, ReactNode, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Loader from "../ui/Loader";
import Select from '@/components/ui/Select'
import SelectPointerLogin from '@/components/svg/SelectPointerLogin';
import LoginForm from '@/components/login/LoginForm';
import { motion, AnimatePresence } from "motion/react";
import Alert from "@/components/ui/Alert";

export default function LoginContainer() : ReactElement {
    const isLogging : boolean = useSelector((state : RootState) => state.authorization.isLogging);

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

    const options = ['Ypf', 'Shell', 'Axion'];

    return (
        <AnimatePresence mode="wait">
            <Alert message={loginError.message} type="error" show={loginError.isError && !isLogging}/>
            {!isLogging && (
                <motion.div className="w-[90%] h-[85%] rounded-3xl flex overflow-hidden" key="login-container" initial={{opacity: 1}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.5, ease: "easeInOut"}}>
                    <section className="h-full w-[50%] bg-gradient-to-b from-gabu-100 to-gabu-900 rounded-s-3xl p-[6rem]">
                        <img src="/assets/gabu_logo.png" alt="gabu_logo" className="mt-7"/>
                        <h1 className="text-6xl font-bold mt-[3rem] text-gabu-100 whitespace-pre-line">Hola,
                        Bienvenido!</h1>
                        <p className="text-gabu-100 text-2xl mt-4">Gestion y administracion de bienes de uso</p>
                    </section>
                    <section className="bg-gabu-100 h-full w-[50%] flex justify-center items-center">
                        <LoginForm onLoginError={handleLoginError} loginError={loginError}>
                            <Select label='Seleccione una empresa' options={options} isLogin={true} SelectPointer={SelectPointerLogin}/>
                        </LoginForm>
                    </section>
                </motion.div>
            )}
            {isLogging && (
                <motion.div className="fixed inset-0 flex items-center justify-center" key="loader" initial={{opacity: 0, y:200}} animate={{opacity: 1, y:0}} exit={{opacity: 0, y:200, transition: { type: "tween", duration: 0.6, ease:"easeInOut"}}} transition={{type: "spring", damping: 20, stiffness:900, duration: 0.6, ease: "easeInOut"}}>
                    <Loader/>
                </motion.div>
            )}
        </AnimatePresence>
    );
}