import React from "react";
import MasterDataIcon from "@/components/svg/menu/MasterDataIcon";
import ProcessesIcon from "@/components/svg/menu/ProcessesIcon";
import InvestmentsIcon from "@/components/svg/menu/InvestmentsIcon";
import AccountIcon from '@/components/svg/menu/AccountIcon';

const iconMap = {
  AccountIcon,
  MasterDataIcon,
  ProcessesIcon,
  InvestmentsIcon,
};

export function getIcon(icon : string) : React.ComponentType {
    return iconMap[icon as keyof typeof iconMap];
}