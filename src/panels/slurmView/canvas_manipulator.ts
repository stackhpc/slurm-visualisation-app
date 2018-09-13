import moment from 'moment'
import _ from 'lodash'
import { HSVtoRGB } from './slurm_view_helpers';
import MonascaClient from '../../components/monasca_client'
import bluebird from "../../libs/bluebird"

bluebird.config({cancellation: true});

export default class CanvasManipulator {
    
    private drawingContext: CanvasRenderingContext2D;
    private time_range_resolution = 8; // ie.number of intervals
    private timeline_height = 30 * window.devicePixelRatio;
    private job_owner_hue_map: Map<string, number> = new Map();
    private job_id_saturation_value_map: Map<number, number> = new Map();
    private jobs_data: Array<any>;
    private mouse_down = false;
    private mouse_down_offset_x;
    private display_job_overview_overlay: bluebird<any>;
    private canvas_image: ImageData;
    private click_count = 0;
    private singleClickTimer: any;

    constructor(private canvas: HTMLCanvasElement, private job_overview_overlay: HTMLDivElement,
        private node_height, private level_offset, private total_width, private $location, 
        private $window, private monascaSrv: MonascaClient, private $timeout){

        this.node_height = node_height * window.devicePixelRatio;
        this.level_offset = level_offset * window.devicePixelRatio;
        this.total_width = total_width * window.devicePixelRatio;
        this.jobs_data = [];
        
        this.drawingContext = this.canvas.getContext('2d');
        this.drawingContext.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.canvas.style.width = (this.total_width/window.devicePixelRatio) + "px";
        this.canvas.width = this.total_width;
        this.addEventListeners();
    }

    private getHeight(){
        return (this.jobs_data.length > 0) 
            ? this.jobs_data[this.jobs_data.length-1].y 
                + this.jobs_data[this.jobs_data.length-1].levels * this.level_offset
                + this.node_height
            : 0;
    }

    private redirectToJobStatistics(job_id, start, end){

        console.log("double click");
        this.$timeout(() => {
            this.$location.path("/dashboard/db/job-statistics").search({
                "var-job_id": job_id,
                "var-datasource": "Monasca API",
                "from": start,
                "to": end,
            });
        }, 100);
    }

    private getJobWidth(job){
        return job.width_normalized * this.total_width;
    }

    private getJobX(job){
        return job.start_normalized * this.total_width + this.level_offset * job.level;
    }

    private findNode(offsetX, offsetY){
        for(let node_i = 0; node_i < this.jobs_data.length; node_i++){
            var node_y = this.jobs_data[node_i].y;
            var node_height = this.node_height + this.level_offset * this.jobs_data[node_i].levels;
            if(offsetY > node_y && offsetY < node_y + node_height){
                var jobs_for_node = this.jobs_data[node_i].jobs_level_data.reduce((acc, val) => acc.concat(val), []);
                var bounding_jobs = jobs_for_node.filter(job => {
                    var job_y = this.jobs_data[node_i].y + this.level_offset * this.jobs_data[node_i].levels - this.level_offset * job.level;
                    var job_height = this.node_height;
                    if(offsetX > this.getJobX(job)  && offsetX < this.getJobX(job) + this.getJobWidth(job)
                        && offsetY > job_y  && offsetY < job_y + job_height) return true;
                    else return false;
                })
                var selected_job = _.maxBy(bounding_jobs, job => job.level);
                return [node_i, selected_job];
            }
        }
        return [null, null]
    }

    private mouse_down_start_offsetX;
    private mouse_down_delta_offset_x;

