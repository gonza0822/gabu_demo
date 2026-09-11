'use client';
import React, { useEffect, useMemo, useRef } from "react";
import NavItems from "./NavItems";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { Submenu, Menu, navActions } from "@/store/navSlice";
import { OpenPage, openPagesActions } from "@/store/openPagesSlice";
import { getPage } from "@/store/openPagesActions";
import { usePathname, useRouter } from "next/navigation";
import RestartSimulation from "@/components/fixedAssets/RestartSimulation";
import { isStaleWorkspacePath, syncWorkspacePath } from "@/util/navigation/syncWorkspacePath";

/** Incluye simulación: sin pageKey, AbmSimulationFixedAssetDynamic monta el ABM sin bienId y no hidrata. */
const DYNAMIC_ABM_PREFIXES = [
    "AbmFixedAssetModify-",
    "AbmFixedAssetConsult-",
    "AbmFixedAssetClone-",
    "AbmFixedAssetAltaAgregado-",
    "AbmSimulationFixedAssetModify-",
    "AbmSimulationFixedAssetConsult-",
    "AbmSimulationFixedAssetClone-",
    "AbmSimulationFixedAssetAltaAgregado-",
] as const;

function isDynamicAbmPage(pageKey: string): boolean {
    return DYNAMIC_ABM_PREFIXES.some((p) => pageKey.startsWith(p));
}

function listOpenTabs(clientMenu: Menu): Submenu[] {
    return clientMenu.menu
        .flatMap((m) => m.submenu)
        .filter((submenu) => submenu.isOpen && !submenu.modalOnly);
}

/** Entrada solo por menú: la ruta debe coincidir con un submenú ya marcado isOpen. */
function findOpenSubmenuForPath(clientMenu: Menu, pathName: string): Submenu | undefined {
    return listOpenTabs(clientMenu).find((submenu) => submenu.path === pathName);
}

function findSubmenuLocation(clientMenu: Menu, pathName: string): { menuId: number; submenuId: number } | null {
    for (let menuId = 0; menuId < clientMenu.menu.length; menuId++) {
        const submenuId = clientMenu.menu[menuId].submenu.findIndex(
            (submenu) => submenu.path === pathName && !submenu.modalOnly
        );
        if (submenuId >= 0) return { menuId, submenuId };
    }
    return null;
}

function menuHasCatalogItems(clientMenu: Menu): boolean {
    return clientMenu.menu.some((group) => group.submenu.length > 0);
}

export default function MainNavigation({children} : {children : React.ReactNode}) : React.ReactElement {
    const client : string = useSelector((state : RootState) => state.authorization.client);
    const clientMenu : Menu | undefined = useSelector((state: RootState) => state.nav.find((m : Menu) => m.client === client));
    const openPages : OpenPage[] = useSelector((state : RootState) => state.openPages || []);
    const restartSimulationOpen = useSelector((state: RootState) => state.overlay?.restartSimulationOpen ?? false);
    const pathName = usePathname();
    const router = useRouter();
    const dispatch = useDispatch();
    const prevPathRef = useRef<string | null>(null);
    const redirectingRef = useRef(false);
    const prevOpenTabPathsRef = useRef<string[]>([]);

    const openTabs = useMemo(
        () => (clientMenu ? listOpenTabs(clientMenu) : []),
        [clientMenu]
    );

    const openSubmenuForPath = useMemo(
        () => (clientMenu ? findOpenSubmenuForPath(clientMenu, pathName) : undefined),
        [clientMenu, pathName]
    );

    const fallbackOpenTab = useMemo(
        () => openTabs.find((submenu) => submenu.active) ?? openTabs[0],
        [openTabs]
    );

    // Recarga: el menú arranca vacío. No ir a home hasta hidratar.
    // Si la URL es un ítem de menú, reabrir esa pestaña (F5 debe quedarse en la misma pantalla).
    // No reabrir si el usuario acaba de cerrar esa pestaña y el router todavía no cambió la URL.
    useEffect(() => {
        if (!clientMenu || !client) return;
        if (!menuHasCatalogItems(clientMenu)) return;

        const openPaths = openTabs.map((submenu) => submenu.path);
        const justClosedCurrentTab =
            prevOpenTabPathsRef.current.includes(pathName) && !openPaths.includes(pathName);
        prevOpenTabPathsRef.current = openPaths;

        if (pathName === "/home") {
            redirectingRef.current = false;
            return;
        }

        const location = findSubmenuLocation(clientMenu, pathName);
        if (location) {
            redirectingRef.current = false;
            if (justClosedCurrentTab) return;
            if (!openSubmenuForPath || !openSubmenuForPath.active) {
                // URL still catching up after a tab click: keep the tab the user just selected.
                const pathUnchanged = prevPathRef.current === pathName;
                const alreadyActive = openTabs.find((submenu) => submenu.active);
                if (pathUnchanged && alreadyActive && alreadyActive.path !== pathName) {
                    return;
                }
                dispatch(navActions.openPage({ client, menuId: location.menuId, submenuId: location.submenuId }));
            }
            return;
        }

        if (openSubmenuForPath) {
            redirectingRef.current = false;
            return;
        }
        if (fallbackOpenTab) {
            redirectingRef.current = false;
            if (fallbackOpenTab.path !== pathName) {
                syncWorkspacePath(fallbackOpenTab.path, router, "replace");
            }
            return;
        }
        if (redirectingRef.current) return;
        redirectingRef.current = true;
        router.replace("/home");
    }, [client, clientMenu, openTabs, openSubmenuForPath, fallbackOpenTab, pathName, router, dispatch]);

    useEffect(() => {
        if (!clientMenu || !openSubmenuForPath) return;
        // Solo al cambiar la URL: si no, un click de pestaña (pathname aún viejo) reactivaría la tab anterior.
        if (prevPathRef.current === pathName) return;
        if (isStaleWorkspacePath(pathName)) return;

        const pageAlreadyOpen : OpenPage | undefined = openPages.find(page => page.page === openSubmenuForPath.table);

        if(!pageAlreadyOpen){
            dispatch(openPagesActions.addOpenPage({
                page: openSubmenuForPath.table,
            }));
        } else if(pageAlreadyOpen.active === false){
            dispatch(openPagesActions.setActivePage({
                page: pageAlreadyOpen.page
            }));
        }
        prevPathRef.current = pathName;
    }, [pathName, clientMenu, openPages, openSubmenuForPath, dispatch]);

    const showWorkspace = Boolean(clientMenu && openTabs.length > 0);

    return (
        <main className="bg-gabu-300 w-full h-[94vh] p-7">
            {restartSimulationOpen ? <RestartSimulation /> : null}
            {showWorkspace ? <NavItems/> : null}
            <div className="h-[92%] bg-gabu-100 w-full relative rounded-b-xl overflow-hidden">
                {showWorkspace && openPages.map((page : OpenPage) => {
                    const PageComponent = getPage(page.page);
                    const isDynamicAbm = isDynamicAbmPage(page.page);

                    return (
                        <div key={page.page} className={`${page.active ? '' : 'hidden'} w-full h-full`}>
                            <PageComponent pageKey={isDynamicAbm ? page.page : undefined} />
                        </div>
                    );
                })}
            </div>
        </main>
    );
}