import React from "react";
import ReportsEmission from "@/components/fixedAssets/ReportsEmission";

export default function SimulationsReportsPage(): React.ReactElement {
    return (
        <div className="w-full h-full">
            <ReportsEmission simulationOnly />
        </div>
    );
}
