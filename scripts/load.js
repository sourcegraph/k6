import http from 'k6/http';
import { group, sleep } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import {
  makeGraphQLQuery,
  processResponse,
  makeStreamEndpoint,
  searchQueries,
  uri,
  params,
  thresholds,
  graphqlEndpoint,
} from './utils/helpers.js';
/* 
The test starts with 0 vitual users and ramp up from 0 to max concurrent user count gradually
each user would perform a random request according to the assigned distribution for each search type
*/
// TEST SCRIPT CONFIGS
export const options = { thresholds };
// TEST SCRIPT IN-IT FUNCTION
export function setup() {
  console.log('Load Testing Instance: ' + uri);
}
// TEST SCRIPT
export default function () {
  if (__VU % 10 == 1) {
    // 10% of the VUs perform a random search request chosen from any search types
    group('stream', function () {
      const searchType = randomItem(searchQueries.types);
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const streamEndpoint = makeStreamEndpoint(searchQuery);
      const res = http.get(streamEndpoint, params, tags);
      processResponse(res, tags);
      sleep(5);
    });
  } else if (__VU % 10 == 2) {
    // 20% of the VUs performs regexp searches
    group('graphQL - Regexp', function () {
      const searchType = 'regexp';
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const body = makeGraphQLQuery('search', searchQuery.query);
      const res = http.post(graphqlEndpoint, body, params, tags);
      processResponse(res, tags);
      sleep(3);
    });
  } else {
    // the rest of the VUs (70%) performs literal searches
    group('graphQL - Literal', function () {
      const searchType = 'literal';
      const tags = { tag: { type: searchType } };
      const searchQuery = randomItem(searchQueries[searchType]);
      const body = makeGraphQLQuery('search', searchQuery.query);
      const res = http.post(graphqlEndpoint, body, params, tags);
      processResponse(res, tags);
      sleep(2);
    });
  }
}
