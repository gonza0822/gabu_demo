import React from "react";
import TableContainer from "@/components/tables/TableContainer";

export default function ActualizationIndexesTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/actualizationIndex"/>
    );
}