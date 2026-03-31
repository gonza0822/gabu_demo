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
import TaxCoefficientsTable from "@/app/(main-layout)/(main-nav)/tables/taxCoefficients/page";
import MeasurementUnitsTable from "@/app/(main-layout)/(main-nav)/tables/measurementUnits/page";
import ManageFixedAssets from "@/app/(main-layout)/(main-nav)/fixedAssets/manage/page";
import ManageParametersTable from "@/app/(main-layout)/(main-nav)/fixedAssets/parameters/page";
import ManageDefaultsTable from "@/app/(main-layout)/(main-nav)/fixedAssets/defaults/page";
import ReportsEmissionPage from "@/app/(main-layout)/(main-nav)/fixedAssets/reports/page";
import CalculoAmortizacionesPage from "@/app/(main-layout)/(main-nav)/processes/calculo-amortizaciones/page";
import CierreMensualPage from "@/app/(main-layout)/(main-nav)/processes/cierre-mensual/page";
import CierreEjercicioPage from "@/app/(main-layout)/(main-nav)/processes/cierre-ejercicio/page";
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
    TaxCoefficientsTable,
    MeasurementUnitsTable,
    ManageFixedAssets,
    ManageParametersTable,
    ManageDefaultsTable,
    ReportsEmissionPage,
    CalculoAmortizacionesPage,
    CierreMensualPage,
    CierreEjercicioPage,
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

export function getPage(page: string): React.ComponentType<PageComponentProps> {
    if (page.startsWith("AbmFixedAssetModify-") || page.startsWith("AbmFixedAssetConsult-") ||
        page.startsWith("AbmFixedAssetClone-") || page.startsWith("AbmFixedAssetAltaAgregado-")) {
        return AbmFixedAssetDynamic;
    }
    const StaticPage = pagesMap[page as keyof typeof pagesMap];
    return StaticPage as React.ComponentType<PageComponentProps>;
}