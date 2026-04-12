import { configureStore } from "@reduxjs/toolkit";
import authorizationReducer from "./authorizationSlice";
import navReducer from './navSlice';
import openPagesReducer from './openPagesSlice';
import overlayReducer from "./overlaySlice";

const store = configureStore({
    reducer: {
        authorization: authorizationReducer,
        nav: navReducer,
        openPages: openPagesReducer,
        overlay: overlayReducer,
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;