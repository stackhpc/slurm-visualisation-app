
import moment from 'moment'

export default class MonascaClient {

    private ds: any;

    constructor(private backendSrv, private datasourceSrv) { }

    // Returns a object of unique metrics of the cluster
    public listClusterMetrics() : Promise<any> {
        return Promise.resolve([
            { name: "aggregate_cpu_usage", value: "80%" },
            { name: "aggregate_gpu_usage", value: "60%" },
            { name: "aggregate_bandwidth_usage", value: "40%"}
        ]);
    }

    public nodeJobMetrics(to: string, from: string){
        var interval = moment.duration(moment(to).diff(moment(from)));
        return Promise.resolve([
            { hostname: "gluster-1.alaskalocal", states_over_time: [
                { state: "OFF", job_id: null, timestamp: moment(to).add(interval * (2/4)) }, // 2/4 
                { state: "ON", job_id: "0", timestamp: moment(to).add(interval * (3/4)) }, // 1/4
                { state: "ON", job_id: "1", timestamp: moment(to).add(interval) } // 1/4
            ]},
            { hostname: "openhpc-compute-0", states_over_time: [
                { state: "ON", job_id: "0", timestamp: moment(to).add(interval * (2/4)) },
                { state: "ON", job_id: "1", timestamp: moment(to).add(interval * (3/4)) },
                { state: "OFF", job_id: null, timestamp: moment(to).add(interval) }
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

    public listJobsAndMetrics(): Promise<any> {
        return Promise.resolve([
            { name: "Job 1", id: "uuid 1", metrics: {
                state: "RUNNING",
                elapsed_time: "1-01:02:03",
                start_time: "2018-01-01T00:00:01Z", //timestamp in OSI 8601 combined datetime format
                end_time: "pending...",
                resources: [{name: "nodes", value: ["gluster-1.alaskalocal", "gluster-2.alaskalocal"]}, {name: "cpus", value: 10}]
            }},
            { name: "Job 2", id: "uuid 2", metrics: {
                state: "PENDING",
                elapsed_time: "00:00:00",
                start_time: "pending...",
                end_time: "pending...",
                resources: [{name: "nodes", value: ["gluster-1.alaskalocal", "openhpc-compute-0"]}, {name: "cpus", value: 20}]
            }},
            { name: "Job 3", id: "uuid 3", metrics: {
                state: "FINISHED",
                elapsed_time: "1-01:02:03",
                start_time: "2018-01-01T00:00:01Z",
                end_time: "2018-01-02T00:00:01Z",
                resources: [{name: "nodes", value: ["gluster-2.alaskalocal", "openhpc-compute-0"]}, {name: "cpus", value: 30}]
            }}
        ])
    }

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
            .get("api/plugins/monasca-app/settings")
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