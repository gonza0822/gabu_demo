import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function UsersTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/user"/>
    );
}