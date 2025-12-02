import NavigationContainer from "@/components/menu/NavigationContainer";
import React from "react";

export default function MainLayout({ children } : { children : React.ReactNode }) : React.ReactElement {
    return (
        <NavigationContainer>
            {children}
        </NavigationContainer>
    );
}