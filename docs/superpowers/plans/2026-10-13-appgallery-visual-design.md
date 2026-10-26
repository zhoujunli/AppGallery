# AppGallery 视觉深化（第一步）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页的观感做到 `example1.html` / `example2.html` 的水准 —— 抽出两边共用的设计系统 `assets/theme.css`，卡片里换成用 HTML/CSS 画出来的界面预览，辉光从 hero 内的局部灯换成全屏环境光。

**Architecture:** 色值全部收进新的 `assets/theme.css`（深/浅两套令牌 + 四个从 `style.css` 搬来的组件），`assets/style.css` 瘦成纯版式且不再出现任何字面色值。卡片预览分三层：数据形状由 `projects.js` 的 `preview` 字段声明，合法性由 `logic.js` 的纯函数 `normalizePreview` 在运行时兜底、由 `scripts/validate-projects.mjs` 在构建期报错，DOM 由新的 `assets/preview.js` 用 `createElement` 搭。**没有构建步骤，没有新依赖。**

**Tech Stack:** 原生 HTML/CSS/ES5 风格的 JS（`file://` 双击可用），Node 内置 `node --test`，无头 Chrome 做渲染验证。

**Spec:** [`docs/superpowers/specs/2026-10-13-appgallery-visual-design.md`](../specs/2026-10-13-appgallery-visual-design.md)

## Global Constraints

- **不提交。** 用户明确要求「先别提交」。**每个任务末尾没有 commit 步骤**，这是有意为之，不要补上。任务的「完成」以验证步骤通过为准。
- **全部中文** —— 注释、文档、标识符以外的文案一律中文。
- **数据值绝不进 `innerHTML`。** 一切文本用 `createElement` + `textContent`（旧规格 Review Focus 2）。`innerHTML` 只允许用于不含数据的固定骨架。
- **`file://` 双击必须能用。** 不许用 ES modules、不许 `fetch` 本地文件、不许构建步骤。`projects.js` 保持浏览器全局（挂 `window.PROJECTS`）。
- **`package.json` 不加 `"type": "module"`。** `assets/*.js` 是 IIFE + 全局，`scripts/*.mjs` 才是 ESM。
- **色值只在 `assets/theme.css` 里出现。** `assets/style.css` 里不得有任何 `#rgb` / `rgba()` / `hsl()` 字面量。自检命令：
  ```bash
  grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' assets/style.css
  ```
  必须无输出（这条是硬约束，Task 1 和 Task 3 都要跑）。
- **不改首页结构。** `index.html` 的骨架（nav → hero（badge/h1/lead）→ 筛选条 → 三列网格 → 页脚）保持原样，只加一个 `<div class="bg-glow">` 和一个 `<link>`、一个 `<script>`。
- **不加依赖、不加构建。** `npm test` = `node --test`，`npm run validate` = `node scripts/validate-projects.mjs`，两者全绿是每个任务的收尾要求。
- **部署不用改。** `docs/deploy.md` 第 7 阶段是 `ossutil cp -r assets/ oss://<bucket>/assets/` —— 整目录上传，`theme.css` 和 `preview.js` 自动带上。`scripts/`、`docs/`、`tests/` 本来就不上传，新增的验证脚本天然不会上线。

## Review Focus

Spec 是愿景文档，没说到的输入不等于允许出错。以下五类最可能咬到真实使用者，每一条都在后面对应任务的测试里钉住：

1. **`preview` 写错或只写了一半** —— 改了 `projects.js` 但忘了跑 `npm run validate`。页面必须回退成纯色条，**不白屏、不抛错、不出现半个窗口**。→ Task 4（`normalizePreview` 非法输入用例）、Task 7（无 preview 的 fixture 渲染）。
2. **只有一部分项目有 `preview`** —— 网格里有的卡片带窗口、有的只有渐变条，**卡片高度必须一致**（色条恒 140px），不能一格高一格低。→ Task 7 的高度相等断言。
3. **版本信息取不到**（两个 releases 仓库还没建，这是当前的真实状态）—— 卡片版本槽显示「版本信息暂不可用」，**卡片高度不受影响**。→ Task 7 在 `versions.json` 不存在的状态下渲染并断言等高。
4. **系统开了「减少动态效果」** —— 卡片必须立刻可见，**不能停在 `opacity: 0`**。→ Task 8 用 `--force-prefers-reduced-motion` 渲染，断言 `.reveal` 根本没被挂上。
5. **去掉 JS** —— 整页必须照常可读（渐变条 + 图标 + 文字），只是没有预览窗口。绝不学 `example1.html` 把 `opacity: 0` 写在 CSS 里。→ Task 7 用 `--disable-javascript` 渲染。

---

## 与 spec 的偏差（先说清楚）

写计划时对着真实文件核了一遍，有五处 spec 的说法需要修正、补齐，或者照做会出 bug。**这五处都已反映在下面的任务里**，评审时请一并确认：

1. **`theme.css` 到底装哪些组件。** Spec §4 的 `theme.css` 那一行列了 `.panel .panel-head .panel-body .kicker .btn .btn-primary .btn-quiet .reveal .chip .tag`，但同一节 `style.css` 那一行只说「带色值的**四个**组件移去 `theme.css`」，两处对不上。**取后者**：只搬 `.panel` `.chip` `.tag` `.panel-label`，再加上确实要用的 `.reveal`。`.panel-head` / `.panel-body` / `.btn` / `.kicker` 目前没有任何标记用它，**不造**（YAGNI）—— 第二步真需要时再加。`.btn-primary` / `.btn-quiet` 留在 `style.css`。

2. **`style.css` 里还有 4 处字面色值 spec 没算到。** Spec §5.1 的令牌表覆盖不到它们，但 §4 要求 `style.css` 零字面色值，二者不能同时成立。补 4 个令牌：`--on-accent`（压在两停渐变上的文字）、`--notice-bg` / `--notice-border` / `--notice-fg`（详情页那条琥珀色提示条，它自带一套配色，不跟 `--amber` 走）。这是**新增**，Spec §5.1 的表需要相应扩充。

3. **改名面比 spec 说的多 3 处。** Spec §5.4 只统计了 `style.css` 里的 53 处。实际上 `project.html:56` 和 `404.html:55` 各有一处内联 `style="color:var(--badge-text)"`，`assets/app.js:176` 有一处 `'var(--dim)'`。一共 **56 处**，Task 1 会一起改掉。

4. **入场动效用 `@keyframes`，不用 spec §8 写的 `transition`。** 照 §8 写动效**根本不会发生**：`.reveal` 在 `theme.css`、`.card` 在 `style.css`，两者都是单类选择器（优先级 0-1-0）且都写 `transition` 这个简写属性，`style.css` 源码序在后，`.card { transition: transform .15s ease, border-color .15s ease }` 会把 `.reveal` 的 `transition` 整个覆盖掉。改用 `animation` 就不碰这个属性，顺带也不会拖慢 `.card:hover` 的 `transform` 过渡。**同一个陷阱还有一处**：spec §8 说把站点已有的 `prefers-reduced-motion` 块「照同一个口径」—— 但那条块里管的是 `.version-loading` 和 `.card`，它们的规则在 `style.css`，覆盖也必须在 `style.css` 里（放 `theme.css` 会被源码序更后的 `style.css` 盖掉，等于没写）。所以 Task 8 **只把 `.reveal` 那一条放进 `theme.css`**（它覆盖的是同文件里的规则，安全），`style.css` 原有那条一个字不动。

5. **`--icon-bg` 跟着 `--bg` 走。** 原值是 `--icon-bg: var(--bg)`（不是硬编码），所以 spec §5.3 的差异表里没有它 —— 但它实际会跟着那处 `#0b0d12 → #0b0d10` 一起挪 2 个色阶。同样不可辨，只是列出来免得对比截图时误判。`theme.css` 里保留 `var(--bg)` 这个引用关系，不要图省事写成字面量。

另外两处**方法**上的调整（目标不变，手段更省）：

- Spec §11 第 5 条说「用像素采样脚本确认辉光没有色彩跳变」。改成**截图 + 直接看图**，外加一条 DOM probe 断言 `.bg-glow` 的 `position: fixed` 且尺寸等于视口。同样的目的，不用手写 PNG 解码器。
- Spec §11 第 6 条说截图逐张对比。任务里给出确切的 Chrome 命令，产出放进 `.superpowers/shots/before` 和 `.superpowers/shots/after`，**对比时用 Read 工具直接看图**。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `assets/theme.css` | **新建** | 唯一的色值来源。深浅两套令牌 + `.panel` `.chip` `.tag` `.panel-label` `.reveal` `.bg-glow` |
| `assets/preview.js` | **新建** | 卡片预览窗口的构造器。按 `kind` 分发到 terminal / admin 模板，`createElement` 搭 DOM |
| `assets/style.css` | 大改 | 瘦成纯版式：nav / hero / 筛选 / 网格 / 卡片 / 详情页 / 页脚。零字面色值 |
| `assets/logic.js` | 改 | 加 `normalizePreview` 与 `previewStatusTone` 两个纯函数 |
| `assets/app.js` | 改 | `cardNode` 里挂预览窗口；`renderHome` 挂入场动效；`var(--dim)` → `var(--fg-faint)` |
| `projects.js` | 改 | 两个项目各加一个 `preview` 字段 |
| `index.html` | 改 | `<link theme.css>`、`<div class="bg-glow">`、`<script preview.js>` |
| `project.html` `404.html` | 改 | `<link theme.css>`、`<div class="bg-glow">`、内联色值改名 |
| `scripts/validate-projects.mjs` | 改 | 校验 `preview` 的形状 |
| `tests/logic.test.mjs` | 改 | `normalizePreview` / `previewStatusTone` 的单测 |
| `tests/validate-projects.test.mjs` | 改 | `preview` 校验用例 |
| `.gitignore` | 改 | 加 `_*.html`（临时验证页） |
| `docs/deploy.md` | **不改** | `ossutil cp -r assets/` 已覆盖新文件 |

**加载顺序（三个页面一致）：** `theme.css` → `style.css`；脚本 `projects.js` → `logic.js` → `preview.js`（仅 index）→ `app.js`。`preview.js` 必须在 `app.js` 之前，因为 `cardNode` 会在同一个 tick 里读 `window.AppGalleryPreview`。

---

## 通用工具（多个任务会用到，先在这里定义一次）

### 截图

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="file:///Users/xj/code/AppGallery"

shot() {  # shot <输出目录> <页面> <dark|light> [宽] [高]
  local out="$1" page="$2" mode="$3" w="${4:-1120}" h="${5:-1500}"
  local scheme=1        # 1=light 2=dark
  [ "$mode" = dark ] && scheme=2
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size="$w,$h" \
    --blink-settings=preferredColorScheme=$scheme \
    --virtual-time-budget=3000 \
    --screenshot="$out/$(echo "$page" | tr '/?=.' '----').$mode.png" \
    "$ROOT/$page"
}
```

调用示例（`mkdir -p .superpowers/shots/after` 之后）：

```bash
shot .superpowers/shots/after index.html dark
shot .superpowers/shots/after index.html light
shot .superpowers/shots/after "project.html?p=claudepocket" dark
```

`--blink-settings=preferredColorScheme` 驱动 `prefers-color-scheme`，而三个页面的内联脚本在无 localStorage 时正是按它解析主题的（无头 profile 每次都是干净的），所以这能稳定切深浅两套。

### DOM probe（量几何，比数像素省事）

把待测页面复制一份、注入一段脚本、跑 `--dump-dom`、grep 出结果。`_probe.html` 用完即删。

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

probe() {  # probe <页面> <宽> <注入的 JS 片段：往 out 里塞字段>
  local page="$1" w="$2" body="$3"
  python3 - "$page" "$body" <<'PY'
import sys
page, body = sys.argv[1], sys.argv[2]
src = open(page, encoding='utf-8').read()
inject = """<script>
window.addEventListener('load', function () {
  setTimeout(function () {
    try {
      var out = {};
      %s
      document.title = 'PROBE ' + JSON.stringify(out).replace(/"/g, "'");
    } catch (e) {
      document.title = 'PROBEERR ' + e.message;
    }
  }, 900);
});
</script>""" % body
open('_probe.html', 'w', encoding='utf-8').write(src.replace('</body>', inject + '</body>'))
PY
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size="$w,1500" --virtual-time-budget=4000 \
    --dump-dom "$ROOT/_probe.html" 2>/dev/null \
    | grep -o "PROBE[A-Z]* {[^<]*}" | head -1
  rm -f "$ROOT/_probe.html"
}
```

