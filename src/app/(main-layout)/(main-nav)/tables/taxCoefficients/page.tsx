import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function TaxCoefficientsTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/taxCoefficient"/>
    );
}