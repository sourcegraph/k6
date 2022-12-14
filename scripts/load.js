import { group, sleep } from 'k6';
import http from 'k6/http';
import {
  randomIntBetween,
  randomItem,
} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import {
  endpoints,
  graphqlEndpoint,
  instanceSize,
  makeGraphQLQuery,
  makeHighlightVariable,
  makeStreamEndpoint,
  params,
  processResponse,
  searchQueries,
  getStreamSearchMatches,
  searchTypes,
  testThresholds,
  uri,
} from './utils/helpers.js';
/* 
The test starts with 0 vitual users and ramp up from 0 to max concurrent user count gradually
each user would perform a random request according to the assigned distribution for each search type
*/

// TEST SCRIPT CONFIGS / IN-IT
const thresholds = testThresholds.load;
const testConfig = JSON.parse(open(`options/load.json`))[instanceSize];
testConfig.thresholds = thresholds;
export const options = testConfig;

// TEST SCRIPT IN-IT FUNCTION
export function setup() {
  console.log(`Load Testing Size ${instanceSize} Instance: ${uri}`);
}

// TEST SCRIPT
export default function () {
  // Enforce different start time
  sleep(randomIntBetween(0, 60));
  if (__VU % 10 == 0) {
    /*  
    10% of the VUs sends a random search request chosen
    from any search types to a random API endpoint.
    It has the longest sleep time as most searches happen via
    stream search, and structural and unindexed searches are 
    the least commonly performed search types 
    */
    const endpoint = randomItem(endpoints);
    group(endpoint, function () {
      const searchType = randomItem(searchTypes);
      createSearchRequest(searchType, endpoint);
    });
  } else if (__VU % 10 <= 2) {
    /* 
    20% of the VUs sends regexp search requests to the stream
    search API.
    */
    group('stream', function () {
      createSearchRequest('regexp', 'stream');
    });
  } else {
    /* 
    The rest of the VUs send literal search requests to the stream
    search API.
    */
    group('stream', function () {
      createSearchRequest('literal', 'stream');
    });
  }
  sleep(randomIntBetween(0, 30));
  /* HELPER FUNCTION */
  // Create a search request for specificed search type and endpoint
  function createSearchRequest(type, endpoint) {
    const tags = { tag: { type: type } };
    // Pick a search query base on type
    const searchQuery = randomItem(searchQueries[type]);
    if (endpoint === 'graphql') {
      const body = makeGraphQLQuery('search', { query: searchQuery.query });
      const res = http.post(graphqlEndpoint, body, params, tags);
      res ? processResponse(res, tags) : null;
    } else if (endpoint === 'stream') {
      const streamEndpoint = makeStreamEndpoint(searchQuery);
      const res = http.get(streamEndpoint, params, tags);
      res ? processResponse(res, tags) : null;
      if (res && res.body) {
        const data = getStreamSearchMatches(res.body);
        data.forEach((d) => {
          const results = JSON.parse(d.replace('data: ', ''));
          if (results.length) {
            results.forEach((r) => {
              const variable = makeHighlightVariable(r);
              const hBody = makeGraphQLQuery('highlighter', variable);
              const hRes = http.post(graphqlEndpoint, hBody, params, tags);
              hRes ? processResponse(hRes, tags, 'highlight') : null;
            });
          }
        });
      }
    }
  }
}
