# AppGallery 视觉深化设计（第一步）

> 本规格是 [`2026-10-08-appgallery-design.md`](2026-10-08-appgallery-design.md) 的**修订**，不是新项目。
> 站点的结构、数据模型、下载逻辑、部署方式一律沿用旧规格，本文只动「看起来怎么样」。

## 1. 这份规格管什么

用户提出两件事：

1. 把 `example1.html`（ClaudePocket）和 `example2.html`（商会通）这两个落地页接进来当项目详情页；
2. 现在的 `index.html` 不好看。

第二件事的成因不是配色，是**空**：首页只有一条 hero 加一个三列网格，两个项目放进去右边空一格，往下全是大片空白。

经确认，分两步做，本文只覆盖**第一步**：

- 首页结构完全不动（导航 / hero / 筛选 / 三列网格 / 页脚），只把观感做到两个 example 的水准；
- 卡片里换成用 HTML/CSS 画的界面预览。

**第二步（把 example 接成详情页、并给落地页补一套浅色）另立规格。** 本文为它打的地基是第 5 节的令牌 —— 两边共用同一套词汇，第二步的浅色只写一遍。

### 1.1 取代旧规格的哪几节

| 旧规格 | 处置 |
|---|---|
| §5.1 色彩表 | **被本文 §5 取代**。令牌改名并扩充（`--panel`→`--bg-card` 等） |
| §5.1.1 第 3 条（浅色下的 hero 光晕） | **被本文 §7 取代**。光晕从 hero 内的局部灯改成全屏固定层 |
| §5.2 卡片 | **被本文 §6 取代**。旧规格「无截图，所以渐变条是卡片的视觉主体；图标本身充当封面」的前提不再成立 —— 现在卡片里有一块画出来的界面预览，图标不再是唯一的封面 |
| §5.4 字体 | 本文 §9 **补充**（字号、字距、抗锯齿） |
| §5.3 响应式断点、§5.5 无障碍、§5.6 移动端、§5.7 主题切换 | 不变，本文只在涉及处补充 |

## 2. 目标与非目标

**目标**

- 首页在深/浅两套主题下的观感，达到 `example1.html` / `example2.html` 的水准：有层次、有内容感、不空。
- 卡片一眼能看出「这是个什么应用」，而不只是「一个名字 + 一条色带」。
- 为第二步铺好路：一套两边共用的令牌，落地页补浅色时不重复劳动。

**非目标**

- 不动首页的页面结构（不加章节、不改网格列数、不换 hero 布局）。
- 不做第二步（接 example、给落地页补浅色）。
- 不给详情页兜底模板加界面预览 —— 第二步之后那里会被 example 自己的预览取代，现在画是浪费。
- 不引入构建工具、框架、CSS 预处理器。站点现在无构建，保持无构建。

## 3. 关键决策一览

| 决策 | 选择 | 理由 |
|---|---|---|
| 整体路径 | 抽出共用设计系统（`assets/theme.css`） | 第二步要给两份 25KB 落地页补浅色，共用令牌是唯一能让它不翻倍的做法；而且两边色值本来就几乎逐条相同 |
| 卡片版式 | **甲**：窗口贴卡片右下边被裁掉，图标压在舞台左下角 | 三套候选里唯一既有层次、又读得出「这是个什么界面」的（见 §6.1） |
| 模拟界面怎么来 | 布局在代码里（模板），文字在数据里（`projects.js`） | 守住既有分层，也守住「数据绝不进 `innerHTML`」那条规矩 |
| 辉光 | 换成 example 的 `position: fixed` 全屏层 | 顺带消掉上一次那个硬边 bug 的**根因** —— 没有盒子边界可裁了 |
| 入场动效 | 默认可见，JS 跑起来才加 `.reveal` | example 把 `opacity: 0` 写在 CSS 里，无 JS 时整页全白；反过来做可渐进增强 |
| 组件级令牌 | 删掉 `--badge-*` / `--btn-quiet-*` 五个 | 用 `--accent` / `--accent-dim` 直接表达，与 example 的做法一致 |

## 4. 文件与分层

**新增**

| 文件 | 职责 |
|---|---|
| `assets/theme.css` | 唯一的色值来源。令牌（深/浅两套）+ 基础件。基础件里 `.panel` `.chip` `.tag` `.panel-label` 四个是**从 `style.css` 搬过来**的（它们现在就在那儿，只是带着色值），另加 example 那一路的 `.panel-head` / `.panel-body`、`.btn` `.btn-primary` `.btn-quiet`、`.reveal` |
| `assets/preview.js` | 卡片里模拟界面的构造器。按 `kind` 分发到模板，用 `createElement` 搭 DOM 返回节点 |

