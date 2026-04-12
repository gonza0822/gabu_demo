import AbmFixedAsset from "@/components/fixedAssets/AbmFixedAsset";
import React from "react";

type Props = { params: Promise<{ id: string }> };

export default async function SimulationsClonePage({ params }: Props): Promise<React.ReactElement> {
    const { id } = await params;
    return (
        <div className="w-full h-full">
            <AbmFixedAsset bienId={id} cloneMode simulationOnly />
        </div>
    );
}
