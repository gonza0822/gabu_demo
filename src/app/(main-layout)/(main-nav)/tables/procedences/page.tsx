import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function ProcedencesTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/procedence"/>
    );
}