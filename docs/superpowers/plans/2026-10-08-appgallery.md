# AppGallery 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭出一个零依赖的静态网站，展示个人做过的项目并提供安装包下载，部署到阿里云 OSS。

**Architecture:** 纯静态三页（首页 / 详情页 / 404），无构建、无框架。项目元数据手写在 `projects.js`（浏览器全局变量，规避 `file://` 下的 CORS），版本元数据由构建脚本从 GitHub Releases 生成成 `versions.json`。所有有分支的逻辑抽成 `assets/logic.js` 里的纯函数，浏览器与 Node 测试共用同一份源码。

**Tech Stack:** 原生 HTML / CSS / JavaScript（经典脚本，非 ES module）；构建与测试脚本用 Node 内置模块，零依赖。

**Spec:** `docs/superpowers/specs/2026-10-08-appgallery-design.md`

## 本计划对规格的两处细化

规格已批准。以下两处是写计划时发现规格没覆盖到、必须补充的，请一并审：

1. **新增 `assets/logic.js`（纯函数层）与 `tests/` 目录。**
   规格第 9 节要求纯函数能被 `node:test` 覆盖，但如果纯函数放在 `assets/app.js` 里，Node 一旦 `require` 就会碰到顶层的 `document` 而崩溃。拆成独立文件是规格测试要求的直接结果。

2. **`versions.json` 的条目结构保持规格 4.2 原样（一条 = 一个可下载文件），历史版本区按 `version` 分组渲染。**
   一个 release 可能同时挂 `.apk` 和 `.exe`，那就是两条条目。不分组的话，同一个版本号会在历史列表里出现两次，看起来像 bug。

## Global Constraints

以下约束对**每个任务**都生效，取自规格：

- **零依赖**：不引入任何 npm 包、不使用任何 CDN 上的第三方库、不使用任何框架。`package.json` 只放脚本命令，不装任何东西。
- **经典脚本，不用 ES module**：`index.html` / `project.html` / `404.html` 里引用的 `assets/*.js` 必须是普通 `<script src>`（非 `type="module"`），以保证 `file://` 下双击打开仍能渲染页面骨架。`scripts/` 下的 Node 脚本用 `.mjs`。
- **前端不调用任何 GitHub API**。页面上所有资源都来自本站。
- **主题初始化必须内联在 `<head>`**，不能放进 `assets/app.js`（延迟加载会导致首屏白闪）。
- **全站简体中文文案**。代码注释也用中文。
- **目标浏览器**：Chrome / Safari / Firefox / Edge 最近两个大版本。
- **绝不把 AccessKey、Token 写进仓库**。构建脚本只从环境变量 `GITHUB_TOKEN` 读取。
- **每个任务结束都要提交**。

## Review Focus

规格是愿景文档，它没提到的输入不等于可以崩。以下是五类最可能让真人用户踩坑、且任何任务的测试都不会自动覆盖的情况，按可能性排序。每一类都已在对应任务的测试里钉死：

1. **图标文件缺失或加载失败**（路径写错、文件损坏）→ 应回退到自动生成的占位图标，而不是显示破图。→ Task 6
2. **`?p=` 参数为空、大小写不符或含注入字符** → 应安全显示"找不到这个项目"，且参数值**绝不直接插进 `innerHTML`**。→ Task 1（`findProject` 单测）、Task 7（用 `textContent` 渲染）
3. **`versions.json` 是合法 JSON 但结构异常**（值是字符串、条目缺 `version`）→ 只让该项目的版本区降级，其他项目不受影响，整页不崩。→ Task 1（`normalizeVersions` 单测）
4. **项目声明的 `platforms` 与 release 里的实际资产不匹配**（声明 `android` 却只发了 `.exe`）→ 主下载按钮应兜底到第一个可下载项，而不是消失。→ Task 1（`pickPrimaryFile` 单测）
5. **`platforms` 只含 `web` 却没配 `liveUrl`** → 详情页会什么都不剩。→ Task 2（校验脚本报错）

---

## File Structure

| 文件 | 职责 |
|---|---|
| `package.json` | 只定义 `test` / `validate` / `versions` 三条脚本命令，无依赖 |
| `projects.js` | 手写的项目元数据，挂到 `window.PROJECTS` |
| `assets/logic.js` | 纯函数层：扩展名→平台映射、版本分组、挑主按钮、找项目、版本容错。无 DOM、无网络，浏览器与 Node 共用 |
| `assets/app.js` | DOM 层：主题切换、首页渲染与筛选、详情页渲染、降级态 |
| `assets/style.css` | 两套主题令牌 + 全部组件样式 |
| `index.html` | 首页结构 + `<head>` 内联主题脚本 |
| `project.html` | 详情页结构 + `<head>` 内联主题脚本 |
| `404.html` | 错误页 + `<head>` 内联主题脚本 |
| `scripts/validate-projects.mjs` | 校验 `projects.js`；导出 `validateProjects()` 供测试 |
| `scripts/fetch-releases.mjs` | 拉 GitHub Releases 生成 `versions.json`；导出 `buildVersions()` / `humanSize()` 供测试 |
| `tests/*.test.mjs` | `node:test` 单元测试 |
| `docs/deploy.md` | OSS + 云效流水线的手把手配置步骤 |

`versions.json` 是构建产物，**加入 `.gitignore`，不进仓库**。

---

### Task 1: 纯逻辑层 `assets/logic.js`

**Files:**
- Create: `assets/logic.js`
- Create: `tests/logic.test.mjs`
- Modify: `.gitignore`（追加 `versions.json`）

**Interfaces:**
- Consumes: 无（这是最底层的模块）
- Produces: 挂到 `globalThis.AppGalleryLogic`，同时 `module.exports` 同一对象，含：
  - `platformForExtension(filename: string) => 'android'|'windows'|'macos'|null`
  - `projectPlatformsFor(target: string) => string[]`
  - `detectVisitorOS(ua: string) => 'android'|'ios'|'macos'|'windows'|'unknown'`
  - `compareVersionStrings(a: string, b: string) => number`
  - `groupByVersion(entries: object[]) => {version, date, files}[]`（新的在前）
  - `pickPrimaryFile(group: object|null, visitorOS: string) => object|null`
  - `findProject(projects: object[], id: string) => object|null`
  - `normalizeVersions(raw: any) => {[projectId]: object[]}`

- [ ] **Step 1: 写失败的测试**

Create `tests/logic.test.mjs`:

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/logic.test.mjs`
Expected: FAIL —— `Cannot find module '../assets/logic.js'`

- [ ] **Step 3: 写实现**

Create `assets/logic.js`:

```js
/**
 * AppGallery 纯逻辑层。
 * 不碰 DOM、不发请求 —— 浏览器与 Node 测试共用同一份源码。
 * 写法是「UMD 精简版」：Node 里走 module.exports，浏览器里挂全局。
 */
