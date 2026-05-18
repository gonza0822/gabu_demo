'use client';

import React, { ReactElement, useState, useEffect } from "react";
import MenuItem from '@/components/menu/MenuItem'
import NavigationDefaultItem from "./NavigationDefaultItem";
import HelpIcon from "../svg/menu/HelpIcon";
import CloseSessionIcon from "../svg/menu/CloseSessionIcon";
import { useDispatch, useSelector } from "react-redux";
import { authorizationActions } from "@/store/authorizationSlice";
import { useRouter } from "next/navigation";
import { Menu } from "@/store/navSlice";
import { RootState } from "@/store";
import { MenuObj, navActions, Submenu } from "@/store/navSlice";
import { clearFixedAssetsBootstrapCache } from "@/lib/cache/fixedAssetsBootstrapCache";
import { clearLibrosFormCache } from "@/lib/cache/librosFormCache";

export default function NavigationMenu() : ReactElement {
    const [idActive, setIdActive] = useState<number | null>(null);
    const dispatch = useDispatch();
    const router = useRouter();
    const client : string = useSelector((state : RootState) => state.authorization.client);
    const clientMenu : Menu | undefined = useSelector((state: RootState) => state.nav.find((m : Menu) => m.client === client));

    function handleClickItem(id : number) {
        setIdActive(prevId => (id === prevId ? null : id));
    }

    async function handleCloseSession(e: React.MouseEvent<HTMLLIElement>) {
        await fetch(`/api/user?closeSession=true`);
        if (client) {
            clearFixedAssetsBootstrapCache(client);
            clearLibrosFormCache(client);
        }
        try {
            window.localStorage.removeItem("gabu-client");
        } catch {
            /* noop */
        }
        dispatch(authorizationActions.logout());
    }

    async function loadMenu() {
        const res = await fetch(`/api/menu`);

        const data = await res.json();

        if(res.ok && data.menu){
            const maxOrder : number = data.menu.flatMap((m : MenuObj) => m.submenu).reduce((max : number, submenu : Submenu) => submenu.order > max ? submenu.order : max, 0);
            dispatch(navActions.setCompletemNav({
                menu: {
                    client: client,
                    menu: data.menu,
                    maxOrder: maxOrder
                },
                client: client
            }));
        }
    }

    useEffect(() => {
        if (!client) {
            return;
        }
        loadMenu();
    }, [client]);

    return (
        <nav className="w-full flex flex-col grow min-h-0">
            <ul className="menu-main-list flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                {clientMenu?.menu && clientMenu.menu.map((item, index) => <MenuItem key={index} menuId={index} menuItem={item} onClick={() => handleClickItem(index)} active={index === idActive}/>)}
            </ul>

            <ul className="menu-footer-list ml-5 mb-4 mt-3 flex flex-col gap-4 shrink-0">
                <NavigationDefaultItem icon={HelpIcon} title="Ayuda" onClick={() => {}}/>
                <NavigationDefaultItem icon={CloseSessionIcon} title="Cerrar sesion" onClick={handleCloseSession}/>
            </ul>
        </nav>
    );
}