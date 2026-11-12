# AI Daily Digest

Daily AI news, filtered to my interests, with a one-line "why you need to know this".
Free to run: GitHub Actions + GitHub Pages + free LLM tiers.

## How it works
Every ~3 hours a GitHub Actions job collects news (RSS, Hacker News, Reddit, GitHub, job feeds),
merges duplicate stories, scores them with Gemini (Groq as backup, rule-based fallback if both
are out of quota), labels them Breaking / Today / Important, writes `feed.json` to the `data`
branch and deploys the React dashboard in `web/` to GitHub Pages.

## Tune it (no code changes)
- `config/profile.yml`: my interests, relevance boosts, mute list
- `config/sources.yml`: add or remove sources (`npm run check-sources` tests them)
- `config/rules.yml`: label thresholds, ranking, batch sizes, model names

## Develop
```bash
npm install
cd web && npm install && cd ..         # install the dashboard from INSIDE web/, not with --prefix
npm test && (cd web && npm test)       # unit tests
npm run pipeline                       # needs GEMINI_API_KEY / GROQ_API_KEY for LLM scoring; works without (fallback)
cd web && npm run dev                  # dashboard
```
Set `DATA_DIR=some-folder` to keep local runs out of `data/`.

## One-time setup (GitHub)
1. Create a public repo and push `main`.
2. Create the `data` branch (see "Create the data branch" below).
3. Repo Settings -> Secrets and variables -> Actions: add `GEMINI_API_KEY` (and optionally `GROQ_API_KEY`).
4. Repo Settings -> Pages -> Source: **GitHub Actions**.
5. Actions tab -> `update-digest` -> Run workflow.

### Create the data branch
```bash
tmp=$(mktemp -d) && cd "$tmp" && git init -b data
echo '{"generatedAt":"1970-01-01T00:00:00.000Z","items":[]}' > feed.json
echo '{"ids":{}}' > seen.json
git add . && git commit -m "data: init"
git remote add origin <your-repo-url> && git push origin data
```

## If updates stop
GitHub can disable scheduled workflows in public repos after ~60 days without repo activity.
The workflow commits to `data` on every run, which normally counts as activity, but if the
schedule is ever disabled, re-enable it in the Actions tab.
