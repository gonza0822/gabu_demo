import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthorizationState = {
    logged: boolean,
    connected: boolean,
    isLogging: boolean,
    user: string | null,
    client: string
}

const initialAuthorizationState : AuthorizationState = {
    logged: false,
    connected: false,
    user: null,
    client: 'Admagro',
    isLogging: false
}

const authorizationSlice = createSlice({
    name: 'authSlice',
    initialState: initialAuthorizationState,
    reducers: {
        login(state: AuthorizationState, action: PayloadAction<{user: string}>){
            state.logged = true;
            state.user = action.payload.user;
            state.isLogging = false;
        },
        LogginIn(state: AuthorizationState, action: PayloadAction<{isLogging: boolean}>){
            state.isLogging = action.payload.isLogging;
        },
        clientConnect(state: AuthorizationState, action: PayloadAction<{client: string}>){
            state.client = action.payload.client;
            state.connected = true;
        },
        logout(state: AuthorizationState) {
            state.logged = true;
            state.user = null;
        },
        setLogin(state: AuthorizationState, action: PayloadAction<{auth: AuthorizationState}>){
            return action.payload.auth;
        }
    }
});

export const authorizationActions = authorizationSlice.actions;

export default authorizationSlice.reducer;

