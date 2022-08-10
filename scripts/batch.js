import http from 'k6/http';
import { group } from 'k6';
import { Rate } from 'k6/metrics';
import {
  thresholds,
  getGraphQLBatchRequests,
  processBatchResponses,
  processResponse,
  uri,
} from './utils/helpers.js';
export let successRate = new Rate('successful_requests');
/* 
Batch multiple HTTP requests together, to issue them in parallel over multiple TCP connections.
This test allows each VUs to perform multiple requests at once, concurrently
*/
// TEST SCRIPT CONFIGS
export const options = { thresholds, batch: 55, batchPerHost: 0 };
// TEST SCRIPT IN-IT
export function setup() {
  console.log('Testing Instance: ' + uri);
  return getGraphQLBatchRequests();
}
// TEST SCRIPT
export default function (requests) {
  //   SEARCH REQUESTS FOR LITERAL SEARCHES
  group('literal', function () {
    const searchType = 'literal';
    const responses = http.batch(requests[searchType]);
    processBatchResponses(responses, searchType);
  });
  //   SEARCH REQUESTS FOR REGEXP SEARCHES
  group('regexp', function () {
    const searchType = 'regexp';
    const responses = http.batch(requests[searchType]);
    processBatchResponses(responses, searchType);
  });
  //   SEARCH REQUESTS FOR STRUCTURAL SEARCHES
  group('structural', function () {
    const searchType = 'structural';
    const responses = http.batch(requests[searchType]);
    processBatchResponses(responses, searchType);
  });
  //   SEARCH REQUESTS FOR UNINDEXED SEARCHES
  group('unindexed', function () {
    const searchType = 'unindexed';
    const responses = http.batch(requests[searchType]);
    processBatchResponses(responses, searchType);
  });
  //   REQUEST TO FRONTEND URL
  group('frontend', function () {
    const searchType = 'frontend';
    const tags = { tag: { type: searchType } };
    const res = http.get(uri, null, tags);
    processResponse(res, tags);
  });
}
