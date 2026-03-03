import React from "react";
import TableContainer from "@/components/tables/TableContainer";

export default function CostCenterTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/costCenter"/>
    );
}