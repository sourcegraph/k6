import { group, sleep } from 'k6';
import http from 'k6/http';
import {
  randomIntBetween,
  randomItem,
} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import {
  graphqlEndpoint,
  instanceSize,
  makeGraphQLQuery,
  makeStreamEndpoint,
  params,
  processResponse,
  searchQueries,
  searchTypes,
  testThresholds,
  uri,
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
    /*  
    10% of the VUs sends a random search request chosen
    from any search types to the graphQL API endpoint.
    It has the longest sleep time as most searches happen via
    stream search, and structural and unindexed searches are 
    the least commonly performed search types 
    */
    group('graphQL', function () {
      sleep(randomIntBetween(1, 240));
      const searchType = randomItem(searchTypes);
      createSearchRequest(searchType, 'graphql');
      sleep(randomIntBetween(1, 240));
    });
  } else if (__VU % 10 == 2) {
    /* 
    20% of the VUs sends regexp search requests to the stream
    search API.
    */
    group('Stream - Regexp', function () {
      sleep(randomIntBetween(1, 120));
      const searchType = 'regexp';
      createSearchRequest(searchType, 'stream');
      sleep(randomIntBetween(1, 120));
    });
  } else if (__VU % 10 == 3) {
    /* 
    30% of the VUs send literal search requests to the stream
    search API. It also has a shorter start time compare to other 
    search types as it is the most commonly performed searches 
    */
    group('Stream - Literal', function () {
      sleep(randomIntBetween(1, 60));
      const searchType = 'literal';
      createSearchRequest(searchType, 'stream');
      sleep(randomIntBetween(1, 240));
    });
  } else {
    /* 
    The rest of the VUs (40%) hits frontpage url.
    This stimulates users hitting the site in browser
    it also has the shortest sleep time as more users spend more time
    browsing results and pages than performing searches 
    */
    group('frontpage', function () {
      sleep(randomIntBetween(1, 30));
      const searchType = 'frontpage';
      createSearchRequest(searchType);
      sleep(randomIntBetween(1, 30));
    });
  }
  /* HELPER FUNCTION */
  // Create a search request for specificed search type and endpoint
  function createSearchRequest(type, endpoint) {
    const tags = { tag: { type: type } };
    const searchQuery =
      type == 'frontpage' ? null : randomItem(searchQueries[type]);
    let res = null;
    switch (endpoint) {
      case (endpoint = 'graphql'):
        const body = makeGraphQLQuery('search', searchQuery.query);
        res = http.post(graphqlEndpoint, body, params, tags);
        break;
      case (endpoint = 'stream'):
        const streamEndpoint = makeStreamEndpoint(searchQuery);
        res = http.get(streamEndpoint, params, tags);
        break;
      // set default for url
      default:
        res = http.get(uri, searchQuery, tags);
    }
    res ? processResponse(res, tags) : null;
  }
}
