import fs from 'fs';

/* This script generate a set of queries using the repos name provided in the .setting.json */
const userSettings = JSON.parse(fs.readFileSync('.settings.json').toString());

const queryComponents = JSON.parse(
  fs.readFileSync('scripts/utils/generator.json').toString()
);
const repos = userSettings.repos;
if (!repos) {
  console.log("no repos are defined, please edit '.settings.json'")
  process.exit(1)
}

if (repos.length > 1) {
  const newQueries = {
    literal: [],
    regexp: [],
    structural: [],
    unindexed: [],
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
    newQueries[component.type].push(query);
  });
  fs.writeFileSync('.queries.json', JSON.stringify(newQueries));
}
