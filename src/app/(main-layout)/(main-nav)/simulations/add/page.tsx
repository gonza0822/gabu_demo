import AbmFixedAsset from "@/components/fixedAssets/AbmFixedAsset";
import React from "react";

export default function SimulationsAddPage() : React.ReactElement {
    return (
        <div className="w-full h-full">
            <AbmFixedAsset simulationOnly />
        </div>
    );
}
