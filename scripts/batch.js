import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { sleep } from 'k6';
import {
  thresholds,
  processResponse,
  groupGraphQLBatchRequests,
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
  // group all the search queries together to process requests with batch
  return groupGraphQLBatchRequests();
}
// MAIN TEST SCRIPT
// SEARCH REQUESTS FOR EACH VU TO EXECUTE
export default function (requests) {
  const responses = http.batch(requests);
  responses.forEach((res, i) => {
    const tags = { tag: { type: requests[i][4].tags.type } };
    processResponse(res, tags);
  });
}
