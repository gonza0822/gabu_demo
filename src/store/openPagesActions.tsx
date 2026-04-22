'use client';

import React from "react";
import AccountsTable from "@/app/(main-layout)/(main-nav)/tables/accounts/page";
import CostCenterTable from "@/app/(main-layout)/(main-nav)/tables/costCenter/page";
import GroupsTable from "@/app/(main-layout)/(main-nav)/tables/groups/page";
import PlantsTable from "@/app/(main-layout)/(main-nav)/tables/plants/page";
import GeographicsLocationsTable from "@/app/(main-layout)/(main-nav)/tables/geographicsLocations/page";
import ProcedencesTable from "@/app/(main-layout)/(main-nav)/tables/procedences/page";
import ActualizationIndexesTable from "@/app/(main-layout)/(main-nav)/tables/actualizationIndexes/page";
import QuotationsMETable from "@/app/(main-layout)/(main-nav)/tables/quotationsME/page";
import UsersTable from "@/app/(main-layout)/(main-nav)/tables/users/page";
import BusinessUnitsTable from "@/app/(main-layout)/(main-nav)/tables/businessUnits/page";
import CatalogTable from "@/app/(main-layout)/(main-nav)/tables/catalog/page";
import TaxCoefficientsTable from "@/app/(main-layout)/(main-nav)/tables/taxCoefficients/page";
import MeasurementUnitsTable from "@/app/(main-layout)/(main-nav)/tables/measurementUnits/page";
import ManageFixedAssets from "@/app/(main-layout)/(main-nav)/fixedAssets/manage/page";
import ManageParametersTable from "@/app/(main-layout)/(main-nav)/fixedAssets/parameters/page";
import ManageDefaultsTable from "@/app/(main-layout)/(main-nav)/fixedAssets/defaults/page";
import ReportsEmissionPage from "@/app/(main-layout)/(main-nav)/fixedAssets/reports/page";
import CalculoAmortizacionesPage from "@/app/(main-layout)/(main-nav)/processes/calculo-amortizaciones/page";
import GeneracionAsientosPage from "@/app/(main-layout)/(main-nav)/processes/generacion-asientos/page";
import CierreMensualPage from "@/app/(main-layout)/(main-nav)/processes/cierre-mensual/page";
import CierreEjercicioPage from "@/app/(main-layout)/(main-nav)/processes/cierre-ejercicio/page";
import InvestmentsProjectsPage from "@/app/(main-layout)/(main-nav)/investments/projects/page";
import InvestmentsWorkOrdersPage from "@/app/(main-layout)/(main-nav)/investments/workOrders/page";
import InvestmentsChargesPage from "@/app/(main-layout)/(main-nav)/investments/charges/page";
import SimulationsManagePage from "@/app/(main-layout)/(main-nav)/simulations/manage/page";
import SimulationsParametersPage from "@/app/(main-layout)/(main-nav)/simulations/parameters/page";
import SimulationsReportsPage from "@/app/(main-layout)/(main-nav)/simulations/reports/page";
import SimulationsCalculoAmortizacionesPage from "@/app/(main-layout)/(main-nav)/simulations/calculo-amortizaciones/page";
import SimulationsAddPage from "@/app/(main-layout)/(main-nav)/simulations/add/page";
import AbmFixedAsset from "@/components/fixedAssets/AbmFixedAsset";

const pagesMap = {
    AccountsTable,
    CostCenterTable,
    PlantsTable,
    GroupsTable,
    GeographicsLocationsTable,
    ProcedencesTable,
    ActualizationIndexesTable,
    QuotationsMETable,
    UsersTable,
    BusinessUnitsTable,
    CatalogTable,
    TaxCoefficientsTable,
    MeasurementUnitsTable,
    ManageFixedAssets,
    ManageParametersTable,
    ManageDefaultsTable,
    ReportsEmissionPage,
    CalculoAmortizacionesPage,
    GeneracionAsientosPage,
    CierreMensualPage,
    CierreEjercicioPage,
    InvestmentsProjectsPage,
    InvestmentsWorkOrdersPage,
    InvestmentsChargesPage,
    SimulationsManagePage,
    SimulationsParametersPage,
    SimulationsReportsPage,
    SimulationsCalculoAmortizacionesPage,
    SimulationsAddPage,
    AbmFixedAsset,
};

