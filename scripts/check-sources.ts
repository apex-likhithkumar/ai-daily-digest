import { collectOne } from '../src/collectors';
import { loadConfig } from '../src/config';

const config = loadConfig('config');
const ctx = {
  fetchImpl: fetch,
  now: new Date(),
  lookbackHours: config.rules.collect.maxAgeHours,
  githubToken: process.env.GITHUB_TOKEN,
};

for (const source of config.sources) {
  try {
    const items = await collectOne(source, ctx);
    console.log(`OK    ${source.id.padEnd(20)} ${items.length} items`);
  } catch (error) {
    console.log(`FAIL  ${source.id.padEnd(20)} ${error instanceof Error ? error.message : String(error)}`);
  }
}
