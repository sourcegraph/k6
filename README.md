# K6 for Sourcegraph

This repository contains scripts for k6, an open-source tool for load testing, to run in order to performance tests on a Sourcegraph instance.

The goal of the tests is to provide site admins with an overview of their instances at a given situation, like what the response time for a search query is during peak hour, as well as its resource-utilization level. It also helps identifying its breaking point.

## Tests

A test fails when successful rate is lower than 90%:
  - Successful rate only goes up when a search query returns results

You should increase the resources for your instance accordingly if running a test designed for your instance size breaks your instance.

It is expected for search results to return slower during its peak hours, especially for search queries that are considered expensive, like structural searches and unindexed searches. We should focus on the failing request rates for those tests instead.

> NOTE: These values defined in the config/thresholds.json in the tests directory

Types of searches:
- literal search - example: 'repo:^github.com/sourcegraph/sourcegraph$ console lang:TypeScript'
- regex search - example: 'repo:github.com/sourcegraph/sourcegraph$ \bbtn-secondary\b patternType:regexp'
- structural search - example: 'repo:^github.com/sourcegraph/sourcegraph$ try { :[matched_statements] } catch { :[matched_catch] } patternType:structural'
- unindexed search - example: 'repo:^github.com/sourcegraph/sourcegraph$ type:diff TODO select:commit.diff.removed'

### Size Chart

#### n-users

__n__ is equal to 20% of the user count that the instance supports before it ramps back down to 0.

| Size   | Users | n (expected users) |
|--------|-------|--------------------|
| S      | 10000 | 2000               |
| M      | 20000 | 4000               |
| L      | 60000 | 12000              |
| XL.    | -     | -                  |

### Search Performance Test

Test duration: ~32m

The test runs the same set of queries for each search type 30 times respectively, with a max duration set as 32 minutes.

From the end-of-test summary, we can see how long it takes for each type of search to be executed by looking at the time for first byte metrics for 95% of the requests P(95).

A search type fails when 95% of the searches take longer than the time listed below to return results:

- Regular queries:
  - literal: 2-seconds
  - regexp: 2-seconds
  - structural: 5.5-seconds
  - unindexed: 5.5-seconds

- Expensive queries:
  - literal: 5.5-seconds
  - regexp: 6.5-seconds
  - structural: 15-seconds
  - unindexed: 50-seconds

^Based on results from cloud with 10% buffer

> Note: The same set of search queries should be use across instances for search performance test

```bash
k6 run scripts/search.js
```

### Load Test

Test duration: ~5m

The load test ramps up from 0 to __n__ concurrent users (see n-users table above) over 1 minutes, and stays at __n__ concurrent users for 3 minutes, before ramping back down to 0 in 1 minutes. Each virtual user would send a a random request to one of the instance endpoints at a random time over the test duration with the following distribution: 
- 60% of the VUs -GET request to the stream search API endpoint with a random literal search query
- 20% of the VUs -GET request to the stream search API endpoint with a random regexp search query
- 10% of the VUs -POST request to the graphQL API endpoint with a random search query

This distrubtion is based on our data, where about 70% of all the searches performed are literal search, and 1-2% are structural and unindexed searches. 

The result shows us how the instance performs under both normal and peak load.

To start a load test, run the following command at the root of this repository:

```sh
# example for size small:
# k6 run -e SG_SIZE=s scripts/stress.js
k6 run -e SG_SIZE=<size> scripts/load.js
# OR, if you have the instance info added to the .settings.json:
k6 run scripts/load.js
```

### Stress Test

Test duration: ~1.5m Max

The stress test tries to overwhelm the system with an extreme surge of load by having __n__ concurrent users sending one random search request at the same time to the instance.

> Note: In a stress test result, we look at the request failure ratio (http_req_failed) in the end-of-test summary. The successful-calls (check) ratio for a well-performing instance should be above 90%.

To start a stress test, run the following command at the root of this repository:

