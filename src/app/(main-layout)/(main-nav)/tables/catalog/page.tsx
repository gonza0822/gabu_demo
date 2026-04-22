import TableContainer from "@/components/tables/TableContainer";
import React from "react";

export default function CatalogTable(): React.ReactElement {
    return (
        <TableContainer connPath="/api/tables/catalog" />
    );
}
