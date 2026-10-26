import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProjects } from '../scripts/validate-projects.mjs';

const ok = {
  id: 'tide-focus',
  name: '潮汐番茄钟',
  tagline: '安静到不像效率工具',
  theme: ['#6366f1', '#8b5cf6'],
  platforms: ['android'],
  releasesRepo: 'xj/tide-focus-releases'
};

test('一份合法配置没有错误', () => {
  assert.deepEqual(validateProjects([ok]), []);
});

test('window.PROJECTS 不是数组时报错', () => {
  assert.equal(validateProjects(null).length, 1);
  assert.equal(validateProjects({}).length, 1);
  assert.equal(validateProjects([]).length, 1, '空列表也算错');
});

test('id 必须唯一且 URL 安全', () => {
  assert.ok(validateProjects([ok, { ...ok, name: '另一个' }]).some((e) => e.includes('重复')));
  assert.ok(validateProjects([{ ...ok, id: 'Has Space' }]).length > 0);
  assert.ok(validateProjects([{ ...ok, id: '-leading' }]).length > 0);
  assert.ok(validateProjects([{ ...ok, id: undefined }]).length > 0);
});

test('theme 必须是两个 #RRGGBB', () => {
  assert.ok(validateProjects([{ ...ok, theme: ['#6366f1'] }]).length > 0);
  assert.ok(validateProjects([{ ...ok, theme: ['red', '#8b5cf6'] }]).length > 0);
  assert.ok(validateProjects([{ ...ok, theme: '#6366f1' }]).length > 0);
});

test('platforms 取值受限', () => {
  assert.ok(validateProjects([{ ...ok, platforms: ['ios'] }]).length > 0);
  assert.ok(validateProjects([{ ...ok, platforms: [] }]).length > 0);
});

test('releasesRepo 必须是 owner/repo', () => {
  assert.ok(validateProjects([{ ...ok, releasesRepo: 'tide-focus' }]).length > 0);
  assert.ok(validateProjects([{ ...ok, releasesRepo: '' }]).length > 0);
});

test('图标文件不存在时报错', () => {
  const errors = validateProjects([{ ...ok, icon: 'icons/missing.png' }], {
    iconExists: () => false
  });
  assert.ok(errors.some((e) => e.includes('icons/missing.png')));
  assert.deepEqual(
    validateProjects([{ ...ok, icon: 'icons/ok.png' }], { iconExists: () => true }),
    []
  );
});

test('liveUrl 若填写必须是合法 URL', () => {
  assert.deepEqual(validateProjects([{ ...ok, liveUrl: 'https://a.example.com' }]), []);
  assert.ok(validateProjects([{ ...ok, liveUrl: 'not a url' }]).length > 0);
});

test('只含 web 却没有 liveUrl 时报错', () => {
  const errors = validateProjects([{ ...ok, platforms: ['web'] }]);
  assert.ok(errors.some((e) => e.includes('liveUrl')), '否则详情页什么都不剩');
  assert.deepEqual(
    validateProjects([{ ...ok, platforms: ['web'], liveUrl: 'https://a.example.com' }]),
    []
  );
});

const withPreview = (preview) => [{ ...ok, preview }];

const terminal = {
  kind: 'terminal',
  title: 'claudepocket — zsh',
  lines: ['❯ 一行', '⏺ 两行', '✓ 三行']
};

const admin = {
  kind: 'admin',
  title: '商会通 · 入会审批',
  nav: ['商会管理', '成员管理', '入会审批'],
  active: 2,
  columns: ['申请人', '申请商会', '状态'],
  rows: [['张伟', '深圳市商会', '待审批']]
};

test('没有 preview 字段是合法的（可选字段）', () => {
  assert.deepEqual(validateProjects([ok]), []);
});

test('合法的 terminal / admin 没有错误', () => {
  assert.deepEqual(validateProjects(withPreview(terminal)), []);
  assert.deepEqual(validateProjects(withPreview(admin)), []);
});

test('preview 不是对象时报错', () => {
  for (const bad of [null, 'terminal', 42, []]) {
    assert.ok(validateProjects(withPreview(bad)).length > 0, `${JSON.stringify(bad)} 应当报错`);
  }
});

test('preview.kind 必须在枚举内', () => {
  const errors = validateProjects(withPreview({ ...terminal, kind: 'video' }));
  assert.ok(errors.some((e) => e.includes('preview.kind')));
});

test('preview.title 必须是非空字符串', () => {
  assert.ok(validateProjects(withPreview({ ...terminal, title: '' })).length > 0);
  assert.ok(validateProjects(withPreview({ ...terminal, title: '   ' })).length > 0);
  assert.ok(validateProjects(withPreview({ ...terminal, title: 7 })).length > 0);
});

test('terminal 的 lines 必须 3–4 条非空字符串', () => {
  assert.ok(validateProjects(withPreview({ ...terminal, lines: ['a', 'b'] })).length > 0, '太少');
  assert.ok(
    validateProjects(withPreview({ ...terminal, lines: ['a', 'b', 'c', 'd', 'e'] })).length > 0,
    '太多 —— 超出 140px 窗口的版面预算'
  );
  assert.ok(validateProjects(withPreview({ ...terminal, lines: 'a b c' })).length > 0, '不是数组');
  assert.ok(validateProjects(withPreview({ ...terminal, lines: ['a', '', 'c'] })).length > 0, '有空项');
  assert.ok(validateProjects(withPreview({ ...terminal, lines: ['a', 'b', 3] })).length > 0, '有非字符串');
});

test('admin 的 nav 必须 2–5 条', () => {
  assert.ok(validateProjects(withPreview({ ...admin, nav: ['只有一个'] })).length > 0);
  assert.ok(
    validateProjects(withPreview({ ...admin, nav: ['a', 'b', 'c', 'd', 'e', 'f'] })).length > 0
  );
});

