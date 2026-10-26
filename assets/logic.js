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
   * 项目的 GitHub Releases 页。releasesRepo 是可选字段（小程序、纯展示项目不填），
   * 没填就返回 null —— 调用方据此不画那个按钮，而不是拼出
   * 'https://github.com/undefined/releases' 这么一条死链。
   */
  function releasesPageUrl(project) {
    var repo = project && typeof project.releasesRepo === 'string' ? project.releasesRepo : '';
    if (repo.trim() === '') return null;
    return 'https://github.com/' + repo + '/releases';
  }

  /**
   * 详情页下载区那句空态文案。
   *
   * "有没有 releasesRepo" 在 "拉到了没有" 前面判：前者是项目的属性，后者是
   * 这一次网络的结果。顺序反过来，整批拉取失败时没有仓库的项目会显示
   * 「版本信息暂不可用。」—— 它本来就没有版本号，这句话是凭空造出来的。
   */
  function downloadEmptyText(project, state) {
    if (!releasesPageUrl(project)) return '这个项目没有可下载的安装包。';
    return state && state.status === 'failed' ? '版本信息暂不可用。' : '还没有可下载的版本。';
  }

  /**
   * 详情页顶部那条"版本取不到"的提示条该不该出现。
   * 那条话里有一句"下载可直接去仓库的 Releases 页"，对没有仓库的项目指不到任何地方。
   */
  function shouldShowVersionNotice(project, state) {
    if (!releasesPageUrl(project)) return false;
    return !!(state && state.status === 'failed');
  }

  /**
   * 卡片上版本号那个位置该写什么（spec §7 那张表的三种情况）。
   *
   * 没有 releasesRepo 的项目（小程序）先走掉，返回空串。
   * 这一步不能省：versions.json 是整批拉的，拉不到时所有卡片一起写
   * 「版本信息暂不可用」—— 那张卡片就会在说一个它从来没有的东西"暂时拿不到"。
   * 小程序不是"版本号暂时取不到"，是压根没有版本号这回事。
   */
  function versionLabel(project, state) {
    var repo = project && typeof project.releasesRepo === 'string' ? project.releasesRepo : '';
    if (repo.trim() === '') return '';
    // status 是 loadVersions 那两个：ready / failed。loading 只出现在详情页
    // （那时卡片上是一条脉冲条，根本不走这里），万一走到就什么都不说。
    if (state && state.status === 'ready') {
      var id = project && typeof project.id === 'string' ? project.id : '';
      var groups = groupByVersion(state.byProject && state.byProject[id]);
      return groups.length === 0 ? '' : 'v' + groups[0].version;
    }
    // 全批拉不到和单个拉不到在这里分不开，统一按"拉不到"说（spec §7）
    return state && state.status === 'failed' ? '版本信息暂不可用' : '';
  }

  // ---------- 卡片预览 ----------
  // 上界不是随手定的形状检查，而是版面预算：超过就装不进卡片里那个
  // 140px 高的窗口（见 spec §6.1/§6.2）。
  var PREVIEW_LIMITS = {
    terminalLines: [3, 4],   // [最少, 最多]
    nav: [2, 5],
    navActiveMax: 2,         // 窄屏侧栏只显示前 3 项，高亮项必须落在前 3 项之内
    columns: [2, 3],
    rows: [1, 3],
    phoneRowCells: 2         // phone 每行固定两格：左主文案、右进度或状态
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

    if (pv.kind === 'phone') {
      if (!Array.isArray(pv.rows)) return null;
      if (pv.rows.length < PREVIEW_LIMITS.rows[0] || pv.rows.length > PREVIEW_LIMITS.rows[1]) return null;

      var phoneRows = [];
      for (var q = 0; q < pv.rows.length; q++) {
        // 每行正好两格，多一格少一格都画不出那一行
        var phoneRow = cleanTextList(pv.rows[q], PREVIEW_LIMITS.phoneRowCells, PREVIEW_LIMITS.phoneRowCells);
        if (!phoneRow) return null;
        phoneRows.push(phoneRow);
      }

      return { kind: 'phone', title: title, rows: phoneRows };
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
    releasesPageUrl: releasesPageUrl,
    versionLabel: versionLabel,
    downloadEmptyText: downloadEmptyText,
    shouldShowVersionNotice: shouldShowVersionNotice,
    normalizeVersions: normalizeVersions,
    normalizePreview: normalizePreview,
    previewStatusTone: previewStatusTone
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AppGalleryLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