(function (root) {
  'use strict';

  var EXTENSION_PLATFORM = {
    '.apk': 'android',
    '.exe': 'windows',
    '.msi': 'windows',
    '.dmg': 'macos',
    '.zip': 'macos'
  };

  // 明确忽略：这些不是给访客直接安装用的
  var IGNORED_EXTENSIONS = ['.aab'];

  function extensionOf(filename) {
    var name = String(filename == null ? '' : filename);
    var dot = name.lastIndexOf('.');
    if (dot < 0 || dot === name.length - 1) return '';
    return name.slice(dot).toLowerCase();
  }

  function platformForExtension(filename) {
    var ext = extensionOf(filename);
    if (ext === '') return null;
    if (IGNORED_EXTENSIONS.indexOf(ext) !== -1) return null;
    return EXTENSION_PLATFORM[ext] || null;
  }

  // 具体系统 token 归并到 projects.js 里声明的平台名。
  // 只服务于「下载 XX 版」这类面向访客的文案 —— 别拿它做匹配，
  // 它会把 windows 和 macos 一起压成 desktop，两个安装包从此分不开。
  function projectPlatformsFor(target) {
    if (target === 'android') return ['android'];
    if (target === 'windows' || target === 'macos') return ['desktop'];
    return [];
  }

  function detectVisitorOS(ua) {
    var s = String(ua == null ? '' : ua);
    if (/android/i.test(s)) return 'android';
    if (/iphone|ipad|ipod/i.test(s)) return 'ios';
    if (/windows/i.test(s)) return 'windows';
    if (/macintosh|mac os x/i.test(s)) return 'macos';
    return 'unknown';
  }

  // 按数字段比较，避免 '10' < '9' 这种字符串比较的坑
  function compareVersionStrings(a, b) {
    var pa = String(a).replace(/^v/i, '').split(/[.\-+]/);
    var pb = String(b).replace(/^v/i, '').split(/[.\-+]/);
    var len = Math.max(pa.length, pb.length);
    for (var i = 0; i < len; i++) {
      var sa = pa[i];
      var sb = pb[i];
      // 一段先耗尽：多出来的那段是数字（2.1.0 对 2.1）就算更大，
      // 是文字（2.1.0 对 2.1.0-beta.1）就是预发布，算更小
      if (sa === undefined) return isNaN(parseInt(sb, 10)) ? 1 : -1;
      if (sb === undefined) return isNaN(parseInt(sa, 10)) ? -1 : 1;

      var na = parseInt(sa, 10);
      var nb = parseInt(sb, 10);
      var aNum = !isNaN(na);
      var bNum = !isNaN(nb);
      if (aNum && bNum) {
        if (na !== nb) return na - nb;
      } else if (aNum !== bNum) {
        // 数字段大于非数字段
        return aNum ? 1 : -1;
      } else if (sa !== sb) {
        return sa < sb ? -1 : 1;
      }
    }
    return 0;
  }

  function timeOf(entry) {
    var t = Date.parse(entry && entry.date);
    return isNaN(t) ? 0 : t;
  }

  /**
   * versions.json 里某一项目的条目数组（一条 = 一个可下载文件）→ 按版本分组的数组。
   * 以发布日期为主排序依据：GitHub 的 tag 命名千奇百怪，日期比 tag 可靠得多。
   */
  function groupByVersion(entries) {
    if (!Array.isArray(entries)) return [];
    var byVersion = new Map();
    entries.forEach(function (entry) {
      if (!entry || typeof entry !== 'object') return;
      if (typeof entry.version !== 'string' || entry.version === '') return;
      if (!byVersion.has(entry.version)) {
        byVersion.set(entry.version, { version: entry.version, date: entry.date || '', files: [] });
      }
      var group = byVersion.get(entry.version);
      if (entry.date && !group.date) group.date = entry.date;
      group.files.push(entry);
    });
    var groups = Array.from(byVersion.values());
    groups.sort(function (a, b) {
      var byDate = timeOf(b) - timeOf(a);
      if (byDate !== 0) return byDate;
      return compareVersionStrings(b.version, a.version);
    });
    return groups;
  }

  /**
   * 从最新一组里挑访客该下载的那个文件。
   * visitorOS 和 file.platform 两边都是系统 token（android/windows/macos），同域，直接比。
   * 不要借 projectPlatformsFor 归并 —— 那会把 .exe 和 .dmg 都变成 desktop，
   * Windows 访客就可能被塞一个 .dmg。
   * 没有匹配的平台时兜底到第一个 —— 宁可给一个不完美的包，也不让主按钮消失。
   */
  function pickPrimaryFile(group, visitorOS) {
    if (!group || !Array.isArray(group.files) || group.files.length === 0) return null;
    for (var j = 0; j < group.files.length; j++) {
      if (group.files[j] && group.files[j].platform === visitorOS) return group.files[j];
    }
    return group.files[0];
  }

  function findProject(projects, id) {
    if (!Array.isArray(projects) || typeof id !== 'string' || id === '') return null;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i] && projects[i].id === id) return projects[i];
    }
    return null;
  }

  /**
   * 容错：任何非法输入都退化成空对象 / 空数组，绝不让版本区炸掉整页。
   */
  function normalizeVersions(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    var out = {};
    Object.keys(raw).forEach(function (key) {
      var value = raw[key];
      out[key] = Array.isArray(value)
        ? value.filter(function (e) {
            return e && typeof e === 'object' && typeof e.version === 'string';
          })
        : [];
    });
    return out;
  }

  var api = {
    extensionOf: extensionOf,
    platformForExtension: platformForExtension,
    projectPlatformsFor: projectPlatformsFor,
    detectVisitorOS: detectVisitorOS,
    compareVersionStrings: compareVersionStrings,
    groupByVersion: groupByVersion,
    pickPrimaryFile: pickPrimaryFile,
    findProject: findProject,
    normalizeVersions: normalizeVersions
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AppGalleryLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/logic.test.mjs`
Expected: PASS —— 全部 11 个测试通过

- [ ] **Step 5: 把构建产物加进 .gitignore**

`.gitignore` 追加：

```
# 构建产物，由 scripts/fetch-releases.mjs 生成
versions.json
```

- [ ] **Step 6: 提交**

```bash
git add assets/logic.js tests/logic.test.mjs .gitignore
git commit -m "feat: 抽出纯逻辑层 logic.js 并补单元测试"
```

---

### Task 2: 配置校验 `scripts/validate-projects.mjs`

**Files:**
- Create: `scripts/validate-projects.mjs`
- Create: `tests/validate-projects.test.mjs`
- Create: `package.json`

**Interfaces:**
- Consumes: 无（独立脚本）
- Produces:
  - `loadProjects(projectsPath: string) => object[]` —— 用 `node:vm` 在伪造的 `window` 沙箱里执行 `projects.js`
  - `validateProjects(projects: any, options?: { iconExists?: (relPath: string) => boolean }) => string[]` —— 返回错误消息数组，空数组表示通过

- [ ] **Step 1: 写失败的测试**

Create `tests/validate-projects.test.mjs`:

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/validate-projects.test.mjs`
Expected: FAIL —— `Cannot find module '../scripts/validate-projects.mjs'`

- [ ] **Step 3: 写实现**

Create `scripts/validate-projects.mjs`:

```js
#!/usr/bin/env node
/**
 * 校验 projects.js。
 * 配置写错时立刻报错，而不是等页面渲染出来才发现图标裂了。
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PLATFORMS = ['android', 'desktop', 'web'];

/**
 * projects.js 是浏览器脚本（挂 window.PROJECTS），所以用沙箱执行取出数据，
 * 而不是把它改成模块 —— 那样会破坏 file:// 下双击打开的能力。
 */
export function loadProjects(projectsPath) {
  const src = readFileSync(projectsPath, 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox, { filename: projectsPath });
  return sandbox.window.PROJECTS;
}

export function validateProjects(projects, options = {}) {
  const iconExists = options.iconExists || (() => true);
  if (!Array.isArray(projects)) return ['projects.js 没有导出数组：window.PROJECTS 不是数组'];
  if (projects.length === 0) return ['项目列表是空的'];

  const errors = [];
  const seen = new Set();

  projects.forEach((p, i) => {
    const at = `第 ${i + 1} 个${p && p.id ? `（${p.id}）` : ''}`;
    if (!p || typeof p !== 'object' || Array.isArray(p)) {
      errors.push(`${at}：不是一个对象`);
      return;
    }

    if (typeof p.id !== 'string' || !ID_RE.test(p.id)) {
      errors.push(`${at}：id 缺失或不合法（只能用小写字母、数字、连字符，且以字母或数字开头）`);
    } else if (seen.has(p.id)) {
      errors.push(`${at}：id "${p.id}" 重复`);
    } else {
      seen.add(p.id);
    }

    if (typeof p.name !== 'string' || !p.name.trim()) errors.push(`${at}：缺少 name`);
    if (typeof p.tagline !== 'string' || !p.tagline.trim()) errors.push(`${at}：缺少 tagline`);

    if (!Array.isArray(p.platforms) || p.platforms.length === 0) {
      errors.push(`${at}：platforms 必须是非空数组`);
    } else {
      p.platforms.forEach((v) => {
        if (PLATFORMS.indexOf(v) === -1) {
          errors.push(`${at}：platforms 含非法值 "${v}"（允许：${PLATFORMS.join(' / ')}）`);
        }
      });
    }

    if (
      !Array.isArray(p.theme) ||
      p.theme.length !== 2 ||
      !p.theme.every((c) => HEX_RE.test(String(c)))
    ) {
      errors.push(`${at}：theme 必须是两个 #RRGGBB 色值`);
    }

    if (typeof p.releasesRepo !== 'string' || !REPO_RE.test(p.releasesRepo)) {
      errors.push(`${at}：releasesRepo 必须是 owner/repo 格式`);
    }

    if (p.icon !== undefined) {
      if (typeof p.icon !== 'string' || !p.icon.trim()) {
        errors.push(`${at}：icon 若填写必须是非空字符串`);
      } else if (!iconExists(p.icon)) {
        errors.push(`${at}：图标文件不存在 —— ${p.icon}`);
      }
    }

    if (p.liveUrl !== undefined) {
      if (typeof p.liveUrl !== 'string') {
        errors.push(`${at}：liveUrl 必须是字符串`);
      } else {
        try {
          new URL(p.liveUrl);
        } catch {
          errors.push(`${at}：liveUrl 不是合法 URL —— ${p.liveUrl}`);
        }
      }
    }

    if (p.stack !== undefined && !Array.isArray(p.stack)) {
      errors.push(`${at}：stack 必须是数组`);
    }

    // 只含 web 又没有体验地址的话，详情页的下载区会什么都不剩
    const onlyWeb = Array.isArray(p.platforms) && p.platforms.length === 1 && p.platforms[0] === 'web';
    if (onlyWeb && typeof p.liveUrl !== 'string') {
      errors.push(`${at}：platforms 只含 web，必须同时提供 liveUrl`);
    }
  });

  return errors;
}

