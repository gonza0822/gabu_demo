'use client';

import { Provider } from "react-redux";
import store from "./index";
import React, { ReactElement } from "react";

export default function ReduxProvider({children} : { children : React.ReactNode}) : ReactElement {
    return <Provider store={store}>{children}</Provider>
}