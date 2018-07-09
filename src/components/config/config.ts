/*
*   Copyright 2017 StackHPC
*   (C) Copyright 2017 Hewlett Packard Enterprise Development LP
*
*   Licensed under the Apache License, Version 2.0 (the "License");
*   you may not use this file except in compliance with the License.
*   You may obtain a copy of the License at
*
*       http://www.apache.org/licenses/LICENSE-2.0
*
*   Unless required by applicable law or agreed to in writing, software
*   distributed under the License is distributed on an "AS IS" BASIS,
*   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*   See the License for the specific language governing permissions and
*   limitations under the License.
*/

export default class SlurmAppConfigCtrl {

    public static templateUrl = "components/config/config.html"
    private static acceptedTypes = ["monasca-datasource", "monasca-grafana-datasource"]
    private datasources: Array<String>;
    private appModel: any;
    private appEditCtrl: any;
    private dashboardsImported: boolean;
    private init: Promise<any>;

    constructor(private $timeout, private backendSrv, private $q){

        this.dashboardsImported = false;
        if(!this.appModel.jsonData){
            this.appModel.jsonData = {};
        }
        this.appEditCtrl.setPostUpdateHook(this.postUpdate.bind(this));
        // this.init = this.loadDataSources()
        //     .then(() => this.$timeout());
    }

    // private loadDataSources(){
    //     return this.backendSrv.get("/api/datasources")
    //     .then(response => {
    //         this.datasources =  response
    //         .filter(ds => SlurmAppConfigCtrl.acceptedTypes.indexOf(ds.type) >= 0)
    //         .map(ds => ds.name);
            
    //         //Select first datasource if none previously selected
    //         if(!this.appModel.jsonData.dataSourceName && this.datasources.length > 0){
    //             this.appModel.jsonData.dataSourceName = this.datasources[0];
    //         }
    //     });
    // }

    private postUpdate() {
        if (!this.appModel.enabled) {
          return this.$q.resolve();
        }
        return this.appEditCtrl.importDashboards()
        .then(() => {
          console.log("dashboards imported")
          this.dashboardsImported = true;
        });
    }

}