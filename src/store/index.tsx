import { configureStore } from "@reduxjs/toolkit";
import authorizationReducer from "./authorizationSlice";
import navReducer from './navSlice';

const store = configureStore({
    reducer: {
        authorization: authorizationReducer,
        nav: navReducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;