**改动**

| 文件 | 改什么 |
|---|---|
| `assets/style.css` | 瘦成「本站版式」：nav / hero / 网格 / 卡片 / 详情页布局 / 页脚。带色值的四个组件移去 `theme.css`；**自己不再定义任何色值**，一律引 `theme.css` |
| `index.html` `project.html` `404.html` | 在 `style.css` 之前加 `<link rel="stylesheet" href="assets/theme.css">` |
| `projects.js` | 加可选字段 `preview` |
| `assets/app.js` | `cardNode()` 里把现在那条纯色 `card-strip` 交给 `preview.js`；加 `.reveal` 的挂载 |
| `assets/logic.js` | 加纯函数 `normalizePreview(project)` |
| `scripts/validate-projects.mjs` | 校验 `preview` 的形状 |
| `tests/` | `normalizePreview` 的单测；校验器的新用例 |

**不动**：`scripts/fetch-releases.mjs`、`docs/deploy.md`（部署是 `ossutil cp -r assets/` 整目录上传，新文件自动带上）、部署产物清单。

**加载顺序**：`theme.css` → `style.css`。两者都是普通 `<link>`，`file://` 双击打开照常。

## 5. 令牌

`assets/theme.css` 定义。以 example 的词汇为准，本站原来的名字并进去。

### 5.1 全量表

| 令牌 | 深色（默认） | 浅色 | 用途 | 本站旧名 |
|---|---|---|---|---|
| `--bg` | `#0b0d10` | `#ffffff` | 页面底色 | `--bg` |
| `--bg-soft` | `#111419` | `#f7f8fa` | 次级面（安静按钮、列表当前项） | — |
| `--bg-card` | `#14181e` | `#ffffff` | 卡片 / 面板 / 预览窗口 | `--panel` |
| `--line` | `#232a33` | `#e8eaef` | 主描边 | `--border` |
| `--line-soft` | `#1b2128` | `#f0f2f5` | 内部分隔线 | — |
| `--fg` | `#e6edf3` | `#0f1115` | 主文字 | `--text` |
| `--fg-dim` | `#9aa7b4` | `#5b6274` | 次要文字 | `--muted` |
| `--fg-faint` | `#66727e` | `#9aa1b2` | 极次要文字、版本号 | `--dim` |
| `--accent` | `#a5b4fc` | `#4f46e5` | 强调色（徽章文字、focus、预览里的提示符与高亮条） | `--badge-text` |
| `--accent-dim` | `#2c3350` | `#ddd6fe` | 强调色的描边 | `--badge-border`、`--btn-quiet-border`（深色下两者同值） |
| `--accent-bg` | `transparent` | `#f5f3ff` | 强调色的底 | `--badge-bg` |
| `--blue` | `#7cc4ff` | `#2563eb` | 语义色 | — |
| `--amber` | `#f0b46a` | `#b45309` | 语义色（待办、草稿） | — |
| `--purple` | `#b39dff` | `#7c3aed` | 语义色 | — |
| `--red` | `#ff7b72` | `#dc2626` | 语义色（驳回、停用） | — |
| `--ok` | `#6ee7b7` | `#047857` | 语义色（已通过、发布） | — |
| `--brand-a` | `#6366f1` | 同 | 品牌两停渐变的起点 | `--brand-a` |
| `--brand-b` | `#d946ef` | 同 | 品牌两停渐变的终点 | `--brand-b` |
| `--glow-1` | `rgba(99,102,241,.30)` | `rgba(99,102,241,.10)` | 全屏辉光第一层 | `--hero-1` |
| `--glow-2` | `rgba(217,70,239,.18)` | `rgba(217,70,239,.08)` | 全屏辉光第二层 | `--hero-2` |
| `--icon-bg` | `#0b0d10` | `#ffffff` | 图标衬底 | `--icon-bg` |
| `--shadow` | `none` | `0 1px 3px rgba(16,24,40,.05)` | 卡片投影 | `--shadow` |
| `--radius` | `14px` | 同 | 统一圆角 | — |
| `--maxw` | `1120px` | 同 | 内容区最大宽度 | — |
| `--mono` `--sans` | 照 example 原值 | 同 | 字体栈 | 同 |

