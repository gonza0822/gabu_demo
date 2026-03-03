import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function BusinessUnitsTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/businessUnit"/>
    );
}