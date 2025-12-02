'use client';

import React, { ReactElement, useState } from "react";
import MenuItem from '@/components/menu/MenuItem'
import NavigationDefaultItem from "./NavigationDefaultItem";
import HelpIcon from "../svg/menu/HelpIcon";
import CloseSessionIcon from "../svg/menu/CloseSessionIcon";
import { useDispatch, useSelector } from "react-redux";
import { authorizationActions } from "@/store/authorizationSlice";
import { useRouter } from "next/navigation";
import { Menu } from "@/store/navSlice";
import { RootState } from "@/store";

export default function NavigationMenu() : ReactElement {
    const [idActive, setIdActive] = useState<number>();
    const dispatch = useDispatch();
    const router = useRouter();
    const client : string = useSelector((state : RootState) => state.authorization.client);
    if(client === ''){
        router.push('/');
    }
    const clientMenu : Menu = useSelector((state: RootState) => state.nav.find((m : Menu) => m.client === client)!);

    function handleClickItem(id : number) {
        setIdActive(prevId => (id === prevId ? 0 : id));
    }

    function handleCloseSession(e: React.MouseEvent<HTMLLIElement>) {
        dispatch(authorizationActions.logout());
        router.push('/');
    }

    return (
        <nav className="w-full flex flex-col justify-between grow">
            <ul>
                {clientMenu.menu.map((item, index) => <MenuItem key={index} menuId={index} menuItem={item} onClick={() => handleClickItem(index)} active={index === idActive}/>)}
            </ul>

            <ul className="ml-5 mb-[25%] flex flex-col gap-5">
                <NavigationDefaultItem icon={HelpIcon} title="Ayuda" onClick={() => {}}/>
                <NavigationDefaultItem icon={CloseSessionIcon} title="Cerrar sesion" onClick={handleCloseSession}/>
            </ul>
        </nav>
    );
}