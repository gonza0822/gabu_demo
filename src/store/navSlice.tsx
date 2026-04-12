import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import menuConfig from '@/config/menu.json'

export type Submenu = {
    path: string,
    submenuTitle: string,
    table: string,
    isOpen: boolean,
    active: boolean,
    order: number,
    hiddenFromSidebar?: boolean,
    /** Si true: no abre pestaña ni navega; dispara overlay (p. ej. modal). */
    modalOnly?: boolean,
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

function moveOpenSubmenusOneStep(menuObj: Menu): void {
    menuObj.menu.forEach((item) => {
        item.submenu.forEach((subItem) => {
            if (subItem.isOpen) {
                subItem.order += 1;
            }
        });
    });
}

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
                    moveOpenSubmenusOneStep(menuObj);
                    submenu.order = 1;
                    menuObj.maxOrder = menuObj.maxOrder + 1;
                }
            }
        },
        closePage(state: Menu[], action: PayloadAction<{client: string, submenuId: number, menuId: number}>){
            const menuObj = state.find(m => m.client === action.payload.client);
            if(menuObj){
                const submenu : Submenu = menuObj.menu[action.payload.menuId].submenu[action.payload.submenuId];
                const closedOrder = submenu.order;

                let fallbackTab: Submenu | undefined;
                if (submenu.active) {
                    const openTabs = menuObj.menu
                        .flatMap((item) => item.submenu)
                        .filter((subItem) => subItem.isOpen && subItem.path !== submenu.path);
                    fallbackTab = openTabs.find((subItem) => subItem.order === closedOrder - 1)
                        ?? openTabs.find((subItem) => subItem.order === closedOrder + 1);
                }

                submenu.isOpen = false;
                menuObj.menu.forEach(item => {
                    item.submenu.forEach(subItem => {
                        if(subItem.order > closedOrder){
                            subItem.order = subItem.order - 1
                        }
                        subItem.active = false;
                    })
                })
                if (fallbackTab) {
                    fallbackTab.active = true;
                }
                submenu.order = 0;
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
        },
        addDynamicSubmenu(state: Menu[], action: PayloadAction<{client: string; path: string; submenuTitle: string; table: string; hiddenFromSidebar?: boolean}>) {
            const { client, path, submenuTitle, table, hiddenFromSidebar } = action.payload;
            const menuObj = state.find(m => m.client === client);
            if (!menuObj) return;
            const allSubmenus = menuObj.menu.flatMap(m => m.submenu);
            const existing = allSubmenus.find(s => s.path === path);
            if (existing) {
                menuObj.menu.forEach(item => {
                    item.submenu.forEach(subItem => { subItem.active = subItem.path === path; });
                });
                existing.isOpen = true;
                existing.active = true;
                if (existing.order === 0) {
                    moveOpenSubmenusOneStep(menuObj);
                    existing.order = 1;
                    menuObj.maxOrder += 1;
                }
                return;
            }
            const addMenuIdx = menuObj.menu.findIndex(m => m.submenu.some(s => s.path === '/fixedAssets/add'));
            if (addMenuIdx < 0) return;
            menuObj.menu.forEach(item => {
                item.submenu.forEach(subItem => { subItem.active = false; });
            });
            const newSubmenu: Submenu = {
                path,
                submenuTitle,
                table,
                isOpen: true,
                active: true,
                order: 1,
                ...(hiddenFromSidebar !== undefined && { hiddenFromSidebar }),
            };
            moveOpenSubmenusOneStep(menuObj);
            menuObj.menu[addMenuIdx].submenu.push(newSubmenu);
            menuObj.maxOrder += 1;
        },
    }
});

export const navActions = navSlice.actions;

export default navSlice.reducer;

