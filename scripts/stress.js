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
  instanceSize,
  testThresholds,
  uri,
  params,
  graphqlEndpoint,
} from './utils/helpers.js';

// TEST SCRIPT CONFIGS
const thresholds = testThresholds.load;
const testConfig = JSON.parse(open(`options/stress.json`))[instanceSize];
testConfig.thresholds = thresholds;
export const options = testConfig;

// TEST SCRIPT IN-IT FUNCTION
export function setup() {
  console.log('Stress Testing Instance: ' + uri);
}

// TEST SCRIPT
export default function () {
  if (__VU % 10 == 1) {
    // 10% of the VUs perform a random search request chosen from any search types
    group('stream', function () {
      sleep(randomIntBetween(1, 60));
      const searchType = randomItem(searchQueries.types);
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const streamEndpoint = makeStreamEndpoint(searchQuery);
      const res = http.get(streamEndpoint, params, tags);
      processResponse(res, tags);
      sleep(randomIntBetween(1, 5));
    });
  } else if (__VU % 10 == 2) {
    // 20% of the VUs performs regexp searches
    group('graphQL - Regexp', function () {
      sleep(randomIntBetween(1, 30));
      const searchType = 'regexp';
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const body = makeGraphQLQuery('search', { query: searchQuery.query });
      const res = http.post(graphqlEndpoint, body, params, tags);
      processResponse(res, tags);
      sleep(randomIntBetween(1, 5));
    });
  } else if (__VU % 10 == 3) {
    // 30% of the VUs hitting frontpage
    group('frontpage', function () {
      sleep(randomIntBetween(1, 10));
      const searchType = 'frontpage';
      const tags = { tag: { type: searchType } };
      const res = http.get(uri, null, tags);
      processResponse(res, tags);
      sleep(randomIntBetween(1, 5));
    });
  } else {
    // the rest of the VUs (40%) performs literal searches
    group('graphQL - Literal', function () {
      sleep(randomIntBetween(1, 30));
      const searchType = 'literal';
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const body = makeGraphQLQuery('search', { query: searchQuery.query });
      const res = http.post(graphqlEndpoint, body, params, tags);
      processResponse(res, tags);
      sleep(randomIntBetween(1, 5));
    });
  }
}
