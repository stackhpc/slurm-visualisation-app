import { inverseLinearInterpolateOSIString,
     groupByProximity, parseTimeSeries, orderByLevel } from '../panels/slurmView/slurm_view_helpers';
import moment from "../libs/moment.js";

describe("inverseLinearInterpolateOSIString", () => {

    it("1 hours of a 4 hour interval is 0.25", () => {
        var to = moment().toISOString();
        var from = moment().subtract(4, "hour").toISOString();
        var value = moment().subtract(3, "hour").toISOString();
        expect(inverseLinearInterpolateOSIString(from, to, value))
            .to.eql(0.25);
    })

    it("3 hours of a 4 hour interval is 0.75", () => {
        var to = moment().toISOString();
        var from = moment().subtract(4, "hour").toISOString();
        var value = moment().subtract(1, "hour").toISOString();
        expect(inverseLinearInterpolateOSIString(from, to, value))
            .to.eql(0.75);
    })
})

describe("groupByProximity", () => {

    it('continous pattern, identity mapping', () => {
        var list = ['one', 'one', 'two', 'two']
        var groups = groupByProximity(list);
        expect(groups.one).to.eql([['one', 'one']]);
        expect(groups.two).to.eql([['two', 'two']]);
    })

    it('discontinous pattern, identity mapping', () => {
        var list = ['one', 'one', 'two', 'two', 'one', 'two']
        var groups = groupByProximity(list);
        expect(groups.one).to.eql([['one', 'one'], ['one']]);
        expect(groups.two).to.eql([['two', 'two'], ['two']]);
    })
})

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
          target: "gluster-1.alaskalocal 0 doug",
          datapoints: [
            [_JOB_STATE["RUNNING"], times[2]], 
            [_JOB_STATE["RUNNING"], times[3]],
          ]
        },
        {
          target: "gluster-1.alaskalocal 1 charana",
          datapoints: [
            [_JOB_STATE["RUNNING"], times[3]],
            [_JOB_STATE["RUNNING"], times[4]]
          ]
        },
        {
            target: "openhpc-compute-0 0 doug",
            datapoints: [
              [_JOB_STATE["RUNNING"], times[2]],
              [_JOB_STATE["RUNNING"], times[3]]
            ]
        },
        {
          target: "openhpc-compute-0 1 charana",
          datapoints: [
            [_JOB_STATE["RUNNING"], times[2]],
            [_JOB_STATE["RUNNING"], times[4]]
          ]
        }
    ]

    var expected_jobs_by_node = [
        {
            hostname: "gluster-1.alaskalocal",
            jobs: [
                {job_id: "0", owner: "doug", state: 'RUNNING', start: times[2], end: times[3]},
                {job_id: "1", owner: "charana", state: 'RUNNING', start: times[3], end: times[4]},
            ]
        },
        {
            hostname: "openhpc-compute-0",
            jobs: [
                {job_id: "0", owner: "doug", state: 'RUNNING', start: times[2], end: times[3]},
                {job_id: "1", owner: "charana", state: 'RUNNING', start: times[2], end: times[4]},
            ]
        }
    ];

    it("parseTimeSeries", () => {
        var original_jobs_by_node = parseTimeSeries(dataSeries);
        expect(original_jobs_by_node)
            .to.eql(expected_jobs_by_node)
    })

    it("orderByLevel", () => {
        var jobs_by_level_by_node = orderByLevel(expected_jobs_by_node);
        expect(jobs_by_level_by_node)
            .to.eql([
                {
                    hostname: "gluster-1.alaskalocal",
                    jobs_by_level: [[
                        {job_id: "0", owner: "doug", state: 'RUNNING', start: times[2], end: times[3]},
                        {job_id: "1", owner: "charana", state: 'RUNNING', start: times[3], end: times[4]},
                    ]]
                },
                {
                    hostname: "openhpc-compute-0",
                    jobs_by_level: [
                        [{job_id: "0", owner: "doug", state: 'RUNNING', start: times[2], end: times[3]}],
                        [{job_id: "1", owner: "charana", state: 'RUNNING', start: times[2], end: times[4]}]   
                    ]
                }
            ])
    })
})
