import coreModule from "app/core/core_module"
import SlurmAppConfigCtrl from "./components/config/config"
import SlurmOverviewPageCtrl from "./components/pages/slurm_overview"
import ClusterViewPageCtrl from "./components/pages/cluster_view"
import MonascaClient from "./components/monasca_client"
import { loadPluginCss } from "app/plugins/sdk";

coreModule.service("monascaSrv", MonascaClient)
coreModule.requires.push('multipleSelect')

loadPluginCss({
    dark: "plugins/stackhpc-slurm-visualisation-app/css/monasca.dark.css",
    light: "plugins/stackhpc-slurm-visualisation-app/css/monasca.light.css"
});

export {
    SlurmAppConfigCtrl as ConfigCtrl,
    SlurmOverviewPageCtrl,
    ClusterViewPageCtrl
}