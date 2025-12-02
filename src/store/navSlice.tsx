import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import menu from '@/config/menu.json';
import { makeStrictEnum } from "@prisma/client/runtime/index-browser";

export type Submenu = {
    path: string,
    submenuTitle: string,
    isOpen: boolean,
    active: boolean
}

export type Menu = {
    client: string,
    menu: MenuObj[]
}

export type MenuObj = {
    menuTitle: string,
    icon: string,
    submenu: Submenu[]
}

const initialNavState : Menu[] = menu

const navSlice = createSlice({
    name: 'navSlice',
    initialState: initialNavState,
    reducers: {
        openPage(state: Menu[], action: PayloadAction<{client: string, submenuId: number, menuId: number}>) {
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId].isOpen = true;
                menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId].active = true;
            }
        },
        closePage(state: Menu[], action: PayloadAction<{client: string, submenuId: number, menuId: number}>){
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId].isOpen = false;
                menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId].active = false;
            }
        },
        activePage(state: Menu[], action: PayloadAction<{client: string, submenuId: number, menuId: number}>){
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId].active = true;
            }
        },
        disablePage(state: Menu[], action: PayloadAction<{client: string, submenuId: number, menuId: number}>){
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId].active = false;
            }
        },
    }
});

export const navActions = navSlice.actions;

export default navSlice.reducer;

