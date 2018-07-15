///<reference path="../../globals.d.ts" />

import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import moment from '../../libs/moment'
import CanvasManipulator from './canvas_manipulator';
import { parseTimeSeries, inverseLinearInterpolateOSIString, linearInterpolateOSIString,
     getTimeRange, orderByLevel } from './slurm_view_helpers';

export default class SlurmViewCtrl extends MetricsPanelCtrl {
    public static templateUrl = "panels/slurmView/slurm_view.html"
    private node_height = 40 
    private node_level_offset = 10;
    private total_width = 500;
    private node_filters: any;
    private nodes: Array<any>;
    private filtered_nodes: Array<any>;
    private jobs_by_node: Array<any>;
    private jobs_by_level_by_node: Array<any>;
    private canvas_manipulator: CanvasManipulator;

    constructor(public $scope, public $injector, protected monascaSrv, protected alertSrv, protected $location){
        super($scope, $injector);
        
        // this.events.on('data-received', this.onDataReceived.bind(this));
        this.node_filters = {
            job_filters: {}
        };
        this.configureMetricsOptionsTab();
    }

    private initPanelData(){

        var to = moment().toDate().getTime();
        var from = moment().subtract(1, "day").toDate().getTime();
        var interval = moment.duration(moment(to).diff(moment(from)));
        var times = Array.from(Array(5).keys()).map(i => moment(from).add(interval * (i/4)).toDate().getTime());
    
        var dataSeries = [
            {
              target: "gluster-1.alaskalocal 0 doug",
              datapoints: [
                [2, times[2]], 
                [2, times[3]],
              ]
            },
            {
              target: "gluster-1.alaskalocal 1 charana",
              datapoints: [
                [2, times[3]],
                [2, times[4]]
              ]
            },
            {
                target: "openhpc-compute-0 0 doug",
                datapoints: [
                  [2, times[2]],
                  [2, times[3]]
                ]
            },
            {
              target: "openhpc-compute-0 1 charana",
              datapoints: [
                [2, times[2]],
                [2, times[4]]
              ]
            }
        ]
    
        this.onDataReceived(dataSeries);
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

    private onDataReceived(dataSeries){
        console.log("data recieved: " + JSON.stringify(dataSeries));

        // Check data
        try {
            if(dataSeries[0]){
                if(dataSeries[0].target.split(" ").length !== 3) throw Error("incorret dataSeries format");
            } else throw Error("empty dataSeries");
        } catch(err){
            this.alertSrv.set(err.message, null, "error", 10000);
            return;
        }

        
        // Store data
        [this.node_filters.from, this.node_filters.to] = getTimeRange(dataSeries);
        this.jobs_by_node = parseTimeSeries(dataSeries);
        //TODO: Why is this.jobs_by_node object manipulated
        this.jobs_by_level_by_node = orderByLevel(_.cloneDeep(this.jobs_by_node));

        this.nodes = this.jobs_by_level_by_node
            .filter(jobs_by_level_for_node => { //Filter nodes with no jobs
                return (jobs_by_level_for_node.jobs_by_level.length > 0)
            })
            .map(jobs_by_level_for_node => {
                return {
                    hostname: jobs_by_level_for_node.hostname,
                    height: this.node_height + (jobs_by_level_for_node.jobs_by_level.length - 1) * this.node_level_offset
                }
            })

        // Draw data
        this.drawGraphic();
        
        
    }

    private filterNodes(){
        
        this.filtered_nodes = this.nodes;

        if(this.node_filters.hostname !== undefined && this.node_filters.hostname != ""){
            this.filtered_nodes = this.filtered_nodes
                .filter(node => node.hostname.startsWith(this.node_filters.hostname));
        }

        if(this.node_filters.owner !== undefined && this.node_filters.owner != ""){
            this.filtered_nodes = this.filtered_nodes
                .filter(node => {
                    var jobs_for_node = this.jobs_by_node
                        .find(jobs_for_node => jobs_for_node.hostname === node.hostname);
                    if(jobs_for_node === undefined) return false;
                    return jobs_for_node.jobs
                        .some(job => job.owner === this.node_filters.job_filters.owner)
                });
        }

        if(this.node_filters.job_filters.job_id !== undefined && this.node_filters.job_filters.job_id !== ""){
            this.filtered_nodes = this.filtered_nodes
                .filter(node => {
                    var jobs_for_node = this.jobs_by_node
                        .find(jobs_for_node => jobs_for_node.hostname === node.hostname);
                    if(jobs_for_node === undefined) return false;
                    return jobs_for_node.jobs
                        .some(job =>  job.job_id === this.node_filters.job_filters.job_id)
                });

            //Clamp timerange to period of time job was active
            var [minFrom, maxTo] = [null, null]
            this.filtered_nodes.forEach(node => {
                var jobs_for_node = this.jobs_by_node
                    .find(jobs_for_node => jobs_for_node.hostname === node.hostname);
                jobs_for_node.jobs
                    .filter(job =>  job.job_id === this.node_filters.job_filters.job_id)
                    .forEach(job => {
                        minFrom = Math.min(minFrom != null ? minFrom : Number.MAX_VALUE, job.start);
                        maxTo = Math.max(maxTo != null ? maxTo : Number.MIN_VALUE, job.end);
                    })
            });
            if(minFrom != null && maxTo != null){
                this.node_filters.clamped_from = minFrom;
                this.node_filters.clamped_to = maxTo;
            }

        } else {
            delete this.node_filters.clamped_from;
            delete this.node_filters.clamped_to;
        }
    }

    private drawGraphic(){
        
        this.filterNodes();
        var [from, to] = [this.node_filters.clamped_from || this.node_filters.from, this.node_filters.clamped_to || this.node_filters.to]
        this.canvas_manipulator.clearJobs();
        for(let j = 0; j < this.filtered_nodes.length; j++){
            var node = this.filtered_nodes[j];
            this.canvas_manipulator.addNode(j);
            var jobs_by_level_for_node = this.jobs_by_level_by_node
                .find(jobs_by_level_for_node => jobs_by_level_for_node.hostname === node.hostname)
            if(jobs_by_level_for_node === undefined) continue;
            jobs_by_level_for_node.jobs_by_level.forEach((jobs_by_level, level) => {
                if(this.node_filters.job_filters.job_id !== undefined && this.node_filters.job_filters.job_id !== ""){
                    jobs_by_level = jobs_by_level.filter(job => job.job_id === this.node_filters.job_filters.job_id);
                }
                if(this.node_filters.job_filters.owner !== undefined && this.node_filters.job_filters.owner !== ""){
                    jobs_by_level = jobs_by_level.filter(job => job.owner === this.node_filters.job_filters.owner);
                }
                jobs_by_level.forEach(job => {
                    
                    var startProp = inverseLinearInterpolateOSIString(from, to, job.start);
                    var endProp = inverseLinearInterpolateOSIString(from, to, job.end);
                    if((startProp != null && endProp != null) || (job.start > from && job.end > to) 
                        || (job.start < from && job.end > to) || (job.start < from && job.end < to)) {
                            startProp = startProp == null ? 0 : startProp;
                            endProp = endProp == null ? 1 : endProp;
                        } else return;
                    this.canvas_manipulator.addJob(j, level, job, startProp, endProp - startProp);
                    // if((this.node_filters.job_filters.job_id === undefined 
                    //     || this.node_filters.job_filters.job_id === "")
                    //     && ((endProp - startProp) * this.total_width) < 30) return;
                    
                })
            })
        }
        this.canvas_manipulator.resetCanvas();
        this.canvas_manipulator.drawTimeline(moment(from), moment(to));
        this.canvas_manipulator.drawJobs(undefined);
    }

    private link(scope, elem, attrs, ctrl){

        //Create and Configure Canvas
        var canvas_elem = elem.find("#node-job-metrics-canvas")[0];
        var job_overview_overlay_elem = elem.find("#job-overview-overlay")[0];
        console.log("x: " + canvas_elem.parentElement.style.width);
        this.canvas_manipulator = new CanvasManipulator(canvas_elem, job_overview_overlay_elem, this.node_height, this.node_level_offset, this.total_width, this.$location, this.monascaSrv);
        canvas_elem.addEventListener("mousedown", (event) => {
            var [from, to] = [this.node_filters.clamped_from || this.node_filters.from, this.node_filters.clamped_to || this.node_filters.to]
            this.node_filters.newFrom = linearInterpolateOSIString(from, to, event.offsetX / (canvas_elem.width/2))
            console.log("this.node_filters.newFrom: " + this.node_filters.newFrom);
        });
        canvas_elem.addEventListener("mouseup", (event) => {
            var [from, to] = [this.node_filters.clamped_from || this.node_filters.from, this.node_filters.clamped_to || this.node_filters.to]
            this.node_filters.newTo = linearInterpolateOSIString(from, to, event.offsetX / (canvas_elem.width/2))
            console.log("this.node_filters.newTo: " + this.node_filters.newTo);
            if(!moment(this.node_filters.newTo).isSame(moment(this.node_filters.newFrom), "minute")){
                this.node_filters.clamped_to = this.node_filters.to = moment(this.node_filters.newTo).isAfter(moment(this.node_filters.newFrom)) ? this.node_filters.newTo : this.node_filters.newFrom;
                this.node_filters.clamped_from = this.node_filters.from = moment(this.node_filters.newFrom).isBefore(moment(this.node_filters.newTo)) ? this.node_filters.newFrom : this.node_filters.newTo;
            }
            this.drawGraphic();
        });
        this.initPanelData();
    }
    
}

