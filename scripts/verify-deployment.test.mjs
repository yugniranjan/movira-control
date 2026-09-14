import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDeployment } from './verify-deployment.mjs';

const reply = (status, body) => ({ status, json: async () => body });
const approved = () => reply(401, { statusCode: 401, code: 'authentication_required' });
function options(api, build = reply(200, { commit: 'abc' })) {
  let calls = 0;
  return { appUrl: 'https://example.test', commit: 'abc', runId: '1', sleep: async () => {}, log: () => {},
    fetchImpl: async () => calls++ === 0 ? build : api() };
}
test('correct frontend and protected API pass', async () => {
  await verifyDeployment(options(approved));
});
test('wrong frontend commit fails before checking API', async () => {
  await assert.rejects(verifyDeployment(options(() => assert.fail(), reply(200, { commit: 'old' }))), /commit does not match/);
});
test('temporary upstream error can recover within the bounded retry', async () => {
  let attempts = 0;
  await verifyDeployment(options(() => ++attempts < 3 ? reply(502, null) : approved()));
  assert.equal(attempts, 3);
});
test('persistent 502 fails with actionable backend diagnosis', async () => {
  let attempts = 0;
  await assert.rejects(verifyDeployment(options(() => { attempts++; return reply(502, null); })), /Frontend files deployed.*HTTP 502.*Diagnose backend/);
  assert.equal(attempts, 6);
});
for (const response of [reply(200, {}), reply(401, { statusCode: 401 }), reply(302, null)]) {
  test(`unverified API response ${response.status} cannot report success`, async () => {
    await assert.rejects(verifyDeployment(options(() => response)), /backend verification failed/);
  });
}
test('network errors cannot report success', async () => {
  await assert.rejects(verifyDeployment(options(() => { throw new Error('socket'); })), /unreachable/);
});
