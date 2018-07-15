///<reference path="../../globals.d.ts" />

import _ from "lodash"
import moment from '../../libs/moment'
import Chart from "../../libs/Chart"


export default class SlurmOverviewPageCtrl {

    public static templateUrl = "components/pages/slurm_overview.html"
    public loadFailed: boolean;
    public pageLoaded: boolean;
    public nodes_and_metrics: Array<any>;
    public filtered_nodes_and_metrics: Array<any>;
    public node_filters: any;    
    public jobs_and_metrics: Array<any>;
    public filtered_jobs_and_metrics: Array<any>;
    public job_filters: any;
    public cluster_metrics: any;
    public init: Promise<any>;

    public multiListSelected: Array<String>;
    public multiListOptions: Array<String>;

    constructor(private $window, private $location, private $timeout, private monascaSrv){
        
        console.log("SlurmOverviewPageCtrl: started");
        this.multiListSelected = [];
        this.multiListOptions = ["Java", "C++", "C#"];
        this.pageLoaded = false;
        this.loadFailed = false;
        this.node_filters = {};
        this.job_filters = {
            start_time: {},
            end_time: {}
        };
        this.init = this.loadMetrics()
            .then(() => this.$timeout());
    }

    public suggestOwners(){
        return ["charana", "doug"];
    }

    public suggestNodesByHostname(){
        return ["gluster-1.alaskalocal", "gluster-2.alaskalocal", "openhpc-compute-0"]
    }

    public redirecttoJobNodeStatistics(hostname, job_and_metrics): void {
        var start_time = new Date(job_and_metrics.metrics.start_time);
        var end_time = new Date(job_and_metrics.metrics.end_time);
        this.$location.path("/dashboard/db/system-overview").search({
            "var-hostname": hostname,
            "from": !isNaN(start_time.getTime()) ? start_time.getTime() : undefined,
            "to": !isNaN(end_time.getTime()) ? end_time.getTime() : undefined,
        })
        this.$window.location.reload()
    }

    public filterJobs(): void {
        
        this.filtered_jobs_and_metrics = _.cloneDeep(this.jobs_and_metrics);
        //Filter by Job State
        if(this.job_filters.hostname !== undefined && this.job_filters.hostname !== ""){
            this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                return job_and_metrics.metrics.resources.filter(resource => resource.name === "nodes")[0]
                    .value.some(resource => resource.startsWith(this.job_filters.hostname))
            })
        }

        console.log("this.job_filters.state: " + this.job_filters.state);
        if(this.job_filters.state !== undefined){
            this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                return job_and_metrics.metrics.state === this.job_filters.state;
            })
        }

        if(this.job_filters.owner !== undefined){
            this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                return job_and_metrics.owner === this.job_filters.owner;
            })
        }

        console.log("this.job_filters.start_time: " + JSON.stringify(this.job_filters.start_time));
        if(this.job_filters.start_time.filter !== undefined){
            var filter = this.job_filters.start_time.filter.split(" ")[1];
            if(this.job_filters.start_time.time !== undefined && !isNaN(this.job_filters.start_time.time.getTime())){
                if(filter == "AFTER"){
                    this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                        var startDate = new Date(job_and_metrics.metrics.start_time) 
                        return !isNaN(startDate.getTime()) && moment(startDate)
                            .isAfter(moment(this.job_filters.start_time.time))
                    })
                }
                if(filter === "BEFORE"){
                    this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                        var startDate = new Date(job_and_metrics.metrics.start_time) 
                        return !isNaN(startDate.getTime()) && moment(startDate)
                            .isBefore(moment(this.job_filters.start_time.time))
                    })
                }
            }
        }

        if(this.job_filters.end_time.filter !== undefined){
            var filter = this.job_filters.end_time.filter.split(" ")[1];
            if(this.job_filters.end_time.time !== undefined && !isNaN(this.job_filters.end_time.time.getTime())){
                if(filter == "AFTER"){
                    this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                        var endDate = new Date(job_and_metrics.metrics.end_time) 
                        return !isNaN(endDate.getTime()) && moment(endDate)
                            .isAfter(moment(this.job_filters.end_time.time))
                    })
                }
                if(filter === "BEFORE"){
                    this.filtered_jobs_and_metrics = this.filtered_jobs_and_metrics.filter(job_and_metrics => {
                        var endDate = new Date(job_and_metrics.metrics.end_time) 
                        return !isNaN(endDate.getTime()) && moment(endDate)
                            .isBefore(moment(this.job_filters.end_time.time))
                    })
                }
            }
        }
    }

    public filterNodes(): void {

        this.filtered_nodes_and_metrics = _.cloneDeep(this.nodes_and_metrics);
        //Filter by Node hostname
        console.log("this.node_filters.hostname: " + this.node_filters.hostname);
        if(this.node_filters.hostname !== undefined && this.node_filters.hostname !== ""){
            this.filtered_nodes_and_metrics = this.filtered_nodes_and_metrics.filter(node_and_metrics => {
                return node_and_metrics.hostname.startsWith(this.node_filters.hostname)
            })             
        }
        //Filter by Node usage
        if(this.node_filters.severity !== undefined){
            this.filtered_nodes_and_metrics = this.filtered_nodes_and_metrics.filter(node_and_metrics => {
                var severity = node_and_metrics.metrics.usage.color === "red" ? "HIGH"
                    : node_and_metrics.metrics.usage.color === "yellow" ? "MEDIUM" : "LOW";
                return severity === this.node_filters.severity;
            })
        }
    }

    public isArray(obj){
        return Array.isArray(obj);
    }

    private loadMetrics() : Promise<any> {
        return this.monascaSrv
            .listClusterMetrics()
            .then((cluster_metrics: any) => {
                console.log("SlurmOverviewPageCtrl: loadClusterMetrics: success");
                this.cluster_metrics = cluster_metrics;
            })
            .then(() => this.monascaSrv.listNodesAndMetrics())
            .then((nodes_and_metrics: Array<any>) => {
                console.log("SlurmOverviewPageCtrl: listNodesAndMetrics: success");
                this.nodes_and_metrics = nodes_and_metrics.map((node_and_metrics) => {
                    var percentage = parseInt(node_and_metrics.metrics.usage.substr(0, node_and_metrics.metrics.usage.indexOf("%")))
                    node_and_metrics.metrics.usage = {
                        percentage: node_and_metrics.metrics.usage,
                    }
                    console.log("node_and_metrics.metrics.usage.percentage: " + node_and_metrics.metrics.usage.percentage);
                    console.log("percentage: " + percentage);
                    node_and_metrics.metrics.usage.color = percentage >= 80 ? "red" : (percentage >= 50 ? "yellow" : "white")
                    console.log("node_and_metrics.metrics.usage.color: " + node_and_metrics.metrics.usage.color);
                    return node_and_metrics;
                });
                this.filtered_nodes_and_metrics = this.nodes_and_metrics;
            })
            .then(() => this.monascaSrv.listJobsAndMetrics())
            .then((jobs_and_metrics: Array<any>) => {
                console.log("SlurmOverviewPageCtrl: listJobsAndMetrics: success");
                this.jobs_and_metrics = jobs_and_metrics;
                this.filtered_jobs_and_metrics = this.jobs_and_metrics;
            })
            .catch((err: Error) => {
                console.log("SlurmOverviewPageCtrl: " + err.message);
                this.loadFailed = true;
            })
            .then(() => {
                console.log("SlurmOverviewPageCtrl: page-loaded");
                this.pageLoaded = true;
            })
    }
}