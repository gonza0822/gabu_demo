import React from "react";
import './styles.css';
import MainNavigation from "@/components/main/MainNavigation";

export default function MainNavLayout({ children } : { children : React.ReactNode }) : React.ReactElement {
    console.log('Rendering MainNavLayout');
    return (
        <MainNavigation>
            {children}
        </MainNavigation>
    );
}