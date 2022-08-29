import http from 'k6/http';
import { group, sleep } from 'k6';
import {
  makeGraphQLQuery,
  processResponse,
  searchTestQueries,
  testThresholds,
  uri,
  instanceSize,
  params,
  graphqlEndpoint,
} from './utils/helpers.js';
/* 
The test starts with 0 vitual users and ramp up from 0 to max concurrent user count gradually
each user would perform a random request according to the assigned distribution for each search type
*/

// TEST SCRIPT CONFIGS
const thresholds = testThresholds.search;
const testConfig = JSON.parse(open('options/search.json'));
testConfig.thresholds = thresholds;
export const options = testConfig;

// TEST SCRIPT IN-IT FUNCTION
export function setup() {
  console.log(
    `Search Performance Testing on Size ${instanceSize} Instance: ${uri}`
  );
}

// TEST SCRIPT
export default function () {
  // REGULAR QUERIES
  group('regular', function () {
    const searchQueries = searchTestQueries.regular;
    searchQueries.forEach((searchQuery) => {
      const searchType = searchQuery.type;
      const tags = { tag: { [searchType]: 'regular' } };
      const body = makeGraphQLQuery('search', { query: searchQuery.query });
      const res = http.post(graphqlEndpoint, body, params, tags);
      processResponse(res, tags);
      sleep(0.5);
    });
  });
  // EXPENSIVE QUERIES
  group('expensive', function () {
    const searchQueries = searchTestQueries.expensive;
    searchQueries.forEach((searchQuery) => {
      const searchType = searchQuery.type;
      const tags = { tag: { [searchType]: 'expensive' } };
      const body = makeGraphQLQuery('search', { query: searchQuery.query });
      const res = http.post(graphqlEndpoint, body, params, tags);
      processResponse(res, tags);
      sleep(0.5);
    });
  });
}
