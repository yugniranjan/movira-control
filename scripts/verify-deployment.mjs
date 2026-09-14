import { pathToFileURL } from 'node:url';

export async function verifyDeployment({ appUrl, commit, runId, fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), log = console.log }) {
  if (!appUrl || !commit || !runId) throw new Error('APP_URL, GITHUB_SHA and GITHUB_RUN_ID are required.');
  const buildUrl = new URL('/build-info.json', appUrl);
  buildUrl.searchParams.set('run', runId);
  const build = await fetchImpl(buildUrl, { signal: AbortSignal.timeout(15000), redirect: 'manual' });
  if (build.status !== 200) throw new Error(`Frontend build verification returned HTTP ${build.status}.`);
  const info = await build.json();
  if (info.commit !== commit) throw new Error('The deployed frontend commit does not match this workflow. Check build-info.json and CloudFront caching.');
  log(`Frontend commit ${commit} is deployed successfully.`);

  let status = 'unreachable';
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const response = await fetchImpl(new URL('/api/control/locations/all', appUrl), {
        signal: AbortSignal.timeout(10000), redirect: 'manual',
      });
      status = response.status;
      const body = await response.json().catch(() => null);
      if (status === 401 && body?.statusCode === 401 && body?.code === 'authentication_required') {
        log('Public backend API is reachable and authentication is enforced.');
        return;
      }
    } catch { status = 'unreachable'; }
    log(`Backend verification ${attempt}/6: HTTP ${status}; expected authentication-required JSON (401).`);
    if (attempt < 6) await sleep(5000);
  }
  throw new Error(`Frontend files deployed, but backend verification failed (HTTP ${status}). Run Diagnose backend availability in aeroSportsAdmin; inspect backend startup and Nginx/CloudFront API routing. Do not bypass this check.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyDeployment({ appUrl: process.env.APP_URL, commit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID })
    .catch(error => { console.error(`::error::${error.message}`); process.exitCode = 1; });
}
