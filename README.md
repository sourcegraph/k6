# K6 for Sourcegraph

For interal users: Please download the [queries.json file](https://github.com/sourcegraph/reference-architecture-test/blob/main/loadtests/queries.json) and move it to the [./configs directory](./configs/).

This repository contains scripts for k6, an open-source tool for load testing, to run in order to performance tests on a Sourcegraph instance.

The goal of the tests is to provide site admins with an overview of their instances at a given situation, like what the response time for a search query is during peak hour, as well as its resource-utilization level. It also helps identifying its breaking point.

## Tests

A test fails when successful rate is lower than 90%:
  - Successful rate only goes up when a search query returns results

You should increase the resources for your instance accordingly if running a test designed for your instance size breaks your instance.

A search type fails when 95% of the searches take longer than the time listed below to return results during non-stressed tests:
  - literal: 5.5seconds
  - regexp: 6.5seconds
  - structural: 35seconds
  - unindexed: 35seconds

It is expected for search results to return slower during its peak hours, especially for search queries that are considered expensive, like structural searches and unindexed searches. We should focus on the failing request rates for those tests instead.

> NOTE: These values defined in the config/thresholds.json in the tests directory

Types of searches:
- literal search - example: 'repo:^github.com/sourcegraph/sourcegraph$ console lang:TypeScript'
- regex search - example: 'repo:github.com/sourcegraph/sourcegraph$ \bbtn-secondary\b patternType:regexp'
- unindexed search - example: 'repo:^github.com/sourcegraph/sourcegraph$ type:diff TODO select:commit.diff.removed'
- structural search - example: 'repo:^github.com/sourcegraph/sourcegraph$ try { :[matched_statements] } catch { :[matched_catch] } patternType:structural'

### n-users

__n__ is equal to 20% of the user count that the instance supports before it ramps back down to 0.

| Size | Users | n (expected users) |
|------|-------|--------------------|
| S    | 10000 | 2000               |
| M    | 20000 | 4000               |
| L    | 60000 | 12000              |
| XL   |       |                    |
| 2XL  |       |                    |

### Load Test

The load test starts with 0 concurrent virtual users (VUs), and ramps up gradually to __n__ users (see n-users table above) before ramping back down to 0. Each virtual user would send one random request to one of the instance endpoints, with a random sleep time (1 - 60 seconds) in between:
- 40% of the VUs send a POST request to the graphQL API endpoint with a random literal search query
- 30% of the VUs send a GET request to frontpage
- 20% of the VUs send a POST request to the graphQL API endpoint with a random regexp search query
- 10% of the VUs send a GET request to the stream search API endpoint with a random search query

The result shows us how the instance performs under both normal and peak load.

To start a load test, run the following command at the root of this repository:

```sh
# example for size small:
# k6 run -c tests/configs/load/s.json tests/load.js
k6 run -c configs/load/<size>.json tests/load.js
```

### Stress Test

The stress test runs the same script as the load test aggressively in a short time period. 

The test tries to overwhelms the system with an extreme surge of load by ramping up from 0 to __n__ users (see n-users table above) in 30 seconds, where each user sends a random request to the instance concurrently, with a random start time and sleep time in between for another 30 seconds.

The response time of a stress test is expected to be slower than usual, as we should rather focus on the request failure rate in this test instead. 

A stress test fails if the failure rate is higher than 10% of the total requests made.

To start a stress test, run the following command at the root of this repository:

```sh
# example for size small: 
# k6 run -c configs/stress/s.json scripts/stress.js
k6 run -c configs/stress/<size>.json scripts/stress.js
```

## Instructions

#### Step 1: Install k6

Install k6 on your testing machine.

Please refer to [k6 installation guide](https://k6.io/docs/getting-started/installation/) for detail.

#### Step 2: Clone the required repositories

Make sure your instance has the repositories listed in the GitHub config below cloned and indexed:

```json
{
  "url": "https://github.com",
  "token": "REDACTED",
  "orgs": [
    "sourcegraph",
    "google",
    "microsoft"
  ],
  "repos": [
    "torvalds/linux"
  ]
}
```

#### Step 3: Export the variables

The tests start with looking for the `instance URL` and `access token` generated from your instance as exported environment variables.

Replace the instance URL and access token placeholders accordingly and export them using the following command:

```sh
export SG_LOADTESTS_TOKEN=1234567890
export SG_LOADTESTS_URL=https://your.sourcegraph.com
```

#### Step 4: Import the scripts and test queries

1. Clone this repository
2. Import the [queries.json file](https://github.com/sourcegraph/reference-architecture-test/blob/main/loadtests/queries.json) and move it to the [./configs directory](./configs/) --the file is only accessible by internal users. THIS IS A TEMPORARY STEP AND WILL BE REMOVED IN THE FUTURE.

#### Step 5: Pick a test to run

##### Load Test

To start a load test, run the following command at the root of this repository:

```sh
# example for size small:
# k6 run -c configs/load/s.json scripts/load.js
k6 run -c configs/load/<size>.json scripts/load.js
```

##### Stress Test

To start a stress test, run the following command at the root of this repository:

```sh
# example for size medium instance: 
# k6 run -c configs/stress/m.json scripts/stress.js
k6 run -c configs/stress/<size>.json scripts/stress.js
```

## Troubleshooting

### ERRO[0000] TypeError: Invalid scheme

This error indicates that the environment variables for the instance URL and token are missing.

```bash
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

ERRO[0000] TypeError: Invalid scheme
	at Rt (https://jslib.k6.io/url/1.0.0/index.js:2:29523(73))
	at file:///home/stress.js:35:24(93)  hint="script exception"
```

### socket: too many open files

This error indicates that your testing machine does not have enough TCP sockets opened to run the tests. Please refer to the k6 docs here for more detail. A general solution is to increase the user limits on your machine using the following command:

```bash
# Adjust the suggested number 250000 if needed
ulimit -n 250000
```