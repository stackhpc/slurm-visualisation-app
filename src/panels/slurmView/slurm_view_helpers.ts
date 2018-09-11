import moment from '../../libs/moment'
import _ from 'lodash'

export function getTimeRange(dataSeries) : [number, number]{

    var min = undefined, max = undefined;
    dataSeries.forEach(metric => {
        if(metric.datapoints && metric.datapoints.length >= 2){
            min = Math.min(min ? min : Number.MAX_VALUE, metric.datapoints[0][1]);
            max = Math.max(max ? max : Number.MIN_VALUE, metric.datapoints[metric.datapoints.length - 1][1]);
        }
    })
    if(min && max) return [min, max];
    else return [undefined, undefined];
}

var job_state_map = ["UNKNOWN", "PENDING", "RUNNING", "SUSPENDED", "COMPLETING", "COMPLETED"]
export function parseTimeSeries(dataSeries){

    // Choose the longest and remove duplicates
    var uniq_job_metrics = _.groupBy(dataSeries, job_metric => job_metric.target);
    dataSeries = Object.entries(uniq_job_metrics).map(([hostname, uniq_job_metric_list]: [string, any]) => {
        return _.maxBy(uniq_job_metric_list, job_metric => job_metric.datapoints.length);
    })

    var job_metrics_groupedby_node = _.groupBy(dataSeries, job_metric => job_metric.target.split(" ")[0]); //group by host/node
    delete job_metrics_groupedby_node["null"];
    var jobs_by_node = Object.entries(job_metrics_groupedby_node).map(([hostname, job_metrics_by_node]: [string, any]) => {
        var jobs = [];
        job_metrics_by_node.forEach(job_metric => {
            var [hostname, job_id, owner] = job_metric.target.split(" ");
            var job_states = groupByProximity(job_metric.datapoints, datapoint => job_state_map[datapoint[0]])  //group by proximity according to job state
            if(job_states['RUNNING']){
                var running_job_states = job_states['RUNNING'].reduce((running_job_states, job_running_state) => {
                    if(job_running_state.length >= 2){
                        running_job_states.push({
                            start: job_running_state[0][1],
                            end: job_running_state[job_running_state.length-1][1],
                            state: 'RUNNING'
                        })   
                    }
                    return running_job_states;
                }, [])
                running_job_states.forEach(running_state => {
                    jobs.push({ job_id: job_id, owner: owner, start: running_state.start, end: running_state.end, state: running_state.state})
                });
            }
        })
        return {
            hostname: hostname,
            jobs: jobs
        };
    });
    console.log("jobs_by_node: " + JSON.stringify(jobs_by_node));
    return jobs_by_node;
}

// var job_state_map = ["UNKNOWN", "PENDING", "RUNNING", "SUSPENDED", "COMPLETING", "COMPLETED"]
// export function parseTimeSeries(dataSeries){

//     var job_metrics_groupedby_node = _.groupBy(dataSeries, job_metric => job_metric.target.split(" ")[0]); //group by host/node
//     console.log("job_metrics_groupedby_node: " + JSON.stringify(job_metrics_groupedby_node));
//     var jobs_by_node = Object.entries(job_metrics_groupedby_node).map(([hostname, job_metrics_by_node]: [string, any]) => {
//         console.log("hostname: " + hostname, "job_metrics_by_node: " + JSON.stringify(job_metrics_by_node));
//         var jobs = [];
//         job_metrics_by_node.forEach(job_metric => {
//             var [hostname, job_id, owner] = job_metric.target.split(" ");
//             console.log("hostname: " + hostname, "job_id: " + job_id, "owner: " + owner);
//             var job_states = groupByProximity(job_metric.datapoints, datapoint => job_state_map[datapoint[0]])  //group by proximity according to job state
//             console.log("job_states: " + JSON.stringify(job_states));
//             if(job_states['RUNNING']){
//                 var running_job_states = _.without(job_states['RUNNING'].map(job_running_state => (job_running_state.length >= 2) ? {
//                     start: job_running_state[0][1],
//                     end: job_running_state[job_running_state.length-1][1],
//                     state: 'RUNNING'
//                 } : null), [null]);
//                 running_job_states.forEach(running_state => {
//                     jobs.push({ job_id: job_id, owner: owner, start: running_state.start, end: running_state.end, state: running_state.state})
//                 });
//             }
//         })
//         return {
//             hostname: hostname,
//             jobs: jobs
//         };
//     });
//     console.log("jobs_by_node: " + JSON.stringify(jobs_by_node));
//     return jobs_by_node;
// }

export function orderByLevel(jobs_by_node){

    var jobs_by_node_and_level = jobs_by_node.map(jobs_for_node => {
        var jobs_by_level = [];
        while(jobs_for_node.jobs.length !== 0){
            jobs_by_level.push([jobs_for_node.jobs[0]]);
            jobs_for_node.jobs.splice(0, 1);
            for(let i = 0; i < jobs_for_node.jobs.length; i++){
                if(moment(jobs_for_node.jobs[i].start)
                    .isSameOrAfter(moment(jobs_by_level[jobs_by_level.length-1][jobs_by_level[jobs_by_level.length-1].length - 1].end))){
                    jobs_by_level[jobs_by_level.length-1].push(jobs_for_node.jobs[i]);
                    jobs_for_node.jobs.splice(i, 1);
                    i--;
                }
            }
        }
        return {
            hostname: jobs_for_node.hostname,
            jobs_by_level: jobs_by_level
        }
    })
    console.log("jobs_by_node_and_level: " + JSON.stringify(jobs_by_node_and_level));
    return jobs_by_node_and_level;
}

export function inverseLinearInterpolateOSIString(start, end, value){
    if(moment(value).isBefore(moment(start)) || moment(value).isAfter(moment(end))) return null;
    var diff_ms = moment(value).diff(moment(start));
    var interval_ms = moment(end).diff(moment(start));
    return diff_ms / interval_ms;
}

export function linearInterpolateOSIString(start, end, prop: number){
    console.log("prop: " + prop);
    var duration_diff = moment.duration(moment(end).diff(moment(start))) * prop;
    return moment(start).add(duration_diff);
}

var identity = val => val;
export function groupByProximity(list, mapToKey = identity){

    var groups: any = {};
    groups[mapToKey(list[0])] = [[list[0]]];
    for(let i = 1; i < list.length; i++){
        var [prevVal, currVal] = [list[i-1], list[i]];
        if(mapToKey(prevVal) === mapToKey(currVal)) {
            if(!groups[mapToKey(prevVal)]) groups[mapToKey(prevVal)] = [[currVal]];
            else groups[mapToKey(prevVal)][groups[mapToKey(prevVal)].length - 1].push(currVal);
        }
        else {
            if(!groups[mapToKey(currVal)]) groups[mapToKey(currVal)] = [[currVal]];
            else groups[mapToKey(currVal)].push([currVal]);
        }
    }
    return groups;
}

export function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

