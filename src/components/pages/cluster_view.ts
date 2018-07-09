///<reference path="../../globals.d.ts" />

import moment from 'moment'

export default class ClusterViewPageCtrl {
    public static templateUrl = "components/pages/cluster_view.html"
    private node_filters: any;
    private node_filters_data;
    private nodes_and_metrics: Array<any>;
    private filtered_nodes_and_metrics: Array<any>;
    private nodes_job_metrics: Array<any>;
    private canvas_manipulator: CanvasManipulator;
    public init: Promise<any>;

    constructor(private monascaSrv, private $timeout, private $scope){
        this.node_filters = {
            to: "now",
            from: "now-1_day"
        };
        this.computeFiltersData();
        this.init = this.loadView();
    }

    private durationProp(timestamp){
        var diff_ms = timestamp.diff(this.node_filters_data.from);
        var interval_ms = this.node_filters_data.interval.asMilliseconds();
        return diff_ms / interval_ms;
    }

    private computeFiltersData(){
        this.node_filters_data = {};
        console.log(this.parseTimestamptoOSIString(this.node_filters.from));
        console.log(this.parseTimestamptoOSIString(this.node_filters.to));
        this.node_filters_data.from = moment(this.parseTimestamptoOSIString(this.node_filters.from));
        this.node_filters_data.to = moment(this.parseTimestamptoOSIString(this.node_filters.to));
        this.node_filters_data.interval = moment.duration(this.node_filters_data.to.diff(this.node_filters_data.from))
        console.log("this.node_filters_data.interval: " + this.node_filters_data.interval);
    }
    
    private parseTimestamptoOSIString(timestamp: string): string {
        if(!moment(timestamp).isValid()) return moment(timestamp).toISOString();
        
        if(timestamp.startsWith("now")){
            if(timestamp.indexOf("-") === -1) return moment();
            else{
                var timestamp_period = parseInt(timestamp.substring(timestamp.indexOf("-") + 1, timestamp.length));
                if(isNaN(timestamp_period)) throw new Error("invalid timestamp period")
                var timestamp_unit = timestamp.substring(timestamp.indexOf("_") + 1, timestamp.length);
                if(!['day', 'month', 'year'].some(unit => unit === timestamp_unit)) throw new Error("invalid timestamp unit")
                // @ts-ignore: collision due to deprecated reverse overloading
                return moment().subtract(timestamp_period, timestamp_unit).toISOString()
            }
        }
    }

    private filterNodes(){
        
        this.filtered_nodes_and_metrics = this.nodes_and_metrics;
        if(this.node_filters.hostname !== undefined && this.node_filters.hostname != ""){
            this.filtered_nodes_and_metrics = this.filtered_nodes_and_metrics
                .filter(node_and_metrics => node_and_metrics.hostname === this.node_filters.hostname);
        }
    }

    private loadView(){
        return this.monascaSrv
        .listNodesAndMetrics()
        .then(nodes_and_metrics => {
            this.nodes_and_metrics = nodes_and_metrics
            this.filtered_nodes_and_metrics = nodes_and_metrics;
        })
        .then(() => this.monascaSrv.nodeJobMetrics(
            this.parseTimestamptoOSIString(this.node_filters.from),
            this.parseTimestamptoOSIString(this.node_filters.to)
        ))
        .then(nodes_job_metrics => {
            this.nodes_job_metrics = nodes_job_metrics;
        })
        .then(() => this.$timeout());
    }

    private link(scope, elem, attrs, ctrl){
        
        console.log("started drawing")
        this.init
        .then(() => {
            this.canvas_manipulator = new CanvasManipulator(elem.find("#node-job-metrics-canvas")[0]);
            for(let j = 0; j < this.filtered_nodes_and_metrics.length; j++){
                var node_and_metrics = this.filtered_nodes_and_metrics[j];
                var node_job_metrics = this.nodes_job_metrics
                    .find(node_job_metrics => node_job_metrics.hostname === node_and_metrics.hostname)
                if(node_job_metrics === undefined) continue;
                for(let i = 0; i < node_job_metrics.states_over_time.length + 1; i++){
                    var fillStyle = (i-1 == -1) ? "blue" :
                        node_job_metrics.states_over_time[i-1].state === "ON" ? "red" : "yellow";
                    var startProp = (i-1 == -1) ? 0 : this.durationProp(node_job_metrics.states_over_time[i-1].timestamp);
                    var endProp = (i == node_job_metrics.states_over_time.length) ? 1 : this.durationProp(node_job_metrics.states_over_time[i].timestamp);
                    this.canvas_manipulator.drawRect(
                        j * 100, 500 * startProp, 500 * (endProp - startProp), 100, fillStyle);
                }
            }
        })
    }
    
}

class CanvasManipulator {

    private canvas: any; // jsLite wrapper over HTMLCanvasElement class
    private drawingContext: any;

    constructor(canvas_elem: HTMLCanvasElement){
        console.log("nodeName: " + canvas_elem.nodeName);
        console.log("tagName: " + canvas_elem.tagName);
        this.canvas = canvas_elem;
        this.drawingContext = this.canvas.getContext('2d');

    }

    public drawRect(x, y, width, height, color): void {
        console.log(x, y, width, height, color);
        this.drawingContext.fillStyle = color;
        this.drawingContext.fillRect(x ,y, width, height);
        console.log("drew rectangle")
        this.drawingContext.fillStyle = "white";
        this.drawingContext.fillRect(0 ,0, 100, 100);
        // this.drawingContext.fillStyle = "black";
    }
}