test('admin 的 active 必须是 0–2 的整数', () => {
  // 窄屏侧栏只显示前 3 项，指到第 4 项高亮就会被藏起来 —— 数据层直接禁掉
  assert.ok(validateProjects(withPreview({ ...admin, active: 3 })).length > 0);
  assert.ok(validateProjects(withPreview({ ...admin, active: -1 })).length > 0);
  assert.ok(validateProjects(withPreview({ ...admin, active: 1.5 })).length > 0);
  assert.ok(validateProjects(withPreview({ ...admin, active: '1' })).length > 0);
  assert.ok(validateProjects(withPreview({ ...admin, active: undefined })).length > 0);
  assert.deepEqual(validateProjects(withPreview({ ...admin, nav: ['a', 'b'], active: 1 })), []);
});

test('admin 的 columns 必须 2–3 列', () => {
  assert.ok(validateProjects(withPreview({ ...admin, columns: ['只有一列'], rows: [['a']] })).length > 0);
  assert.ok(
    validateProjects(withPreview({ ...admin, columns: ['a', 'b', 'c', 'd'], rows: [['a', 'b', 'c', 'd']] })).length > 0
  );
});

test('admin 的 rows 必须 1–3 行，且每行格子数等于列数', () => {
  assert.ok(validateProjects(withPreview({ ...admin, rows: [] })).length > 0, '没有数据行');
  assert.ok(
    validateProjects(withPreview({ ...admin, rows: [['a', 'b', 'c'], ['a', 'b', 'c'], ['a', 'b', 'c'], ['a', 'b', 'c']] })).length > 0,
    '四行超出预算'
  );
  const short = validateProjects(withPreview({ ...admin, rows: [['张伟', '深圳市商会']] }));
  assert.ok(short.some((e) => e.includes('格')), '行的格子数比表头少应当报错');
  const long = validateProjects(withPreview({ ...admin, rows: [['张伟', '深圳市商会', '待审批', '多余']] }));
  assert.ok(long.some((e) => e.includes('格')), '行的格子数比表头多应当报错');
});

test('terminal 写 lines、admin 写 nav，互不代填', () => {
  // 把 admin 的字段填进 terminal 应当报缺 lines
  const errors = validateProjects(withPreview({ ...terminal, lines: undefined, nav: ['a', 'b'] }));
  assert.ok(errors.some((e) => e.includes('preview.lines')));
});

test('page 若填写必须是 projects/ 下真实存在的 .html', () => {
  // 不写仍然合法 —— 没落地页的项目继续走生成的详情页
  assert.deepEqual(validateProjects([ok]), []);

  const withPage = (page) =>
    validateProjects([{ ...ok, page }], {
      pageExists: (rel) => rel === 'projects/tide-focus.html'
    });

  assert.deepEqual(withPage('projects/tide-focus.html'), []);

  assert.ok(withPage('').length > 0, '空串');
  assert.ok(withPage('projects/../secrets.html').length > 0, '越出 projects/');
  assert.ok(withPage('javascript:alert(1)').length > 0, '不是路径');
  assert.ok(withPage('tide-focus.html').length > 0, '没写在 projects/ 下');
  assert.ok(withPage('projects/whatever.html').length > 0, '文件不存在');
});

const phone = {
  kind: 'phone',
  title: '博物游 · 展览详情',
  rows: [
    ['第一关 · 青铜时代', '文物 2/3'],
    ['第二关 · 玉器与礼制', '文物 0/2']
  ]
};

test('合法的 phone 没有错误', () => {
  assert.deepEqual(validateProjects(withPreview(phone)), []);
});

test('phone 的 rows 必须 1–3 行、每行正好两格', () => {
  assert.ok(validateProjects(withPreview({ ...phone, rows: [] })).length > 0, '没有行');
  assert.ok(
    validateProjects(withPreview({ ...phone, rows: [['a', 'b'], ['a', 'b'], ['a', 'b'], ['a', 'b']] })).length > 0,
    '四行超出预算'
  );
  assert.ok(
    validateProjects(withPreview({ ...phone, rows: [['只有一格']] })).some((e) => e.includes('格')),
    '少一格应当报错'
  );
  assert.ok(
    validateProjects(withPreview({ ...phone, rows: [['a', 'b', 'c']] })).some((e) => e.includes('格')),
    '多一格应当报错'
  );
});

test('phone 只认 rows，不拿 lines 或 nav 顶替', () => {
  const errors = validateProjects(withPreview({ kind: 'phone', title: 'x', lines: ['a', 'b', 'c'] }));
  assert.ok(errors.some((e) => e.includes('preview.rows')));
});

test('小程序是合法平台', () => {
  // 博物游：微信小程序，没有安装包、也没有可点的线上地址。
  // 它既不是 android/desktop，也不该被塞进 web（塞进去就会触发「只挂 web 必须给
  // liveUrl」那条 —— 而这个项目恰恰给不出线上入口）。
  assert.deepEqual(validateProjects([{ ...ok, platforms: ['miniprogram'] }]), []);
  assert.deepEqual(validateProjects([{ ...ok, platforms: ['web', 'miniprogram'], liveUrl: 'https://a.example.com' }]), []);
});

test('releasesRepo 可以不填', () => {
  // 没有 GitHub Releases 的项目（小程序、纯展示项目）不该被迫编一个仓库名 ——
  // 编出来的会渲染成一条通往 404 的链接。
  assert.deepEqual(validateProjects([{ ...ok, releasesRepo: undefined }]), []);
  // 填了就必须是 owner/repo：上面那条用例继续管着
  assert.ok(validateProjects([{ ...ok, releasesRepo: 'tide-focus' }]).length > 0);
});
