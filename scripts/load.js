import http from 'k6/http';
import { group, sleep } from 'k6';
import {
  randomIntBetween,
  randomItem,
} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import {
  makeGraphQLQuery,
  processResponse,
  makeStreamEndpoint,
  searchQueries,
  testThresholds,
  instanceSize,
  uri,
  params,
  graphqlEndpoint,
} from './utils/helpers.js';
/* 
The test starts with 0 vitual users and ramp up from 0 to max concurrent user count gradually
each user would perform a random request according to the assigned distribution for each search type
*/

// TEST SCRIPT CONFIGS
const thresholds = testThresholds.load;
const testConfig = JSON.parse(open(`options/load.json`))[instanceSize];
testConfig.thresholds = thresholds;
export const options = testConfig;

// TEST SCRIPT IN-IT FUNCTION
export function setup() {
  console.log('Load Testing Instance: ' + uri);
}

// TEST SCRIPT
export default function () {
  if (__VU % 10 == 1) {
    // 10% of the VUs perform a random search request chosen from any search types
    // it has the longest sleep time as structural and unindexed searches are
    // the least commonly performed search types
    group('stream', function () {
      sleep(randomIntBetween(1, 240));
      const searchType = randomItem(searchQueries.types);
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const streamEndpoint = makeStreamEndpoint(searchQuery);
      const res = http.get(streamEndpoint, params, tags);
      processResponse(res, tags);
      sleep(randomIntBetween(1, 240));
    });
  } else if (__VU % 10 == 2) {
    // 20% of the VUs performs regexp searches
    group('graphQL - Regexp', function () {
      sleep(randomIntBetween(1, 120));
      const searchType = 'regexp';
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const body = makeGraphQLQuery('search', searchQuery.query);
      const res = http.post(graphqlEndpoint, body, params, tags);
      processResponse(res, tags);
      sleep(randomIntBetween(1, 120));
    });
  } else if (__VU % 10 == 3) {
    // 30% of the VUs performs literal searches with a shorter sleep time
    // as it is the most commonly performed searches
    group('graphQL - Literal', function () {
      sleep(randomIntBetween(1, 60));
      const searchType = 'literal';
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const body = makeGraphQLQuery('search', searchQuery.query);
      const res = http.post(graphqlEndpoint, body, params, tags);
      processResponse(res, tags);
      sleep(randomIntBetween(1, 60));
    });
  } else {
    // the rest of the VUs (40%) hits frontpage
    // this stimulates users hitting the site in browser
    // it also has the shortest sleep time as more users spend more time
    // browsing results and pages than performing searches
    group('frontpage', function () {
      sleep(randomIntBetween(1, 30));
      const searchType = 'frontpage';
      const tags = { tag: { type: searchType } };
      const res = http.get(uri, null, tags);
      processResponse(res, tags);
      sleep(randomIntBetween(1, 30));
    });
  }
}
