import { LazyExoticComponent, VoidFunctionComponent } from "react";
import { FederatedModule } from "@app/components";
import { useConfig } from "@rhoas/app-services-ui-shared";
import { ServiceDownPage } from "@app/pages/ServiceDown/ServiceDownPage";
import { AppServicesLoading } from "@rhoas/app-services-ui-components";

export const ServiceAccountsPagePOC: VoidFunctionComponent = () => {
  return (
    <FederatedModule
      scope="sas"
      module="./ServiceAccounts"
      fallback={<AppServicesLoading />}
      render={(component) => (
        <ServiceAccountsPagePOCConnected Component={component} />
      )}
    />
  );
};

const ServiceAccountsPagePOCConnected: VoidFunctionComponent<{
  Component: LazyExoticComponent<any>;
}> = ({ Component }) => {
  const config = useConfig();
  if (config?.serviceDown) {
    return <ServiceDownPage />;
  }
  return <Component />;
};
export default ServiceAccountsPagePOC;
