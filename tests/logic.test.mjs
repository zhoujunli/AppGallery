import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('../assets/logic.js');

test('扩展名映射：认得出 Android / Windows / macOS', () => {
  assert.equal(L.platformForExtension('tide-focus-2.1.0.apk'), 'android');
  assert.equal(L.platformForExtension('TIDE-FOCUS-2.1.0.APK'), 'android', '大小写不敏感');
  assert.equal(L.platformForExtension('app-setup.exe'), 'windows');
  assert.equal(L.platformForExtension('app.msi'), 'windows');
  assert.equal(L.platformForExtension('app.dmg'), 'macos');
  assert.equal(L.platformForExtension('app-macos.zip'), 'macos');
});

test('扩展名映射：.aab 与未知扩展名一律忽略', () => {
  assert.equal(L.platformForExtension('app.aab'), null, 'aab 是给商店的，装不上');
  assert.equal(L.platformForExtension('app.tar.gz'), null);
  assert.equal(L.platformForExtension('SHA256SUMS'), null);
  assert.equal(L.platformForExtension(''), null);
  assert.equal(L.platformForExtension(null), null);
  assert.equal(L.platformForExtension('trailing.'), null);
});

test('系统 → 项目平台归并', () => {
  assert.deepEqual(L.projectPlatformsFor('android'), ['android']);
  assert.deepEqual(L.projectPlatformsFor('windows'), ['desktop']);
  assert.deepEqual(L.projectPlatformsFor('macos'), ['desktop']);
  assert.deepEqual(L.projectPlatformsFor('ios'), []);
  assert.deepEqual(L.projectPlatformsFor('unknown'), []);
});

test('访客系统探测', () => {
  assert.equal(L.detectVisitorOS('Mozilla/5.0 (Linux; Android 14)'), 'android');
  assert.equal(L.detectVisitorOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), 'ios');
  assert.equal(L.detectVisitorOS('Mozilla/5.0 (Windows NT 10.0; Win64)'), 'windows');
  assert.equal(L.detectVisitorOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'macos');
  assert.equal(L.detectVisitorOS(''), 'unknown');
  assert.equal(L.detectVisitorOS(null), 'unknown');
});

test('版本号比较按数字段而非字符串', () => {
  assert.ok(L.compareVersionStrings('v2.1.0', 'v2.0.9') > 0);
  assert.ok(L.compareVersionStrings('v10.0.0', 'v9.0.0') > 0, '10 应该大于 9');
  assert.ok(L.compareVersionStrings('v2.1.0', 'v2.1.0-beta.1') > 0, '正式版大于预发布');
  assert.equal(L.compareVersionStrings('v2.1.0', '2.1.0'), 0, 'v 前缀不影响');
});

test('版本分组：按日期降序，同版本号合并', () => {
  const groups = L.groupByVersion([
    { version: '2.0.0', date: '2026-06-02', platform: 'android' },
    { version: '2.1.0', date: '2026-09-28', platform: 'android' },
    { version: '2.1.0', date: '2026-09-28', platform: 'windows' }
  ]);
  assert.equal(groups.length, 2, '2.1.0 的两条合并成一组');
  assert.equal(groups[0].version, '2.1.0', '新的在前');
  assert.equal(groups[0].files.length, 2);
  assert.equal(groups[1].version, '2.0.0');
});

test('版本分组：非法输入返回空数组', () => {
  assert.deepEqual(L.groupByVersion(null), []);
  assert.deepEqual(L.groupByVersion('nope'), []);
  assert.deepEqual(L.groupByVersion([null, { noVersion: 1 }]), []);
});

test('挑主按钮：按访客系统匹配', () => {
  // files[0] 是 android，所以 macos / windows 两条断言都只能靠「匹配」通过；
  // 一旦 pickPrimaryFile 退回兜底，这两条会一起变红。
  const group = {
    version: '2.1.0',
    files: [
      { version: '2.1.0', platform: 'android' },
      { version: '2.1.0', platform: 'macos' },
      { version: '2.1.0', platform: 'windows' }
    ]
  };
  assert.equal(L.pickPrimaryFile(group, 'macos').platform, 'macos');
  assert.equal(L.pickPrimaryFile(group, 'windows').platform, 'windows');
});