export type PageComponentProps = { pageKey?: string };

/** Componente estable para evitar remontajes. Devuelve el mismo componente para todas las páginas dinámicas. */
function AbmFixedAssetDynamic({ pageKey }: PageComponentProps): React.ReactElement {
    if (!pageKey) return <AbmFixedAsset />;
    if (pageKey.startsWith("AbmFixedAssetModify-")) {
        const id = pageKey.replace("AbmFixedAssetModify-", "");
        return <AbmFixedAsset bienId={id} />;
    }
    if (pageKey.startsWith("AbmFixedAssetConsult-")) {
        const id = pageKey.replace("AbmFixedAssetConsult-", "");
        return <AbmFixedAsset bienId={id} consultMode />;
    }
    if (pageKey.startsWith("AbmFixedAssetClone-")) {
        const id = pageKey.replace("AbmFixedAssetClone-", "");
        return <AbmFixedAsset bienId={id} cloneMode />;
    }
    if (pageKey.startsWith("AbmFixedAssetAltaAgregado-")) {
        const id = pageKey.replace("AbmFixedAssetAltaAgregado-", "");
        return <AbmFixedAsset bienId={id} altaAgregadoMode />;
    }
    return <AbmFixedAsset />;
}

function AbmSimulationFixedAssetDynamic({ pageKey }: PageComponentProps): React.ReactElement {
    if (!pageKey) return <AbmFixedAsset simulationOnly />;
    if (pageKey.startsWith("AbmSimulationFixedAssetModify-")) {
        const id = pageKey.replace("AbmSimulationFixedAssetModify-", "");
        return <AbmFixedAsset bienId={id} simulationOnly />;
    }
    if (pageKey.startsWith("AbmSimulationFixedAssetConsult-")) {
        const id = pageKey.replace("AbmSimulationFixedAssetConsult-", "");
        return <AbmFixedAsset bienId={id} consultMode simulationOnly />;
    }
    if (pageKey.startsWith("AbmSimulationFixedAssetClone-")) {
        const id = pageKey.replace("AbmSimulationFixedAssetClone-", "");
        return <AbmFixedAsset bienId={id} cloneMode simulationOnly />;
    }
    if (pageKey.startsWith("AbmSimulationFixedAssetAltaAgregado-")) {
        const id = pageKey.replace("AbmSimulationFixedAssetAltaAgregado-", "");
        return <AbmFixedAsset bienId={id} altaAgregadoMode simulationOnly />;
    }
    return <AbmFixedAsset simulationOnly />;
}

function NotImplementedPage(): React.ReactElement {
    return (
        <div className="w-full h-full flex items-center justify-center bg-gabu-100">
            <p className="text-gabu-900 text-sm xl:text-base">
                Esta pantalla aun no esta implementada.
            </p>
        </div>
    );
}

export function getPage(page: string): React.ComponentType<PageComponentProps> {
    if (page.startsWith("AbmFixedAssetModify-") || page.startsWith("AbmFixedAssetConsult-") ||
        page.startsWith("AbmFixedAssetClone-") || page.startsWith("AbmFixedAssetAltaAgregado-")) {
        return AbmFixedAssetDynamic;
    }
    if (page.startsWith("AbmSimulationFixedAssetModify-") || page.startsWith("AbmSimulationFixedAssetConsult-") ||
        page.startsWith("AbmSimulationFixedAssetClone-") || page.startsWith("AbmSimulationFixedAssetAltaAgregado-")) {
        return AbmSimulationFixedAssetDynamic;
    }
    const StaticPage = pagesMap[page as keyof typeof pagesMap];
    if (!StaticPage) return NotImplementedPage;
    return StaticPage as React.ComponentType<PageComponentProps>;
}