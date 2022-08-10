import http from 'k6/http';
import { group, sleep } from 'k6';
import {
  makeGraphQLQuery,
  processResponse,
  searchQueries,
  uri,
  thresholds,
  graphqlEndpoint,
  params,
} from './utils/helpers.js';
/* 
EACH VU TO SEND 50+ REQUESTS TO GRAPHQL ENDPOINT PER ITERATION
*/
// TEST SCRIPT CONFIGS
export const options = { thresholds };
// TEST SCRIPT IN-IT
export function setup() {
  console.log('Testing Instance: ' + uri);
}
// TEST SCRIPT
export default function () {
  group('Frontend', function () {
    const searchType = 'frontend';
    const tags = { tag: { type: searchType } };
    const res = http.get(uri, null, tags);
    processResponse(res, tags);
  });
  group('Literal', function () {
    const searchType = 'literal';
    const tags = { tag: { type: searchType } };
    searchQueries[searchType].forEach((searchQuery) => {
      const body = makeGraphQLQuery('search', searchQuery.query);
      const res = http.post(graphqlEndpoint.toString(), body, params, tags);
      processResponse(res, tags);
      sleep(1);
    });
  });
  group('Regexp', function () {
    const searchType = 'regexp';
    const tags = { tag: { type: searchType } };
    searchQueries[searchType].forEach((searchQuery) => {
      const body = makeGraphQLQuery('search', searchQuery.query);
      const res = http.post(graphqlEndpoint.toString(), body, params, tags);
      processResponse(res, tags);
      sleep(1);
    });
  });
  group('Structural', function () {
    const searchType = 'structural';
    const tags = { tag: { type: searchType } };
    searchQueries[searchType].forEach((searchQuery) => {
      const body = makeGraphQLQuery('search', searchQuery.query);
      const res = http.post(graphqlEndpoint.toString(), body, params, tags);
      processResponse(res, tags);
      sleep(1);
    });
  });
  group('Unindexed', function () {
    const searchType = 'unindexed';
    const tags = { tag: { type: searchType } };
    searchQueries[searchType].forEach((searchQuery) => {
      const body = makeGraphQLQuery('search', searchQuery.query);
      const res = http.post(graphqlEndpoint.toString(), body, params, tags);
      processResponse(res, tags);
      sleep(1);
    });
  });
}