深色的 `--bg` 由 `#0b0d12` 改成 `#0b0d10`，与 example 对齐 —— 差 2 个色阶，肉眼不可辨，但对齐之后两边就是同一套值。

浅色里 `--blue` `--amber` `--purple` `--red` `--ok` 是**新配的**：深色那五个是「在暗底上发光」的高明度色，直接搬到白底上会看不清，所以浅色另取一组深一档的值。

**每个项目的 `theme` 渐变仍然两套主题共用、不重新取色**（旧规格 §5.1 的这条不变）—— 颜色来自项目图标本身，不随主题变。

`--accent` / `--accent-dim` / `--accent-bg` 是**可覆盖的**：本站页面用上表的值；第二步落地页各自覆盖成产品自己的强调色（商会通是靛蓝、ClaudePocket 是薄荷绿），这正是 example 现在各自做的。

### 5.2 组件级令牌的去向

`--badge-bg` `--badge-border` `--badge-text` `--btn-quiet-bg` `--btn-quiet-border` 五个删掉：

- 徽章 → `color: var(--accent)` + `border-color: var(--accent-dim)` + `background: var(--accent-bg)`
- 安静按钮 → `background: var(--bg-soft)` + `border: 1px solid var(--line)`

徽章那三行是**等值替换** —— `--accent` 深色取的就是旧的 `--badge-text` 值，`--accent-dim` 深色取的就是旧的 `--badge-border` 值 —— 改完像素不变。安静按钮不是，见下表。

### 5.3 观感差异清单

改名本身应当像素不变，除了下面这几处**已知并接受**的差异。它们全都是「旧的写法和 example 不一致」，不是顺手改的。

| 位置 | 现在 | 改成 | 判断 |
|---|---|---|---|
| 页面底色 | `#0b0d12` | `#0b0d10` | 差 2 个色阶，不可辨。对齐 example |
| 卡片 / 面板面 | `#14171f` | `#14181e` | 不可辨 |
| 主描边 | `#232833` | `#232a33` | 不可辨 |
| 主文字 | `#e8ecf4` | `#e6edf3` | 不可辨 |
| 次要文字 | `#8b93a7` | `#9aa7b4` | 略亮，可辨 |
| **极次要文字** | `#4b5163` | `#66727e` | **明显变亮**。`#4b5163` 压在深底上本来就偏暗（版本号、平台标签在用），换成 example 的值更好读 |
| **安静按钮底（深）** | `#171b26` | `#111419` | **从比面板亮变比面板暗**：凸起 → 凹陷。两种都成立；不喜欢就把深色的 `--bg-soft` 调回 `#171b26`（代价：预览窗口里侧栏当前项也跟着变亮） |
| 安静按钮描边（深） | `#2c3350` | `#232a33` | 紫色调消失，变中性 |
| **安静按钮底（浅）** | `#ffffff` | `#f7f8fa` | **这其实是修 bug**：现在浅色下按钮是白底压在白色页面上，基本看不出边界 |
| 安静按钮描边（浅） | `#c7cbd6` | `#e8eaef` | 变淡 —— 底色既然有边界了，描边就跟 `--line` 走 |

### 5.4 改名的规模与验收

实测 `style.css` 里 `var()` 引用共 **70 处**，其中要跟着改名的 **53 处**，集中度很不均：

| 令牌 | 引用数 | |
|---|---|---|
| `--muted` → `--fg-dim` | 16 | 最多，漏一处最显眼 |
| `--border` → `--line` | 11 | |
| `--text` → `--fg` | 8 | |
| `--badge-text` → `--accent` | 5 | |
| `--panel` → `--bg-card` | 3 | |
| `--bg` | 3 | 名字不变，只改值 |
| `--dim` → `--fg-faint` | 2 | |
| `--hero-1` `--hero-2` → `--glow-1` `--glow-2` | 各 1 | |
| 五个组件令牌 → 表达式 | 各 1 | |
| **不变**：`--brand-a`(4) `--brand-b`(3) `--mono`(6) `--shadow`(2) `--icon-bg`(1) | 16 | |

`node --test` **覆盖不到 CSS**，所以这一步不靠测试，靠：改名前把三个页面在深/浅两套下各截一遍图存档，改完再截一遍，逐张对比 —— **只允许 §5.3 那几处现形，其余像素级一致。**

## 6. 卡片与模拟界面

### 6.1 卡片解剖（甲）

