import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import menuConfig from '@/config/menu.json'

export type Submenu = {
    path: string,
    submenuTitle: string,
    table: string,
    isOpen: boolean,
    active: boolean,
    order: number,
    hiddenFromSidebar?: boolean
}

export type Menu = {
    client: string,
    menu: MenuObj[],
    maxOrder: number
}

export type MenuObj = {
    menuTitle: string,
    icon: string,
    submenu: Submenu[]
}

const menu : Menu[] = menuConfig;

const initialNavState : Menu[] = menu

const navSlice = createSlice({
    name: 'navSlice',
    initialState: initialNavState,
    reducers: {
        openPage(state: Menu[], action: PayloadAction<{client: string, submenuId: number, menuId: number}>) {
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                const submenu : Submenu = menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId];
                menuObj.menu.forEach(item => {
                    item.submenu.forEach(subItem => {
                        subItem.active = false;
                    })
                })
                submenu.active = true;
                if(!submenu.isOpen){
                    submenu.isOpen = true;
                    submenu.order = menuObj.maxOrder + 1;
                    menuObj.maxOrder = menuObj.maxOrder + 1;
                }
            }
        },
        closePage(state: Menu[], action: PayloadAction<{client: string, submenuId: number, menuId: number}>){
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                const submenu : Submenu = menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId];
                submenu.isOpen = false;
                menuObj.menu.forEach(item => {
                    item.submenu.forEach(subItem => {
                        if(subItem.order === submenu.order - 1){
                            console.log("estoy");
                            if(submenu.active){
                                subItem.active = true;
                            }
                        }

                        if(subItem.order > submenu.order){
                            subItem.order = subItem.order - 1
                        }
                    })
                })
                submenu.order = 0;
                submenu.active = false;
                menuObj.maxOrder = menuObj.maxOrder - 1;
            }
        },
        activePage(state: Menu[], action: PayloadAction<{client: string, submenuId: number, menuId: number}>){
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                const submenu : Submenu = menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId];
                menuObj.menu.forEach(item => {
                    item.submenu.forEach(subItem => {
                        subItem.active = false;
                    })
                })
                submenu.active = true;
            }
        },
        changeOrder(state: Menu[], action: PayloadAction<{client: string, newSubmenus: Submenu[]}>) {
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                const orderMap = new Map(
                    action.payload.newSubmenus.map((newSubItem, index) => [newSubItem.path, index + 1])
                )

                menuObj.menu.forEach(item => {
                    item.submenu.forEach(subItem => {
                        const newOrder = orderMap.get(subItem.path);
                        if(newOrder !== undefined){
                            subItem.order = newOrder;
                        }
                    })
                })
            }
        },
        setCompletemNav(state: Menu[], action: PayloadAction<{menu : Menu, client : string}>) {
            return state.map(m => {
                if(m.client === action.payload.client){
                    return action.payload.menu;
                } else {
                    return m;
                }
            });
        }
    }
});

export const navActions = navSlice.actions;

export default navSlice.reducer;