test('挑主按钮：android 不在首位时也只能靠匹配拿到', () => {
  // 上一条里 android 是 files[0]，那条断言会被兜底满足 ——
  // 这里把 android 放到第二位，兜底只会给回 macos。
  const group = {
    version: '2.1.0',
    files: [
      { version: '2.1.0', platform: 'macos' },
      { version: '2.1.0', platform: 'android' }
    ]
  };
  assert.equal(L.pickPrimaryFile(group, 'android').platform, 'android');
});

test('挑主按钮：没有匹配的平台时兜底到第一个', () => {
  const group = { version: '2.1.0', files: [{ version: '2.1.0', platform: 'android' }] };
  assert.equal(L.pickPrimaryFile(group, 'macos').platform, 'android', '声明 android 却只有 apk 时不能返回 null');
  assert.equal(L.pickPrimaryFile(group, 'unknown').platform, 'android');
  assert.equal(L.pickPrimaryFile(null, 'android'), null);
  assert.equal(L.pickPrimaryFile({ files: [] }, 'android'), null);
});

test('找项目：精确匹配，非法输入返回 null', () => {
  const projects = [{ id: 'tide-focus' }, { id: 'ledger' }];
  assert.equal(L.findProject(projects, 'ledger').id, 'ledger');
  assert.equal(L.findProject(projects, 'TIDE-FOCUS'), null, '大小写敏感');
  assert.equal(L.findProject(projects, 'nope'), null);
  assert.equal(L.findProject(projects, ''), null);
  assert.equal(L.findProject(projects, null), null);
  assert.equal(L.findProject(projects, '<script>alert(1)</script>'), null);
  assert.equal(L.findProject(null, 'ledger'), null);
});

test('版本容错：结构异常只让该项目降级', () => {
  assert.deepEqual(L.normalizeVersions(null), {});
  assert.deepEqual(L.normalizeVersions([]), {});
  assert.deepEqual(L.normalizeVersions('nope'), {});
  assert.deepEqual(L.normalizeVersions({ a: 'not-an-array' }), { a: [] });
  assert.deepEqual(
    L.normalizeVersions({ a: [{ version: '1.0.0' }, { noVersion: true }, null] }),
    { a: [{ version: '1.0.0' }] },
    '缺 version 的条目被剔除，好的条目留下'
  );
});

// ---------- normalizePreview ----------

const terminalOk = {
  preview: {
    kind: 'terminal',
    title: 'claudepocket — zsh',
    lines: ['❯ 把退款的测试补上', '⏺ Edit src/refund/handler.ts', '✓ 32 passed']
  }
};

const adminOk = {
  preview: {
    kind: 'admin',
    title: '商会通 · 入会审批',
    nav: ['商会管理', '成员管理', '入会审批'],
    active: 2,
    columns: ['申请人', '申请商会', '状态'],
    rows: [['张伟', '深圳市商会', '待审批']]
  }
};

test('normalizePreview：合法 terminal 原样通过', () => {
  assert.deepEqual(L.normalizePreview(terminalOk), {
    kind: 'terminal',
    title: 'claudepocket — zsh',
    lines: ['❯ 把退款的测试补上', '⏺ Edit src/refund/handler.ts', '✓ 32 passed']
  });
});

test('normalizePreview：合法 admin 原样通过', () => {
  assert.deepEqual(L.normalizePreview(adminOk), adminOk.preview);
});

test('normalizePreview：没有 preview 字段就返回 null', () => {
  assert.equal(L.normalizePreview({ id: 'x' }), null);
  assert.equal(L.normalizePreview(undefined), null);
  assert.equal(L.normalizePreview(null), null);
});