调用示例（量卡片和窗口的高度）：

```bash
probe index.html 1120 '
var stage = document.querySelector(".card-stage");
var card = document.querySelector(".card");
out.stageH = stage ? stage.getBoundingClientRect().height : -1;
out.cardH = card ? Math.round(card.getBoundingClientRect().height) : -1;
out.overflow = stage ? (stage.scrollHeight > stage.clientHeight) : null;
out.cards = document.querySelectorAll(".card").length;
'
```

`--dump-dom` 会把 `document.title` 里的 `"` 转义成 `&quot;`，所以上面统一把 `"` 换成 `'` 再输出，grep 才不会被打断。

那 900ms 是给入场动效留的：卡片动画本身 500ms，第二张还要加 40ms 的错峰延迟，一共 540ms。测量的时刻必须晚于它，否则「类摘干净了没有」会测到一半的状态（Task 8 用得上）。

### 把上面两个函数装进当前 shell

每开一个新 shell 都先跑一遍（两个函数不在 shell 之间保留）：

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="file:///Users/xj/code/AppGallery"
# …然后把 shot 和 probe 两个函数体粘进来…
```

---

## Task 1: 建 `assets/theme.css`，令牌改名，色值归一

最基础也最容易出错的一步。**完成时整站应当只差 spec §5.3 那张表里列出的差异，其余像素级一致** —— 所以先存基线。

**Files:**
- Create: `assets/theme.css`
- Modify: `assets/style.css`（令牌块删除、全部引用改名、4 处字面色值换令牌、删 `[data-theme="light"] .notice`）
- Modify: `index.html:34`、`project.html:34,56`、`404.html:34,55`
- Modify: `assets/app.js:176`
- Modify: `.gitignore`

**Interfaces:**
- Produces: 全部令牌名，下游任务按 §5.1 的名字引用 —— `--bg` `--bg-soft` `--bg-card` `--line` `--line-soft` `--fg` `--fg-dim` `--fg-faint` `--accent` `--accent-dim` `--accent-bg` `--blue` `--amber` `--purple` `--red` `--ok` `--brand-a` `--brand-b` `--glow-1` `--glow-2` `--icon-bg` `--shadow` `--on-accent` `--notice-bg` `--notice-border` `--notice-fg` `--mono` `--radius` `--maxw`
- Produces: `.panel` `.chip` `.tag` `.panel-label` 四个类改由 `theme.css` 定义（`style.css` 里删掉同名规则）
- 不产生：任何 JS 接口

- [ ] **Step 1: 存改名前的基线截图**

```bash
mkdir -p .superpowers/shots/before .superpowers/shots/after
# 先粘好上面的 shot 函数，然后：
for m in dark light; do
  shot .superpowers/shots/before index.html $m
  shot .superpowers/shots/before "project.html?p=claudepocket" $m
  shot .superpowers/shots/before "project.html?p=chamberconnect" $m
  shot .superpowers/shots/before 404.html $m
done
ls -la .superpowers/shots/before
```

Expected: 8 个 PNG。**改名完成后这 8 张是唯一的对照物**，别丢。

- [ ] **Step 2: 写 `assets/theme.css`**

完整内容：

```css
/* ===== AppGallery 设计系统 =====
   这是唯一放色值的地方。assets/style.css 里不得出现任何字面色值，
   自检：grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' assets/style.css  应当无输出。

   第二步（把 example1/example2 接成项目详情页）会共用这个文件。落地页各自
   覆盖 --accent / --accent-dim / --accent-bg 三个为自己的品牌色，其余直接继承 ——
   所以这三个是「可覆盖」的，别把它们和内页专用的令牌混在一起用。 */

:root {
  --bg: #0b0d10;
  --bg-soft: #111419;
  --bg-card: #14181e;
  --line: #232a33;
  --line-soft: #1b2128;

  --fg: #e6edf3;
  --fg-dim: #9aa7b4;
  --fg-faint: #66727e;

  --accent: #a5b4fc;
  --accent-dim: #2c3350;
  --accent-bg: transparent;

  --blue: #7cc4ff;
  --amber: #f0b46a;
  --purple: #b39dff;
  --red: #ff7b72;
  --ok: #6ee7b7;

  --brand-a: #6366f1;
  --brand-b: #d946ef;
  --glow-1: rgba(99, 102, 241, .30);
  --glow-2: rgba(217, 70, 239, .18);

  --icon-bg: var(--bg);
  --shadow: none;

  /* 压在两停渐变上的文字。渐变不随主题变，所以它也没有浅色版本 */
  --on-accent: #ffffff;

  /* 详情页那条「版本信息取不到」的提示。它自带一套琥珀色，不跟 --amber 走：
     底色和描边要的是带透明度的琥珀，文字要的是压得住那个底色的深琥珀。 */
  --notice-bg: rgba(245, 158, 11, .10);
  --notice-border: rgba(245, 158, 11, .22);
  --notice-fg: #d6bc8a;

  --mono: "SF Mono", Menlo, Consolas, monospace;
  --sans: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  --radius: 14px;
  --maxw: 1120px;
}

[data-theme="light"] {
  --bg: #ffffff;
  --bg-soft: #f7f8fa;
  --bg-card: #ffffff;
  --line: #e8eaef;
  --line-soft: #f0f2f5;

  --fg: #0f1115;
  --fg-dim: #5b6274;
  --fg-faint: #9aa1b2;

  --accent: #4f46e5;
  --accent-dim: #ddd6fe;
  --accent-bg: #f5f3ff;

  /* 深色那组语义色是「在暗底上发光」的高明度色，直接搬到白底上会看不清，
     所以浅色另取一档更深的值 */
  --blue: #2563eb;
  --amber: #b45309;
  --purple: #7c3aed;
  --red: #dc2626;
  --ok: #047857;

  --glow-1: rgba(99, 102, 241, .10);
  --glow-2: rgba(217, 70, 239, .08);

  --icon-bg: #ffffff;
  --shadow: 0 1px 3px rgba(16, 24, 40, .05);

  --notice-bg: #fffbeb;
  --notice-border: #fde68a;
  --notice-fg: #92670f;
}

/* ===== 基础件 =====
   这四个是从 style.css 搬过来的（它们只是带着色值而已）。 */

.panel {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 18px;
  box-shadow: var(--shadow);
}

.panel-label {
  font-size: 12px;
  letter-spacing: .08em;
  color: var(--fg-dim);
  margin-bottom: 14px;
}

.chip {
  font-family: var(--mono);
  font-size: 11px;
  border-radius: 999px;
  padding: 2px 9px;
  border: 1px solid var(--line);
  color: var(--fg-dim);
}