三套候选都做过真实渲染（`_variants.html`，临时页，定稿后删）。选甲：

| 候选 | 判断 |
|---|---|
| **甲 · 窗口贴右下边被裁掉 + 图标压角** | **选它**。裁切让它读起来像「截图从卡片里露出来」，图标压角有层次；商会通那张尤其成立 —— 侧栏 + 表格 + 状态胶囊挤在一个角里，一眼就知道是个后台 |
| 乙 · 素舞台（无窗口框，文字浮在色条上） | 弃。薄荷色那半段渐变上白字读不清，补一层压暗遮罩才勉强能看，但一压薄荷色就脏了 |
| 丙 · 窗口居中 + 图标进标题栏 | 弃。那一圈渐变变成很粗的彩色边框，吵；图标进标题栏之后「变小」了，作品集该有的分量没了；内容还会从中间切断一行，像 bug 而不是设计 |

```
┌─ .card-strip ──── 项目 theme 的渐变（135deg） ──────────┐
│  ┌─ .card-stage ── --bg-card 面 + 1px --line 描边 ───┐  │
│  │  ┄┄ 标题栏（mono 小字）                            │  │
│  │  模拟界面的内容                                    │  │
│  └────────────────────────────────────────────────────┘ │ ← 右边和下边没有描边，
│  ▣ 图标（左下，紧靠舞台左边，往下伸 18px 进卡片正文）        │    贴着卡片边缘被裁掉
└──────────────────────────────────────────────────────────┘
```

| 部件 | 几何 |
|---|---|
| `.card-strip` | 高 140px（≥768px）/ 104px（<768px）；`position: relative`；**不设 `overflow`** |
| `.card-stage` | `position: absolute; left: 64px; top: 16px; right: 0; bottom: 0`；`--bg-card` 面、`1px solid --line`、**右边和下边不描边**、`border-radius: 9px 0 0 0`、`overflow: hidden` |
| `.card-icon` | **位置不变**：`left: 14px; bottom: -18px`、44px、圆角 12px、`z-index: 2` |
| 手机端 | 色条 104px，舞台 `left: 54px; top: 12px`；内容按整行减少，见下 |

**`.card-strip` 绝不能设 `overflow: hidden`。** 图标往下伸 18px 进卡片正文，色条一旦裁剪就把图标切掉半个 —— 这是做候选时真实踩到的坑。舞台自己的 `overflow: hidden` 已经足够裁掉它内部的内容；舞台贴着卡片右/下边、不需要色条再裁。

**排版约束**：舞台左边缘在 64px，图标右沿在 14 + 44 = 58px，中间留 6px。图标并不压住舞台，而是紧挨着站在它左边、同时往下伸 18px 进卡片正文。这三个数值（`left: 64px` / `left: 14px` / `bottom: -18px`）是候选页上实际渲染过、你挑中的那一版，照搬，不要顺手调。

**内容行数**：预览是缩略图，不追求显示全部。规则是——

- **桌面端**（色条 140px）：数据里给了几行就完整显示几行，**一行都不截半截**。§6.3 定的「终端 4 行、后台 3 行 + 表头」就是按这个高度算出来的预算。
- **窄屏**（色条 104px）装不下，**按整行 / 整项隐藏**：终端留 3 行，后台侧栏留 3 项、表格留 2 行。用 CSS `:nth-child(n+N)` 隐藏。
- **不许出现被切断的半行。** 半行看起来像 bug 而不是设计 —— 这是候选丙（窗口居中）被否掉的直接原因。
- 字号与行距的具体值，在实现时按「桌面端正好装下 4 行且不溢出」反推，本文不写死。

卡片其余部分（`.card-body` 的 `padding: 28px 16px 16px`、`.card-name`、`.card-tagline`、`.card-meta`、整卡是 `<a>`、`border-radius: 14px`）全部不变。

### 6.2 数据模型 `preview`

`projects.js` 里每个项目加一个**可选**字段：

```js
preview: {
  kind: 'terminal' | 'admin',   // 必填，决定用哪个模板
  title: '…',                   // 必填，窗口标题栏文字

  // kind === 'terminal' 时必填
  lines: ['…'],                 // 3–4 条，一条一行

  // kind === 'admin' 时必填
  nav: ['…'],                   // 侧栏项，2–5 条
  active: 0,                    // 高亮第几项，0 ≤ active ≤ 2
  columns: ['…'],               // 表头，2–3 列
  rows: [['…']]                 // 数据行，1–3 行，每行长度等于 columns.length
}
```