test('normalizePreview：形状不对一律 null，不抛错', () => {
  const bad = [
    { preview: null },
    { preview: 'terminal' },
    { preview: [] },
    { preview: { kind: 'terminal', title: 'x' } },                        // 缺 lines
    { preview: { kind: 'terminal', title: '', lines: ['a', 'b', 'c'] } }, // title 空
    { preview: { kind: 'terminal', title: 'x', lines: ['a', 'b'] } },     // 少于 3 行
    { preview: { kind: 'terminal', title: 'x', lines: ['a', 'b', 'c', 'd', 'e'] } }, // 多于 4 行
    { preview: { kind: 'terminal', title: 'x', lines: ['a', '', 'c'] } }, // 空行
    { preview: { kind: 'terminal', title: 'x', lines: ['a', 'b', 3] } },  // 非字符串
    { preview: { kind: 'video', title: 'x' } },                           // 未知 kind
    { preview: { kind: 'admin', title: 'x', nav: ['a'], active: 0, columns: ['a', 'b'], rows: [['a', 'b']] } },        // nav 只有 1 项
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: 3, columns: ['a', 'b'], rows: [['a', 'b']] } },  // active 越界
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: -1, columns: ['a', 'b'], rows: [['a', 'b']] } }, // active 负数
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: 1.5, columns: ['a', 'b'], rows: [['a', 'b']] } },// active 非整数
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: '1', columns: ['a', 'b'], rows: [['a', 'b']] } },// active 是字符串
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: 0, columns: ['a'], rows: [['a']] } },             // 只有 1 列
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: 0, columns: ['a', 'b'], rows: [] } },             // 没有数据行
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: 0, columns: ['a', 'b'], rows: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h']] } }, // 4 行
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: 0, columns: ['a', 'b'], rows: [['a']] } },        // 行比表头短
    { preview: { kind: 'admin', title: 'x', nav: ['a', 'b'], active: 0, columns: ['a', 'b'], rows: [['a', 'b', 'c']] } } // 行比表头长
  ];
  bad.forEach((p, i) => {
    assert.equal(L.normalizePreview(p), null, `第 ${i + 1} 个非法输入应当返回 null`);
  });
});

test('normalizePreview：字段两端空白被去掉，返回的是副本', () => {
  const src = { preview: { kind: 'terminal', title: '  x  ', lines: [' a ', ' b ', ' c '] } };
  const out = L.normalizePreview(src);
  assert.deepEqual(out, { kind: 'terminal', title: 'x', lines: ['a', 'b', 'c'] });
  assert.notEqual(out, src.preview, '必须是副本，改它不能影响原数据');
});

// ---------- previewStatusTone ----------

test('previewStatusTone：spec §6.3 那九个词各归各的语气', () => {
  assert.equal(L.previewStatusTone('待审批'), 'amber');
  assert.equal(L.previewStatusTone('草稿'), 'amber');
  assert.equal(L.previewStatusTone('已通过'), 'ok');
  assert.equal(L.previewStatusTone('已发布'), 'ok');
  assert.equal(L.previewStatusTone('启用'), 'ok');
  assert.equal(L.previewStatusTone('已退回'), 'red');
  assert.equal(L.previewStatusTone('已驳回'), 'red');
  assert.equal(L.previewStatusTone('停用'), 'red');
});

test('previewStatusTone：认不出来就不着色，不猜', () => {
  assert.equal(L.previewStatusTone('深圳市商会'), '');
  assert.equal(L.previewStatusTone(''), '');
  assert.equal(L.previewStatusTone(null), '');
  assert.equal(L.previewStatusTone(undefined), '');
  assert.equal(L.previewStatusTone('已通过审核'), '', '必须是整词匹配，不能前缀匹配');
});

// ---------- normalizePreview: phone ----------

