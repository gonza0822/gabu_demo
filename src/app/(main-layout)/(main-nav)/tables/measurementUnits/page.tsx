import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function MeasurementUnitsTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/measurementUnit"/>
    );
}