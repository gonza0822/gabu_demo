import { createSlice } from "@reduxjs/toolkit";

type OverlayState = {
    restartSimulationOpen: boolean;
};

const initialState: OverlayState = {
    restartSimulationOpen: false,
};

const overlaySlice = createSlice({
    name: "overlay",
    initialState,
    reducers: {
        openRestartSimulation(state) {
            state.restartSimulationOpen = true;
        },
        closeRestartSimulation(state) {
            state.restartSimulationOpen = false;
        },
    },
});

export const overlayActions = overlaySlice.actions;
export default overlaySlice.reducer;
