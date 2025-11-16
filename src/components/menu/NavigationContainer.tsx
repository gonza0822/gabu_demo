import { ReactElement } from "react";
import NavigationMenu from "./NavigationMenu";
import Header from "./Header";

export default function NavigationContainer({children} : {children : React.ReactNode}) : ReactElement {
    return (
        <div className="flex items-start h-screen" id="app">
            <aside className="h-full w-[20%] bg-gabu-900 flex flex-col">
                <div className="w-full flex justify-center py-3 flex-none">
                    <img src="../assets/gabu_logo.png" alt="gabu_logo" className="brightness-200 h-[80px] w-[80px] btn-home"/>
                </div>
                <NavigationMenu/>
            </aside>
            <div className="flex flex-col flex-grow-0 w-full h-full">
                <Header/>
                {children}
            </div>
        </div>
    );
}