import { Trend } from 'k6/metrics';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { check } from 'k6';

// TYPES
export const searchTypes = ['literal', 'regexp', 'structural', 'unindexed'];

// ENDPOINT SETTINGS
export const endpoints = ['graphql', 'stream'];
export const settings = JSON.parse(open('../../.settings.json'));

//uri
export const uri = settings.uri
  ? settings.uri
  : __ENV.SG_LOADTESTS_URL;
// token
const accessToken = settings.tokens != null && settings.tokens.length > 0
  ? settings.tokens.pop()
  : __ENV.SG_LOADTESTS_TOKEN;
// instance size
export const instanceSize = __ENV.SG_SIZE
  ? __ENV.SG_SIZE.toLowerCase()
  : settings.size.toLowerCase();
export const graphqlEndpoint = new URL('/.api/graphql', uri).toString();
const headers = { Authorization: `token ${accessToken}` };
export const params = {
  headers,
  timeout: "70s", // 60s backend timeout + 10s buffer for RTT
};
// IMPORT SEARCH QUERIES FROM JSON
// search queries for load test - load.js script
export const searchQueries =
  settings.mode === 'dev'
    ? JSON.parse(open('../../configs/queries/dev.json'))
    : JSON.parse(open('../../.queries.json'));
// search queries for search performance test - search.js script
export const searchTestQueries = JSON.parse(
  open('../../configs/queries/search.json')
);
// thresholds for tests
export const testThresholds = JSON.parse(open('../options/thresholds.json'));

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
  highlighter: `query HighlightedFile(
          $repoName: String!
          $commitID: String!
          $filePath: String!
      ) {
          repository(name: $repoName) {
              commit(rev: $commitID) {
                  file(path: $filePath) {
                      isDirectory
                      richHTML
                  }
              }
          }
      }`,
};

// FUNCTION TO CREATE A GRAPHQL QUERY
export function makeGraphQLQuery(query_type, variable) {
  const graphQL_query = graphQLQueries[query_type];
  return JSON.stringify({
    query: graphQL_query,
    variables: variable,
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

// FUNCTION TO GROUP ALL BATCH GRAPHQL REQUESTS
export function groupGraphQLBatchRequests() {
  const groupedRequests = [];
  searchQueries.types.forEach((type) => {
    const requests = makeGraphQLRequests(type);
    groupedRequests.push(...requests);
  });
  return groupedRequests;
}

// FUNCTION TO CREATE BATCH GRAPHQL REQUESTS BY SEARCH TYPE
export function makeGraphQLRequests(search_type) {
  const queries = searchQueries[search_type];
  const requests = [];
  queries.forEach((query) => {
    const tags = { tags: { type: search_type } };
    const body = makeGraphQLQuery('search', query.query);
    const request = ['POST', graphqlEndpoint, body, params, tags];
    requests.push(request);
  });
  return requests;
}

// Return variable for highlight graphql request
export function makeHighlightVariable(result) {
  return {
    repoName: result.repository || '',
    commitID: result.commit || '',
    filePath: result.path || '',
  };
}

// PROCESS RESPONSES IN BATCH
export function processBatchResponses(responses, searchType) {
  const tags = { tag: { type: searchType } };
  responses.forEach((res) => {
    processResponse(res, tags);
  });
}

// PROCESS INDIVIDUAL RESPONSE
export function processResponse(response, tags, highlight) {
  const checkTag = highlight ? { tag: { type: 'highlight' } } : tags;
  TTFB.add(response.timings.waiting, checkTag.tag);
  check(
    response,
    { [checkTag.tag.type]: (res) => res.status === 200 },
    checkTag.tag
  );
}

// Filter stream search results to get matches
export function getStreamSearchMatches(response_body) {
  return response_body.split`\n`.filter((line) =>
    line.startsWith('data: [{"type":"')
  );
}
