import { collectAll } from './collectors';
import { loadConfig } from './config';
import { buildLlm } from './llm';
import { runPipeline } from './pipeline';

const DATA_DIR = process.env.DATA_DIR ?? 'data';

const config = loadConfig('config');
const now = new Date();

const llm = buildLlm(config.rules.llm.providers, {
  gemini: process.env.GEMINI_API_KEY,
  groq: process.env.GROQ_API_KEY,
});

const summary = await runPipeline({
  dataDir: DATA_DIR,
  config,
  llm,
  now,
  collect: () =>
    collectAll(config.sources, {
      fetchImpl: fetch,
      now,
      lookbackHours: config.rules.collect.maxAgeHours,
      githubToken: process.env.GITHUB_TOKEN,
    }),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log: (message) => console.warn(message),
});

console.log(JSON.stringify(summary));