.tag {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--fg-dim);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 2px 8px;
}
```

- [ ] **Step 3: 从 `assets/style.css` 删掉令牌块和浅色提示条覆写**

删掉 `style.css` 第 1–39 行的两个块（`:root { … }` 和 `[data-theme="light"] { … }`），连同第 1 行的 `/* ===== 主题令牌 ===== */` 注释。

再删掉第 412 行这一条（它已经搬进 `theme.css` 的 `[data-theme="light"]`）：

```css
[data-theme="light"] .notice { color: #92670f; background: #fffbeb; border-color: #fde68a; }
```

在文件最顶上补一行说明：

```css
/* 色值全在 assets/theme.css 里。本文件只排版式，不得出现字面色值。 */
```

- [ ] **Step 4: 批量改名**

```bash
sed -i '' \
  -e 's/var(--badge-text)/var(--accent)/g' \
  -e 's/var(--badge-bg)/var(--accent-bg)/g' \
  -e 's/var(--badge-border)/var(--accent-dim)/g' \
  -e 's/var(--btn-quiet-bg)/var(--bg-soft)/g' \
  -e 's/var(--btn-quiet-border)/var(--line)/g' \
  -e 's/var(--hero-1)/var(--glow-1)/g' \
  -e 's/var(--hero-2)/var(--glow-2)/g' \
  -e 's/var(--muted)/var(--fg-dim)/g' \
  -e 's/var(--border)/var(--line)/g' \
  -e 's/var(--text)/var(--fg)/g' \
  -e 's/var(--panel)/var(--bg-card)/g' \
  -e 's/var(--dim)/var(--fg-faint)/g' \
  assets/style.css
```

**顺序不能乱**：`var(--badge-text)` 必须在 `var(--text)` 之前替换，否则 `var(--badge-text)` 会先被切成 `var(--badge-fg)`。上面这个顺序是对的。

`var(--bg)` 名字不变，不动。`var(--brand-a)` `var(--brand-b)` `var(--icon-bg)` `var(--shadow)` `var(--mono)` 都不变。

- [ ] **Step 5: 改掉改名后残留的 4 处字面色值**

`style.css` 里这几条 sed 碰不到，手工改。

`.btn-primary`：`color: #fff;` → `color: var(--on-accent);`

`.btn-primary small`：`color: rgba(255, 255, 255, .78);` → 两行

```css
  color: var(--on-accent);
  opacity: .78;
```

`.card-icon-fallback` 和 `.detail-icon-fallback` 各一个 `color: #fff;` → `color: var(--on-accent);`

`.notice` 的三行：

```css
  background: var(--notice-bg);
  border: 1px solid var(--notice-border);
  color: var(--notice-fg);
```

- [ ] **Step 6: 把 `.panel` `.chip` `.tag` `.panel-label` 从 `style.css` 删掉**

这四条规则现在在 `theme.css` 里了。删掉 `style.css` 里同名的四条。**按选择器找，不要按行号** —— Step 3 删掉 39 行之后行号全变了：

```bash
grep -nE '^\.(panel|chip|tag|panel-label) \{' assets/style.css
```

Expected: 四条，每条都是独占一行的单类选择器（`* { box-sizing: border-box }` 那一段之后）。删掉这四条以及它们的规则体。

**别碰** `.tag-row`、`.chip-row`、`.detail-head`、`.panel > .panel-label` 这类别的选择器 —— 上面这个 `^\.(panel|chip|tag|panel-label) \{` 恰好只匹配那四条独占一行的，用别的写法（比如不带 `^` 和 ` \{`）会误伤。

删完再跑一次上面那条 grep，应当无输出。

- [ ] **Step 7: 三个 HTML 接上 `theme.css`**

`index.html` / `project.html` / `404.html` 各把

```html
<link rel="stylesheet" href="assets/style.css">
```

换成

```html
<link rel="stylesheet" href="assets/theme.css">
<link rel="stylesheet" href="assets/style.css">
```

- [ ] **Step 8: 改掉 HTML 和 JS 里剩下的 3 处旧令牌名**

`project.html:56` 和 `404.html:55`，把内联样式里的旧名换掉：

```html
<!-- 旧 -->
<a class="link-list" href="index.html" style="color:var(--badge-text)">← 回到全部项目</a>
<!-- 新 -->
<a class="link-list" href="index.html" style="color:var(--accent)">← 回到全部项目</a>
```

`assets/app.js:176`：

```js
        slot.style.color = 'var(--fg-faint)';
```

- [ ] **Step 9: `.gitignore` 加一行**

```
# 一次性验证页，不进仓库
_*.html
```

- [ ] **Step 10: 自检 —— 没有旧令牌名，没有字面色值**

```bash
echo "=== 旧令牌名（应为空）==="
grep -nE '\-\-(panel|border|text|muted|dim|hero-[12]|badge-bg|badge-border|badge-text|btn-quiet-bg|btn-quiet-border)\b' \
  assets/style.css assets/app.js index.html project.html 404.html
echo "=== style.css 里的字面色值（应为空）==="
grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' assets/style.css
echo "=== 检查完毕 ==="
```

Expected: 两个 grep 都没有输出。

`.tag` 和 `.panel` 等类名含 `panel`，上面的正则带了 `--` 前缀，不会误伤。

- [ ] **Step 11: 跑测试和校验**

```bash
npm test && npm run validate
```

Expected: 全绿。这一步不该有任何测试失败 —— 没动 JS 逻辑，只动了 `app.js` 里一个字符串。

- [ ] **Step 12: 截改名后的图，逐张对比**

```bash
for m in dark light; do
  shot .superpowers/shots/after index.html $m
  shot .superpowers/shots/after "project.html?p=claudepocket" $m
  shot .superpowers/shots/after "project.html?p=chamberconnect" $m
  shot .superpowers/shots/after 404.html $m
done
```

然后**用 Read 工具把 `.superpowers/shots/before` 和 `.superpowers/shots/after` 里的图两两打开对比**，重点看这四处（spec §5.3 列的已知差异，其余应当看不出区别）：

| 看哪里 | 期望 |
|---|---|
| 卡片版本号（`v…` 或「版本信息暂不可用」）、平台 chip 的文字 | 比之前亮一点（`--fg-faint` 从 `#4b5163` 升到 `#66727e`） |
| 详情页「去 GitHub Releases 看看」按钮的底色 | 深色下从比面板亮变成比面板暗 |
| 同一个按钮的描边 | 深色下紫色调消失；浅色下变淡 |
| 浅色下同一个按钮 | 现在有可见的边界了（之前白底白页面） |

完整清单见 spec §5.3（十条）。另外六条是「页面底色、卡片/面板面、主描边、主文字」各差 2 个色阶，以及 `--icon-bg` 跟着 `--bg` 一起挪（见本文开头偏差 5）—— **这些肉眼分不出来**，所以上面表里没列；但如果逐像素比出差异，它们应当在其中。

**发现表以外的差异就是改错了**，回去查 Step 4 的 sed 顺序和 Step 5 的四处。

---

## Task 2: 全屏辉光 `.bg-glow`

**Files:**
- Modify: `assets/theme.css`（追加 `.bg-glow`）
- Modify: `assets/style.css`（删 `.hero::before` + mask + `.hero{overflow:hidden}` + `.hero > *`，加堆叠层级）
- Modify: `index.html:37`、`project.html:37`、`404.html:37`

**Interfaces:**
- Consumes: Task 1 的 `--glow-1` `--glow-2`
- Produces: `.bg-glow`（三个页面的 `<body>` 第一个子元素）

- [ ] **Step 1: 在 `theme.css` 末尾追加 `.bg-glow`**

```css
/* ===== 全屏环境光 =====
   用 fixed 定位铺满视口，就没有「盒子边界」可切了。
   之前那版是 .hero::before 的局部光 —— 盒子边界正好横切过还没衰减完的渐变，
   左右各留一条竖直硬边，靠给左右各 12% 加 mask 才遮住。这层没有那个问题，
   代价是光从「hero 标题旁的一盏灯」变成「整页的环境光」，而且不随页面滚动。 */
.bg-glow {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(560px 380px at 8% 4%, var(--glow-1), transparent 70%),
    radial-gradient(680px 420px at 78% -8%, var(--glow-2), transparent 70%);
}
```

- [ ] **Step 2: 从 `style.css` 删掉旧的 hero 光晕**

删掉整条 `.hero::before { … }`（含那三行解释 mask 的中文注释）。

删掉 `.hero > * { position: relative; }`。

`.hero` 本身改成（去掉 `overflow: hidden` —— 它只是为那条 `::before` 存在的）：

```css
.hero {
  position: relative;
  padding: 40px 0 26px;
}
```

- [ ] **Step 3: 在 `style.css` 里把内容抬到辉光之上**

`.bg-glow` 的 `z-index: 0` 要有人压得住它。在 `.wrap` 那段后面加一条：

```css
/* 压在 .bg-glow（z-index: 0）之上 */
.nav, main, .footer { position: relative; z-index: 1; }
```

- [ ] **Step 4: 三个页面各加一个辉光层**

`index.html` / `project.html` / `404.html` 的 `<body>` 紧跟一个：

```html
<body>

<div class="bg-glow" aria-hidden="true"></div>

<header class="nav">
```

- [ ] **Step 5: 断言辉光的几何**

```bash
probe index.html 1120 '
var g = document.querySelector(".bg-glow");
if (!g) { out.missing = true; }
else {
  var cs = getComputedStyle(g);
  var r = g.getBoundingClientRect();
  out.position = cs.position;
  out.zIndex = cs.zIndex;
  out.w = Math.round(r.width);
  out.h = Math.round(r.height);
  out.firstChild = document.body.firstElementChild.className;
  out.heroBefore = getComputedStyle(document.querySelector(".hero"), "::before").content;
}
'
```

Expected:

```
PROBE {'position':'fixed','zIndex':'0','w':1120,'h':1500,'firstChild':'bg-glow','heroBefore':'none'}
```

`heroBefore` 是 `'none'` 就说明旧的 `::before` 真的删掉了（不是被覆盖）。

- [ ] **Step 6: 截图，确认没有竖直硬边**

```bash
shot .superpowers/shots/after index.html dark 1120 700
shot .superpowers/shots/after index.html light 1120 700
```

用 Read 打开这两张，**沿左侧和右侧边缘从上到下看** —— 不应该出现一条直的色彩突变。辉光在视口边缘被截断是对的（它本来就该溢出画面），中间不该有接缝。浅色下同样看一遍。

- [ ] **Step 7: 跑测试与校验**

```bash
npm test && npm run validate
```

- [ ] **Step 8: 换宽窗口再看一次**

```bash
shot .superpowers/shots/after index.html dark 1600 800
```

辉光是 `fixed` 铺满视口的，宽屏下光斑位置按百分比走，不该出现断层。看一眼。

---

## Task 3: 排版口径

**Files:**
- Modify: `assets/style.css`（`body`）
- Modify: `assets/theme.css`（`.panel-label`）

**Interfaces:**
- Consumes: Task 1 的 `--fg-faint` `--mono`
- Produces: 无新接口

**先说清楚这一步的实际效果**：站内几乎所有元素都写死了自己的字号（`.hero p` 14px、`.card-tagline` 13px、`.intro p` 14px、`.badge` 12px…），所以把 `body` 从 15px 提到 16px **主要影响的是没有显式定字号的元素和继承来的行高**，肉眼变化有限。真正的观感变化来自抗锯齿和 `.panel-label`。这是 spec §9 的原话，照做，但别指望它翻天覆地。

**spec §9 的「标题」那一行不用改 —— 它描述的现状已经成立。** 表里写「现在 `letter-spacing: -.025em`，改成保持，各级统一到 `-.02em` 起步」，实测只有两个 h1：`.hero h1` 是 `-.025em`（`style.css:161`）、`.detail-head h1` 是 `-.02em`（`style.css:344`），**已经各就各位**。站内没有 h2/h3，`.card-name` 按 §6.1 属于卡片正文、不在这一节的范围。所以这一步不写任何 `letter-spacing`，改用 Step 3 的一条命令把这个现状钉下来 —— 免得执行的人以为漏了、凭感觉加一条上去。

- [ ] **Step 1: 改 `body`**

```css
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.7;
  /* 与 example 一致。只是渲染更细，不改布局 */
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 2: 改 `.panel-label`**

`theme.css` 里的 `.panel-label` 改成：

```css
.panel-label {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .08em;
  color: var(--fg-faint);
  margin-bottom: 14px;
}
```

字距本来就是 `.08em`，不动。

- [ ] **Step 3: 自检 —— 字面色值仍是零，标题字距没被动过**

```bash
echo "=== style.css 里的字面色值（应为空）==="
grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' assets/style.css
echo "=== 标题字距（应当只有这两条，且值不变）==="
grep -n 'letter-spacing' assets/style.css
echo "=== 检查完毕 ==="
```

Expected:

- 第一个 grep 无输出
- 第二个 grep 只有两条：`.hero h1` 的 `-.025em` 和 `.detail-head h1` 的 `-.02em`，再加上 `.panel-label` 的 `.08em`（在 `theme.css` 里，不在这份文件）。**值一个字都不该变** —— 这一节不碰标题字距（见本节开头）。

若多出别的 `letter-spacing`，说明执行时凭感觉加了东西，回退掉。

- [ ] **Step 4: 截图看详情页和首页**

```bash
shot .superpowers/shots/after "project.html?p=chamberconnect" dark
shot .superpowers/shots/after index.html dark
```

用 Read 打开。看两处：「下载」「关于这个项目」「技术栈」这几个面板标签现在应当是等宽小字且比正文明显弱；正文行距比之前松一点。**布局不应出现任何位移或换行变化** —— 出现的行数变了就说明字号改动波及到了不该波及的元素，回去查是哪一条依赖了继承字号。

- [ ] **Step 5: 跑测试与校验**

```bash
npm test && npm run validate
```

---

## Task 4: `logic.js` 加 `normalizePreview` 和 `previewStatusTone`

纯函数，TDD，`node --test` 能直接覆盖。这是预览数据的**运行时兜底**：形状不对就返回 `null`，调用方回退成纯色条 —— 页面永远不会因为 `projects.js` 写错而白屏。

**Files:**
- Modify: `assets/logic.js`（`findProject` 之后加两个函数，`api` 对象里导出）
- Test: `tests/logic.test.mjs`（追加）

**Interfaces:**
- Produces:
  - `L.normalizePreview(project)` → `null` 或
    `{ kind: 'terminal', title: string, lines: string[] }` 或
    `{ kind: 'admin', title: string, nav: string[], active: number, columns: string[], rows: string[][] }`
  - `L.previewStatusTone(text)` → `'' | 'amber' | 'ok' | 'red'`
- Consumes: 无

- [ ] **Step 1: 写失败的测试**

追加到 `tests/logic.test.mjs` 末尾。

**这个文件不用 `import`** —— 它开头是：

```js
const require = createRequire(import.meta.url);
const L = require('../assets/logic.js');
```

因为 `assets/logic.js` 是 UMD-lite（`file://` 下当浏览器全局、Node 下走 `module.exports`），而 `package.json` 故意没有 `"type": "module"`。所以**所有调用都要带 `L.` 前缀**，不要改成命名导入 —— 那会绕过仓库现有的约定，也会让同一个模块出现两种加载方式。

```js
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
```

文件顶部的 `createRequire` 那三行不用改 —— `L` 后面自动就有两个新函数。

- [ ] **Step 2: 跑测试，确认失败**

```bash
node --test tests/logic.test.mjs 2>&1 | tail -20
```

Expected: 失败，报 `L.normalizePreview is not a function`（`L` 本身是有的，只是还没有这两个键）。

- [ ] **Step 3: 实现**

在 `assets/logic.js` 里、`findProject` 之后、`normalizeVersions` 之前插入：

```js
  // ---------- 卡片预览 ----------
  // 上界不是随手定的形状检查，而是版面预算：超过就装不进卡片里那个
  // 140px 高的窗口（见 spec §6.1/§6.2）。
  var PREVIEW_LIMITS = {
    terminalLines: [3, 4],   // [最少, 最多]
    nav: [2, 5],
    navActiveMax: 2,         // 窄屏侧栏只显示前 3 项，高亮项必须落在前 3 项之内
    columns: [2, 3],
    rows: [1, 3]
  };

  // 状态词 → 语气。整词匹配，认不出来就返回 ''（＝不着色），不猜。
  var STATUS_TONES = [
    ['amber', ['待审批', '草稿']],
    ['ok', ['已通过', '已发布', '启用']],
    ['red', ['已退回', '已驳回', '停用']]
  ];

  function previewStatusTone(text) {
    var s = typeof text === 'string' ? text.trim() : '';
    if (s === '') return '';
    for (var i = 0; i < STATUS_TONES.length; i++) {
      if (STATUS_TONES[i][1].indexOf(s) !== -1) return STATUS_TONES[i][0];
    }
    return '';
  }

  function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  /**
   * 一串非空字符串，长度必须在 [min, max] 之内；任何一项不合格就整串作废。
   * 返回新数组（副本），拿不到合格的就返回 null。
   */
  function cleanTextList(value, min, max) {
    if (!Array.isArray(value)) return null;
    var out = [];
    for (var i = 0; i < value.length; i++) {
      var s = cleanText(value[i]);
      if (s === '') return null;
      out.push(s);
    }
    if (out.length < min || out.length > max) return null;
    return out;
  }

  /**
   * 卡片预览是增强项：形状不对就返回 null，调用方回退成纯色渐变条。
   *
   * 这里刻意不抛错 —— projects.js 是手写的，改了数据忘了跑校验是常事，
   * 一个字段写错不该让整个首页白屏。报错是 scripts/validate-projects.mjs 的事，
   * 那个在构建期跑，写错会挡住部署。
   */
  function normalizePreview(project) {
    if (!project || typeof project !== 'object') return null;
    var pv = project.preview;
    if (!pv || typeof pv !== 'object' || Array.isArray(pv)) return null;

    var title = cleanText(pv.title);
    if (title === '') return null;

    if (pv.kind === 'terminal') {
      var lines = cleanTextList(pv.lines, PREVIEW_LIMITS.terminalLines[0], PREVIEW_LIMITS.terminalLines[1]);
      if (!lines) return null;
      return { kind: 'terminal', title: title, lines: lines };
    }

    if (pv.kind === 'admin') {
      var nav = cleanTextList(pv.nav, PREVIEW_LIMITS.nav[0], PREVIEW_LIMITS.nav[1]);
      if (!nav) return null;

      // 只认真正的整数：1.5 和 '1' 都不行
      if (typeof pv.active !== 'number' || !isFinite(pv.active) || Math.floor(pv.active) !== pv.active) return null;
      if (pv.active < 0 || pv.active > PREVIEW_LIMITS.navActiveMax) return null;

      var columns = cleanTextList(pv.columns, PREVIEW_LIMITS.columns[0], PREVIEW_LIMITS.columns[1]);
      if (!columns) return null;

      if (!Array.isArray(pv.rows)) return null;
      if (pv.rows.length < PREVIEW_LIMITS.rows[0] || pv.rows.length > PREVIEW_LIMITS.rows[1]) return null;

      var rows = [];
      for (var r = 0; r < pv.rows.length; r++) {
        // 每行格子数必须正好等于表头列数
        var row = cleanTextList(pv.rows[r], columns.length, columns.length);
        if (!row) return null;
        rows.push(row);
      }

      return {
        kind: 'admin', title: title, nav: nav,
        active: pv.active, columns: columns, rows: rows
      };
    }

    return null;
  }
```

在文件末尾的 `api` 对象里加两个名字：

```js
  var api = {
    extensionOf: extensionOf,
    platformForExtension: platformForExtension,
    projectPlatformsFor: projectPlatformsFor,
    detectVisitorOS: detectVisitorOS,
    compareVersionStrings: compareVersionStrings,
    groupByVersion: groupByVersion,
    pickPrimaryFile: pickPrimaryFile,
    findProject: findProject,
    normalizeVersions: normalizeVersions,
    normalizePreview: normalizePreview,
    previewStatusTone: previewStatusTone
  };
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
node --test tests/logic.test.mjs 2>&1 | tail -20
```

Expected: 全部通过，0 失败。

- [ ] **Step 5: 跑全量测试**

```bash
npm test
```

Expected: 全绿（含原有的三个测试文件）。

---

## Task 5: `validate-projects.mjs` 校验 `preview`

和 Task 4 同样的规则，但职责不同：`normalizePreview` 在运行时**兜底**，校验器在构建期**报错挡住部署**。两边的上下界必须一致，别让一个松一个紧。

**Files:**
- Modify: `scripts/validate-projects.mjs`（加 `validatePreview` / `checkList`，在 `validateProjects` 里调用）
- Test: `tests/validate-projects.test.mjs`（追加）

**Interfaces:**
- Consumes: 无（故意不 import `logic.js` —— 校验器要能在 `logic.js` 坏掉的时候照样报出问题）
- Produces: 无新接口，只多报错

- [ ] **Step 1: 写失败的测试**

追加到 `tests/validate-projects.test.mjs` 末尾：

```js
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
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
node --test tests/validate-projects.test.mjs 2>&1 | tail -20
```

Expected: 多个失败 —— 现在的校验器完全不管 `preview`，非法数据会静默通过。

- [ ] **Step 3: 实现**

在 `scripts/validate-projects.mjs` 里，`PLATFORMS` 那几行常量之后加：

```js
const PREVIEW_KINDS = ['terminal', 'admin'];

// 与 assets/logic.js 的 PREVIEW_LIMITS 必须一致。
// 那边是运行时兜底（返回 null），这边是构建期报错（挡住部署），
// 一个松一个紧就等于没有约束。
const PREVIEW_LIMITS = {
  terminalLines: [3, 4],
  nav: [2, 5],
  navActiveMax: 2,
  columns: [2, 3],
  rows: [1, 3]
};
```

在 `validateProjects` 函数之前加两个辅助函数：

```js
/**
 * 一串非空字符串，长度必须在 [min, max] 之内。
 * 报错信息带上字段名和实际长度，让人一眼知道改哪儿。
 */
function checkTextList(value, name, min, max, at, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${at}：${name} 必须是数组`);
    return;
  }
  if (value.length < min || value.length > max) {
    errors.push(`${at}：${name} 要有 ${min}–${max} 项，现在是 ${value.length} 项`);
    return;
  }
  if (value.some((v) => typeof v !== 'string' || !v.trim())) {
    errors.push(`${at}：${name} 每一项都必须是非空字符串`);
  }
}

