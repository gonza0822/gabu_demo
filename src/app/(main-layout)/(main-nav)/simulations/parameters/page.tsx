import React from "react";
import ManageParameters from "@/components/fixedAssets/ManageParameters";

export default function SimulationsParametersPage(): React.ReactElement {
    return (
        <div className="w-full h-full">
            <ManageParameters simulationOnly />
        </div>
    );
}
