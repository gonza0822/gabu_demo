'use client';

import { ReactElement, useEffect } from "react";
import NavigationMenu from "./NavigationMenu";
import Header from "./Header";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Menu } from "@/store/navSlice";

export default function NavigationContainer({children} : {children : React.ReactNode}) : ReactElement {
    const router = useRouter();

    async function validateSession() {
        const res = await fetch('/api/session?isInSession=true');
    
        const data = await res.json();

        if(!res.ok || (data.status && data.status === 500) || !data.sessionExists){
            router.push('/');
        }
    }


    useEffect(() => {
        validateSession();
    }, []);

    return (      
        <div className="flex items-start h-screen overflow-hidden" id="app">
            <>
                <aside className="h-full w-[20%] bg-gabu-900 flex flex-col min-h-0">
                    <div className="w-full flex justify-center py-3 flex-none">
                        <img src="../assets/gabu_logo.png" alt="gabu_logo" className="brightness-200 h-[80px] w-[80px] btn-home cursor-pointer" onClick={() => router.push('/home')}/>
                    </div>
                    <NavigationMenu/>
                </aside>
                <div className="flex flex-col flex-grow-0 w-full h-full min-h-0">
                    <Header/>
                    {children}
                </div>
            </>
        </div>
    );
}