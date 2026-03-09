'use client';

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
    AbmFixedAsset,
};

export function getPage(page : string) : React.ComponentType {
    if (page.startsWith("AbmFixedAssetModify-")) {
        const id = page.replace("AbmFixedAssetModify-", "");
        return () => <AbmFixedAsset bienId={id} />;
    }
    if (page.startsWith("AbmFixedAssetConsult-")) {
        const id = page.replace("AbmFixedAssetConsult-", "");
        return () => <AbmFixedAsset bienId={id} consultMode />;
    }
    if (page.startsWith("AbmFixedAssetClone-")) {
        const id = page.replace("AbmFixedAssetClone-", "");
        return () => <AbmFixedAsset bienId={id} cloneMode />;
    }
    if (page.startsWith("AbmFixedAssetAltaAgregado-")) {
        const id = page.replace("AbmFixedAssetAltaAgregado-", "");
        return () => <AbmFixedAsset bienId={id} altaAgregadoMode />;
    }
    return pagesMap[page as keyof typeof pagesMap];
}