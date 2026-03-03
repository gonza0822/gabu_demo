import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function GroupsTable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/group"/>
    );
}