// 手机形态：顶部一条导航条 + 每行两格（左边主文案、右边进度或状态）。
// 没有底栏 —— 博物游的 app 里其实没有底栏（Tabbar.vue 只有一个「首页」项、
// 哪里都没引用），画上去就是在编。
const phoneOk = {
  preview: {
    kind: 'phone',
    title: '博物游 · 展览详情',
    rows: [
      ['第一关 · 青铜时代', '文物 2/3'],
      ['第二关 · 玉器与礼制', '文物 0/2']
    ]
  }
};

test('normalizePreview：合法 phone 原样通过', () => {
  assert.deepEqual(L.normalizePreview(phoneOk), phoneOk.preview);
});

test('normalizePreview：phone 的非法形状一律 null', () => {
  const bad = [
    { kind: 'phone', title: 'x' },                                                    // 缺 rows
    { kind: 'phone', title: 'x', rows: [] },                                          // 没有行
    { kind: 'phone', title: 'x', rows: [['a', 'b'], ['a', 'b'], ['a', 'b'], ['a', 'b']] }, // 4 行超出 140px 窗口的预算
    { kind: 'phone', title: 'x', rows: [['a']] },                                     // 行只有 1 格
    { kind: 'phone', title: 'x', rows: [['a', 'b', 'c']] },                           // 行有 3 格
    { kind: 'phone', title: 'x', rows: [['a', '']] },                                 // 有空项
    { kind: 'phone', title: '', rows: [['a', 'b']] }                                  // title 空
  ];
  bad.forEach((preview, i) => {
    assert.equal(L.normalizePreview({ preview }), null, `第 ${i + 1} 个应当返回 null`);
  });
  assert.notEqual(L.normalizePreview({ preview: phoneOk.preview }), null, '基准本身是合法的');
});

test('normalizePreview：phone 只取 title 和 rows，多出来的字段不影响判定', () => {
  // 多给了 admin 的 nav/columns：忽略，只要 rows 自己对得上就合法
  const extra = L.normalizePreview({
    preview: { kind: 'phone', title: 'x', nav: ['a', 'b'], columns: ['a', 'b'], rows: [['a', 'b']] }
  });
  assert.deepEqual(extra, { kind: 'phone', title: 'x', rows: [['a', 'b']] });

  // 但别的 kind 的字段不能拿来顶替 rows
  assert.equal(
    L.normalizePreview({ preview: { kind: 'phone', title: 'x', lines: ['a', 'b'] } }),
    null,
    'terminal 的 lines 不能当 rows 用'
  );
});

// ---------- releasesPageUrl ----------

test('releasesPageUrl：没填 releasesRepo 时没有 Releases 页可去', () => {
  assert.equal(
    L.releasesPageUrl({ releasesRepo: 'xj/tide-focus-releases' }),
    'https://github.com/xj/tide-focus-releases/releases'
  );
  // 小程序项目没有 GitHub Releases。若不判空，详情页会渲染出
  // https://github.com/undefined/releases 这么一条死链。
  assert.equal(L.releasesPageUrl({ id: 'bowuyou' }), null);
  assert.equal(L.releasesPageUrl({ releasesRepo: '' }), null);
  assert.equal(L.releasesPageUrl({ releasesRepo: 42 }), null);
  assert.equal(L.releasesPageUrl(null), null);
});

// ---------- versionLabel ----------

test('versionLabel：没有 releasesRepo 的项目不说「暂不可用」', () => {
  // 小程序没有 GitHub Releases，它从来就没有版本号这回事。整批拉取失败时
  // app.js 会把所有卡片都写成「版本信息暂不可用」—— 那张卡片就会在说一个
  // 根本不存在的东西"暂时拿不到"。
  const bowuyou = { id: 'bowuyou', name: '博物游' };
  const failed = { status: 'failed', byProject: {} };

  assert.equal(L.versionLabel(bowuyou, failed), '', '拉取失败也不该冒出版本号位置');
  assert.equal(L.versionLabel(bowuyou, { status: 'ready', byProject: {} }), '');
});

