///<reference path="../../globals.d.ts" />

import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import moment from '../../libs/moment'
import { parseTimeSeries } from './job_view_helpers'; 

export default class JobViewCtrl extends MetricsPanelCtrl {

    public static templateUrl = "panels/jobView/job_view.html"
    public loadFailed: boolean;
    public pageLoaded: boolean;
    public jobs_and_metrics: Array<any>;
    public filtered_jobs_and_metrics: Array<any>;
    public job_filters: any;

    constructor(public $scope, public $injector, public $timeout, private $location, private $window, private monascaSrv){
        super($scope, $injector);

        // this.events.on('data-received', this.onDataReceived.bind(this));
        // this.events.on('render', this.onDataReceived.bind(this));
        this.pageLoaded = false;
        this.loadFailed = false;
        this.job_filters = {
            start_time: {},
            end_time: {}
        };
    }

    private configureMetricsOptionsTab(){
        this.panel.datasource = "Monasca API";
        this.panel.targets = [
            {
              "policy": "default",
              "dsType": "influxdb",
              "resultFormat": "time_series",
              "tags": [],
              "groupBy": [
                {
                  "type": "time",
                  "params": [
                    "$interval"
                  ]
                },
                {
                  "type": "fill",
                  "params": [
                    "null"
                  ]
                }
              ],
              "select": [
                [
                  {
                    "type": "field",
                    "params": [
                      "value"
                    ]
                  },
                  {
                    "type": "mean",
                    "params": []
                  }
                ]
              ],
              "refId": "A",
              "aggregator": "none",
              "period": "300",
              "dimensions": [
                {
                  "key": "hostname",
                  "value": "$all"
                },
                {
                  "key": "job_id",
                  "value": "$all"
                },
                {
                  "key": "user_id",
                  "value": "$all"
                }
              ],
              "error": "",
              "metric": "slurm.job_status",
              "alias": "@hostname @job_id @user_id"
            }
          ]
    }

    private initPanelData(){

        var to = moment().toDate().getTime();
        var from = moment().subtract(1, "day").toDate().getTime();
        var interval = moment.duration(moment(to).diff(moment(from)));
        var times = Array.from(Array(5).keys()).map(i => moment(from).add(interval * (i/4)).toDate().getTime());
    
        var _JOB_STATE = {
            "UNKNOWN": 0,  
            "PENDING": 1,       // PD, Awaiting resource allocation
            "RUNNING": 2,       // R, Resources allocated and script executing
            "SUSPENDED": 3,     // S, Job suspended and previously allocated resources released
            "COMPLETING": 4,    // CG, in the process of completing, processes of a job still executing in the background
            "COMPLETED": 5      // CD, job terminated (successfully)
        }
        
        var dataSeries = [
            {
                target: "gluster-2.alaskalocal 3 john",
                datapoints: [
                    [_JOB_STATE["RUNNING"], times[1], 
                    {"job_name":"test_mpivch.sh", 'runtime': '00:00:00', 'time_limit': '1-00:00:00',
                    'start_time': '2018-01-26T12:05:46', 'end_time': '2018-01-27T12:05:46'}],
                    [_JOB_STATE["COMPLETED"], times[3],
                    {"job_name":"test_mpivch.sh", 'runtime': '04:00:00', 'time_limit': '1-00:00:00',
                    'start_time': '2018-01-26T12:05:46', 'end_time': '2018-01-26T16:05:46'}]
                ]
            },
            {
                target: "gluster-1.alaskalocal 0 doug",
                datapoints: [
                    [_JOB_STATE["PENDING"], times[2],
                    {"job_name":"test_ompi.sh", 'runtime': '00:00:00', 'time_limit': '1-00:00:00',
                    'start_time': 'Unkown', 'end_time': 'Unknown'}],
                    [_JOB_STATE["PENDING"], times[3],
                    {"job_name":"test_ompi.sh", 'runtime': '00:00:00', 'time_limit': '1-00:00:00',
                    'start_time': '2018-01-26T16:05:46', 'end_time': '2018-01-27T16:05:46'}]
                ]
            },
            {
              target: "gluster-1.alaskalocal 1 charana",
              datapoints: [
                [_JOB_STATE["RUNNING"], times[2],
                {"job_name":"test_pcp.sh", 'runtime': '00:10:00', 'time_limit': '1-00:00:00',
                'start_time': '2018-01-26T20:05:46', 'end_time': '2018-01-27T20:05:46'}],
                [_JOB_STATE["RUNNING"], times[4],
                {"job_name":"test_pcp.sh", 'runtime': '04:10:00', 'time_limit': '1-00:00:00',
                'start_time': '2018-01-26T20:05:46', 'end_time': '2018-01-27T20:05:46'}]
              ]
            },
            {
                target: "openhpc-compute-0 0 doug",
                datapoints: [
                    [_JOB_STATE["PENDING"], times[2],
                    {"job_name":"test_ompi.sh", 'runtime': '00:00:00', 'time_limit': '1-00:00:00',
                    'start_time': 'Unknown', 'end_time': 'Unknown'}],
                    [_JOB_STATE["PENDING"], times[3],
                    {"job_name":"test_ompi.sh", 'runtime': '00:00:00', 'time_limit': '1-00:00:00',
                    'start_time': '2018-01-26T16:05:46', 'end_time': '2018-01-27T16:05:46'}]
                ]
            },
            {
              target: "openhpc-compute-0 1 charana",
              datapoints: [
                [_JOB_STATE["RUNNING"], times[2],
                {"job_name":"test_pcp.sh", 'runtime': '00:10:00', 'time_limit': '1-00:00:00',
                'start_time': '2018-01-26T20:05:46', 'end_time': '2018-01-27T20:05:46'}],
                [_JOB_STATE["RUNNING"], times[4],
                {"job_name":"test_pcp.sh", 'runtime': '04:10:00', 'time_limit': '1-00:00:00',
                'start_time': '2018-01-26T20:05:46', 'end_time': '2018-01-27T20:05:46'}]
              ]
            }
        ]
    
        this.onDataReceived(dataSeries);
    }

