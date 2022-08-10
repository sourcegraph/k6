import { Trend } from 'k6/metrics';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { check } from 'k6';
// IMPORT SEARCH QUERIES FROM JSON
export const searchQueries = JSON.parse(open('../../configs/queries.json'));
// IMPORT THRESHOLDS SETTINGS FROM JSON
export const thresholds = JSON.parse(open('./thresholds.json'));

// ENDPOINT SETTINGS
export const uri = __ENV.SG_LOADTESTS_URL;
const accessToken = __ENV.SG_LOADTESTS_TOKEN;
export const graphqlEndpoint = new URL('/.api/graphql', uri).toString();
const headers = { Authorization: `token ${accessToken}` };
export const params = { headers };

// Create metrics module - time_to_first_byte
export const TTFB = new Trend('time_to_first_byte', true);

// FUNCTION TO CREATE A STREAM REQUEST
export function makeStreamEndpoint(searchQuery) {
  const streamEndpoint = new URL('/.api/search/stream', uri);
  streamEndpoint.searchParams.append('q', searchQuery.query);
  streamEndpoint.searchParams.append('v', 'V2');
  streamEndpoint.searchParams.append('t', searchQuery.type);
  streamEndpoint.searchParams.append('display', 10);
  return streamEndpoint.toString();
}

// GRAPHQL QUERIES
const graphQLQueries = {
  search: `query ($query: String!) {
          search(query: $query) {
            results {
              matchCount
            }
          }
        }`,
};

// FUNCTION TO CREATE A GRAPHQL QUERY
export function makeGraphQLQuery(query_type, variable) {
  const graphQL_query = graphQLQueries[query_type];
  return JSON.stringify({
    query: graphQL_query,
    variables: {
      query: variable,
    },
  });
}

// FUNCTION TO GET BATCH GRAPHQL REQUESTS
export function getGraphQLBatchRequests() {
  return {
    literal: makeGraphQLRequests('literal'),
    regexp: makeGraphQLRequests('regexp'),
    structural: makeGraphQLRequests('structural'),
    unindexed: makeGraphQLRequests('unindexed'),
  };
}

// FUNCTION TO CREATE BATCH GRAPHQL REQUESTS
export function makeGraphQLRequests(search_type) {
  const queries = searchQueries[search_type];
  const requests = [];
  queries.forEach((query) => {
    const tags = { tags: { type: query.type } };
    const body = makeGraphQLQuery('search', query.query);
    const request = ['POST', graphqlEndpoint, body, params, tags];
    requests.push(request);
  });
  return requests;
}

// PROCESS BATCH RESPONSES
export function processBatchResponses(responses, searchType) {
  const tags = { tag: { type: searchType } };
  responses.forEach((res) => {
    processResponse(res, tags);
  });
}

// PROCESS RESPONSE
export function processResponse(response, tags) {
  TTFB.add(response.timings.waiting, tags.tag);
  check(response, { [tags.tag.type]: (res) => res.status === 200 }, tags.tag);
}
