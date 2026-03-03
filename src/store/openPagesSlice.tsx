import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import React from "react";

export type OpenPage = {
    page: string,
    active: boolean,
}

const initialOpenPagesState : OpenPage[] = []

const openPagesSlice = createSlice({
    name: 'openPagesSlice',
    initialState: initialOpenPagesState,
    reducers: {
        addOpenPage(state: OpenPage[], action: PayloadAction<{page: string}>){
            const existingPage = state.find(p => p.page === action.payload.page);
            if(!existingPage){
                state.forEach(p => {
                    p.active = false;
                });
                state.push({
                    page: action.payload.page,
                    active: true
                });
            }
        },
        removeOpenPage(state: OpenPage[], action: PayloadAction<{page: string}>){
            return state.filter(p => p.page !== action.payload.page);
        },
        setActivePage(state: OpenPage[], action: PayloadAction<{page: string}>){
            state.forEach(p => {
                p.active = p.page === action.payload.page;

            });
        }
    }
});

export const openPagesActions = openPagesSlice.actions;
export default openPagesSlice.reducer;