这些上下界不是随手定的形状检查，而是**版面预算** —— 超过就装不进 §6.1 的窗口。`active ≤ 2` 这一条尤其要说清楚：窄屏侧栏只显示前 3 项，如果 `active` 指到第 4 项，高亮就在窄屏被隐藏掉了。所以直接在数据层禁掉这种组合，而不是在 CSS 里想办法。

**分工**：布局在代码里（`preview.js` 的模板），**文字在数据里** —— 模板用 `textContent` 填字，与 `app.js` 现有做法一致，参数值绝不进 `innerHTML`。

**没有 `preview` 的项目**照旧走现在那条纯色渐变条。字段可选、不填不报错，以后加新项目可以先不加预览。

### 6.3 两个模板

`kind: 'terminal'` —— 标题栏（三个点 + mono 标题）+ 若干行 mono 文字。首行是提示符行，前缀 `❯` 用强调色；以 `✓` 开头的行用 `--ok`。

`kind: 'admin'` —— 标题栏 + 一列 mini 侧栏（`active` 那项加左侧 2px 强调色竖条 + `--bg-soft` 底）+ 一张小表（表头 `--fg-faint`，数据行首列 `--fg`、其余 `--fg-dim`）。最后一列按词着色：

| 词 | 色 |
|---|---|
| 待审批、草稿 | `--amber` |
| 已通过、已发布、启用 | `--ok` |
| 已退回、已驳回、停用 | `--red` |
| 其它 | `--fg-dim`，无胶囊 |

**已填好的内容**（照抄 `example1.html` / `example2.html` 里真实的界面文字，不是我编的 —— 只有终端那几行是**摘**的）：

```js
// claudepocket
preview: {
  kind: 'terminal',
  title: 'claudepocket — zsh',
  lines: [
    '❯ 把退款的测试补上',
    '⏺ Edit src/refund/handler.ts',
    '补了三个用例：负数、超额、重复。',
    '✓ 32 passed'
  ]
}

// chamberconnect
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
}
```

后台那段是原样搬的（原来就是三行三列，正好在预算内）。终端那段**砍了两行**：example1 的终端是六行，140px 的窗口装不下，去掉了 `⏺ Read` 和 `⏺ Bash` 两条中间步骤。留下的四行仍是一条完整的话 —— 提问 → 改文件 → 说明了改了什么 → 测试通过。当缩略图看，四行比六行还清楚。

### 6.4 无障碍

- `.card-stage` 整体 `aria-hidden="true"`，内部**不含任何可聚焦元素**（纯 `span`/`div`）。
- 卡片的可访问名字仍来自 `.card-name` + `.card-tagline`，不因预览而改变。
- 预览是装饰，不进 tab 顺序，也不被读屏朗读。

### 6.5 纯函数

`assets/logic.js` 新增 `normalizePreview(project)`：返回一个规范化的预览对象，**拿不到合法预览时返回 `null`**（调用方据此回退到纯色条）。

它不是校验器的复制品，而是运行时的兜底：`projects.js` 是手写的，可能出现「改了数据但没跑校验」的情况，页面不能因此白屏或抛错。

## 7. 辉光

现在的 `.hero::before` 是 hero 盒子内的两层径向渐变。盒子边界正好横切过还没衰减完的渐变，左右各留一条竖直硬边 —— 上次是用 `mask-image` 把左右各 12% 柔化遮过去的（`style.css` 里那段带注释的 hack）。

改成 example 的做法，**根因消失**：

```css
.bg-glow {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(560px 380px at 8% 4%, var(--glow-1), transparent 70%),
    radial-gradient(680px 420px at 78% -8%, var(--glow-2), transparent 70%);
}
```

- `.hero::before` 与那段 `mask-image` **一并删掉**。
- `nav` / `main` / `footer` 加 `position: relative; z-index: 1`，压在辉光之上。
- 三个页面都在 `<body>` 开头加一个 `<div class="bg-glow" aria-hidden="true"></div>`。

**这是观感性质的改变，需要你确认**：光从「hero 标题旁边的一盏灯」（局部、随内容滚动）变成「整个页面的环境光」（全屏、固定不动）。这是 example 的效果。若想要原来那种局部灯，就不要本节，保留 `.hero::before` 和那段 mask。

## 8. 动效

卡片入场：淡入 + 上移 14px。