    private onDataReceived(dataSeries){
        
        console.log("dataSeries: " + JSON.stringify(dataSeries));
        if(dataSeries == null) return;
        else {
            this.jobs_and_metrics = parseTimeSeries(dataSeries);
            this.filtered_jobs_and_metrics = this.jobs_and_metrics;
        }
    }

    public redirecttoJobNodeStatistics(hostname, job_and_metrics): void {
        this.timeout(() => {
            var start_time = new Date(job_and_metrics.job_data.start_time);
            var end_time = new Date(job_and_metrics.job_data.end_time);
            this.$location.path("/dashboard/db/system-overview").search({
                "var-hostname": hostname,
                "from": !isNaN(start_time.getTime()) ? start_time.getTime() : undefined,
                "to": !isNaN(end_time.getTime()) ? end_time.getTime() : undefined,
            })
        }, 250);
    }

    public filterJobs(): void {
        
        this.filtered_jobs_and_metrics = _.cloneDeep(this.jobs_and_metrics);
        //Filter by Job State
        if(this.job_filters.hostname != null && this.job_filters.hostname !== ""){
            this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                return job_and_metrics.job_data.resources.filter(resource => resource.name === "nodes")[0]
                    .value.some(resource => resource.startsWith(this.job_filters.hostname))
            })
        }

        console.log("this.job_filters.state: " + this.job_filters.state);
        if(this.job_filters.state != null){
            this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                return job_and_metrics.job_data.state === this.job_filters.state;
            })
        }

        if(this.job_filters.owner != null){
            this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                return job_and_metrics.user_id === this.job_filters.owner;
            })
        }

        console.log("this.job_filters.start_time: " + JSON.stringify(this.job_filters.start_time));
        if(this.job_filters.start_time.filter != null){
            var filter = this.job_filters.start_time.filter.split(" ")[1];
            if(this.job_filters.start_time.time != null && !isNaN(this.job_filters.start_time.time.getTime())){
                if(filter == "AFTER"){
                    this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                        var startDate = new Date(job_and_metrics.job_data.start_time) 
                        return !isNaN(startDate.getTime()) && moment(startDate)
                            .isAfter(moment(this.job_filters.start_time.time))
                    })
                }
                if(filter === "BEFORE"){
                    this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                        var startDate = new Date(job_and_metrics.job_data.start_time) 
                        return !isNaN(startDate.getTime()) && moment(startDate)
                            .isBefore(moment(this.job_filters.start_time.time))
                    })
                }
            }
        }

        if(this.job_filters.end_time.filter != null){
            var filter = this.job_filters.end_time.filter.split(" ")[1];
            if(this.job_filters.end_time.time != null && !isNaN(this.job_filters.end_time.time.getTime())){
                if(filter == "AFTER"){
                    this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                        var endDate = new Date(job_and_metrics.job_data.end_time) 
                        return !isNaN(endDate.getTime()) && moment(endDate)
                            .isAfter(moment(this.job_filters.end_time.time))
                    })
                }
                if(filter === "BEFORE"){
                    this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                        var endDate = new Date(job_and_metrics.job_data.end_time) 
                        return !isNaN(endDate.getTime()) && moment(endDate)
                            .isBefore(moment(this.job_filters.end_time.time))
                    })
                }
            }
        }

        if(this.job_filters.sort_by != null && this.job_filters.sort_operation != null){
            this.filtered_jobs_and_metrics = _.sortBy(this.filtered_jobs_and_metrics, job_and_metrics => {
                var date = this.job_filters.sort_by === "END TIME" ? job_and_metrics.job_data.end_time : job_and_metrics.job_data.start_time;
                return moment(date).unix();
            })
            if(this.job_filters.sort_operation == "DESCENDING") {
                this.filtered_jobs_and_metrics = _.reverse(this.filtered_jobs_and_metrics)
            }
        }
    }

    private link(scope, elem, attrs, ctrl){
        this.initPanelData();
    }

    public suggestNodesByHostname(){
        return ["gluster-1.alaskalocal", "gluster-2.alaskalocal", "openhpc-compute-0"]
    }

    public suggestOwners(){
        return ["charana", "doug"];
    }

    public isArray(obj){
        return Array.isArray(obj);
    }

}
