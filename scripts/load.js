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

// TEST SCRIPT CONFIGS / IN-IT
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
    search API. It also has a shorter start time compare to other 
    search types as it is the most commonly performed searches 
    */
    group('stream', function () {
      createSearchRequest('literal', 'stream');
    });
  }

  /* HELPER FUNCTION */
  // Create a search request for specificed search type and endpoint
  function createSearchRequest(type, endpoint) {
    sleep(randomIntBetween(0, 60));
    const tags = { tag: { type: type } };
    // frontpage calls have no endpoint and does not require search query
    const searchQuery = endpoint ? randomItem(searchQueries[type]) : null;
    let res = null;
    let body = null;
    switch (endpoint) {
      case (endpoint = 'graphql'):
        body = makeGraphQLQuery('search', { query: searchQuery.query });
        res = http.post(graphqlEndpoint, body, params, tags);
        sleep(randomIntBetween(0, 30));
        break;
      case (endpoint = 'stream'):
        const streamEndpoint = makeStreamEndpoint(searchQuery);
        res = http.get(streamEndpoint, params, tags);
        if (res.body) {
          const data = res.body.split`\n`.filter((line) =>
            line.startsWith('data: [{"type":"')
          );
          data.forEach((d) => {
            const results = JSON.parse(d.replace('data: ', ''));
            if (!results.length) return;
            results.forEach((r) => {
              const variable = {
                repoName: r.repository || '',
                commitID: r.commit || '',
                filePath: r.path || '',
              };
              const highlightBody = makeGraphQLQuery('highlighter', variable);
              const highlightRes = http.post(
                graphqlEndpoint,
                highlightBody,
                params,
                tags
              );
              highlightRes
                ? processResponse(highlightRes, tags, 'highlight')
                : null;
            });
          });
        }
        sleep(randomIntBetween(0, 30));
        break;
      default:
        // set default for http calls to frontpage
        res = http.get(uri, searchQuery, tags);
    }
    res ? processResponse(res, tags) : null;
  }
}
