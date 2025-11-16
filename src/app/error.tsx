'use client'

import React, { ReactElement } from "react";

export default function Error({error} : {error : { message : string}}) : ReactElement {
    return (
        <h1>{error.message}</h1>
    );
}