test('versionLabel：有 releasesRepo 的项目正常显示最新版本号', () => {
  const project = { id: 'tide', releasesRepo: 'xj/tide-focus-releases' };
  const state = {
    status: 'ready',
    byProject: {
      tide: [
        { version: '2.1.0', date: '2026-03-01', platform: 'android' },
        { version: '2.0.0', date: '2026-01-01', platform: 'android' }
      ]
    }
  };

  assert.equal(L.versionLabel(project, state), 'v2.1.0', '取最新那一组');
  assert.equal(
    L.versionLabel(project, { status: 'failed', byProject: {} }),
    '版本信息暂不可用',
    '拉不到就是这个说法（spec §7）'
  );
  assert.equal(
    L.versionLabel(project, { status: 'ready', byProject: { tide: [] } }),
    '',
    '一个 release 都没有就不显示版本号（spec §7）'
  );
});

test('versionLabel：脏输入不炸', () => {
  const state = { status: 'ready', byProject: { x: [{ version: '1.0.0' }] } };
  assert.equal(L.versionLabel(null, state), '');
  assert.equal(L.versionLabel({ id: 'x' }, state), '', '没有 releasesRepo 一样返回空');
  assert.equal(L.versionLabel({ id: 'x', releasesRepo: '   ' }, state), '', '空白串当没填');
  assert.equal(L.versionLabel({ id: 'x', releasesRepo: 'a/b' }, { status: 'loading', byProject: {} }), '',
    'loading 阶段什么都不说 —— 卡片上那时是一条脉冲条');
  assert.equal(L.versionLabel({ id: 'x', releasesRepo: 'a/b' }, null), '',
    'state 整个没传也不崩');
});

// ---------- 下载区的空态与提示条 ----------

test('downloadEmptyText：没有 releasesRepo 的项目，跟拉取成败无关', () => {
  // 详情页原来先判 state.status === 'failed' 再说文案，于是整批拉取失败时
  // 小程序项目会显示「版本信息暂不可用。」—— 它根本没有版本号这回事，
  // 该说的是「这个项目没有可下载的安装包。」，这句在任何网络状态下都成立。
  const bowuyou = { id: 'bowuyou', platforms: ['miniprogram'] };
  const tide = { id: 'tide', releasesRepo: 'xj/tide-releases' };

  assert.equal(L.downloadEmptyText(bowuyou, { status: 'failed', byProject: {} }),
    '这个项目没有可下载的安装包。');
  assert.equal(L.downloadEmptyText(bowuyou, { status: 'ready', byProject: {} }),
    '这个项目没有可下载的安装包。');

  assert.equal(L.downloadEmptyText(tide, { status: 'failed', byProject: {} }), '版本信息暂不可用。');
  assert.equal(L.downloadEmptyText(tide, { status: 'ready', byProject: { tide: [] } }), '还没有可下载的版本。');
});

test('shouldShowVersionNotice：没有 releasesRepo 就不出现那条提示', () => {
  // 提示条写的是「下载可直接去仓库的 Releases 页」—— 对一个没有仓库的项目，
  // 这句话指不到任何地方。
  const bowuyou = { id: 'bowuyou', platforms: ['miniprogram'] };
  const tide = { id: 'tide', releasesRepo: 'xj/tide-releases' };

  assert.equal(L.shouldShowVersionNotice(bowuyou, { status: 'failed', byProject: {} }), false);
  assert.equal(L.shouldShowVersionNotice(bowuyou, { status: 'ready', byProject: {} }), false);
  assert.equal(L.shouldShowVersionNotice(tide, { status: 'failed', byProject: {} }), true);
  assert.equal(L.shouldShowVersionNotice(tide, { status: 'ready', byProject: {} }), false);
  assert.equal(L.shouldShowVersionNotice(tide, { status: 'loading', byProject: {} }), false);
  assert.equal(L.shouldShowVersionNotice(null, { status: 'failed', byProject: {} }), false);
});