    private addEventListeners(){

        angular.element(this.job_overview_overlay).parent()[0].addEventListener("mouseleave", (event) => {
            console.log("mouseleave");
            this.job_overview_overlay.style.display = "none";
        })

        this.canvas.addEventListener("mousedown", (event) => {
            this.canvas_image = this.drawingContext.getImageData(0, 0, this.total_width, this.getHeight());
            this.mouse_down = true;
            this.mouse_down_start_offsetX = event.offsetX * window.devicePixelRatio;
            this.mouse_down_delta_offset_x = 0;
            this.mouse_down_offset_x = event.offsetX * window.devicePixelRatio;
        });

        this.canvas.addEventListener("mouseup", (event) => {
            this.mouse_down = false;
        });

        this.canvas.addEventListener("mousemove", (event) => {
            var offsetX = event.offsetX * window.devicePixelRatio;
            var offsetY = event.offsetY * window.devicePixelRatio;
            if(this.mouse_down == true){
                if(Math.abs(offsetX - this.mouse_down_start_offsetX) < this.mouse_down_delta_offset_x){
                    //refresh and draw overlay till current point
                    this.drawingContext.putImageData(this.canvas_image, 0, 0);
                    this.drawLine(
                        [this.mouse_down_start_offsetX, 0],
                        [this.mouse_down_start_offsetX, this.getHeight()],
                        "red"
                    );
                    this.drawingContext.globalAlpha = 0.3;
                    this.drawingContext.fillStyle = "#555555"
                    this.drawingContext.fillRect(
                        this.mouse_down_start_offsetX , 0,
                        offsetX - this.mouse_down_start_offsetX, this.getHeight());
                    this.drawingContext.globalAlpha = 1;                    
                }
                else{ //continue drawing overlay
                    this.drawingContext.globalAlpha = 0.3;
                    this.drawingContext.fillStyle = "#555555"
                    this.drawingContext.fillRect(
                        this.mouse_down_offset_x , 0,
                        offsetX - this.mouse_down_offset_x, this.getHeight());
                    this.drawingContext.globalAlpha = 1;
                }
                this.mouse_down_delta_offset_x = Math.abs(offsetX - this.mouse_down_start_offsetX);
                this.mouse_down_offset_x = offsetX;
            }
            else{
                var [node_i, selected_job] = this.findNode(offsetX, offsetY);
                if(selected_job != null){
                    this.drawJobs(node_i);
                    var job_y = this.jobs_data[node_i].y + this.level_offset * this.jobs_data[node_i].levels - this.level_offset * selected_job.level;
                    var job_height = this.node_height;
                    this.drawJob(this.getJobX(selected_job), job_y, this.getJobWidth(selected_job), job_height, selected_job.job_id, selected_job.color);
                }
            }
        });

        this.canvas.addEventListener("click", (event) => {
            this.click_count++;
            if (this.click_count === 1) {
                this.singleClickTimer = setTimeout(() => {
                    this.click_count = 0;
                    onclick(event);
                }, 400);
            }
            else if (this.click_count === 2) {
                clearTimeout(this.singleClickTimer);
                this.click_count= 0;
                ondblclick(event);
            }
        })

        var onclick = (event) => {
            console.log("click");
            var offsetX = event.offsetX * window.devicePixelRatio;
            var offsetY = event.offsetY * window.devicePixelRatio;
            var [node_i, selected_job] = this.findNode(offsetX, offsetY);
            if(selected_job != null){

                this.job_overview_overlay.style.display = "block";
                this.job_overview_overlay.style.top = event.offsetY + "px";
                this.job_overview_overlay.style.left = event.offsetX + "px";
                this.job_overview_overlay.style.backgroundColor = "transparent";
                this.job_overview_overlay.style.color = "white";
                this.job_overview_overlay.innerHTML = `
                        <span ng-class="icon" class="fa fa-spinner fa-spin"></span>
                    `;

                var metric_prefix = `user.stats.${selected_job.job_id}.${selected_job.owner}`

                if(this.display_job_overview_overlay != null) this.display_job_overview_overlay.cancel();
                this.display_job_overview_overlay = bluebird.resolve(this.monascaSrv.listMetricNamesStartWith(metric_prefix))
                    .then(data => {
                        // data = ['user.stats.0.doug.user_metric1', 'user.stats.0.doug.user_metric2'];
                        var user_metrics: Array<any> = data.map(metric => metric.slice(metric_prefix.length + 1))
                        this.job_overview_overlay.style.backgroundColor = "#141414";
                        this.job_overview_overlay.innerHTML = 
                            "<div style='margin: 10px 20px 10px 10px; white-space: nowrap;'>" +
                            []
                            .concat(user_metrics
                                .reduce((acc, val) => {
                                    acc.push(`<div style="text-indent: 20px;"> ${val} </div>`);
                                    return acc;
                                }, [`<div> User Metrics </div>`]))
                            .concat([`job id: ${selected_job.job_id}`, `owner: ${selected_job.owner}`]
                                .reduce((acc, val) => {
                                    acc.push(`<div style="text-indent: 20px;"> ${val} </div>`);
                                    return acc;
                                }, [`<div> Job Info </div>`])
                            )
                            .join("\n")
                            + "</div>"
                    });
            }
        }

        var ondblclick = (event) => {
            var offsetX = event.offsetX * window.devicePixelRatio;
            var offsetY = event.offsetY * window.devicePixelRatio;
            var [node_i, selected_job] = this.findNode(offsetX, offsetY);
            if(selected_job != null){
                this.redirectToJobStatistics(selected_job.job_id, selected_job.start, selected_job.end);
            }
        }
    }

    

