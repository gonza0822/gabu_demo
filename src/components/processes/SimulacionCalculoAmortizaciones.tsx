'use client';

import React from "react";
import ProcessRunner from "@/components/processes/ProcessRunner";

export default function SimulacionCalculoAmortizaciones(): React.ReactElement {
    return <ProcessRunner mode="amortizacion" simulationOnly />;
}
