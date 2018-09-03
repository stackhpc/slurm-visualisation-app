///<reference path="../../globals.d.ts" />

import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import moment from '../../libs/moment'
// @ts-ignore
import CanvasManipulator from './canvas_manipulator';
import { parseTimeSeries, inverseLinearInterpolateOSIString, linearInterpolateOSIString,
     getTimeRange, orderByLevel } from './slurm_view_helpers';

export default class SlurmViewCtrl extends MetricsPanelCtrl {
    public static templateUrl = "panels/slurmView/slurm_view.html"
    private loaded = false;
    private node_height = 40 
    private node_level_offset = 10;
    private node_filters: any;
    private nodes: Array<any>;
    private filtered_nodes: Array<any>;
    private jobs_by_node: Array<any>;
    private jobs_by_level_by_node: Array<any>;
    private canvas_manipulator: CanvasManipulator;

   constructor(public $scope, public $injector, protected monascaSrv, protected alertSrv, protected $location, 
        protected $window, public $timeout, public timeSrv){
        super($scope, $injector);

        this.events.on('data-received', this.onDataReceived.bind(this));
        this.events.on('render', this.onDataReceived.bind(this));
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
                  "value": "$hostname"
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

        if(dataSeries == null && this.loaded != true) return;
        if(dataSeries == null && this.loaded == true){
            this.drawGraphic();
        }
        else {
            this.loaded = true;
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
            this.filtered_nodes = this.nodes;

            // Draw data
            this.drawGraphic();
        }
        
    }

    public filterNodes(){

        
        var hostname_dimension = this.panel.targets[0].dimensions
            .find(dimension => dimension.key === "hostname")
        if(hostname_dimension != null) {
            if(this.node_filters.hostname != null && this.node_filters.hostname !== ""){
                hostname_dimension.value = this.node_filters.hostname;
            } else hostname_dimension.value = "$hostname";
        }

        var user_id_dimension = this.panel.targets[0].dimensions
            .find(dimension => dimension.key === "user_id")
        if(user_id_dimension != null) {
            if(this.node_filters.job_filters.owner != null && this.node_filters.job_filters.owner !== ""){
                user_id_dimension.value = this.node_filters.job_filters.owner;
            } else user_id_dimension.value = "$all";
        }


        var job_id_dimension = this.panel.targets[0].dimensions
            .find(dimension => dimension.key === "job_id")
        if(job_id_dimension != null) {
            if(this.node_filters.job_filters.job_id != null && this.node_filters.job_filters.job_id !== ""){
                [this.node_filters.stored_from, this.node_filters.stored_to] = [this.node_filters.from, this.node_filters.to]
                job_id_dimension.value = this.node_filters.job_filters.job_id;
            } else {
                job_id_dimension.value = "$all";
            }
        }

        this.refresh();
    }

    // private clampTimeRange(){

    //     if(this.node_filters.job_filters.job_id != null && this.node_filters.job_filters.job_id !== ""){
    //         //Clamp timerange to period of time job was active
    //         var [minFrom, maxTo] = [null, null]
    //         this.filtered_nodes.forEach(node => {
    //             var jobs_for_node = this.jobs_by_node
    //                 .find(jobs_for_node => jobs_for_node.hostname === node.hostname);
    //             jobs_for_node.jobs
    //                 .filter(job =>  job.job_id === this.node_filters.job_filters.job_id)
    //                 .forEach(job => {
    //                     minFrom = Math.min(minFrom != null ? minFrom : Number.MAX_VALUE, job.start);
    //                     maxTo = Math.max(maxTo != null ? maxTo : Number.MIN_VALUE, job.end);
    //                 })
    //         });
    //         if(minFrom != null && maxTo != null){
                
    //             this.timeSrv.setTime({
    //                 from: minFrom,
    //                 to: maxTo
    //             })
    //         }
    //     }
    //     else {

    //     }
    // }

    private drawGraphic(){
        
        //this.clampTimeRange();
        console.log("drawGraphic");
        var [from, to] = [this.node_filters.from, this.node_filters.to]
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
                    // if((endProp - startProp) * this.total_width < 30) return;
                    this.canvas_manipulator.addJob(j, level, job, startProp, endProp - startProp);
                })
            })
        }
        console.log("this.panel.span: " + this.panel.span);
        this.canvas_manipulator.resetCanvas(this.panel.span * 110 - 155);
        this.canvas_manipulator.drawTimeline(from, to);
        this.canvas_manipulator.drawJobs(undefined);
    }

    private link(scope, elem, attrs, ctrl){

        //Create and Configure Canvas
        var canvas_elem = elem.find("#node-job-metrics-canvas")[0];
        var job_overview_overlay_elem = elem.find("#job-overview-overlay")[0];
        console.log("x: " + canvas_elem.parentElement.style.width);
        this.canvas_manipulator = new CanvasManipulator(canvas_elem, job_overview_overlay_elem, this.node_height,
        this.node_level_offset, this.panel.span * 110 - 155, this.$location, this.$window, this.monascaSrv,
        this.$timeout);
        canvas_elem.addEventListener("mousedown", (event) => {
            if(this.node_filters.job_filters.job_id != null && this.node_filters.job_filters.job_id !== "") return;
            this.node_filters.newFrom = linearInterpolateOSIString(this.node_filters.from, this.node_filters.to, event.offsetX / (canvas_elem.width/2))
            console.log("this.node_filters.newFrom: " + this.node_filters.newFrom);
        });
        canvas_elem.addEventListener("mouseup", (event) => {
            this.node_filters.newTo = linearInterpolateOSIString(this.node_filters.from, this.node_filters.to, event.offsetX / (canvas_elem.width/2))
            console.log("this.node_filters.newTo: " + this.node_filters.newTo);
            if(!moment(this.node_filters.newTo).isSame(moment(this.node_filters.newFrom), "minute")){
                var to = moment(this.node_filters.newTo).isAfter(moment(this.node_filters.newFrom)) ? this.node_filters.newTo : this.node_filters.newFrom;
                var from = moment(this.node_filters.newFrom).isBefore(moment(this.node_filters.newTo)) ? this.node_filters.newFrom : this.node_filters.newTo;
                //this.eventManager.updateTime({to: to, from: from});
                this.timeSrv.setTime({
                    from: from,
                    to: to
                })
            }        
        });
        // this.initPanelData();
    }
}