// 直接运行时才执行 CLI，被 import 时只暴露函数
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const projectsPath = join(ROOT, 'projects.js');
  let projects;
  try {
    projects = loadProjects(projectsPath);
  } catch (err) {
    console.error(`无法读取 projects.js：${err.message}`);
    process.exit(1);
  }

  const errors = validateProjects(projects, {
    iconExists: (rel) => existsSync(join(ROOT, rel))
  });

  if (errors.length) {
    console.error('projects.js 校验未通过：');
    errors.forEach((e) => console.error('  ✗ ' + e));
    process.exit(1);
  }
  console.log(`projects.js 校验通过（${projects.length} 个项目）`);
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/validate-projects.test.mjs`
Expected: PASS

- [ ] **Step 5: 建 package.json**

Create `package.json`（**不装任何依赖**）：

```json
{
  "name": "appgallery",
  "version": "1.0.0",
  "private": true,
  "description": "个人项目展示与安装包分发站",
  "scripts": {
    "test": "node --test",
    "validate": "node scripts/validate-projects.mjs",
    "versions": "node scripts/fetch-releases.mjs"
  }
}
```

注意两点：

- **不写 `"type": "module"`**。这样 `.js` 在 Node 里按 CommonJS 解析，`assets/logic.js` 的 `module.exports` 分支才会生效；`.mjs` 仍然按 ES module 解析。`tests/logic.test.mjs` 里的 `createRequire` 依赖这一点。
- **测试脚本用裸 `node --test`，不要写成 `node --test tests/`**。Node 24 把位置参数当模块或 glob 解析，传目录会报 `Cannot find module '.../tests'`；裸 `node --test` 按 `*.test.mjs` 约定自动发现，跨版本更稳。

- [ ] **Step 6: 提交**

```bash
git add scripts/validate-projects.mjs tests/validate-projects.test.mjs package.json
git commit -m "feat: 新增 projects.js 校验脚本与测试"
```

---

### Task 3: 版本清单生成 `scripts/fetch-releases.mjs`

**Files:**
- Create: `scripts/fetch-releases.mjs`
- Create: `tests/fetch-releases.test.mjs`

**Interfaces:**
- Consumes:
  - `loadProjects()`（Task 2）
  - `platformForExtension()`（Task 1，通过 `createRequire` 加载 `assets/logic.js`）
- Produces:
  - `humanSize(bytes: number) => string` —— 如 `"8.4 MB"` / `"512 KB"`，非法输入返回 `""`
  - `buildVersions(projects: object[], releasesByRepo: {[repo]: object[]}) => object` —— 产出 `versions.json` 的结构

- [ ] **Step 1: 写失败的测试**

Create `tests/fetch-releases.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVersions, humanSize } from '../scripts/fetch-releases.mjs';

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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/fetch-releases.test.mjs`
Expected: FAIL —— `Cannot find module '../scripts/fetch-releases.mjs'`

- [ ] **Step 3: 写实现**

Create `scripts/fetch-releases.mjs`:

```js
#!/usr/bin/env node
/**
 * 拉取 GitHub Releases，生成 versions.json。
 * 拉取失败时保留上一次的产物，绝不写空文件覆盖。
 */
import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { loadProjects } from './validate-projects.mjs';

const require = createRequire(import.meta.url);
const { platformForExtension } = require('../assets/logic.js');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'versions.json');

export function humanSize(bytes) {
  const n = Number(bytes);
  if (!isFinite(n) || n <= 0) return '';
  const mb = n / 1048576;
  if (mb >= 1) return mb.toFixed(1) + ' MB';
  return Math.max(1, Math.round(n / 1024)) + ' KB';
}

/**
 * 纯函数：projects + GitHub releases 载荷 → versions.json 结构。
 * 一条 = 一个可下载文件；同一 release 里的多个资产会产生多条同版本号的条目。
 */
export function buildVersions(projects, releasesByRepo) {
  const out = {};
  projects.forEach((project) => {
    const releases = releasesByRepo[project.releasesRepo] || [];
    const entries = [];

    releases.forEach((release) => {
      if (!release || release.draft) return;
      const version = String(release.tag_name || '').replace(/^v/i, '');
      if (!version) return;
      const date = String(release.published_at || release.created_at || '').slice(0, 10);

      (release.assets || []).forEach((asset) => {
        const platform = platformForExtension(asset.name);
        if (!platform) return;
        entries.push({
          version,
          date,
          size: humanSize(asset.size),
          platform,
          sources: [{ label: 'GitHub', url: asset.browser_download_url }]
        });
      });
    });

    out[project.id] = entries;
  });
  return out;
}