    public resetCanvas(total_width){
        
        this.total_width = total_width * window.devicePixelRatio;
        this.canvas.style.width = (this.total_width/window.devicePixelRatio) + "px";
        this.canvas.width = this.total_width;
        this.canvas.style.height = (this.getHeight() + this.timeline_height)/window.devicePixelRatio + "px";
        this.canvas.height = (this.getHeight() + this.timeline_height);
        this.drawingContext.fillStyle = "#1f1d1d";
        this.drawingContext.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // @ts-ignore
    public drawTimeline(from, to){
        console.log("from: " + moment(from).toDate().toUTCString().split(" ")[4]);
        console.log("to: " + moment(to).toDate().toUTCString().split(" ")[4]);

        if(this.jobs_data.length > 0){
            
            var interval_ms = moment.duration(moment(to).diff(moment(from))) / this.time_range_resolution;
            var interval_x = this.total_width / this.time_range_resolution;
            var height = this.getHeight();
    
            this.drawingContext.fillStyle = "white"
            this.drawLine(
                [0, height + this.timeline_height],
                [this.total_width, height + this.timeline_height],
                "grey"
            );
    
            // Draw timestamps
            Array.from(Array(this.time_range_resolution).keys()).forEach(i => {
                if(i == 0 || i == this.time_range_resolution) return;
                var x = interval_x * i;
                var date = moment(from).add(interval_ms * i).toDate();
                var time_str_24hr = date.toUTCString().split(" ")[4];
                var date_str = date.getUTCDate() + "/" + date.getUTCMonth();
                var time_date_str = date_str + " " + time_str_24hr;
                this.drawingContext.font = (11 * window.devicePixelRatio) + "px" + " AvenirNext-UltraLight";
                var textMeasure = this.drawingContext.measureText(time_date_str);
                this.drawingContext.fillText(time_date_str, x - textMeasure.width/2, height + this.timeline_height * (3/4));
                
                this.drawLine(
                    [x, 0],
                    [x, height],
                    "grey"
                );    
            })
        }
    }

    private drawLine(start: [number, number], end: [number, number], color: string){
        this.drawingContext.strokeStyle = color;
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(start[0], start[1]);
        this.drawingContext.lineTo(end[0], end[1]);
        this.drawingContext.stroke();
    }

    public drawJobs(node_i){
        var jobs_data = (node_i != null) ? [this.jobs_data[node_i]] : this.jobs_data;
        jobs_data.forEach((jobs_for_node_by_level) => {
            jobs_for_node_by_level.jobs_level_data.forEach((jobs_for_node_for_level, level) => {
                jobs_for_node_for_level.forEach(job => {
                    var job_y = jobs_for_node_by_level.y + this.level_offset * jobs_for_node_by_level.levels - this.level_offset * job.level;
                    var job_height = this.node_height;
                    this.drawJob(this.getJobX(job), job_y, this.getJobWidth(job), job_height, job.job_id, job.color);
                });
            });
        })
    }

    private drawJob(x, y, width, height, job_id, color){
        console.log(x, y, width, height, job_id)
        this.drawingContext.fillStyle = color;
        this.drawingContext.fillRect(x, y, width, height);
        this.drawingContext.strokeStyle = "grey";
        this.drawingContext.strokeRect(x, y, width, height);
        
        this.drawingContext.fillStyle = "white";
        this.drawingContext.font = (11 * window.devicePixelRatio) + "px" + " AvenirNext-UltraLight";
        this.drawingContext.fillText(job_id, x + width/2, y + height/2) 
    }

    public addNode(node_i){
        if(this.jobs_data[node_i] == null) {
            for(var c_node_i = this.jobs_data.length; c_node_i <= node_i; c_node_i++){
                this.jobs_data[c_node_i] = {
                    y: node_i === 0 ? 0 
                        : this.jobs_data[c_node_i - 1].y 
                            + this.node_height
                            + this.jobs_data[node_i - 1].levels * this.level_offset,
                    levels: 0,
                    jobs_level_data: []
                }
            }
        }
    }

    public addJob(node_i, level, job, start_normalized, width_normalized): void {

        var x = start_normalized * this.total_width + this.level_offset * level;
        var width = width_normalized;
        if(!this.job_id_saturation_value_map.has(job.job_id)) {
            if(!this.job_owner_hue_map.has(job.owner)){
                this.job_owner_hue_map.set(job.owner, Math.random());
            }
            this.job_id_saturation_value_map.set(job.job_id, Math.random());
        }

        if(this.jobs_data[node_i].jobs_level_data[level] == null) {
            this.jobs_data[node_i].jobs_level_data[level] = [];
            this.jobs_data[node_i].levels = level;
        }

        var rgb = HSVtoRGB(this.job_owner_hue_map.get(job.owner),
         this.job_id_saturation_value_map.get(job.job_id),
         this.job_id_saturation_value_map.get(job.job_id));
        console.log("rgb: " + JSON.stringify(rgb));

        this.jobs_data[node_i].jobs_level_data[level].push({
            start_normalized: start_normalized, width_normalized: width_normalized, level: level,
            job_id: job.job_id, hostname: job.hostname, owner: job.owner, start: job.start, end: job.end,
            color: "#" + Number(rgb.r << 16 | rgb.g << 8 | rgb.b).toString(16).padStart(6, '0')
        });
    }

    public clearJobs(){
        this.jobs_data = [];
    }

}


