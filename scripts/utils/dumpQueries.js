import {
  makeGraphQLQuery,
  processResponse,
  searchTestQueries,
  testThresholds,
  uri,
  instanceSize,
  params,
  graphqlEndpoint,
} from './helpers.js';

/* This script generate a set of queries using the repos name provided in the .setting.json */
const userSettings = JSON.parse(open('../../.settings.json'));

const queryComponents = JSON.parse(open("../../scripts/utils/generator.json"));

export default function () {
  const repos = userSettings.repos;
  if (repos.length > 1) {
    const newQueries = {
      newQueries: {
        literal: [],
        regexp: [],
        structural: [],
        unindexed: []
      }, 
      searchRegular: {
        literal: [],
        regexp: [],
        structural: [],
        unindexed: []
      },
      searchExpensive: {
        literal: [],
        regexp: [],
        structural: [],
        unindexed: []
      },
    };
    const components = queryComponents.queries;
    const reposLength = repos.length;
    components.forEach((component) => {
      const randomNummber = Math.floor(Math.random() * reposLength);
      const randomCount = Math.floor(Math.random() * 10);
      const repo = repos[randomNummber];
      const query = {
        query: `repo:^${repo}$ ${component.query} count:${
          randomCount ? randomCount : 'all'
        }`,
        type: component.type,
      };
      newQueries.newQueries[component.type].push(JSON.stringify(query));
    });

    const searchQueries = searchTestQueries.regular;
    searchQueries.forEach((searchQuery) => {
      const searchType = searchQuery.type;
      const tags = { tag: { [searchType]: 'regular' } };
      const body = makeGraphQLQuery('search', { query: searchQuery.query });

      newQueries.searchRegular[searchType].push(body);
    });

    const searchQueries2 = searchTestQueries.expensive;
    searchQueries2.forEach((searchQuery) => {
      const searchType = searchQuery.type;
      const tags = { tag: { [searchType]: 'regular' } };
      const body = makeGraphQLQuery('search', { query: searchQuery.query });

      newQueries.searchExpensive[searchType].push(body);
    });

    console.log(markdown(newQueries));
  }
}

function markdown(queries) {
  var types = ["literal", "regexp", "structural", "unindexed"];

  var out = "# Queries\n";
  out += "## Base Queries\n";

  types.forEach((type) => {
    out += `### ${type}` + "\n";

    queries.newQueries[type].forEach((q) => {
      out += "```shell\n" + curlify(q) + "\n```\n\n";
    });
  });

  out += "## Search (Regular)\n";

  types.forEach((type) => {
    out += `### ${type}` + "\n";

    queries.searchRegular[type].forEach((q) => {
      out += "```shell\n" + curlify(q) + "\n```\n\n";
    });
  });

  out += "## Search (Expensive)\n";

  types.forEach((type) => {
    out += `### ${type}` + "\n";

    queries.searchExpensive[type].forEach((q) => {
      out += "```shell\n" + curlify(q) + "\n```\n\n";
    });
  });
  return out;
}

const curlTmpl = `curl -g -X POST -H "Content-Type: application/json" -H "Authorization: token {{token}}" -d '{{body}}' $url` 

function curlify(query) {
  return curlTmpl.replace("{{body}}", query).replace(/\\n/g, "")
}
