import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthorizationState = {
    logged: boolean,
    connected: boolean,
    isLogging: boolean,
    token: string,
    user: string | null,
    client: string
}

const initialAuthorizationState : AuthorizationState = {
    logged: false,
    connected: false,
    token: '',
    user: null,
    client: '',
    isLogging: false
}

const authorizationSlice = createSlice({
    name: 'authSlice',
    initialState: initialAuthorizationState,
    reducers: {
        login(state: AuthorizationState, action: PayloadAction<{user: string, token: string}>){
            state.logged = true
            state.token = action.payload.token;
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
            state.logged = true
            state.token = '';
            state.user = null;
        }
    }
});

export const authorizationActions = authorizationSlice.actions;

export default authorizationSlice.reducer;

