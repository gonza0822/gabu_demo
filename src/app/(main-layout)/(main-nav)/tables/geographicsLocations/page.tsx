import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function GeographicsLocationsTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/geographicLocation"/>
    );
}