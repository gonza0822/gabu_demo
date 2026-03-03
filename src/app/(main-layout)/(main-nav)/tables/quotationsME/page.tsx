import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function QuotationsMETable() : React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/quotationME"/>
    );
}