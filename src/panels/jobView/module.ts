import coreModule from "app/core/core_module"
import MonascaClient from "../../components/monasca_client"
import JobViewCtrl from "./job_view"

coreModule.service("monascaSrv", MonascaClient)

export  {
  JobViewCtrl as PanelCtrl
};