async function fetchReleases(repo, token) {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'AppGallery-build',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const projects = loadProjects(join(ROOT, 'projects.js'));
  const repos = [...new Set(projects.map((p) => p.releasesRepo))];
  const token = process.env.GITHUB_TOKEN || '';

  const releasesByRepo = {};
  const failures = [];
  for (const repo of repos) {
    try {
      releasesByRepo[repo] = await fetchReleases(repo, token);
    } catch (err) {
      failures.push(`${repo}：${err.message}`);
    }
  }

  if (failures.length) {
    console.error('以下仓库拉取失败：');
    failures.forEach((f) => console.error('  ✗ ' + f));
    if (existsSync(OUT)) {
      console.error('保留上一次的 versions.json，不覆盖。');
    } else {
      console.error('没有可保留的旧文件。');
    }
    process.exit(1);
  }

  const versions = buildVersions(projects, releasesByRepo);
  writeFileSync(OUT, JSON.stringify(versions, null, 2) + '\n');
  console.log(`已写出 versions.json（${Object.keys(versions).length} 个项目）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/fetch-releases.test.mjs`
Expected: PASS

- [ ] **Step 5: 跑一遍全量测试**

Run: `npm test`
Expected: PASS —— 三个测试文件全绿

- [ ] **Step 6: 提交**

```bash
git add scripts/fetch-releases.mjs tests/fetch-releases.test.mjs
git commit -m "feat: 新增 versions.json 生成脚本与测试"
```

---

### Task 4: 三份 HTML 骨架 + 双主题样式 + 无白闪内联脚本

**Files:**
- Create: `index.html`
- Create: `project.html`
- Create: `404.html`
- Create: `assets/style.css`

**Interfaces:**
- Consumes: 无
- Produces: DOM 契约，后续任务依赖这些钩子属性
  - 主题切换按钮：`[data-theme-toggle]`
  - 首页项目网格容器：`[data-grid]`
  - 首页筛选条容器：`[data-filters]`
  - 首页项目计数：`[data-count]`
  - 详情页各挂载点：`[data-header]`、`[data-download]`、`[data-intro]`（返回链接是静态 `<a class="back" href="index.html">`，无需 JS，故无钩子）
  - 详情页"找不到"覆盖层：`[data-notfound]`
  - `localStorage` 键名：`appgallery-theme`，取值 `system` | `light` | `dark`

- [ ] **Step 1: 写样式**

Create `assets/style.css`:

```css
/* ===== 主题令牌 ===== */
:root {
  --bg: #0b0d12;
  --panel: #14171f;
  --border: #232833;
  --text: #e8ecf4;
  --muted: #8b93a7;
  --dim: #4b5163;
  --shadow: none;
  --brand-a: #6366f1;
  --brand-b: #d946ef;
  --icon-bg: var(--bg);
  --hero-1: rgba(99, 102, 241, .30);
  --hero-2: rgba(217, 70, 239, .18);
  --badge-bg: transparent;
  --badge-border: #2c3350;
  --badge-text: #a5b4fc;
  --btn-quiet-bg: #171b26;
  --btn-quiet-border: #2c3350;
  --mono: "SF Mono", Menlo, Consolas, monospace;
}

[data-theme="light"] {
  --bg: #ffffff;
  --panel: #ffffff;
  --border: #e8eaef;
  --text: #0f1115;
  --muted: #5b6274;
  --dim: #9aa1b2;
  --shadow: 0 1px 3px rgba(16, 24, 40, .05);
  --icon-bg: #ffffff;
  --hero-1: rgba(99, 102, 241, .10);
  --hero-2: rgba(217, 70, 239, .08);
  --badge-bg: #f5f3ff;
  --badge-border: #ddd6fe;
  --badge-text: #4f46e5;
  --btn-quiet-bg: #ffffff;
  --btn-quiet-border: #c7cbd6;
}

/* ===== 基础 ===== */
* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  line-height: 1.6;
}

a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }

:focus-visible {
  outline: 2px solid var(--brand-a);
  outline-offset: 2px;
}

.wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 20px;
}

/* ===== 顶栏 ===== */
.nav {
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
}

.brand-mark {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  background: linear-gradient(135deg, var(--brand-a), var(--brand-b));
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--muted);
}

.nav-links a:hover { color: var(--text); }

.theme-toggle {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--panel);
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.theme-toggle:hover { color: var(--text); border-color: var(--muted); }

/* ===== Hero ===== */
.hero {
  position: relative;
  padding: 40px 0 26px;
  overflow: hidden;
}

.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 90% at 16% 0%, var(--hero-1), transparent 70%),
    radial-gradient(50% 80% at 84% 4%, var(--hero-2), transparent 70%);
  pointer-events: none;
}

.hero > * { position: relative; }

.badge {
  display: inline-block;
  font-size: 12px;
  color: var(--badge-text);
  background: var(--badge-bg);
  border: 1px solid var(--badge-border);
  border-radius: 999px;
  padding: 3px 10px;
  margin-bottom: 14px;
}

.hero h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.14;
  letter-spacing: -.025em;
}

.hero h1 .accent {
  background: linear-gradient(90deg, var(--brand-a), var(--brand-b));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero p {
  margin: 12px 0 0;
  max-width: 380px;
  color: var(--muted);
  font-size: 14px;
}

/* ===== 筛选条 ===== */
.filters {
  display: flex;
  gap: 8px;
  padding-bottom: 18px;
  overflow-x: auto;
  scrollbar-width: none;
}

.filters::-webkit-scrollbar { display: none; }

.filter {
  flex: none;
  font-size: 13px;
  color: var(--muted);
  background: none;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 14px;
  cursor: pointer;
  font-family: inherit;
}

.filter[aria-pressed="true"] {
  color: var(--bg);
  background: var(--text);
  border-color: var(--text);
  font-weight: 600;
}

/* ===== 卡片网格 ===== */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  padding-bottom: 40px;
}

.card {
  display: block;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform .15s ease, border-color .15s ease;
}

.card:hover { transform: translateY(-2px); border-color: var(--muted); }
.card[hidden] { display: none; }

.card-strip {
  display: block;
  height: 76px;
  position: relative;
}

.card-icon {
  position: absolute;
  left: 14px;
  bottom: -18px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--icon-bg);
  border: 1px solid var(--border);
  object-fit: cover;
}

.card-icon-fallback {
  position: absolute;
  left: 14px;
  bottom: -18px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.card-body {
  display: block;
  padding: 28px 16px 16px;
}

.card-name { display: block; font-size: 15px; font-weight: 600; }

.card-tagline {
  display: block;
  margin-top: 5px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.chip {
  font-family: var(--mono);
  font-size: 11px;
  border-radius: 999px;
  padding: 2px 9px;
  border: 1px solid var(--border);
  color: var(--muted);
}

.card-version { font-family: var(--mono); font-size: 12px; color: var(--dim); }

.version-loading {
  display: inline-block;
  width: 42px;
  height: 10px;
  border-radius: 999px;
  background: var(--border);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }

@media (prefers-reduced-motion: reduce) {
  .version-loading { animation: none; }
  .card { transition: none; }
}

/* ===== 详情页 ===== */
.back { display: inline-block; padding: 20px 0 0; font-size: 13px; color: var(--muted); }
.back:hover { color: var(--text); }

.detail-head {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 0 26px;
}

.detail-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  object-fit: cover;
  flex: none;
}

.detail-icon-fallback {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  flex: none;
}

.detail-head h1 { margin: 0; font-size: 26px; letter-spacing: -.02em; }
.detail-head .tagline { margin: 6px 0 0; font-size: 14px; color: var(--muted); }

.detail-body {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 24px;
  align-items: start;
  padding-bottom: 48px;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  box-shadow: var(--shadow);
}

.panel-label {
  font-size: 12px;
  letter-spacing: .08em;
  color: var(--muted);
  margin-bottom: 14px;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--brand-a), var(--brand-b));
  color: #fff;
}

.btn-primary strong { display: block; font-size: 15px; font-weight: 600; }
.btn-primary small { display: block; font-family: var(--mono); margin-top: 3px; font-size: 12px; color: rgba(255, 255, 255, .78); }

.btn-quiet {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--btn-quiet-bg);
  border: 1px solid var(--btn-quiet-border);
}

.btn-quiet strong { display: block; font-size: 15px; font-weight: 600; }
.btn-quiet small { display: block; font-family: var(--mono); margin-top: 3px; font-size: 12px; color: var(--muted); }

.alt-source { margin-top: 10px; font-size: 12px; color: var(--muted); }
.alt-source a { color: var(--badge-text); }

.notice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 16px;
  margin-bottom: 18px;
  border-radius: 10px;
  background: rgba(245, 158, 11, .10);
  border: 1px solid rgba(245, 158, 11, .22);
  color: #d6bc8a;
  font-size: 13px;
}

[data-theme="light"] .notice { color: #92670f; background: #fffbeb; border-color: #fde68a; }

.versions { margin-top: 18px; }

.version-row {
  font-family: var(--mono);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  color: var(--muted);
}

.version-row:last-child { border-bottom: none; }
.version-row .v { color: var(--text); }
.version-row .dl { color: var(--badge-text); white-space: nowrap; }

.versions[data-collapsed="true"] .version-row:nth-child(n+6) { display: none; }

.more-toggle {
  margin-top: 10px;
  font-size: 12px;
  color: var(--badge-text);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}

.intro p { margin: 0 0 14px; font-size: 14px; color: var(--text); line-height: 1.85; }
.intro p:last-child { margin-bottom: 0; }

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 8px;
}

.link-list { list-style: none; margin: 0; padding: 0; font-size: 14px; line-height: 2.1; }
.link-list a { color: var(--badge-text); }

.empty { font-size: 14px; color: var(--muted); }

/* ===== 页脚 ===== */
.footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 0 28px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--dim);
}

/* ===== 404 ===== */
.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 60vh;
  text-align: center;
}

/* ===== 响应式 ===== */
@media (max-width: 1023px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 767px) {
  .wrap { padding: 0 14px; }
  .grid { grid-template-columns: 1fr; gap: 14px; }
  .hero h1 { font-size: 27px; }
  .hero { padding: 28px 0 20px; }
  .card-strip { height: 54px; }
  .card-icon,
  .card-icon-fallback { left: 12px; bottom: -14px; width: 38px; height: 38px; border-radius: 11px; font-size: 15px; }
  .card-body { padding: 22px 14px 14px; }
  .detail-body { grid-template-columns: 1fr; }
  .detail-icon,
  .detail-icon-fallback { width: 52px; height: 52px; border-radius: 15px; font-size: 22px; }
  .detail-head h1 { font-size: 21px; }
  .footer { flex-direction: column; gap: 6px; }
}
```

- [ ] **Step 2: 写首页骨架**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>AppGallery — 我做过的应用</title>
<script>
/* 主题必须在 CSS 绘制前定下来，否则会白闪。
   这段不能挪进 app.js —— 那是延迟加载的。 */
(function () {
  /* getItem 单独包一层：存储被拒（隐私模式、Safari 从 file:// 打开、
     企业策略禁用存储）时把它当成「没存过」→ 跟随系统，与 app.js 的
     currentMode() 口径一致。若并进下面的大 try，回退会落到硬编码的 dark，
     而 app.js 随后会按系统偏好改成浅色 —— 那正好是这段脚本要消灭的那次闪。 */
  var saved = null;
  try {
    saved = localStorage.getItem('appgallery-theme');
  } catch (e) {
    /* 读不到就是没存过，saved 保持 null */
  }
  try {
    if (saved !== 'light' && saved !== 'dark') saved = 'system';
    var resolved = saved === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : saved;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    /* 没有 matchMedia 的老浏览器：兜底深色 */
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
</script>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>

<header class="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="index.html">
      <span class="brand-mark"></span>AppGallery
    </a>
    <nav class="nav-links">
      <a href="index.html">项目</a>
      <a href="https://github.com/" data-github-link>GitHub</a>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="切换主题">◐</button>
    </nav>
  </div>
</header>

<main class="wrap">
  <section class="hero">
    <span class="badge"><span data-count>…</span> 个项目 · 持续更新</span>
    <h1>我做过的应用，<br><span class="accent">都在这里。</span></h1>
    <p>点开任意一个，看它解决什么问题，然后下载安装包亲自试试。</p>
  </section>

  <div class="filters" data-filters role="group" aria-label="按平台筛选"></div>

  <div class="grid" data-grid></div>
</main>

<footer class="wrap footer">
  <span>© <span data-year></span> —— 用 HTML 和一段脚本搭的</span>
  <a href="https://github.com/" data-github-link>GitHub</a>
</footer>

<script src="projects.js"></script>
<script src="assets/logic.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: 写详情页骨架**

Create `project.html` —— `<head>` 与首页完全相同（含同一段内联主题脚本），`<body>` 如下：

```html
<body>

<header class="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="index.html">
      <span class="brand-mark"></span>AppGallery
    </a>
    <nav class="nav-links">
      <a href="index.html">项目</a>
      <a href="https://github.com/" data-github-link>GitHub</a>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="切换主题">◐</button>
    </nav>
  </div>
</header>

<main class="wrap">
  <!-- 找不到项目时显示，找到时移除 hidden -->
  <section class="centered" data-notfound hidden>
    <h1>找不到这个项目</h1>
    <p class="empty">链接可能过期了，或者项目已经改名。</p>
    <a class="link-list" href="index.html" style="color:var(--badge-text)">← 回到全部项目</a>
  </section>

  <div data-project>
    <a class="back" href="index.html">← 全部项目</a>
    <div data-header></div>
    <div data-notice></div>
    <div class="detail-body">
      <div data-download></div>
      <div class="intro" data-intro></div>
    </div>
  </div>
</main>

<footer class="wrap footer">
  <span>© <span data-year></span> —— 用 HTML 和一段脚本搭的</span>
  <a href="https://github.com/" data-github-link>GitHub</a>
</footer>

<script src="projects.js"></script>
<script src="assets/logic.js"></script>
<script src="assets/app.js"></script>
</body>
```

- [ ] **Step 4: 写 404 页**

Create `404.html` —— `<head>` 同首页（含内联主题脚本），**只把 `<title>` 换掉**：

```html
<title>没找到这个页面 — AppGallery</title>
```

`<body>` 如下（导航与首页一致，保留「项目」与「GitHub」两项 —— 见规格 3.4）：

```html
<body>

<header class="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="index.html">
      <span class="brand-mark"></span>AppGallery
    </a>
    <nav class="nav-links">
      <a href="index.html">项目</a>
      <a href="https://github.com/" data-github-link>GitHub</a>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="切换主题">◐</button>
    </nav>
  </div>
</header>

<main class="wrap">
  <section class="centered">
    <h1>没找到这个页面</h1>
    <p class="empty">地址可能写错了，或者这个页面已经不在了。</p>
    <a href="index.html" style="color:var(--badge-text)">← 回到全部项目</a>
  </section>
</main>

<footer class="wrap footer">
  <span>© <span data-year></span></span>
</footer>

<script src="assets/logic.js"></script>
<script src="assets/app.js"></script>
</body>
```

- [ ] **Step 5: 手动验证骨架**

在浏览器打开 `index.html`，再用 DevTools 执行：

```js
document.documentElement.setAttribute('data-theme', 'light')
document.documentElement.setAttribute('data-theme', 'dark')
```

Expected:
- 三个页面都能打开（此时 `assets/app.js` 还不存在，控制台会报 404，这是预期的）
- 在浅色/深色之间手动切换时，底色、文字色、描边、导航全部跟着变
- 页面在 `file://` 下双击打开也是这个效果

- [ ] **Step 6: 提交**

```bash
git add index.html project.html 404.html assets/style.css
git commit -m "feat: 三份页面骨架与双主题样式令牌"
```

---

### Task 5: 主题切换（三态 + 持久化 + 跟随系统）

**Files:**
- Create: `assets/app.js`

**Interfaces:**
- Consumes:
  - `[data-theme-toggle]`（Task 4）
  - `localStorage` 键 `appgallery-theme`
- Produces: `assets/app.js` 的模块内结构 —— 后续任务在同一个 IIFE 内追加 `renderHome()` / `renderDetail()`。本任务建立：
  - `MODES = ['system', 'light', 'dark']`
  - `currentMode() => string`
  - `applyMode(mode) => void`
  - `initThemeToggle() => void`
  - 一个在 `DOMContentLoaded` 里按页面类型分发的入口

- [ ] **Step 1: 写实现（主题部分）**

Create `assets/app.js`:

```js
/**
 * AppGallery DOM 层。
 * 纯计算都在 assets/logic.js 里，这里只负责碰 DOM。
 */
(function () {
  'use strict';

  var L = window.AppGalleryLogic;

  // ---------- 主题 ----------
  var THEME_KEY = 'appgallery-theme';
  var MODES = ['system', 'light', 'dark'];
  var MODE_ICON = { system: '◐', light: '☀', dark: '☾' };
  var MODE_LABEL = { system: '跟随系统', light: '浅色', dark: '深色' };

  // 当前模式以这个内存变量为准，localStorage 只用于开机初始化。
  // 若每步都从存储反推：存储写不进去时（隐私模式、Safari 从 file:// 打开、
  // 企业策略），currentMode() 恒为 'system'，三态循环永远停在同一档 ——
  // 用户看到的是「按钮点了没反应」，到不了深色。
  var current = 'system';

  function currentMode() {
    var saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (e) {
      /* 隐私模式下 localStorage 可能抛异常，按跟随系统处理 */
    }
    return MODES.indexOf(saved) === -1 ? 'system' : saved;
  }

  function resolveTheme(mode) {
    if (mode !== 'system') return mode;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyMode(mode) {
    document.documentElement.setAttribute('data-theme', resolveTheme(mode));
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (e) {
      /* 存不下就算了，不影响本次浏览 */
    }
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      btn.textContent = MODE_ICON[mode];
      btn.title = '当前：' + MODE_LABEL[mode];
      btn.setAttribute('aria-label', '当前：' + MODE_LABEL[mode] + '，点击切换主题');
    }
  }

  function initThemeToggle() {
    var btn = document.querySelector('[data-theme-toggle]');
    // 内联脚本已经写好了 data-theme，这里只补按钮的图标与文案
    current = currentMode();
    applyMode(current);
    if (!btn) return;

    btn.addEventListener('click', function () {
      current = MODES[(MODES.indexOf(current) + 1) % MODES.length];
      applyMode(current);
    });

    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onSystemChange = function () {
      if (current === 'system') applyMode(current);
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange); // 老 Safari
  }

  // ---------- 入口 ----------
  function boot() {
    initThemeToggle();

    var year = document.querySelector('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());

    // 渲染逻辑在后续任务里补上
    if (document.querySelector('[data-grid]')) {
      // renderHome();
    }
    if (document.querySelector('[data-project]')) {
      // renderDetail();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
```

- [ ] **Step 2: 手动验证**

打开 `index.html`，在控制台依次执行：

```js
localStorage.removeItem('appgallery-theme')
```

然后刷新页面，验证三件事：

1. 点击右上角按钮，图标在 `◐ → ☀ → ☾` 之间循环，页面配色同步切换
2. 切到某个状态后刷新页面，状态保持
3. 把系统外观切到浅色、页面处于"跟随系统"状态时，页面**实时**跟着变（不用刷新）

Expected: 三条全部成立。

- [ ] **Step 3: 手动验证无白闪**

1. 把系统外貌设为**深色**
2. 点击按钮切到 **浅色**，刷新页面
3. 把系统外观设为**浅色**，切到 **深色**，再刷新

Expected: 两次刷新都不出现一瞬间的白底或黑底闪烁。

- [ ] **Step 4: 提交**

```bash
git add assets/app.js
git commit -m "feat: 三态主题切换与持久化"
```

---

### Task 6: 首页渲染 —— 卡片网格、筛选、降级态

**Files:**
- Modify: `assets/app.js`（在 IIFE 内追加渲染函数，并把 `boot()` 里的 `renderHome()` 取消注释）
- Create: `projects.js`（先用测试数据，Task 8 换成真实项目）

**Interfaces:**
- Consumes:
  - `L.platformForExtension` / `L.projectPlatformsFor` / `L.normalizeVersions`（Task 1）
  - DOM 钩子 `[data-grid]` `[data-filters]` `[data-count]`（Task 4）
- Produces:
  - `renderHome() => void`
  - `loadVersions() => Promise<{status, byProject}>`，`status` 取 `'ready' | 'failed'`；后续 Task 7 复用它

- [ ] **Step 1: 追加渲染实现**

在 `assets/app.js` 的 IIFE 内、`boot()` 之前插入以下代码：

```js
  // ---------- 数据 ----------
  // 两个词汇表是两套 key，别混。这张表的键是 projects.js 里声明的平台名。
  // versions.json 里的系统 token（windows/macos/android）走 Task 7 的 OS_LABEL。
  var PLATFORM_LABEL = { android: 'Android', desktop: '桌面端', web: 'Web' };
  var PLATFORM_ORDER = ['android', 'desktop', 'web'];

  function projects() {
    return Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
  }

  /**
   * 版本信息是增强项：拿不到就返回 failed，页面照常显示，
   * 只是版本号位置退化成"版本信息暂不可用"。
   */
  function loadVersions() {
    return fetch('versions.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (raw) {
        return { status: 'ready', byProject: L.normalizeVersions(raw) };
      })
      .catch(function () {
        return { status: 'failed', byProject: {} };
      });
  }

  // ---------- 图标 ----------
  function iconNode(project, className) {
    if (project.icon) {
      var img = document.createElement('img');
      img.className = className;
      img.src = project.icon;
      img.alt = '';
      // 图标加载失败时回退到占位图标，而不是留一个破图（Review Focus 1）
      img.addEventListener('error', function () {
        img.replaceWith(fallbackIconNode(project, className));
      });
      return img;
    }
    return fallbackIconNode(project, className);
  }

  function fallbackIconNode(project, className) {
    var span = document.createElement('span');
    span.className = className + '-fallback';
    span.style.background = (project.theme && project.theme[0]) || '#6366f1';
    span.textContent = (project.name || '?').trim().charAt(0);
    return span;
  }

  // ---------- 卡片 ----------
  function cardNode(project) {
    var card = document.createElement('a');
    card.className = 'card';
    card.href = 'project.html?p=' + encodeURIComponent(project.id);
    card.setAttribute('data-platforms', (project.platforms || []).join(' '));

    var strip = document.createElement('span');
    strip.className = 'card-strip';
    var theme = project.theme || ['#6366f1', '#8b5cf6'];
    strip.style.background = 'linear-gradient(135deg, ' + theme[0] + ', ' + theme[1] + ')';
    strip.appendChild(iconNode(project, 'card-icon'));
    card.appendChild(strip);

    var body = document.createElement('span');
    body.className = 'card-body';

    var name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = project.name || project.id;
    body.appendChild(name);

    var tagline = document.createElement('span');
    tagline.className = 'card-tagline';
    tagline.textContent = project.tagline || '';
    body.appendChild(tagline);

    var meta = document.createElement('span');
    meta.className = 'card-meta';
    PLATFORM_ORDER.forEach(function (p) {
      if ((project.platforms || []).indexOf(p) === -1) return;
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = PLATFORM_LABEL[p];
      meta.appendChild(chip);
    });
    var slot = document.createElement('span');
    slot.className = 'card-version';
    slot.setAttribute('data-version-slot', project.id);
    slot.innerHTML = '<span class="version-loading"></span>';
    meta.appendChild(slot);
    body.appendChild(meta);

    card.appendChild(body);
    return card;
  }

  function fillVersionSlots(state) {
    document.querySelectorAll('[data-version-slot]').forEach(function (slot) {
      var id = slot.getAttribute('data-version-slot');
      if (state.status === 'failed') {
        slot.textContent = '版本信息暂不可用';
        slot.style.color = 'var(--dim)';
        return;
      }
      var groups = L.groupByVersion(state.byProject[id] || []);
      if (groups.length === 0) {
        slot.textContent = '';
        return;
      }
      slot.textContent = 'v' + groups[0].version;
    });
  }

  // ---------- 筛选 ----------
  function initFilters() {
    var bar = document.querySelector('[data-filters]');
    if (!bar) return;
    var list = projects();
    // 项目太少时筛选没有意义（规格 7）
    if (list.length < 5) {
      bar.remove();
      return;
    }

    var used = PLATFORM_ORDER.filter(function (p) {
      return list.some(function (item) {
        return (item.platforms || []).indexOf(p) !== -1;
      });
    });

    [{ key: 'all', label: '全部' }]
      .concat(used.map(function (p) { return { key: p, label: PLATFORM_LABEL[p] }; }))
      .forEach(function (item, index) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter';
        btn.textContent = item.label;
        btn.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
        btn.addEventListener('click', function () {
          bar.querySelectorAll('.filter').forEach(function (b) {
            b.setAttribute('aria-pressed', 'false');
          });
          btn.setAttribute('aria-pressed', 'true');
          document.querySelectorAll('.card').forEach(function (card) {
            var platforms = (card.getAttribute('data-platforms') || '').split(' ');
            card.hidden = item.key !== 'all' && platforms.indexOf(item.key) === -1;
          });
        });
        bar.appendChild(btn);
      });
  }

  // ---------- 首页 ----------
  function renderHome() {
    var grid = document.querySelector('[data-grid]');
    if (!grid) return;

    var list = projects();
    var count = document.querySelector('[data-count]');
    if (count) count.textContent = String(list.length);

    grid.innerHTML = '';
    list.forEach(function (project) {
      grid.appendChild(cardNode(project));
    });

    initFilters();

    loadVersions().then(fillVersionSlots);
  }
```

同时把 `boot()` 里的 `// renderHome();` 改成 `renderHome();`。

- [ ] **Step 2: 造一份测试用数据与版本文件**

临时把 `projects.js` 写成下面的内容（Task 8 会换成真实项目）：

```js
window.PROJECTS = [
  {
    id: 'tide-focus',
    name: '潮汐番茄钟',
    tagline: '安静到不像效率工具',
    description: '番茄钟我试过十几个，大多数都在催你、提醒你、给你看统计图表。这个反过来，只有一圈缓慢的潮汐和一小时里唯一需要看的那几个字。',
    theme: ['#6366f1', '#8b5cf6'],
    platforms: ['android', 'web'],
    stack: ['Kotlin', 'Compose', 'Room'],
    releasesRepo: 'xj/tide-focus-releases',
    liveUrl: 'https://tide.example.com'
  },
  {
    id: 'ledger',
    name: '记账本',
    tagline: '三秒记一笔，月底不头疼',
    theme: ['#0ea5e9', '#22d3ee'],
    platforms: ['desktop'],
    stack: ['Tauri', 'Rust', 'SQLite'],
    releasesRepo: 'xj/ledger-releases'
  },
  {
    id: 'skycast',
    name: '天气速览',
    tagline: '抬头就知道要不要带伞',
    theme: ['#f97316', '#fb7185'],
    platforms: ['web'],
    releasesRepo: 'xj/skycast-releases',
    liveUrl: 'https://sky.example.com'
  },
  {
    id: 'night-radio',
    name: '深夜电台',
    tagline: '只放你听得进去的歌',
    theme: ['#ec4899', '#8b5cf6'],
    platforms: ['android'],
    releasesRepo: 'xj/night-radio-releases'
  },
  {
    id: 'sticky-notes',
    name: '桌面便签',
    tagline: '贴在屏幕上，忘不掉',
    theme: ['#10b981', '#34d399'],
    platforms: ['desktop'],
    releasesRepo: 'xj/sticky-notes-releases'
  }
];
```

再手工在项目根目录建一份 `versions.json`（它已在 `.gitignore` 里，不会提交），用来验证渲染：

```json
{
  "tide-focus": [
    { "version": "2.1.0", "date": "2026-09-28", "size": "8.4 MB", "platform": "android",
      "sources": [{ "label": "GitHub", "url": "https://github.com/xj/tide-focus-releases/releases/download/v2.1.0/tide-focus-2.1.0.apk" }] },
    { "version": "2.0.3", "date": "2026-08-14", "size": "8.2 MB", "platform": "android",
      "sources": [{ "label": "GitHub", "url": "https://github.com/xj/tide-focus-releases/releases/download/v2.0.3/tide-focus-2.0.3.apk" }] }
  ],
  "ledger": [
    { "version": "1.0.4", "date": "2026-07-01", "size": "12.1 MB", "platform": "windows",
      "sources": [{ "label": "GitHub", "url": "https://github.com/xj/ledger-releases/releases/download/v1.0.4/ledger-setup.exe" }] }
  ],
  "night-radio": [
    { "version": "1.2.0", "date": "2026-05-20", "size": "6.0 MB", "platform": "android",
      "sources": [{ "label": "GitHub", "url": "https://github.com/xj/night-radio-releases/releases/download/v1.2.0/radio.apk" }] }
  ]
}
```

因为 `fetch` 在 `file://` 下会失败，**验证这一步必须用本地 HTTP 服务**：

```bash
python3 -m http.server 8080
```

然后打开 `http://localhost:8080/index.html`。

- [ ] **Step 3: 逐项手工验证**

Expected:

- 五张卡片按 `projects.js` 里的顺序排列，渐变颜色各不相同
- 卡片上的平台标签与 `platforms` 一致
- `tide-focus` 与 `night-radio` 显示 `v2.1.0` / `v1.2.0`；`skycast` 和 `sticky-notes` 版本号为空白（它们没有 release 数据）
- 点击筛选条上的「桌面端」，只剩 `ledger` 和 `sticky-notes`
- `[data-count]` 显示 `5`

- [ ] **Step 4: 验证降级态**

1. 把根目录的 `versions.json` 改名为 `versions.json.bak`，刷新页面
   Expected: 每张卡片的版本号位置显示「版本信息暂不可用」，卡片本身和筛选照常工作，控制台没有未捕获异常
2. 恢复 `versions.json`，把它内容改成 `"这不是对象"`，刷新
   Expected: 同上 —— 结构异常也只降级，不崩（Review Focus 3）
3. 恢复 `versions.json`

- [ ] **Step 5: 验证图标回退**

临时把 `projects.js` 里 `tide-focus` 的 `icon` 改成 `icons/does-not-exist.png`，刷新。

Expected: 该卡片显示一个主题色底、白色首字「潮」的方块，**不是破图**（Review Focus 1）。验证完改回去。

- [ ] **Step 6: 提交**

```bash
git add assets/app.js projects.js index.html
git commit -m "feat: 首页卡片网格、平台筛选与版本降级态"
```

---

### Task 7: 详情页渲染 —— 下载区、历史版本、介绍区

**Files:**
- Modify: `assets/app.js`（追加 `renderDetail()`，把 `boot()` 里的 `// renderDetail();` 取消注释）

**Interfaces:**
- Consumes:
  - `L.findProject` / `L.groupByVersion` / `L.pickPrimaryFile` / `L.detectVisitorOS` / `L.projectPlatformsFor` / `L.normalizeVersions`（Task 1）
  - `loadVersions()` / `iconNode()`（Task 6）
  - DOM 钩子 `[data-notfound]` `[data-project]` `[data-header]` `[data-notice]` `[data-download]` `[data-intro]`（Task 4）
- Produces: `renderDetail() => void`

- [ ] **Step 1: 追加渲染实现**

在 `assets/app.js` 的 IIFE 内、`boot()` 之前插入：

```js
  // ---------- 详情页 ----------
  // versions.json 里的 platform 是系统 token，key 和 Task 6 的 PLATFORM_LABEL 不同
  var OS_LABEL = { android: 'Android', windows: 'Windows', macos: 'macOS' };

  function sourceFor(entry) {
    return entry && entry.sources && entry.sources[0] ? entry.sources[0] : null;
  }

  function renderDetailHeader(project) {
    var host = document.querySelector('[data-header]');
    if (!host) return;
    host.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'detail-head';
    head.appendChild(iconNode(project, 'detail-icon'));

    var text = document.createElement('div');
    var h1 = document.createElement('h1');
    h1.textContent = project.name || project.id;   // 用 textContent，参数值绝不进 innerHTML（Review Focus 2）
    text.appendChild(h1);

    var tagline = document.createElement('p');
    tagline.className = 'tagline';
    tagline.textContent = project.tagline || '';
    text.appendChild(tagline);

    var chips = document.createElement('div');
    chips.className = 'card-meta';
    PLATFORM_ORDER.forEach(function (p) {
      if ((project.platforms || []).indexOf(p) === -1) return;
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = PLATFORM_LABEL[p];
      chips.appendChild(chip);
    });
    text.appendChild(chips);

    head.appendChild(text);
    host.appendChild(head);
  }

  function renderNotice(state) {
    var host = document.querySelector('[data-notice]');
    if (!host) return;
    host.innerHTML = '';
    if (state.status !== 'failed') return;

    var notice = document.createElement('div');
    notice.className = 'notice';
    var mark = document.createElement('span');
    mark.textContent = '!';
    var msg = document.createElement('span');
    msg.textContent = 'GitHub 版本信息暂时取不到。下载可直接去仓库的 Releases 页。';
    notice.appendChild(mark);
    notice.appendChild(msg);
    host.appendChild(notice);
  }

  function releasesPageUrl(project) {
    return 'https://github.com/' + project.releasesRepo + '/releases';
  }

  function renderDownload(project, state) {
    var host = document.querySelector('[data-download]');
    if (!host) return;
    host.innerHTML = '';

    var panel = document.createElement('div');
    panel.className = 'panel';

    var label = document.createElement('div');
    label.className = 'panel-label';
    label.textContent = '下载';
    panel.appendChild(label);

    // 加载中先给一个占位，避免"还没有可下载的版本"一闪而过
    if (state.status === 'loading') {
      var loading = document.createElement('p');
      loading.className = 'empty';
      loading.innerHTML = '<span class="version-loading"></span>';
      panel.appendChild(loading);
      host.appendChild(panel);
      return;
    }

    var groups = state.status === 'ready' ? L.groupByVersion(state.byProject[project.id] || []) : [];
    var onlyWeb = (project.platforms || []).length === 1 && project.platforms[0] === 'web';

    if (onlyWeb) {
      // 纯 Web 项目不给安装包，直接给体验入口（规格 6.2）
      panel.appendChild(makeQuietButton('在线体验', project.liveUrl || '', '在浏览器里直接打开'));
    } else if (groups.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = state.status === 'failed' ? '版本信息暂不可用。' : '还没有可下载的版本。';
      panel.appendChild(empty);
      panel.appendChild(makeQuietButton('去 GitHub Releases 看看', releasesPageUrl(project), project.releasesRepo));
    } else {
      var latest = groups[0];
      var chosen = L.pickPrimaryFile(latest, L.detectVisitorOS(navigator.userAgent));
      var source = sourceFor(chosen);

      if (source) {
        panel.appendChild(
          makePrimaryButton(
            '下载 ' + (PLATFORM_LABEL[L.projectPlatformsFor(chosen.platform)[0]] || '') + ' 版',
            source.url,
            'v' + latest.version + (chosen.size ? ' · ' + chosen.size : '') + (latest.date ? ' · ' + latest.date : ''),
            '_blank'
          )
        );

        // 第二条及以后的来源，退成一行小字（规格 6.4）
        var chosenSources = (chosen.sources || []).slice(1);
        if (chosenSources.length) {
          var alt = document.createElement('p');
          alt.className = 'alt-source';
          alt.appendChild(document.createTextNode('其他下载源：'));
          chosenSources.forEach(function (s, i) {
            if (i > 0) alt.appendChild(document.createTextNode(' · '));
            var a = document.createElement('a');
            a.href = s.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = s.label + ' ↗';
            alt.appendChild(a);
          });
          panel.appendChild(alt);
        }
      } else {
        var noSource = document.createElement('p');
        noSource.className = 'empty';
        noSource.textContent = '这个版本没有可下载的文件。';
        panel.appendChild(noSource);
      }

      // 历史版本：按 version 分组，一组一行
      if (groups.length > 1) {
        var list = document.createElement('div');
        list.className = 'versions';
        if (groups.length > 5) list.setAttribute('data-collapsed', 'true');

        groups.forEach(function (group) {
          var primary = L.pickPrimaryFile(group, L.detectVisitorOS(navigator.userAgent));
          var s = sourceFor(primary);
          var row = document.createElement('div');
          row.className = 'version-row';

          var v = document.createElement('span');
          v.className = 'v';
          v.textContent = 'v' + group.version;
          row.appendChild(v);

          var meta = document.createElement('span');
          var parts = [];
          if (group.files.length > 1) {
            parts.push(group.files.map(function (f) {
              return OS_LABEL[f.platform] || f.platform;
            }).join(' / '));
          }
          if (primary && primary.size) parts.push(primary.size);
          if (group.date) parts.push(group.date);
          meta.textContent = parts.join(' · ');
          row.appendChild(meta);

          if (s) {
            var a = document.createElement('a');
            a.className = 'dl';
            a.href = s.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = '下载';
            row.appendChild(a);
          } else {
            var none = document.createElement('span');
            none.className = 'dl';
            none.textContent = '—';
            row.appendChild(none);
          }

          list.appendChild(row);
        });

        panel.appendChild(list);

        if (groups.length > 5) {
          var toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'more-toggle';
          toggle.textContent = '展开全部 ' + groups.length + ' 个版本';
          toggle.addEventListener('click', function () {
            var collapsed = list.getAttribute('data-collapsed') === 'true';
            list.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
            toggle.textContent = collapsed ? '收起' : '展开全部 ' + groups.length + ' 个版本';
          });
          panel.appendChild(toggle);
        }
      }
    }

    host.appendChild(panel);
  }

  function makePrimaryButton(title, href, subtitle, target) {
    var a = document.createElement('a');
    a.className = 'btn-primary';
    a.href = href;
    if (target) {
      a.target = target;
      a.rel = 'noopener';
    }
    var box = document.createElement('span');
    var strong = document.createElement('strong');
    strong.textContent = title;
    box.appendChild(strong);
    if (subtitle) {
      var small = document.createElement('small');
      small.textContent = subtitle;
      box.appendChild(small);
    }
    a.appendChild(box);
    var arrow = document.createElement('span');
    arrow.textContent = '↓';
    a.appendChild(arrow);
    return a;
  }

  function makeQuietButton(title, href, subtitle) {
    var a = document.createElement('a');
    a.className = 'btn-quiet';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    var box = document.createElement('span');
    var strong = document.createElement('strong');
    strong.textContent = title;
    box.appendChild(strong);
    if (subtitle) {
      var small = document.createElement('small');
      small.textContent = subtitle;
      box.appendChild(small);
    }
    a.appendChild(box);
    var arrow = document.createElement('span');
    arrow.textContent = '↗';
    a.appendChild(arrow);
    return a;
  }

  function renderIntro(project) {
    var host = document.querySelector('[data-intro]');
    if (!host) return;
    host.innerHTML = '';

    var description = project.description;
    var paragraphs = Array.isArray(description) ? description : (description ? [description] : []);

    if (paragraphs.length) {
      var section = document.createElement('div');
      var label = document.createElement('div');
      label.className = 'panel-label';
      label.textContent = '关于这个项目';
      section.appendChild(label);
      paragraphs.forEach(function (text) {
        var p = document.createElement('p');
        p.textContent = text;
        section.appendChild(p);
      });
      host.appendChild(section);
    }

    if (Array.isArray(project.stack) && project.stack.length) {
      var stackBox = document.createElement('div');
      stackBox.style.marginTop = '18px';
      var stackLabel = document.createElement('div');
      stackLabel.className = 'panel-label';
      stackLabel.textContent = '技术栈';
      stackBox.appendChild(stackLabel);
      var row = document.createElement('div');
      row.className = 'tag-row';
      project.stack.forEach(function (name) {
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = name;
        row.appendChild(tag);
      });
      stackBox.appendChild(row);
      host.appendChild(stackBox);
    }

    var links = [];
    links.push({ text: 'Releases 页', href: releasesPageUrl(project) });
    if (project.liveUrl) links.push({ text: '在线体验', href: project.liveUrl });

    if (links.length) {
      var linkBox = document.createElement('div');
      linkBox.style.marginTop = '18px';
      var linkLabel = document.createElement('div');
      linkLabel.className = 'panel-label';
      linkLabel.textContent = '相关链接';
      linkBox.appendChild(linkLabel);
      var ul = document.createElement('ul');
      ul.className = 'link-list';
      links.forEach(function (item) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = item.href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = item.text + ' ↗';
        li.appendChild(a);
        ul.appendChild(li);
      });
      linkBox.appendChild(ul);
      host.appendChild(linkBox);
    }
  }

  function renderDetail() {
    var container = document.querySelector('[data-project]');
    if (!container) return;

    var id = new URLSearchParams(window.location.search).get('p') || '';
    var project = L.findProject(projects(), id);

    if (!project) {
      container.hidden = true;
      var notFound = document.querySelector('[data-notfound]');
      if (notFound) notFound.hidden = false;
      document.title = '找不到这个项目 — AppGallery';
      return;
    }

    document.title = (project.name || project.id) + ' — AppGallery';
    renderDetailHeader(project);

    loadVersions().then(function (state) {
      renderNotice(state);
      renderDownload(project, state);
    });

    // 版本区先渲染加载态，避免加载期间布局跳动
    renderDownload(project, { status: 'loading', byProject: {} });
    renderIntro(project);
  }
```

同时把 `boot()` 里的 `// renderDetail();` 改成 `renderDetail();`。

- [ ] **Step 2: 手工验证**

确保本地服务仍在跑（`python3 -m http.server 8080`），浏览器改为 Chrome。

1. 打开 `http://localhost:8080/project.html?p=tide-focus`
   Expected（macOS 上的 Chrome，UA 含 `Macintosh`，`detectVisitorOS` 返回 `macos`；而 `tide-focus` 唯一那条文件是系统 token `android`，对不上，所以兜底到第一个可下载项）:
   - 标题为「潮汐番茄钟」，图标是占位方块（示例数据没配 `icon`）
   - 下载区主按钮文案「下载 Android 版」，副标题含 `v2.1.0 · 8.4 MB · 2026-09-28`
   - 历史版本区列出 `v2.1.0` 和 `v2.0.3`，两行
   - 相关链接两条：Releases 页、在线体验（`tide-focus` 配了 `liveUrl`）
2. 打开 `?p=ledger`，Expected: 主按钮「下载 桌面端 版」，历史版本区**不出现**（只有一个版本）
3. 打开 `?p=skycast`，Expected: 下载区是一个「在线体验」按钮，指向 `https://sky.example.com`，没有历史版本区
4. 打开 `?p=sticky-notes`，Expected: 显示「还没有可下载的版本。」+ 一个「去 GitHub Releases 看看」按钮
5. 打开 `?p=nope`、`?p=`、`?p=TIDE-FOCUS`、`?p=<script>alert(1)</script>`
   Expected: 四种情况都显示「找不到这个项目」，**都没有弹窗，页面标题正常**（Review Focus 2）

- [ ] **Step 3: 验证平台兜底**

`ledger` 在测试数据里只有一条 `platform: "windows"` 的条目。用 Chrome DevTools 的设备模拟切到 Pixel 5（UA 含 Android）后刷新 `?p=ledger`。

Expected: 主按钮仍然出现，文案是「下载 桌面端 版」—— 因为 `pickPrimaryFile` 在没有匹配平台时兜底到第一个可下载项，而不是返回空白或「这个版本没有可下载的文件」（Review Focus 4）。

- [ ] **Step 4: 提交**

```bash
git add assets/app.js
git commit -m "feat: 详情页下载区、历史版本与介绍区"
```

---

### Task 8: 真实项目数据、图标与全站走查

**Files:**
- Modify: `projects.js`（替换为真实项目）
- Modify: `index.html`、`project.html`、`404.html`（把顶栏与页脚里 `https://github.com/` 这个占位换成你的 GitHub 主页地址）
- Create: `icons/*.png`（用户提供的图标）

**Interfaces:**
- Consumes: 全部既有实现
- Produces: 可直接上线的站点

- [ ] **Step 1: 收集真实信息**

向用户索取：**你的 GitHub 主页地址**，以及每个项目的显示名、一句话简介、详情页段落、图标文件、主题色两个值、支持的平台、GitHub 成品仓库 `owner/repo`、在线体验地址（若有）。

- [ ] **Step 2: 替换 projects.js 与导航链接**

按规格 4.1 的字段写真实数据，数组顺序即首页顺序。

再把 GitHub 占位链接换成你的主页地址。它们都带 `data-github-link` 标记，共**五处**：`index.html` 的顶栏和页脚各一处，`project.html` 的顶栏和页脚各一处，`404.html` 的顶栏一处。

```bash
grep -rn 'data-github-link' index.html project.html 404.html
```

逐处替换 `href="https://github.com/"`。注意**不要**动详情页里由 `releasesRepo` 生成的 `Releases 页` 链接 —— 那个指向成品仓库，不是你的主页。

- [ ] **Step 3: 放图标并跑校验**

把图标文件放进 `icons/`，然后：

Run: `npm run validate`
Expected: `projects.js 校验通过（N 个项目）`

如果有报错，逐条修到通过为止 —— 这正是这个脚本存在的意义。

- [ ] **Step 4: 跑单元测试**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 5: 走一遍规格 9.3 的完整验收清单**

```
- [ ] 首页正常加载，卡片按配置顺序排列
- [ ] 筛选条工作，点击不刷新页面
- [ ] 点卡片进入对应详情页
- [ ] 详情页主按钮指向正确文件，版本号/大小/日期与 GitHub 一致
- [ ] 手机宽度下布局正确（单列、筛选条可滑）
- [ ] 断开网络后刷新，页面显示降级状态而非白屏
- [ ] 键盘 Tab 能走完所有可交互元素，焦点可见
- [ ] 三态切换在三个页面都生效，刷新后保持
- [ ] "跟随系统"状态下，切换系统深浅色时页面实时跟随
- [ ] 首屏无白闪：深色系统下选择浅色、浅色系统下选择深色，刷新均不闪
```

- [ ] **Step 6: 提交**

```bash
git add projects.js icons/ index.html project.html 404.html
git commit -m "feat: 填入真实项目数据、图标与 GitHub 主页链接"
```

---

### Task 9: 部署到 OSS

**Files:**
- Create: `docs/deploy.md`

**Interfaces:**
- Consumes: 全部既有实现
- Produces: 一份可照着做的部署手册

> 这一步大量操作在阿里云控制台网页上完成，无法在仓库里自动化。任务产出是一份**逐步可照做**的文档，外加一次真实的部署验证。

- [ ] **Step 1: 写部署文档**

Create `docs/deploy.md`，内容至少覆盖：

1. **建 Bucket** —— 名称、地域（选离访客近的）、存储类型标准
2. **开静态网站托管** —— 默认首页 `index.html`，默认 404 页 `404.html`
3. **关掉「阻止公共访问」** —— 并说明为什么必须关
4. **绑自定义域名** —— 强调必须用**已备案**的域名，并说明 OSS 默认域名访问 HTML 会被强制下载
5. **配 HTTPS 证书** —— 在阿里云申请免费证书并绑定
6. **建 RAM 子账号** —— 只授予该 Bucket 的读写权限，生成 AccessKey，**不入库**
7. **配云效流水线** —— 拉 Codeup 仓库 → `node scripts/validate-projects.mjs` → `node scripts/fetch-releases.mjs`（环境变量 `GITHUB_TOKEN` 走流水线的密钥管理）→ `ossutil cp` 上传这几个路径：

```
ossutil cp index.html oss://<bucket>/
ossutil cp project.html oss://<bucket>/
ossutil cp 404.html oss://<bucket>/
ossutil cp projects.js oss://<bucket>/
ossutil cp versions.json oss://<bucket>/
ossutil cp -r assets/ oss://<bucket>/assets/
ossutil cp -r icons/ oss://<bucket>/icons/
```

强调**不要**上传 `scripts/` 和 `docs/`。

8. **触发方式** —— 至少支持手动触发；可选加 GitHub release webhook 实现全自动
9. **回滚** —— 出问题时改回上一个提交重新部署

- [ ] **Step 2: 实机部署并验证**

按文档走一遍，然后用手机流量（不用公司内网）打开自定义域名，验证：

- [ ] 首页在浅色/深色下都正常
- [ ] 卡片上的版本号来自真实 GitHub Releases，与仓库里的一致
- [ ] 点下载能真的下到安装包
- [ ] 随便输一个不存在的路径，出现的是自己的 404 页，不是 OSS 的默认报错页
- [ ] 在浏览器里直接访问 `https://<你的域名>/index.html`，页面**正常渲染**而不是提示下载（这一步专门验证自定义域名生效）

- [ ] **Step 3: 提交**

```bash
git add docs/deploy.md
git commit -m "docs: 新增 OSS 部署与云效流水线配置手册"
```

---

## 完成标准

九项全部打勾即完工：

- [ ] `npm test` 全绿
- [ ] `npm run validate` 通过
- [ ] `npm run versions` 能生成真实的 `versions.json`
- [ ] 规格 9.3 的十条验收清单全部通过
- [ ] 三个页面在浅色与深色下都正确
- [ ] 站点已在自定义域名上跑起来，下载链路真实可用