**渐进增强，方向与 example 相反**：example 把 `opacity: 0` 直接写在 CSS 里，没有 JS 时整页全白。本站改成——

- CSS 里只有 `.reveal { opacity: 0; transform: translateY(14px); transition: … }` 和 `.reveal.in { opacity: 1; transform: none }`；
- **由 JS 决定要不要加 `.reveal`**：`IntersectionObserver` 存在才加。不存在（老浏览器、JS 被禁）就一个类都不加 —— 卡片默认可见。

```css
@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal.in { opacity: 1; transform: none; transition: none; }
}
```

站点已有 `prefers-reduced-motion` 的规则块（`.version-loading` 的脉冲、`.card` 的过渡），照同一个口径。

`.card:hover` 的 `translateY(-2px)` + 描边变色保持不变。

## 9. 排版

| 项 | 现在 | 改成 |
|---|---|---|
| 正文 | 15px / 1.6 | **16px / 1.7** |
| 抗锯齿 | 无 | `-webkit-font-smoothing: antialiased` |
| 标题 | `letter-spacing: -.025em` | 保持，各级统一到 `-.02em` 起步 |
| 面板标签（`.panel-label`） | 12px `--muted`，已有 `.08em` 字距 | 换成 mono 字体 + `--fg-faint`（kicker 那一路）。字距已经是 `.08em`，不动 |

## 10. 校验与测试

**`scripts/validate-projects.mjs`** 增补（`preview` 可选，填了才校验）：

- `kind` 必须是 `'terminal'` 或 `'admin'`
- `title` 必须是非空字符串
- `kind === 'terminal'` → `lines` 是非空字符串数组、长度 3–4
- `kind === 'admin'` → `nav` 非空字符串数组（2–5）、`active` 是整数且 `0 ≤ active ≤ 2`（不是 `active < nav.length`，见 §6.2 的理由）、`columns` 非空字符串数组（2–3）、`rows` 每项是字符串数组且长度等于 `columns.length`（1–3 行）

**`tests/`** 新增：

- `normalizePreview` 的单测：合法 terminal / 合法 admin / 缺字段 / `kind` 未知 / `active` 越界 → 各自返回什么
- 校验器的新用例：每种非法形状各一条

**`npm test` 与 `npm run validate` 必须全绿。**

## 11. 验收

**我自己跑的（客观）**

1. 渲染矩阵：`index` / `project?p=claudepocket` / `project?p=chamberconnect` / `404` × 深/浅，各一张。
2. 一个**不填 `preview` 的项目 fixture**，确认回退到纯色条、不报错。
3. `prefers-reduced-motion` 下确认没有位移动画。
4. 窄屏（375px / 768px）各一张。
5. 辉光用像素采样脚本确认左右边界处**没有色彩跳变**（沿用查上次那个硬边 bug 的方法）。
6. 改名前后三页的截图逐张对比（§5.4）。

**交给用户的（主观）**

把站点跑起来，自己在浏览器里过一遍：首页深浅两套、卡片预览的观感、安静按钮那处底色变化（§5.2）、辉光改成全屏环境光之后的感觉（§7）。

## 12. 明确不做

- 不接 example 当详情页、不给落地页补浅色（**第二步**）
- 不动首页结构：不加章节、不改三列网格、不换 hero 布局
- 不给详情页兜底模板加预览
- 不做 `.kicker` 这个组件（首页没有用它的地方）。§9 里说的「kicker 那一路」指的是那套排版口径 —— mono 字体 + 宽字距 + 极弱的颜色 —— 不是要造一个组件出来
- 不引入构建工具、框架、CSS 预处理器
- 不改部署流程与产物清单

## 13. 已知代价

1. **卡片从 76px 长到 140px**，一屏能看到的卡片变少。项目只有两个，这不构成问题；项目多起来之后要重新想。
2. **`style.css` 里 53 处引用要改名，测试覆盖不到**。这是本次最容易出错的一步：靠改名前后逐张截图对比兜底（§5.4），而且改完会有 §5.3 那几处**故意**不一致，对比时别误判成错误。
3. **`assets/theme.css` 要跟第一步之后的两份落地页同步**。第二步之前它只有本站一个消费者，第二步开始时才真正考验这套词汇是否够用。
4. **卡片不再能双击 `file://` 之外的方式验证** —— 预览是运行时建的 DOM，`file://` 下正常（无 fetch），但 `preview.js` 必须在 `app.js` 之前加载，加载顺序成了新的隐式依赖。
