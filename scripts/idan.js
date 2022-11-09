import http from 'k6/http';
import { group, sleep } from 'k6';
import {
  makeGraphQLQuery,
  processResponse,
  searchTestQueries,
  // testThresholds,
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
export const options = {
  "thresholds": {
    "checks": [{ "threshold": "rate>0.99", "abortOnFail": true }],
    "http_req_failed": [{ "threshold": "rate<=0.1", "abortOnFail": true }],
    "checks{kind:simple}": ["rate>0.99"],
    "checks{kind:customer}": ["rate>0.99"],
  },

  "scenarios": {
    "gitserver-ms-git": {
      "executor": "shared-iterations",
      "vus": 1,
      "iterations": 1,
      "maxDuration": "10m"
    }
  }
}

// TEST SCRIPT IN-IT FUNCTION
export function setup() {
  console.log(
    `Search Performance Testing on Size ${instanceSize} Instance: ${uri}`
  );
}

var queries = [
  {
    tag: "simple",
    graphql: {
      "query": `query ($query: String!) {
          search(query: $query) {
            results {
              matchCount
            }
          }
        }`,
      "variables":{"query": "repo:^github.com/microsoft/TypeScript$ graphQL count:4"}
    }
  },
  {
    tag: "customer",
    graphql: { 
      query: `query CodeIntelSearch($query: String!) {
        search(query: $query) {
          ...SearchResults
        }
      }

      fragment SearchResults on Search {
        results {
          __typename
          results {
            ... on FileMatch {
              __typename
              file {
                path
                commit {
                  oid
                }
              }
              repository {
                name
              }
              symbols {
                name
                kind
                location {
                  resource {
                    path
                  }
                  range {
                    start {
                      line
                      character
                    }
                    end {
                      line
                      character
                    }
                  }
                }
              }
              lineMatches {
                lineNumber
                offsetAndLengths
              }
            }
          }
        }
      }`,
      variables: {"query": "context:global ^fromDisplayName$ type:symbol patternType:regexp count:50 case:yes file:\\.(java)$ -repo:^gigarepo$ index:only"
      }
  }
  }
]

// TEST SCRIPT
export default function () {
  // REGULAR QUERIES
  group('regular', function () {
    queries.forEach((query) => {
      const tags = { tag: { "kind": query.tag }} ;
      const body = query.graphql
      const res = http.post(graphqlEndpoint, JSON.stringify(body), params, tags);
      processResponse(res, tags);
      sleep(0.5);
    });
  });
  // EXPENSIVE QUERIES
  // group('expensive', function () {
  //   const searchQueries = searchTestQueries.expensive;
  //   searchQueries.forEach((searchQuery) => {
  //     const searchType = searchQuery.type;
  //     const tags = { tag: { [searchType]: 'expensive' } };
  //     const body = makeGraphQLQuery('search', { query: searchQuery.query });
  //     const res = http.post(graphqlEndpoint, body, params, tags);
  //     processResponse(res, tags);
  //     sleep(0.5);
  //   });
  // });
}
