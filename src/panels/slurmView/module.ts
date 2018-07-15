import coreModule from "app/core/core_module"
import MonascaClient from "../../components/monasca_client"
import SlurmViewCtrl from "./slurm_view"

coreModule.service("monascaSrv", MonascaClient)

export  {
  SlurmViewCtrl as PanelCtrl
};
