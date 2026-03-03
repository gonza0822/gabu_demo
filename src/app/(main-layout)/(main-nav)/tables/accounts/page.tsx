import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function AccountsTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/accounts"/>
    );
}