import React from "react";
import './styles.css';
import MainNavigation from "@/components/main/MainNavigation";

export default function TablesLayout({ children } : { children : React.ReactNode }) : React.ReactElement {
    return (
        <MainNavigation>
            {children}
        </MainNavigation>
    );
}