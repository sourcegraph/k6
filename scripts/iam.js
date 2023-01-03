import http from 'k6/http';
import { group, sleep } from 'k6';
import {
  makeGraphQLQuery,
  processResponse,
  testThresholds,
  uri,
  instanceSize,
  params,
  graphqlEndpoint,
  settings,
} from './utils/helpers.js';
/* 
The test starts with 0 vitual users and ramp up from 0 to max concurrent user count gradually
each user would perform a random request according to the assigned distribution for each search type
*/

// TEST SCRIPT CONFIGS
const thresholds = testThresholds.search;
const testConfig = JSON.parse(open('./options/iam.json'));
testConfig.thresholds = thresholds;
export const options = testConfig;

const searchTestQueries = JSON.parse(open('../configs/queries/iam.json'));

// TEST SCRIPT IN-IT FUNCTION
export const setup = () => {
  console.log(
    `Search Performance Testing on Size ${instanceSize} Instance: ${uri}`
  );

  const tokens = settings.tokens;
  if (tokens.length < 1) {
    throw new Error("No tokens defined in .settings.json")
  }
}

const getRandomToken = () => {
  const tokens = settings.tokens;
  return tokens[Math.floor(Math.random() * tokens.length)]
}

const createRequestParams = (token) => {
  return Object.assign({}, params, {
    headers: Object.assign({}, params.headers, {
      Authorization: `token ${token}`,
    }),
  });
}

const getRandomQuery = () => {
  const searchQueries = searchTestQueries.authzQuery;
  return searchQueries[Math.floor(Math.random() * searchQueries.length)]
}

// TEST SCRIPT
export default () => {
  // REGULAR QUERIES
  group('authzQuery', () => {
    const searchQuery = getRandomQuery()
    const searchType = searchQuery.type;
    const tags = { tag: { [searchType]: 'authzQuery' } };
    const body = makeGraphQLQuery('search', { query: searchQuery.query });
    const params = createRequestParams(getRandomToken())
    const res = http.post(graphqlEndpoint, body, params, tags);
    processResponse(res, tags);
    // sleep(0.5);
  })
}
