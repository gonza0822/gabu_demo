'use client';

import React, { ReactElement, useState } from "react";
import SubmenuItem from "./SubmenuItem";
import Arrow from "../svg/Arrow";
import { motion, AnimatePresence } from "motion/react";
import { MenuObj } from "@/store/navSlice";
import { getIcon } from "@/store/navActions";

export default function MenuItem({menuItem, active, onClick, menuId} : {menuItem : MenuObj, active: boolean, onClick: () => void, menuId: number}) : ReactElement {
    const Icon : React.ComponentType = getIcon(menuItem.icon);

    const maxSubmenuId = menuItem.submenu.length - 1;

    return (
        <li className="flex flex-col cursor-pointer select-none" onClick={onClick}>
            <div className="tabla-item flex justify-between px-2 2xl:px-4 py-2 items-center border-y-1 group hover:border-gabu-100 transition-all duration-150 border-gabu-300" key={menuId}>
                <div className="flex gap-3 h-full items-center">
                    <Arrow height={10} width={10} color="text-gabu-300" hoverStyle="group-hover:text-gabu-100" defaultRotation="rotate-0" activeRotation="rotate-90" active={active}/>
                    <p className="text-gabu-300 group-hover:text-gabu-100 text-sm 2xl:text-lg transition-all duration-150">{menuItem.menuTitle}</p>
                </div>
                <Icon/>
            </div>
            <motion.div className="overflow-hidden ease-linear" initial={false} animate={{height: active ? "auto" : 0}} transition={{duration: 0.3, ease: "easeInOut"}} onClick={(e : React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                <ul className="ml-[6%] xl:ml-[10%] overflow-x-auto max-h-[12rem] xl:max-h-[20rem] 2xl:max-h-[28rem]">
                    {menuItem.submenu.map((menu, index) => <SubmenuItem key={index} submenuId={index} menuId={menuId} submenuItem={menu} isTheLast={maxSubmenuId === index}/>)}
                </ul>
            </motion.div>
        </li>
    );
}