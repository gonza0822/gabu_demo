'use client';

import React, { ReactElement, useState } from "react";
import AccountIcon from '@/components/svg/menu/AccountIcon';
import MenuItem from '@/components/menu/MenuItem'
import MasterDataIcon from "../svg/menu/MasterDataIcon";
import ProcessesIcon from "../svg/menu/ProcessesIcon";
import InvestmentsIcon from "../svg/menu/InvestmentsIcon";
import NavigationDefaultItem from "./NavigationDefaultItem";
import HelpIcon from "../svg/menu/HelpIcon";
import CloseSessionIcon from "../svg/menu/CloseSessionIcon";
import { useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { authorizationActions } from "@/store/authorization-slice";
import { useRouter } from "next/navigation";

export type Submenu = {
    submenuId: number,
    path: string,
    submenuTitle: string
}

export type Menu = {
    menuId: number,
    menuTitle: string,
    icon: React.ComponentType
    submenu: Submenu[]
}

const menu : Menu[] = [
    {
        menuId: 1,
        menuTitle: "Tablas",
        icon: AccountIcon,
        submenu: [
            {
                submenuId: 1,
                submenuTitle: "Cuentas",
                path: '',
            },
            {
                submenuId: 2,
                submenuTitle: "Centro de costo",
                path: '',
            },
            {
                submenuId: 3,
                submenuTitle: "Plantas",
                path: '',
            },
            {
                submenuId: 4,
                submenuTitle: "Grupos",
                path: '',
            },
            {
                submenuId: 5,
                submenuTitle: "Ubicacion geografica",
                path: '',
            },
            {
                submenuId: 6,
                submenuTitle: "Procedencias",
                path: '',
            },
            {
                submenuId: 7,
                submenuTitle: "Cotizacion M.E",
                path: '',
            },
            {
                submenuId: 8,
                submenuTitle: "Usuarios",
                path: '',
            },
            {
                submenuId: 9,
                submenuTitle: "Unidades de negocio",
                path: '',
            },
            {
                submenuId: 10,
                submenuTitle: "Catalogo",
                path: '',
            },
        ]
    },
    {
        menuId: 2,
        menuTitle: "Datos Maestros",
        icon: MasterDataIcon,
        submenu: [
            {
                submenuId: 1,
                submenuTitle: "Administrar",
                path: '',
            },
            {
                submenuId: 2,
                submenuTitle: "Cambios masivos",
                path: '',
            },
            {
                submenuId: 3,
                submenuTitle: "Manejo de parametros",
                path: '',
            },
            {
                submenuId: 4,
                submenuTitle: "Emision de reportes",
                path: '',
            }
        ]
    },
    {
        menuId: 3,
        menuTitle: "Procesos",
        icon: ProcessesIcon,
        submenu: [
            {
                submenuId: 1,
                submenuTitle: "Calculo de amortizaciones",
                path: '',
            },
            {
                submenuId: 2,
                submenuTitle: "Generacion de asientos",
                path: '',
            },
            {
                submenuId: 3,
                submenuTitle: "Cierre de ejercicio",
                path: '',
            },
        ]
    },
    {
        menuId: 4,
        menuTitle: "Inversiones",
        icon: InvestmentsIcon,
        submenu: [
            {
                submenuId: 1,
                submenuTitle: "Proyectos",
                path: '',
            },
            {
                submenuId: 2,
                submenuTitle: "Ordenes de trabajo",
                path: '',
            },
            {
                submenuId: 3,
                submenuTitle: "Cargos",
                path: '',
            },
        ]
    },
]

export default function NavigationMenu() : ReactElement {
    const [idActive, setIdActive] = useState<number>();
    const dispatch = useDispatch();
    const router = useRouter();

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
                {menu.map(item => <MenuItem key={item.menuId} menuItem={item} onClick={() => handleClickItem(item.menuId)} active={item.menuId === idActive}/>)}
            </ul>

            <ul className="ml-5 mb-[25%] flex flex-col gap-5">
                <NavigationDefaultItem icon={HelpIcon} title="Ayuda" onClick={() => {}}/>
                <NavigationDefaultItem icon={CloseSessionIcon} title="Cerrar sesion" onClick={handleCloseSession}/>
            </ul>
        </nav>
    );
}