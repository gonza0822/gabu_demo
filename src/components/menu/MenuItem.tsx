'use client';

import React, { ReactElement, useState } from "react";
import { Menu } from "./NavigationMenu";
import SubmenuItem from "./SubmenuItem";
import Arrow from "../svg/Arrow";
import { motion, AnimatePresence } from "motion/react";

export default function MenuItem({menuItem, active, onClick} : {menuItem : Menu, active: boolean, onClick: () => void}) : ReactElement {
    const Icon : React.ComponentType = menuItem.icon;

    const maxSubmenuId = menuItem.submenu[menuItem.submenu.length - 1].submenuId;

    return (
        <li className="flex flex-col cursor-pointer select-none" onClick={onClick}>
            <div className="tabla-item flex justify-between px-2 2xl:px-4 py-2 items-center border-y-1 group hover:border-gabu-100 transition-all duration-150 border-gabu-300" key={menuItem.menuId}>
                <div className="flex gap-3 h-full items-center">
                    <Arrow height={10} width={10} color="text-gabu-300" hoverStyle="group-hover:text-gabu-100" defaultRotation="rotate-0" activeRotation="rotate-90" active={active}/>
                    <p className="text-gabu-300 group-hover:text-gabu-100 text-sm 2xl:text-lg transition-all duration-150">{menuItem.menuTitle}</p>
                </div>
                <Icon/>
            </div>
            <motion.div className="overflow-hidden ease-linear" initial={false} animate={{height: active ? "auto" : 0}} transition={{duration: 0.3, ease: "easeInOut"}}>
                <ul className="ml-[6%] xl:ml-[10%] overflow-x-auto max-h-[12rem] xl:max-h-[20rem] 2xl:max-h-none">
                    {menuItem.submenu.map(menu => <SubmenuItem key={menu.submenuId} submenuItem={menu} isTheLast={maxSubmenuId === menu.submenuId}/>)}
                </ul>
            </motion.div>
        </li>
    );
}