function validatePreview(p, at, errors) {
  if (p.preview === undefined) return;   // 可选字段

  const pv = p.preview;
  if (!pv || typeof pv !== 'object' || Array.isArray(pv)) {
    errors.push(`${at}：preview 必须是一个对象`);
    return;
  }

  if (PREVIEW_KINDS.indexOf(pv.kind) === -1) {
    errors.push(
      `${at}：preview.kind 必须是 ${PREVIEW_KINDS.join(' / ')} 之一，现在是 ${JSON.stringify(pv.kind)}`
    );
    return;
  }

  if (typeof pv.title !== 'string' || !pv.title.trim()) {
    errors.push(`${at}：preview.title 必须是非空字符串`);
  }

  if (pv.kind === 'terminal') {
    checkTextList(pv.lines, 'preview.lines', PREVIEW_LIMITS.terminalLines[0], PREVIEW_LIMITS.terminalLines[1], at, errors);
    return;
  }

  // kind === 'admin'
  checkTextList(pv.nav, 'preview.nav', PREVIEW_LIMITS.nav[0], PREVIEW_LIMITS.nav[1], at, errors);

  if (
    typeof pv.active !== 'number' ||
    !Number.isInteger(pv.active) ||
    pv.active < 0 ||
    pv.active > PREVIEW_LIMITS.navActiveMax
  ) {
    errors.push(
      `${at}：preview.active 必须是 0–${PREVIEW_LIMITS.navActiveMax} 的整数 —— ` +
      `窄屏侧栏只显示前 ${PREVIEW_LIMITS.navActiveMax + 1} 项，指到更靠后的项高亮会被隐藏`
    );
  }

  checkTextList(pv.columns, 'preview.columns', PREVIEW_LIMITS.columns[0], PREVIEW_LIMITS.columns[1], at, errors);

  if (!Array.isArray(pv.rows) || pv.rows.length < PREVIEW_LIMITS.rows[0] || pv.rows.length > PREVIEW_LIMITS.rows[1]) {
    errors.push(
      `${at}：preview.rows 必须是 ${PREVIEW_LIMITS.rows[0]}–${PREVIEW_LIMITS.rows[1]} 行的数组`
    );
    return;
  }

  pv.rows.forEach((row, i) => {
    if (!Array.isArray(row) || row.some((c) => typeof c !== 'string' || !c.trim())) {
      errors.push(`${at}：preview.rows 第 ${i + 1} 行必须是非空字符串数组`);
      return;
    }
    if (Array.isArray(pv.columns) && row.length !== pv.columns.length) {
      errors.push(
        `${at}：preview.rows 第 ${i + 1} 行有 ${row.length} 格，表头是 ${pv.columns.length} 列`
      );
    }
  });
}
```

在 `validateProjects` 里调用它 —— 加在 `if (p.stack !== undefined …)` 那一块之后、`onlyWeb` 检查之前：

```js
    validatePreview(p, at, errors);
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
node --test tests/validate-projects.test.mjs 2>&1 | tail -30
```

Expected: 全部通过。特别确认 `terminal 写 lines、admin 写 nav，互不代填` 这条通过 —— 它检查的是「`kind` 为 terminal 时只看 `lines`，不会因为 `nav` 存在就换分支」。

- [ ] **Step 5: 跑全量测试与真实校验**

```bash
npm test && npm run validate
```

Expected: 全绿。`npm run validate` 此时应当在真实的 `projects.js` 上通过 —— 因为那两个项目还没加 `preview`，属于合法状态。

---

## Task 6: `assets/preview.js` —— 两个模板

**Files:**
- Create: `assets/preview.js`

**Interfaces:**
- Consumes: `L.normalizePreview` 的输出（Task 4）、`L.previewStatusTone`（Task 4）
- Produces: `window.AppGalleryPreview.build(preview)` → `HTMLElement` 或 `null`

  返回的根元素固定是 `<span class="pv pv-terminal">` 或 `<span class="pv pv-admin">`。
  **窗口的定位与外观（`.card-stage`）由调用方 `app.js` 加上** —— 这个模块只管画窗口里的内容，不管它贴在哪儿，第二步可以把它放到别的地方去。

  传入的 `preview` 必须是 `normalizePreview` 的**输出**（已规范化）；传原始数据不保证正确 —— 这个模块不做校验，那是 `normalizePreview` 和校验器的职责。

- [ ] **Step 1: 写文件**

```js
/**
 * 卡片里的界面预览窗口。
 *
 * 分工：布局在这（模板），文字在 projects.js（数据）。
 * 一切文本走 textContent，参数值绝不进 innerHTML（Review Focus 2）。
 *
 * 这个模块只画窗口的内容，不管它贴在卡片的哪个位置 ——
 * .card-stage 那个定位类是调用方 app.js 加的。
 */