```sh
# example for a size small instance: 
# k6 run -e SG_SIZE=s scripts/stress.js
k6 run -e SG_SIZE=<size> scripts/stress.js
# OR, if you have the instance info added to the .settings.json:
k6 run scripts/stress.js
```

## Instructions
### Empty Instance

This is the suggested steps for a brand new instance with no cloned repositories.

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

#### Step 3: Import the scripts

Clone this repository onto your local machine --this should not be inside the machine that is hosting your Sourcegraph instance.

#### Step 4: Configurations

The tests start with looking for the `instance URL` and `access token` generated from your instance.

Add your `instance URL` and `access token` information to the [.setting.json file](.settings.json). 

Alternatively, you can replace the instance URL and access token placeholders below accordingly and export them as environment variables using the following command:

```sh
export SG_LOADTESTS_TOKEN=1234567890
export SG_LOADTESTS_URL=https://your.sourcegraph.com
```

#### Step 5: Pick a test to run

Before you run a test, you might first need to increase the user limit on your machine: `ulimit -n 250000`

##### Load Test

Run the following command at the root of this repository:

```sh
# example for size small:
# k6 run -e SG_SIZE=s scripts/load.js
k6 run -e SG_SIZE=<size> scripts/load.js
```

##### Stress Test

Run the following command at the root of this repository:

```sh
# example for size medium instance: 
# k6 run -e SG_SIZE=m scripts/stress.js
k6 run -e SG_SIZE=<size> scripts/stress.js
```

##### Search Performance Test

Run the following command at the root of this repository:

```sh
k6 run scripts/search.js
```

### Instance with Repositories

This is the suggested steps for instances with a list of cloned repositories.

#### Step 1: Install k6

Install k6 on your testing machine.

Please refer to [k6 installation guide](https://k6.io/docs/getting-started/installation/) for detail.

#### Step 2: Import the scripts

Clone this repository onto your local machine --this should NOT be inside the machine that is hosting your Sourcegraph instance.

#### Step 3: Configurations

Update the [.setting.json file](.settings.json) using below as exmaple:

```json
{
  "uri": "https://your.sourcegraph.com/",
  "token": "YOUR_SOURCEGRAPH_TOKEN_HERE",
  "size": "",
  "users": "100",
  "mode": "custom",
  "repos": [
    "github.com/sourcegraph/sourcegraph",
    "github.com/sourcegraph/deploy-sourcegraph",
    "github.com/google/crosvm",
    "github.com/microsoft/TypeScript"
  ]
}
```

#### Step 4: Generate a list of customized queries

The queryGenerator script will generate a list of random queries using the repos list provided in your [.setting.json file](.settings.json).

Run the following command at the root of this repository:

```sh
node ./scripts/utils/queryGenerator.js
```

#### Step 5: Pick a test to run

Before you run a test, you might first need to increase the user limit on your machine: `ulimit -n 250000`

##### Load Test

Run the following command at the root of this repository:

```sh
# example for size small:
# k6 run -e SG_SIZE=s scripts/load.js
k6 run -e SG_SIZE=<size> scripts/load.js
```

##### Stress Test

Run the following command at the root of this repository:

```sh
# example for size medium instance: 
# k6 run -e SG_SIZE=m scripts/stress.js
k6 run -e SG_SIZE=<size> scripts/stress.js
```

##### Search Performance Test

Run the following command at the root of this repository:

```sh
k6 run scripts/search.js
```

## Generating Curl commands with the test requests 

It can be useful to share a `curl` command of the requests being generate by this tool. To get them, run the following command at the root of the repository: 

```sh
k6 run scripts/utils/dumpQueries.js
```

The script will print a single log message containing a Markdown string that can easily be shared (with token and url redacted). 

## Known Limitations

- Scaling suggestions for indexserver likely don’t include ctags requirements which can be hefty for files with lots of symbols

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
# Adjust the number to 250000 or more when needed
ulimit -n 250000
```

Please refer to [k6 docs on fine tuning OS](https://k6.io/docs/misc/fine-tuning-os/) for more info.
