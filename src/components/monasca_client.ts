
import moment from '../libs/moment'
import _ from 'lodash'

export default class MonascaClient {

    private ds: any;

    constructor(private backendSrv, private datasourceSrv) { }

    public listMetricNamesStartWith(prefix: string){
        return this._get("/v2.0/metrics", undefined)
            .then(resp => resp.data.elements
                    .map(element => element.name)
                    .filter((name: string) => name.startsWith(prefix)))
    }

    // Returns a object of unique metrics of the cluster
    public listClusterMetrics() : Promise<any> {
        return Promise.resolve([
            { name: "aggregate_cpu_usage", value: "80%" },
            { name: "aggregate_gpu_usage", value: "60%" },
            { name: "aggregate_bandwidth_usage", value: "40%"}
        ]);
    }

    public listJobs(){
        return ["0", "1"];
    }

    public nodeJobMetrics(from: string, to: string){
        var interval = moment.duration(moment(to).diff(moment(from)));
        return Promise.resolve([
            { hostname: "gluster-1.alaskalocal", states_over_time: [
                { state: "OFF", jobs: null, timestamp: moment(from).add(interval * (2/4)) }, // 2/4 
                { state: "ON", jobs: [{ owner :"doug", job_id: "0" }], timestamp: moment(from).add(interval * (3/4)) }, // 1/4
                { state: "ON", jobs: [{ owner: "charana", job_id: "1" }], timestamp: moment(from).add(interval) } // 1/4
            ]},
            { hostname: "openhpc-compute-0", states_over_time: [
                { state: "ON", jobs: [{ owner: "charana", job_id: "1"}, { owner: "doug", job_id: "0" }], timestamp: moment(from).add(interval * (2/4)) },
                { state: "ON", jobs: [{ owner: "charana", job_id: "1" }], timestamp: moment(from).add(interval * (3/4)) },
                { state: "OFF", jobs: null, timestamp: moment(from).add(interval) }
            ]}
        ])
    }

    //Returns a list of objects of unique metrics for each node in the cluster
    public listNodesAndMetrics(): Promise<any> {
        return Promise.resolve([
            { hostname: "gluster-1.alaskalocal", metrics: { 
                usage: "80%"
            } },
            { hostname: "gluster-2.alaskalocal", metrics: { 
                usage: "50%"
            } },
            { hostname: "openhpc-compute-0", metrics: { 
                usage: "20%"
            } }
        ]);
    }

    // public listJobsAndMetrics(): Promise<any> {

    //     // return this._get("/v2.0/metrics/measurements", { 
    //     //         name: "process.cpu_perc", 
    //     //         merge_metrics: false,
    //     //         // start_time: moment().subtract(1, "day").toISOString(),
    //     //         // end_time: moment().toISOString(),
    //     //         start_time: "2018-07-23T10:00:00Z",
    //     //         group_by: "hostname",
    //     //         alias: "@hostname"
    //     //     })
    //     //     .then(resp => {
    //     //         console.log("resp.data: " + JSON.stringify(resp.data));
    //     //         var unique_jobs = _.groupBy(resp.data.elements, metric_measurement => metric_measurement.dimensions.job_id)

    //     //         var jobs_and_job_metrics = [];
    //     //         Object.entries(unique_jobs).forEach(([job_id, metric_measurements]: [string, Array<any>]) => {
    //     //             if(metric_measurements.length > 0 != null  && metric_measurements[0].measurements.length > 0) {
    //     //                 var hosts = metric_measurements.map(metric_measurement =>  metric_measurement.dimensions.hostname)
    //     //                 jobs_and_job_metrics.push({
    //     //                     name: metric_measurements[0].measurements[0][3].job_name,
    //     //                     job_id: metric_measurements[0].dimensions.job_id,
    //     //                     user_id: metric_measurements[0].dimensions.user_id,
    //     //                     metrics: {
    //     //                         state: this._JOB_STATE[metric_measurements[0].measurements[0][1]],
    //     //                         //TODO elapsed_time:
    //     //                         //TODO start_time
    //     //                         //TODO end_time
    //     //                         resources: [{name: "nodes", value: hosts }]
    //     //                     }
    //     //                 })
    //     //             }
    //     //         })
    //     //     });
    // }

    private _delete(path, params) {
        return this._request("DELETE", path, params, undefined);
    }

    private _get(path, params) {
        return this._request("GET", path, params, undefined);
    }

    private _post(path, data) {
        return this._request("POST", path, undefined, data);
    }

    private _patch(path, data) {
        return this._request("PATCH", path, undefined, data);
    }

    private _getDataSource() {
        if (this.ds) {
            return Promise.resolve(this.ds);
        }

        return this.backendSrv
            .get("api/plugins/stackhpc-slurm-visualisation-app/settings")
            .then(response => {
                if (!response.jsonData || !response.jsonData.datasourceName) {
                    throw new Error("No datasource selected in app configuration");
                }

                return this.datasourceSrv
                    .get(response.jsonData.datasourceName)
                    .then(ds => {
                        this.ds = ds;
                        return this.ds;
                    });
            });
    }

    private _request(method, path, params, data) {
        return this._getDataSource().then(dataSource => {
            var headers = {
                "Content-Type": "application/json",
                "X-Auth-Token": dataSource.token
            };

            var options = {
                method: method,
                url: dataSource.url + path,
                params: params,
                data: data,
                headers: headers,
                withCredentials: true
            };

            return dataSource.backendSrv.datasourceRequest(options).catch(err => {
                if (err.status !== 0 || err.status >= 300) {
                    var monascaResponse;
                    if (err.data) {
                        if (err.data.message) {
                            monascaResponse = err.data.message;
                        } else if (err.data.description) {
                            monascaResponse = err.data.description;
                        } else {
                            var errName = Object.keys(err.data)[0];
                            if (err.data[errName]) {
                                monascaResponse = err.data[errName].message;
                            }
                        }
                    }
                    if (monascaResponse) {
                        throw new Error("Monasca Error Response: " + monascaResponse);
                    } else {
                        throw new Error("Monasca Error Status: " + err.status);
                    }
                }
            });
        });
    }
}