(function (root) {
  'use strict';

  var L = root.AppGalleryLogic;

  var PROMPT = '❯';
  var OK_MARK = '✓';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function headNode(title) {
    var head = el('span', 'pv-head');
    var dots = el('span', 'pv-dots');
    for (var i = 0; i < 3; i++) dots.appendChild(el('span', 'pv-dot'));
    head.appendChild(dots);
    head.appendChild(el('span', 'pv-title', title));
    return head;
  }

  function terminalNode(preview) {
    var box = el('span', 'pv pv-terminal');
    box.appendChild(headNode(preview.title));

    preview.lines.forEach(function (line) {
      var first = line.charAt(0);
      var row = el('span', 'pv-line');

      if (first === PROMPT) {
        row.className += ' is-prompt';
        row.appendChild(el('span', 'pv-pr', PROMPT));
        // 提示符后面那个空格由 CSS 的 margin 提供，这里去掉免得双份
        row.appendChild(el('span', 'pv-text', line.slice(1).replace(/^\s+/, '')));
      } else if (first === OK_MARK) {
        row.className += ' is-ok';
        row.appendChild(el('span', 'pv-text', line));
      } else {
        row.appendChild(el('span', 'pv-text', line));
      }

      box.appendChild(row);
    });

    return box;
  }

  /**
   * 表头有 n 列时，前 n-1 列平分剩余宽度，最后一列按内容宽度 ——
   * 因为最后一列是状态列（胶囊），它不该被拉宽。列数由数据决定，
   * 所以模板用内联的 grid-template-columns，CSS 里不写死。
   */
  function gridTemplate(columnCount) {
    var parts = [];
    for (var i = 0; i < columnCount - 1; i++) parts.push('1fr');
    parts.push('auto');
    return parts.join(' ');
  }

  function adminNode(preview) {
    var box = el('span', 'pv pv-admin');
    box.appendChild(headNode(preview.title));

    var body = el('span', 'pv-admin-body');

    var nav = el('span', 'pv-nav');
    preview.nav.forEach(function (item, i) {
      nav.appendChild(el('span', i === preview.active ? 'pv-nav-item is-on' : 'pv-nav-item', item));
    });
    body.appendChild(nav);

    var main = el('span', 'pv-main');
    var template = gridTemplate(preview.columns.length);

    var cols = el('span', 'pv-cols');
    cols.style.gridTemplateColumns = template;
    preview.columns.forEach(function (name) {
      cols.appendChild(el('span', 'pv-col', name));
    });
    main.appendChild(cols);

    preview.rows.forEach(function (row) {
      var line = el('span', 'pv-row');
      line.style.gridTemplateColumns = template;
      var lastIndex = row.length - 1;

      row.forEach(function (cell, i) {
        if (i !== lastIndex) {
          line.appendChild(el('span', 'pv-cell', cell));
          return;
        }
        // 最后一列当状态列：认得出来就画胶囊，认不出来就当普通格子
        var tone = L.previewStatusTone(cell);
        if (tone) {
          line.appendChild(el('span', 'pv-tag is-' + tone, cell));
        } else {
          line.appendChild(el('span', 'pv-cell', cell));
        }
      });

      main.appendChild(line);
    });

    body.appendChild(main);
    box.appendChild(body);
    return box;
  }

  function build(preview) {
    if (!preview || typeof preview !== 'object') return null;
    if (preview.kind === 'terminal') return terminalNode(preview);
    if (preview.kind === 'admin') return adminNode(preview);
    return null;
  }

  root.AppGalleryPreview = { build: build };
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: 造一个临时页把两个模板渲染出来**

`_tmpl.html`（用完删）：

```html
<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="utf-8">
<title>预览模板（临时页）</title>
<link rel="stylesheet" href="assets/theme.css">
<link rel="stylesheet" href="assets/style.css">
<style>
  body { padding: 20px; }
  .row { display: flex; gap: 24px; align-items: flex-start; }
  .box { width: 460px; }
  .box h2 { font-size: 13px; color: var(--fg-dim); font-weight: 400; margin: 0 0 8px; }
  /* 单独展示窗口：给它一个和卡片里一样的舞台盒子 */
  .demo-strip { position: relative; height: 140px; background: linear-gradient(135deg, #b45309, #f59e0b); border-radius: 14px 14px 0 0; }

  /* ⚠ 下面这一整段是 Task 7 要写进 assets/style.css 的规则，这里先原样内联一份。
     原因：Task 6 早于 Task 7，此刻 style.css 里还没有 .card-stage 和 .pv-*，
     不内联的话这个临时页渲染出来是一堆没有样式的裸文字，等于没验证。
     这个文件在本任务结束时删掉，正式的那份只存在于 style.css，不会有两份。 */
  .card-stage {
    display: block;
    position: absolute;
    left: 64px; top: 16px; right: 0; bottom: 0;
    background: var(--bg-card);
    border: 1px solid var(--line);
    border-right: 0; border-bottom: 0;
    border-radius: 9px 0 0 0;
    overflow: hidden;
  }
  .pv { font-family: var(--mono); font-size: 10px; line-height: 1.5; color: var(--fg-dim); }
  .pv-head { display: flex; align-items: center; gap: 5px; padding: 6px 9px; border-bottom: 1px solid var(--line-soft); color: var(--fg-faint); font-size: 10px; }
  .pv-dots { display: flex; gap: 3px; }
  .pv-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--fg-faint); opacity: .5; }
  .pv-title { margin-left: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pv-line { display: block; padding: 2px 10px; white-space: nowrap; overflow: hidden; }
  .pv-pr { color: var(--accent); margin-right: 4px; }
  .pv-line.is-prompt .pv-text { color: var(--fg); }
  .pv-line.is-ok .pv-text { color: var(--ok); }
  .pv-admin-body { display: flex; }
  .pv-nav { flex: none; width: 74px; border-right: 1px solid var(--line-soft); padding: 2px 0; color: var(--fg-faint); }
  .pv-nav-item { display: block; padding: 1px 9px; white-space: nowrap; overflow: hidden; }
  .pv-nav-item.is-on { color: var(--fg); background: var(--bg-soft); box-shadow: inset 2px 0 0 var(--accent); }
  .pv-main { flex: 1; min-width: 0; padding: 5px 10px; }
  .pv-cols, .pv-row { display: grid; gap: 8px; align-items: center; }
  .pv-cols { font-size: 9.5px; color: var(--fg-faint); padding-bottom: 4px; border-bottom: 1px solid var(--line-soft); }
  .pv-row { padding: 2px 0; border-bottom: 1px solid var(--line-soft); }
  .pv-row:last-child { border-bottom: 0; }
  .pv-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pv-row > .pv-cell:first-child { color: var(--fg); }
  .pv-tag { border-radius: 999px; padding: 0 6px; font-size: 9.5px; white-space: nowrap; justify-self: start; }
  .pv-tag.is-amber { background: var(--amber); color: var(--bg); }
  .pv-tag.is-ok    { background: var(--ok);    color: var(--bg); }
  .pv-tag.is-red   { background: var(--red);   color: var(--bg); }
</style>
</head>
<body>

<div class="row">
  <div class="box">
    <h2>terminal</h2>
    <div class="demo-strip" id="a"></div>
  </div>
  <div class="box">
    <h2>admin</h2>
    <div class="demo-strip" id="b"></div>
  </div>
</div>

<script src="projects.js"></script>
<script src="assets/logic.js"></script>
<script src="assets/preview.js"></script>
<script>
var L = window.AppGalleryLogic;
var projects = window.PROJECTS;

function demo(hostId, projectId) {
  var p = L.findProject(projects, projectId);
  var pv = L.normalizePreview(p);
  var host = document.getElementById(hostId);
  if (!pv) { host.textContent = '没有 preview'; return; }
  var stage = AppGalleryPreview.build(pv);
  stage.className = 'card-stage ' + stage.className;
  stage.setAttribute('aria-hidden', 'true');
  host.appendChild(stage);
}

// 这两个项目此刻还没加 preview（Task 7 Step 6 才加），先临时塞进去验证模板
window.PROJECTS[0].preview = {
  kind: 'terminal', title: 'claudepocket — zsh',
  lines: ['❯ 把退款的测试补上', '⏺ Edit src/refund/handler.ts', '补了三个用例：负数、超额、重复。', '✓ 32 passed']
};
window.PROJECTS[1].preview = {
  kind: 'admin', title: '商会通 · 入会审批',
  nav: ['商会管理', '成员管理', '入会审批', '行业管理', '公告管理'], active: 2,
  columns: ['申请人', '申请商会', '状态'],
  rows: [['张伟', '深圳市商会', '待审批'], ['刘洋', '深圳市商会', '已通过'], ['赵凯', '南山区商会', '已退回']]
};
demo('a', 'claudepocket');
demo('b', 'chamberconnect');
</script>
</body>
</html>
```

- [ ] **Step 3: 跑 probe 断言 DOM 内容对得上**

```bash
probe _tmpl.html 1120 '
var term = document.querySelector(".pv-terminal");
var admin = document.querySelector(".pv-admin");
out.termText = term ? term.textContent : null;
out.termLines = document.querySelectorAll(".pv-line").length;
out.prompt = document.querySelectorAll(".pv-line.is-prompt").length;
out.okLine = document.querySelectorAll(".pv-line.is-ok").length;
out.adminText = admin ? admin.textContent : null;
out.navOn = document.querySelectorAll(".pv-nav-item.is-on").length;
out.navOnText = document.querySelector(".pv-nav-item.is-on") ? document.querySelector(".pv-nav-item.is-on").textContent : null;
out.tags = Array.prototype.map.call(document.querySelectorAll(".pv-tag"), function (n) { return n.className.replace("pv-tag ", ""); }).join(",");
out.rows = document.querySelectorAll(".pv-row").length;
out.cols = document.querySelectorAll(".pv-col").length;
out.overflowA = document.querySelector(".pv-terminal").scrollHeight > document.querySelector(".pv-terminal").clientHeight;
out.overflowB = document.querySelector(".pv-admin").scrollHeight > document.querySelector(".pv-admin").clientHeight;
'
```

Expected（关键几项）：

```
'termLines':4
'prompt':1
'okLine':1
'navOn':1
'navOnText':'入会审批'
'tags':'is-amber,is-ok,is-red'
'rows':3
'cols':3
'overflowA':false
'overflowB':false
```

`overflowA` / `overflowB` 都是 `false` 就是没有溢出。若为 `true`，回到 Task 7 调字号与内边距。

- [ ] **Step 4: 截图看两个模板长什么样**

```bash
shot .superpowers/shots/after _tmpl.html dark 1120 400
shot .superpowers/shots/after _tmpl.html light 1120 400
```

用 Read 打开两张。检查：

- 终端那张：第一行 `❯` 是强调色、最后一行 `✓ 32 passed` 是绿色，中间两行是次要色
- 后台那张：侧栏第 3 项「入会审批」有左侧竖条和底色，表格三行的状态列分别是琥珀／绿／红三个实心胶囊
- 浅色下：胶囊是深色底白字（绿是 `#047857`、琥珀是 `#b45309`、红是 `#dc2626`），读得清

不对就改 `theme.css` 里的语义色或 Task 7 的 `.pv-*` 规则，改完重跑本步。

- [ ] **Step 5: 确认没违反 innerHTML 约束**

```bash
grep -n 'innerHTML' assets/preview.js
```

Expected: 无输出。有输出就是引入了一处数据进 DOM 的入口，必须改成 `textContent`。

- [ ] **Step 6: 跑测试与校验**

```bash
npm test && npm run validate
```

Expected: 全绿 —— 这一步没碰 `logic.js` 和校验器，只是新增一个文件。

- [ ] **Step 7: 删掉临时页**

```bash
rm -f _tmpl.html
```

`_tmpl.html` 里内联了一份 `.pv-*` 规则的副本，**必须在本任务结束时删掉**：Task 7 会把同样的规则写进 `assets/style.css`，但 `<style>` 在文档里排在 `<link>` 之后，优先级相同的情况下后出现的赢 —— 留着它，Task 7 之后再看这个页面，看到的仍然是内联的那份，style.css 里写错了也发现不了。正式的那份只存在于 `style.css`。

---

## Task 7: 卡片版式 + 接线 + 数据

四件事一起落地，因为没有数据就看不见版式、没接线就渲染不出来。**完成时两张卡片的色条里应当出现预览窗口，图标压在窗口左边且伸进卡片正文，两个卡片等高，任何尺寸下都不出现被切断的半行。**

**Files:**
- Modify: `assets/style.css`（`.card-strip` 几何、`.card-icon` 的 `z-index`、全部 `.pv-*` 规则、移动端块）
- Modify: `assets/app.js`（`cardNode`）
- Modify: `index.html`（加 `<script src="assets/preview.js">`）
- Modify: `projects.js`（两个项目各加 `preview`）

**Interfaces:**
- Consumes: `L.normalizePreview`（Task 4）、`window.AppGalleryPreview.build`（Task 6）、`--bg-card` `--line` `--line-soft` `--fg-*` `--accent` `--bg-soft` `--amber` `--ok` `--red` `--mono`（Task 1）
- Produces: `.card-stage`、`.pv`、`.pv-head`、`.pv-dots`、`.pv-dot`、`.pv-title`、`.pv-line`、`.pv-pr`、`.pv-text`、`.pv-admin-body`、`.pv-nav`、`.pv-nav-item`、`.pv-main`、`.pv-cols`、`.pv-col`、`.pv-row`、`.pv-cell`、`.pv-tag`
- Produces: 卡片 DOM 结构 = `<a.card data-platforms><span.card-strip style="background:…"><span.card-stage.pv… aria-hidden="true">…</span><img.card-icon></span><span.card-body>…</span></a>`

- [ ] **Step 1: 改 `style.css` 里的 `.card-strip` 和 `.card-icon`**

`.card-strip` 换成：

```css
.card-strip {
  display: block;
  position: relative;
  height: 140px;
  /* 刻意不设 overflow：.card-icon 的 bottom:-18px 要伸进卡片正文，
     一旦在这里裁剪，图标就只剩上面 26px（做版式候选时踩过这个坑）。
     窗口自己的 overflow: hidden 已经够用。 */
}
```

`.card-icon` 加一行 `z-index`（其余不动）：

```css
.card-icon {
  position: absolute;
  left: 14px;
  bottom: -18px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--icon-bg);
  border: 1px solid var(--line);
  object-fit: cover;
  z-index: 2;
}
```

`.card-icon-fallback` 同样加 `z-index: 2;`。

- [ ] **Step 2: 在 `style.css` 里加预览窗口的样式**

加在 `.card-icon-fallback` 之后、`.card-body` 之前：

```css
/* ===== 卡片里的界面预览（版式「甲」）=====
   几何：色条 140px，窗口从 x=64 起、贴着卡片右/下边被裁掉（右边和下边不画描边，
   让它读起来像「截图从卡片里露出来」），图标紧靠窗口左边、往下伸进卡片正文。
   这三个数值是渲染过、挑中的那一版，别顺手调。

   窗口里的字号、行距、内边距都是按「桌面端正好装下 4 行且不溢出」反推的，
   加上校验器把数据卡在 4 行以内（logic.js 的 PREVIEW_LIMITS），两边咬合。
   动之前先看 Task 7 的溢出断言。 */

.card-stage {
  display: block;
  position: absolute;
  left: 64px;
  top: 16px;
  right: 0;
  bottom: 0;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-right: 0;
  border-bottom: 0;
  border-radius: 9px 0 0 0;
  overflow: hidden;
}

.pv {
  font-family: var(--mono);
  font-size: 10px;
  line-height: 1.5;
  color: var(--fg-dim);
}

/* 窗口标题栏 */
.pv-head {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  border-bottom: 1px solid var(--line-soft);
  color: var(--fg-faint);
  font-size: 10px;
}

.pv-dots { display: flex; gap: 3px; }

.pv-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--fg-faint);
  opacity: .5;
}

.pv-title {
  margin-left: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 终端 */
.pv-line {
  display: block;
  padding: 2px 10px;
  white-space: nowrap;
  overflow: hidden;
}

.pv-pr { color: var(--accent); margin-right: 4px; }
.pv-line.is-prompt .pv-text { color: var(--fg); }
.pv-line.is-ok .pv-text { color: var(--ok); }

/* 后台 */
.pv-admin-body { display: flex; }

.pv-nav {
  flex: none;
  width: 74px;
  border-right: 1px solid var(--line-soft);
  padding: 2px 0;
  color: var(--fg-faint);
}

.pv-nav-item {
  display: block;
  padding: 1px 9px;
  white-space: nowrap;
  overflow: hidden;
}

.pv-nav-item.is-on {
  color: var(--fg);
  background: var(--bg-soft);
  box-shadow: inset 2px 0 0 var(--accent);
}

.pv-main {
  flex: 1;
  min-width: 0;
  padding: 5px 10px;
}

/* 列宽由 preview.js 按列数写成内联的 grid-template-columns，
   这里只定间距与对齐 */
.pv-cols, .pv-row { display: grid; gap: 8px; align-items: center; }

.pv-cols {
  font-size: 9.5px;
  color: var(--fg-faint);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--line-soft);
}

.pv-row {
  padding: 2px 0;
  border-bottom: 1px solid var(--line-soft);
}

.pv-row:last-child { border-bottom: 0; }

.pv-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv-row > .pv-cell:first-child { color: var(--fg); }

/* 状态胶囊：实心，不是描边 —— 9.5px 下描边细得看不清 */
.pv-tag {
  border-radius: 999px;
  padding: 0 6px;
  font-size: 9.5px;
  white-space: nowrap;
  justify-self: start;
}

.pv-tag.is-amber { background: var(--amber); color: var(--bg); }
.pv-tag.is-ok    { background: var(--ok);    color: var(--bg); }
.pv-tag.is-red   { background: var(--red);   color: var(--bg); }
```

- [ ] **Step 3: 改 `style.css` 移动端块里的卡片部分**

在已有的 `@media (max-width: 767px)` 块里，把 `.card-strip { height: 54px; }` 换成下面这一组（`.card-icon` 那一行原本就有，不动）：

```css
  .card-strip { height: 104px; }

  /* 窄屏窗口更矮，装不下就按整行/整项隐藏 —— 不裁半行，
     半行看起来像 bug 而不是设计（版式候选丙就是这么被否掉的）。 */
  .card-stage { left: 54px; top: 8px; }
  .pv { font-size: 10px; line-height: 1.45; }
  .pv-head { padding: 5px 9px; font-size: 9.5px; }
  .pv-line { padding: 1px 9px; }
  .pv-main { padding: 4px 8px; }
  .pv-cols { padding-bottom: 3px; }
  .pv-row { padding: 1.5px 0; }
  /* .pv-main 的第一个孩子是表头 .pv-cols，所以第 N 个数据行是第 N+1 个孩子 ——
     要留 2 行就隐藏「第 4 个孩子及以后」（也就是第 3 个数据行）。
     写成 n+3 会把第 2 行也藏掉，只剩一行。 */
  .pv-main > .pv-row:nth-child(n+4) { display: none; }

  /* .pv-nav 的孩子只有侧栏项，没有偏移，留 3 项就是 n+4 */
  .pv-nav-item:nth-child(n+4) { display: none; }
```

- [ ] **Step 4: 在 `app.js` 的 `cardNode` 里挂上预览**

`cardNode` 里，把 `strip` 的五行

```js
    var strip = document.createElement('span');
    strip.className = 'card-strip';
    var theme = project.theme || ['#6366f1', '#8b5cf6'];
    strip.style.background = 'linear-gradient(135deg, ' + theme[0] + ', ' + theme[1] + ')';
    strip.appendChild(iconNode(project, 'card-icon'));
```

改成（中间插一段，其余两行原样保留）：

```js
    var strip = document.createElement('span');
    strip.className = 'card-strip';
    var theme = project.theme || ['#6366f1', '#8b5cf6'];
    strip.style.background = 'linear-gradient(135deg, ' + theme[0] + ', ' + theme[1] + ')';

    // 预览是增强项：任何一个环节缺了都安静地跳过，退化成纯色条（Review Focus 1）
    var preview = L.normalizePreview(project);
    var Preview = window.AppGalleryPreview;
    if (preview && Preview && typeof Preview.build === 'function') {
      var stage = Preview.build(preview);
      if (stage) {
        // 定位与外观的类由这里加 —— preview.js 只管画窗口内容，不管贴在哪儿
        stage.className = 'card-stage ' + stage.className;
        stage.setAttribute('aria-hidden', 'true');   // 纯装饰，不进读屏、不进 tab 顺序
        strip.appendChild(stage);
      }
    }

    strip.appendChild(iconNode(project, 'card-icon'));
    card.appendChild(strip);
```

顺序是「先舞台、后图标」，与挑中的候选页（`_variants.html` 的甲）一致。二者都是绝对定位，图标带 `z-index: 2` 会压在舞台之上，所以 DOM 顺序不影响谁盖住谁 —— 但保持一致，将来调 `z-index` 时才不会出现两处写法不同的意外。

- [ ] **Step 5: `index.html` 引脚本**

```html
<script src="projects.js"></script>
<script src="assets/logic.js"></script>
<script src="assets/preview.js"></script>
<script src="assets/app.js"></script>
```

只有 `index.html` 需要 —— 另外两个页面不渲染卡片。`app.js` 那边有 `window.AppGalleryPreview` 的存在性判断，缺了也不会出错。

- [ ] **Step 6: 给两个项目加 `preview` 数据**

`projects.js` 第一个项目（`claudepocket`）的 `releasesRepo` 那一行之前插入：

```js
    // 卡片里那块界面预览。文字取自 example1.html 里真实的终端 ——
    // 原样是六行，140px 的窗口装不下，砍掉了 ⏺ Read 和 ⏺ Bash 两条中间步骤，
    // 留下的话依然完整：提问 → 改文件 → 说明了改了什么 → 测试通过。
    preview: {
      kind: 'terminal',
      title: 'claudepocket — zsh',
      lines: [
        '❯ 把退款的测试补上',
        '⏺ Edit src/refund/handler.ts',
        '补了三个用例：负数、超额、重复。',
        '✓ 32 passed'
      ]
    },
```

第二个项目（`chamberconnect`）的 `releasesRepo` 那一行之前插入：

```js
    // 取自 example2.html 的后台界面。原来是三行三列，正好在版面预算内。
    preview: {
      kind: 'admin',
      title: '商会通 · 入会审批',
      nav: ['商会管理', '成员管理', '入会审批', '行业管理', '公告管理'],
      active: 2,
      columns: ['申请人', '申请商会', '状态'],
      rows: [
        ['张伟', '深圳市商会', '待审批'],
        ['刘洋', '深圳市商会', '已通过'],
        ['赵凯', '南山区商会', '已退回']
      ]
    },
```

注意：`active: 2` 指向 `入会审批`（第 3 项），落在窄屏可见的前 3 项之内 —— 这是校验器强制的不变量，别改成 3。

- [ ] **Step 7: 跑校验和测试**

```bash
npm test && npm run validate
```

Expected: 全绿。`npm run validate` 现在会真的校验两个 `preview`。

- [ ] **Step 8: 断言卡片版式**

```bash
probe index.html 1120 '
var stages = document.querySelectorAll(".card-stage");
var cards = document.querySelectorAll(".card");
out.stages = stages.length;
out.cards = cards.length;
var rects = Array.prototype.map.call(cards, function (c) { return Math.round(c.getBoundingClientRect().height); });
out.cardHeights = rects.join("/");
out.equalHeight = rects.every(function (h) { return h === rects[0]; });
out.stageH = stages.length ? Math.round(stages[0].getBoundingClientRect().height) : -1;
var strip = document.querySelector(".card-strip");
out.stripH = strip ? Math.round(strip.getBoundingClientRect().height) : -1;
var icon = document.querySelector(".card-icon");
var iconRect = icon.getBoundingClientRect();
var stageRect = stages[0].getBoundingClientRect();
out.iconRight = Math.round(iconRect.right);
out.stageLeft = Math.round(stageRect.left);
out.gap = Math.round(stageRect.left - iconRect.right);
var cardRect = document.querySelector(".card").getBoundingClientRect();
out.iconBottomBelowStrip = Math.round(iconRect.bottom - strip.getBoundingClientRect().bottom);
out.iconVisibleH = Math.round(iconRect.height);
out.overflowT = document.querySelector(".pv-terminal").scrollHeight > document.querySelector(".pv-terminal").clientHeight;
out.overflowA = document.querySelector(".pv-admin").scrollHeight > document.querySelector(".pv-admin").clientHeight;
out.stripOverflow = getComputedStyle(strip).overflow;
out.terms = document.querySelectorAll(".pv-terminal").length;
out.admins = document.querySelectorAll(".pv-admin").length;
out.stageAria = stages[0].getAttribute("aria-hidden");
out.focusables = document.querySelectorAll(".card-stage a, .card-stage button, .card-stage input, .card-stage [tabindex]").length;
var cardName = document.querySelector(".card-name");
out.cardName = cardName ? cardName.textContent : null;
'
```

Expected:

```
'stages':2
'cards':2
'equalHeight':true
'stageH':124
'stripH':140
'gap':6
'iconBottomBelowStrip':18
'iconVisibleH':44
'overflowT':false
'overflowA':false
'stripOverflow':'visible'
'terms':1
'admins':1
'stageAria':'true'
'focusables':0
'cardName':'ClaudePocket'
```

逐项对照：`stageH` 124（140−16）、`gap` 6（64−58）、`iconBottomBelowStrip` 18（图标伸进正文 18px，没被裁）、`iconVisibleH` 44（**没有被 `overflow: hidden` 削掉，这是做候选时踩过的坑**）、`stripOverflow` 是 `visible`（不是 `hidden`）。

后三项是 spec §6.4 的无障碍验收：窗口对读屏隐藏（`stageAria` 为 `'true'`）、**里面没有任何可聚焦元素**（`focusables` 为 0 —— 预览是装饰，不该出现在 tab 顺序里）、卡片的可访问名字仍然来自 `.card-name`。

`overflowT` / `overflowA` 为 `true` 就说明 4 行装不下，回到 Step 2 把 `.pv` 的 `line-height` 降到 1.45 或 `.pv-line` 的 `padding` 降到 `1.5px 10px`，然后重跑本步。

- [ ] **Step 9: 断言窄屏下按整行隐藏**

```bash
probe index.html 375 '
out.cardW = Math.round(document.querySelector(".card").getBoundingClientRect().width);
out.stripH = Math.round(document.querySelector(".card-strip").getBoundingClientRect().height);
out.iconW = Math.round(document.querySelector(".card-icon").getBoundingClientRect().width);
out.iconVisibleH = Math.round(document.querySelector(".card-icon").getBoundingClientRect().height);
var rows = document.querySelectorAll(".pv-row");
out.rowsTotal = rows.length;
out.rowsVisible = Array.prototype.filter.call(rows, function (r) { return r.offsetParent !== null; }).length;
var navs = document.querySelectorAll(".pv-nav-item");
out.navTotal = navs.length;
out.navVisible = Array.prototype.filter.call(navs, function (n) { return n.offsetParent !== null; }).length;
var navOn = document.querySelector(".pv-nav-item.is-on");
out.navOnVisible = navOn ? (navOn.offsetParent !== null) : null;
var t = document.querySelector(".pv-terminal");
out.overflowT = t.scrollHeight > t.clientHeight;
var a = document.querySelector(".pv-admin");
out.overflowA = a.scrollHeight > a.clientHeight;
'
```

Expected:

```
'stripH':104
'iconW':38
'iconVisibleH':38
'rowsTotal':3
'rowsVisible':2
'navTotal':5
'navVisible':3
'navOnVisible':true
'overflowT':false
'overflowA':false
```

`navOnVisible` 必须是 `true` —— 这就是校验器把 `active` 卡在 0–2 的原因。

- [ ] **Step 10: 截图看版式**

```bash
shot .superpowers/shots/after index.html dark 1120 900
shot .superpowers/shots/after index.html light 1120 900
shot .superpowers/shots/after index.html dark 375 800
```

用 Read 打开三张，检查：

- 窗口贴着卡片右边和下边被裁掉，只有左上角是圆的、右边和下边没有描边 —— 读起来像截图从卡片里露出来
- 图标紧靠在窗口左边，**下半截压在卡片正文里**、完整可见
- 窗口里没有半个字被横切
- 浅色下窗口是白面 + 浅描边，在渐变条上分得出边界
- 375px 那张：终端仍是完整 4 行，后台表格只剩 2 行、侧栏只剩 3 项且「入会审批」仍在（带高亮）

- [ ] **Step 11: 关掉 JS 再看一眼**

```bash
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --disable-javascript \
  --window-size=1120,900 --virtual-time-budget=2000 \
  --screenshot=.superpowers/shots/after/index-nojs.png "file:///Users/xj/code/AppGallery/index.html"
```

用 Read 打开。Expected: 两张卡片照常显示 —— 渐变条、图标、名字、简介、平台 chip 都在，只是没有预览窗口、没有版本号（`data-count` 会是 `…`）。**不能是白屏或半张卡片**。

- [ ] **Step 12: 用一个没有 `preview` 的项目验证回退**

临时往 `projects.js` 末尾追加第三个项目（**验证完删掉**）：

```js
  ,{
    id: 'fixture-nopreview',
    name: '回退样例',
    tagline: '故意不填 preview',
    description: ['用来确认没有 preview 的卡片照常渲染。'],
    theme: ['#0f766e', '#22d3ee'],
    platforms: ['web'],
    stack: ['X'],
    releasesRepo: 'zhoujunli/fixture-releases',
    liveUrl: 'https://example.com'
  }
```

```bash
probe index.html 1120 '
var cards = document.querySelectorAll(".card");
var rects = Array.prototype.map.call(cards, function (c) { return Math.round(c.getBoundingClientRect().height); });
out.cards = cards.length;
out.stages = document.querySelectorAll(".card-stage").length;
out.cardHeights = rects.join("/");
out.equalHeight = rects.every(function (h) { return h === rects[0]; });
out.lastHasStage = !!cards[2].querySelector(".card-stage");
out.lastStripH = Math.round(cards[2].querySelector(".card-strip").getBoundingClientRect().height);
'
```

Expected:

```
'cards':3
'stages':2
'lastHasStage':false
'lastStripH':140
'equalHeight':true
```

**三张卡片等高、第三张没有窗口但色条高度一样** —— 这就是 Review Focus 1 和 2 的验收点。

然后**把第三个项目从 `projects.js` 里删掉**，重跑 `npm run validate` 确认回到两个项目。

- [ ] **Step 13: 在 `versions.json` 不存在的状态下确认高度不受影响**

`versions.json` 是 `fetch-releases.mjs` 的产物，在 `.gitignore` 里，当前不存在 —— 也就是说上面所有渲染都已经是在「版本信息取不到」的状态下做的。确认一下：

```bash
ls versions.json 2>/dev/null && echo "存在（那就要另测降级态）" || echo "不存在 —— 降级态已经被上面每一步覆盖"
```

若文件恰好存在，`mv` 走它，重跑 Step 8 的 probe，确认 `equalHeight` 仍为 `true`（版本槽显示「版本信息暂不可用」会占一行，卡片变高但三张仍然等高），测完 `mv` 回来。

- [ ] **Step 14: 跑测试与校验**

```bash
npm test && npm run validate
```

Expected: 全绿。`_tmpl.html` 在 Task 6 末尾已经删了，这里不该再有。

---

## Task 8: `.reveal` 入场动效

**关键约束：内容默认可见。** `example1.html` 把 `opacity: 0` 写在 CSS 里，没有 JS 时整页全白 —— 这里反过来：CSS 里只有「挂上 `.reveal` 才隐藏」，而 `.reveal` 由 JS 在**确认 `IntersectionObserver` 可用、且用户没要求减少动效**之后才挂。

**Files:**
- Modify: `assets/theme.css`（追加 `.reveal` 与 `@keyframes`；把 `prefers-reduced-motion` 那条并进去）
- Modify: `assets/style.css`（删掉原来那条 `@media (prefers-reduced-motion: reduce)`，它搬去 `theme.css` 了）
- Modify: `assets/app.js`（`renderHome`）

**Interfaces:**
- Consumes: `.card`（已有）
- Produces: `.reveal` / `.reveal.in` 两个类；`renderHome` 在卡片元素**进 DOM 之前**决定挂不挂

- [ ] **Step 1: 在 `theme.css` 末尾追加**

```css
/* ===== 入场动效 =====
   内容默认可见，只有 JS 真的挂上 .reveal 才隐藏 ——
   example 是把 opacity: 0 写在 CSS 里，没有 JS 时整页全白，这里反着来。

   用 animation 而不是 transition：.card 自己有一条给 hover 用的
   transition: transform .15s，如果这里也用 transition 改 transform，
   后者的权重更高会把 hover 也拖慢到 .5s。动画结束后由 JS 把两个类摘掉，
   元素回到普通的 .card，hover 照旧。 */
@keyframes card-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}

.reveal { opacity: 0; }
.reveal.in { animation: card-in .5s ease both; }

/* 只管 .reveal 这一条。它覆盖的规则就在同一个文件里、源码序在前，所以生效。
   站点原有的那条 reduced-motion 块（管 .version-loading 和 .card）留在 style.css
   不要动 —— 那两个规则在 style.css 里，theme.css 加载在前，搬过来会被盖掉。 */
@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal.in { opacity: 1; animation: none; }
}
```

- [ ] **Step 2: 确认 `style.css` 原有那条 reduced-motion 块一个字没动**

**这一条不是「改」，是「别改」。** `style.css` 里已经有一条：

```css
@media (prefers-reduced-motion: reduce) {
  .version-loading { animation: none; }
  .card { transition: none; }
}
```

它管的两个规则都在 `style.css`，**必须留在这里**。搬到 `theme.css` 会被源码序更后的 `style.css` 盖掉，等于没写 —— 而 `theme.css` 里那条新加的只管 `.reveal`（覆盖同文件内的规则，安全）。

```bash
grep -n 'prefers-reduced-motion' -A4 assets/style.css assets/theme.css
```

Expected: 两个文件各一条。`style.css` 里仍是 `.version-loading` + `.card`，`theme.css` 里只有 `.reveal, .reveal.in`。

- [ ] **Step 3: 改 `app.js` 的 `renderHome`**

整体替换 `renderHome`：

```js
  // ---------- 首页 ----------
  function renderHome() {
    var grid = document.querySelector('[data-grid]');
    if (!grid) return;

    var list = projects();
    var count = document.querySelector('[data-count]');
    if (count) count.textContent = String(list.length);

    // 入场动效是纯装饰：三件事有一件不成立就一个类都不加，卡片默认可见。
    //  1. 浏览器得有 IntersectionObserver
    //  2. 用户不能开着「减少动态效果」
    //  3. （下面）动画结束要把类摘掉，不然会给 .card 留下永久的 transform
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var io = null;
    if ('IntersectionObserver' in window && !reduce) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
          // 动画放完就把两个类摘掉，元素回到普通的 .card ——
          // 否则 .reveal.in 的 animation 会一直压着 transform，hover 抬不起来
          entry.target.addEventListener('animationend', function () {
            entry.target.classList.remove('reveal', 'in');
            entry.target.style.animationDelay = '';
          }, { once: true });
        });
      }, { rootMargin: '0px 0px -40px 0px' });
    }

    grid.innerHTML = '';
    list.forEach(function (project, i) {
      var card = cardNode(project);
      if (io) {
        // 必须在进 DOM 之前挂上：先进去再挂会先画一帧不透明的，再跳回透明
        card.classList.add('reveal');
        card.style.animationDelay = (i * 40) + 'ms';
      }
      grid.appendChild(card);
      if (io) io.observe(card);
    });

    initFilters();
    loadVersions().then(fillVersionSlots);
  }
```

- [ ] **Step 4: 断言正常运行下类被摘干净**

```bash
probe index.html 1120 '
var cards = document.querySelectorAll(".card");
out.cards = cards.length;
out.withReveal = document.querySelectorAll(".card.reveal").length;
out.withIn = document.querySelectorAll(".card.reveal.in").length;
out.opacities = Array.prototype.map.call(cards, function (c) { return getComputedStyle(c).opacity; }).join(",");
out.delays = Array.prototype.map.call(cards, function (c) { return c.style.animationDelay || "-"; }).join(",");
out.animations = Array.prototype.map.call(cards, function (c) { return getComputedStyle(c).animationName; }).join(",");
'
```

probe 里的 `setTimeout` 是 900ms，动画是 500ms + 延迟（0ms / 40ms），所以此刻动画已经放完、类应当被摘掉了。

Expected:

```
'cards':2
'withReveal':0
'withIn':0
'opacities':'1,1'
'delays':'-,'
'animations':'none,none'
```

`opacities` 是 `1,1` 就说明卡片最终可见；`withReveal` 是 0 说明类摘干净了，hover 不会被拖慢。

若 `withReveal` 是 1 或 2 而 `opacities` 已经是 `1,1`，那是**动画还没放完**（或者 `IntersectionObserver` 的回调来得晚），不是 bug —— 把 `probe` 里的 `setTimeout` 调到 2000 再跑一次。若调完仍然不动，那才是 `animationend` 没触发，回去查 Step 1 的 `@keyframes` 名字和 Step 3 里监听的 `'animationend'` 拼写是否一致。

- [ ] **Step 5: 断言减少动效下根本没挂类**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
python3 - <<'PY'
src = open('index.html', encoding='utf-8').read()
inject = """<script>
window.addEventListener('load', function () {
  setTimeout(function () {
    var cards = document.querySelectorAll('.card');
    var out = {
      cards: cards.length,
      withReveal: document.querySelectorAll('.card.reveal').length,
      opacities: Array.prototype.map.call(cards, function (c) { return getComputedStyle(c).opacity; }).join(',')
    };
    document.title = 'PROBE ' + JSON.stringify(out).replace(/"/g, "'");
  }, 500);
});
</script>"""
open('_probe.html', 'w', encoding='utf-8').write(src.replace('</body>', inject + '</body>'))
PY
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-prefers-reduced-motion \
  --window-size=1120,1500 --virtual-time-budget=4000 \
  --dump-dom "file:///Users/xj/code/AppGallery/_probe.html" 2>/dev/null \
  | grep -o "PROBE {[^<]*}" | head -1
rm -f _probe.html
```

Expected:

```
PROBE {'cards':2,'withReveal':0,'opacities':'1,1'}
```

`withReveal` 是 `0`（不是「有类但被 CSS 覆盖成可见」）—— 说明 JS 那侧就判断掉了，连类都不挂。

- [ ] **Step 6: 截图确认没有停在透明状态**

```bash
shot .superpowers/shots/after index.html dark 1120 900
```

用 Read 打开。两张卡片必须都在。**如果哪张是空的，就是它卡在了 `opacity: 0`** —— 那说明 `animationend` 没触发。回去查 Step 1 的 `@keyframes` 名字和 Step 3 里的监听是否对得上。

- [ ] **Step 7: 跑测试与校验**

```bash
npm test && npm run validate
```

- [ ] **Step 8: 滚到页面下方再看一次**

首页只有两张卡片、没有滚动内容，视口内就会全部触发。为确认「视口外的不动、滚到才动」这条也没写坏，把窗口压矮：

```bash
shot .superpowers/shots/after index.html dark 1120 400
```

用 Read 打开：卡片应当有一半在视口外（被裁），但**视口内的部分已经正常显示**，不是一片空白。再看一张高的确认没有回归：

```bash
shot .superpowers/shots/after index.html dark 1120 1200
```

---

## Task 9: 总验收与清理

前面每个任务各验了自己那一块。这一步按 spec §11 的清单**整体过一遍**，并清掉所有临时产物。

**Files:**
- Delete: `_variants.html`（用户挑版式用的候选页，挑完了）
- Delete: `.superpowers/shots/before` `.superpowers/shots/after`（验证截图）

- [ ] **Step 1: 全量测试与校验**

```bash
npm test && npm run validate
```

Expected: 全绿。

- [ ] **Step 2: 硬约束自检**

```bash
echo "=== style.css 里的字面色值（应为空）==="
grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' assets/style.css
echo "=== 旧令牌名（应为空）==="
grep -nE '\-\-(panel|border|text|muted|dim|hero-[12]|badge-[a-z]+|btn-quiet-[a-z]+)\b' \
  assets/style.css assets/app.js index.html project.html 404.html
echo "=== 数据进 innerHTML 的入口（应为空）==="
grep -n 'innerHTML' assets/preview.js
echo "=== 检查完毕 ==="
```

Expected: 三个 grep 都无输出。

（`assets/app.js` 里有 8 处 `innerHTML`（163 / 236 / 257 / 291 / 312 / 326 / 499 行等），全部是 `= ''` 清空，或者往版本槽塞固定骨架 `'<span class="version-loading"></span>'` —— 都是常量、不含任何项目数据，所以上面只查了新写的 `preview.js`。要复核的话：

```bash
grep -n 'innerHTML' assets/app.js
```

每一行的右侧要么是 `''`，要么是那个不含变量的骨架字符串。出现第三种写法就是引入了数据入口。）

- [ ] **Step 3: 八张渲染矩阵**

```bash
mkdir -p .superpowers/shots/final
for m in dark light; do
  shot .superpowers/shots/final index.html $m
  shot .superpowers/shots/final "project.html?p=claudepocket" $m
  shot .superpowers/shots/final "project.html?p=chamberconnect" $m
  shot .superpowers/shots/final 404.html $m
done
ls .superpowers/shots/final
```

Expected: 8 个 PNG。

- [ ] **Step 4: 逐张看图**

用 Read 全部打开，重点确认：

- 首页深/浅：两张卡片各有预览窗口，图标完整、没有被裁
- 两个详情页：提示条（琥珀）在深/浅下都读得清；「下载」「关于这个项目」「技术栈」「相关链接」四个面板标签是等宽小字
- 404：居中布局正常，辉光在
- 浅色下 `.btn-quiet`（「去 GitHub Releases 看看」）有可见边界 —— 这是 §5.3 里那处 bug 修复的验收点

- [ ] **Step 5: 窄屏矩阵**

```bash
for m in dark light; do
  shot .superpowers/shots/final index.html $m 375 800
  shot .superpowers/shots/final index.html $m 768 900
done
```

用 Read 打开四张：不出现横向滚动、卡片单列、终端 4 行完整、后台表格 2 行 + 侧栏 3 项。

- [ ] **Step 6: 无 JS 与减少动效的最后确认**

```bash
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --disable-javascript \
  --window-size=1120,900 --virtual-time-budget=2000 \
  --screenshot=.superpowers/shots/final/index-nojs.png "file:///Users/xj/code/AppGallery/index.html"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion \
  --window-size=1120,900 --virtual-time-budget=2000 \
  --screenshot=.superpowers/shots/final/index-reduced.png "file:///Users/xj/code/AppGallery/index.html"
```

用 Read 打开两张。Expected: 都是完整可读的首页，不是白屏。

- [ ] **Step 7: 三态主题的点击与刷新保持**

这是旧规格 Task 8 里没跑完的四项之一，本次动了主题令牌，顺手补上。用 headless Chrome 点击主题按钮三次，确认三态循环 + localStorage 落盘：

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
python3 - <<'PY'
src = open('index.html', encoding='utf-8').read()
inject = """<script>
window.addEventListener('load', function () {
  setTimeout(function () {
    var btn = document.querySelector('[data-theme-toggle]');
    var seen = [];
    function snap() {
      seen.push(document.documentElement.getAttribute('data-theme') + ':' + localStorage.getItem('appgallery-theme'));
    }
    snap();
    for (var i = 0; i < 3; i++) { btn.click(); snap(); }
    document.title = 'PROBE ' + JSON.stringify({ seq: seen.join(' ') }).replace(/"/g, "'");
  }, 500);
});
</script>"""
open('_probe.html', 'w', encoding='utf-8').write(src.replace('</body>', inject + '</body>'))
PY
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1120,900 \
  --virtual-time-budget=4000 --dump-dom "file:///Users/xj/code/AppGallery/_probe.html" 2>/dev/null \
  | grep -o "PROBE {[^<]*}" | head -1
rm -f _probe.html
```

Expected: 起始是 `system` 解析出来的主题，连点三次依次走 `light → dark → system`，每一档的 `localStorage` 值都对应写进去了。具体字面量取决于无头环境的系统偏好，**关键是三档都出现了一次且回到起点**。

再看首屏有没有白闪：`--virtual-time-budget` 调到 200、截一张，若头一帧就是正确主题（不是白底），说明内联脚本仍然生效。

- [ ] **Step 8: 用户在浏览器里过一遍**

这一步**不代替用户**。把下面几条交给用户，让他在自己的浏览器里看（记忆里那条：视觉判断交给他，别用截图代替）：

- 首页深浅两套 + 悬停卡片（动效有没有被 `.reveal` 拖慢）
- 卡片里的两个预览窗口
- `.btn-quiet` 那处底色变化（§5.3）—— 接受还是要调回 `#171b26`
- 全屏辉光的感觉（§7）
- 窗口宽度拖到 768 / 375 附近，看有没有半行

- [ ] **Step 9: 删掉临时产物**

```bash
rm -f _variants.html _tmpl.html _probe.html
rm -rf .superpowers/shots/before .superpowers/shots/after .superpowers/shots/final
ls _*.html 2>&1 | head -3
git status --short
```

Expected: `ls` 报 no matches（临时页都清掉了）。`git status` 里是本次改动的正常清单 —— `assets/theme.css`、`assets/preview.js` 是新增，其余是被改的文件。**不要 commit** —— 用户说了「先别提交」。

---

## 做完之后仍然开着的（不属于本计划）

- 两个 releases 仓库还没建 → 版本号与下载按钮仍是降级态（旧规格遗留）
- 第二步：把 `example1.html` / `example2.html` 接成项目详情页，并给两份落地页补浅色。`theme.css` 的可覆盖点（`--accent` / `--accent-dim` / `--accent-bg`）就是为它留的
