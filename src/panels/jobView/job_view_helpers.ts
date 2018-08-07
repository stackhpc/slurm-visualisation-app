import _ from 'lodash'

var _JOB_STATE_INV = {
    "0": "UNKNOWN", 
    "1": "PENDING",       // PD, Awaiting resource allocation
    "2": "RUNNING",       // R, Resources allocated and script executing
    "3": "SUSPENDED",     // S, Job suspended and previously allocated resources released
    "4": "COMPLETING",    // CG, in the process of completing, processes of a job still executing in the background
    "5": "COMPLETED"      // CD, job terminated (successfully)
}

export function parseTimeSeries(dataSeries){
       
    var jobsById = _.groupBy(dataSeries, metric_measurements => metric_measurements.target.split(" ")[1]) //Group metrics by job id
    return Object.entries(jobsById).map(([job_id, metric_measurements]: [string, Array<any>]) => {
        var host_list = metric_measurements.map(metric_measurement => metric_measurement.target.split(" ")[0])
        if(!_.isEqual(host_list, ["(null)"])) {
            _.remove(host_list, host => host == "(null)")
            _.remove(metric_measurements, metric_measurement => metric_measurement.target.split(" ")[0] == "(null)")
        }

        var [hostname, , user_id] = metric_measurements[0].target.split(" ")
        var [value, timestamp, metadata] = metric_measurements[0].datapoints[metric_measurements[0].datapoints.length - 1]
        
        console.log("host_list:", JSON.stringify(host_list));
        console.log("job: ", JSON.stringify({
            job_id: job_id, user_id: user_id, job_data: {
                name: metadata.job_name,
                state: _JOB_STATE_INV[value],
                runtime: metadata.runtime,
                time_limit: metadata.time_limit,
                start_time: metadata.start_time,
                end_time: metadata.end_time,
                resources: [{name: "nodes", value: host_list }]
            }
        }));
        return {
            job_id: job_id, user_id: user_id, job_data: {
                name: metadata.job_name,
                state: _JOB_STATE_INV[value],
                runtime: metadata.runtime,
                time_limit: metadata.time_limit,
                start_time: metadata.start_time,
                end_time: metadata.end_time,
                resources: [{name: "nodes", value: host_list }]
            }
        }
    })
    
}