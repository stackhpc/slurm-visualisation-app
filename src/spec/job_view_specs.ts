import { parseTimeSeries } from '../panels/jobView/job_view_helpers';
import moment from "../libs/moment.js";
import _ from "lodash"

describe("onDataReceived", () => {

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

    var expected_job_and_job_metrics = [
            { job_id: "1", user_id: "charana", job_data: {
                name: "test_pcp.sh", 
                state: "RUNNING",
                runtime: "04:10:00",
                time_limit: "1-00:00:00",
                start_time: "2018-01-26T20:05:46",
                end_time: "2018-01-27T20:05:46",
                resources: [{name: "nodes", value: ["gluster-1.alaskalocal", "openhpc-compute-0"]}]
            }},
            { job_id: "0", user_id: "doug", job_data: {
                name: "test_ompi.sh",
                state: "PENDING",
                runtime: "00:00:00",
                time_limit: "1-00:00:00",
                start_time: "2018-01-26T16:05:46",
                end_time: "2018-01-27T16:05:46",
                resources: [{name: "nodes", value: ["gluster-1.alaskalocal", "openhpc-compute-0"]}]
            }},
            { job_id: "3", user_id: "john", job_data: {
                name: "test_mpivch.sh",
                state: "COMPLETED",
                runtime: "04:00:00",
                time_limit: "1-00:00:00",
                start_time: "2018-01-26T12:05:46",
                end_time: "2018-01-26T16:05:46",
                resources: [{name: "nodes", value: ["gluster-2.alaskalocal"]}]
            }}
        ]

    it("parseTimeSeries", () => {
        
        var output_job_and_job_metrics =  parseTimeSeries(dataSeries);
        expect(expected_job_and_job_metrics)
            .to.eql(output_job_and_job_metrics);
    })
})