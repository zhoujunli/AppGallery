import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVersions, humanSize, releaseRepos } from '../scripts/fetch-releases.mjs';

const project = { id: 'tide-focus', releasesRepo: 'xj/tide-focus-releases' };

const release = (over = {}) => ({
  tag_name: 'v2.1.0',
  published_at: '2026-09-28T10:00:00Z',
  draft: false,
  assets: [
    { name: 'tide-focus-2.1.0.apk', size: 8808038, browser_download_url: 'https://github.com/x/x/releases/download/v2.1.0/a.apk' }
  ],
  ...over
});

test('体积格式化', () => {
  assert.equal(humanSize(8808038), '8.4 MB');
  assert.equal(humanSize(524288), '512 KB');
  assert.equal(humanSize(0), '');
  assert.equal(humanSize(null), '');
  assert.equal(humanSize('nope'), '');
});

test('一个 release 生成对应平台的条目', () => {
  const out = buildVersions([project], { 'xj/tide-focus-releases': [release()] });
  assert.equal(out['tide-focus'].length, 1);
  const entry = out['tide-focus'][0];
  assert.equal(entry.version, '2.1.0', 'v 前缀被去掉');
  assert.equal(entry.date, '2026-09-28');
  assert.equal(entry.platform, 'android');
  assert.equal(entry.size, '8.4 MB');
  assert.equal(entry.sources[0].label, 'GitHub');
  assert.equal(entry.sources[0].url, 'https://github.com/x/x/releases/download/v2.1.0/a.apk');
});

test('一个 release 里的多个资产各生成一条，同版本号', () => {
  const out = buildVersions([project], {
    'xj/tide-focus-releases': [
      release({
        assets: [
          { name: 'app.apk', size: 1000000, browser_download_url: 'u1' },
          { name: 'app-setup.exe', size: 2000000, browser_download_url: 'u2' }
        ]
      })
    ]
  });
  const platforms = out['tide-focus'].map((e) => e.platform).sort();
  assert.deepEqual(platforms, ['android', 'windows']);
  assert.ok(out['tide-focus'].every((e) => e.version === '2.1.0'));
});

test('草稿 release 被忽略', () => {
  const out = buildVersions([project], { 'xj/tide-focus-releases': [release({ draft: true })] });
  assert.deepEqual(out['tide-focus'], []);
});

test('无法识别的资产被忽略，但 release 仍在', () => {
  const out = buildVersions([project], {
    'xj/tide-focus-releases': [
      release({
        assets: [
          { name: 'app.aab', size: 1, browser_download_url: 'u' },
          { name: 'SHA256SUMS', size: 1, browser_download_url: 'u' }
        ]
      })
    ]
  });
  assert.deepEqual(out['tide-focus'], []);
});

test('没有 release 的仓库产出空数组，不是 undefined', () => {
  const out = buildVersions([project], {});
  assert.deepEqual(out['tide-focus'], []);
});

test('缺 tag_name 或 published_at 也不炸', () => {
  const out = buildVersions([project], {
    'xj/tide-focus-releases': [release({ tag_name: '', published_at: undefined })]
  });
  assert.deepEqual(out['tide-focus'], []);
});

test('多个项目各自独立', () => {
  const other = { id: 'ledger', releasesRepo: 'xj/ledger-releases' };
  const out = buildVersions([project, other], { 'xj/tide-focus-releases': [release()] });
  assert.equal(out['tide-focus'].length, 1);
  assert.deepEqual(out['ledger'], []);
});

test('releaseRepos：跳过没填 releasesRepo 的项目', () => {
  // 不填的项目（小程序）不能变成 https://api.github.com/repos/undefined/releases 这种请求
  const out = releaseRepos([project, { id: 'bowuyou', name: '博物游' }]);
  assert.deepEqual(out, ['xj/tide-focus-releases']);
});

test('releaseRepos：同一个仓库只拉一次', () => {
  const out = releaseRepos([project, { id: 'other', releasesRepo: 'xj/tide-focus-releases' }]);
  assert.deepEqual(out, ['xj/tide-focus-releases']);
});

test('releaseRepos：空串和空数组都当没填', () => {
  assert.deepEqual(releaseRepos([{ id: 'a', releasesRepo: '' }]), []);
  assert.deepEqual(releaseRepos([]), []);
  assert.deepEqual(releaseRepos(null), []);
});
