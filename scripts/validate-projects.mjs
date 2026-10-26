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
// miniprogram 是给没有安装包的形态留的（博物游：微信小程序）。
// 它同时绕开「只挂 web 就必须给 liveUrl」那条 —— 小程序可以没有可点的线上地址。
const PLATFORMS = ['android', 'desktop', 'web', 'miniprogram'];

// 落地页路径。它会被直接写进卡片的 href，所以形状必须卡死：
// 只允许 projects/ 下的 .html，挡掉 javascript: 之类的伪协议和 ../ 越界。
const PAGE_RE = /^projects\/[a-z0-9][a-z0-9-]*\.html$/;

const PREVIEW_KINDS = ['terminal', 'admin', 'phone'];

// 与 assets/logic.js 的 PREVIEW_LIMITS 必须一致。
// 那边是运行时兜底（返回 null），这边是构建期报错（挡住部署），
// 一个松一个紧就等于没有约束。
const PREVIEW_LIMITS = {
  terminalLines: [3, 4],
  nav: [2, 5],
  navActiveMax: 2,
  columns: [2, 3],
  rows: [1, 3],
  phoneRowCells: 2
};

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

  // kind === 'phone'：手机屏。顶部一条导航条 + 每行两格，没有表头、没有侧栏。
  if (pv.kind === 'phone') {
    if (!Array.isArray(pv.rows) || pv.rows.length < PREVIEW_LIMITS.rows[0] || pv.rows.length > PREVIEW_LIMITS.rows[1]) {
      errors.push(`${at}：preview.rows 必须是 ${PREVIEW_LIMITS.rows[0]}–${PREVIEW_LIMITS.rows[1]} 行的数组`);
      return;
    }
    pv.rows.forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== PREVIEW_LIMITS.phoneRowCells) {
        const got = Array.isArray(row) ? row.length : 0;
        errors.push(`${at}：preview.rows 第 ${i + 1} 行要有 ${PREVIEW_LIMITS.phoneRowCells} 格，现在有 ${got} 格`);
        return;
      }
      if (row.some((c) => typeof c !== 'string' || !c.trim())) {
        errors.push(`${at}：preview.rows 第 ${i + 1} 行必须是非空字符串数组`);
      }
    });
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

export function validateProjects(projects, options = {}) {
  const iconExists = options.iconExists || (() => true);
  const pageExists = options.pageExists || (() => true);
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

    // 可选：没有 GitHub Releases 的项目不填，卡片与详情页都不显示下载入口。
    // 但一旦填了就必须是 owner/repo —— 拼错的仓库名会渲染成一条通往 404 的链接。
    if (p.releasesRepo !== undefined && (typeof p.releasesRepo !== 'string' || !REPO_RE.test(p.releasesRepo))) {
      errors.push(`${at}：releasesRepo 必须是 owner/repo 格式`);
    }

    if (p.icon !== undefined) {
      if (typeof p.icon !== 'string' || !p.icon.trim()) {
        errors.push(`${at}：icon 若填写必须是非空字符串`);
      } else if (!iconExists(p.icon)) {
        errors.push(`${at}：图标文件不存在 —— ${p.icon}`);
      }
    }

    if (p.page !== undefined) {
      if (typeof p.page !== 'string' || !PAGE_RE.test(p.page)) {
        errors.push(`${at}：page 若填写必须是 projects/<名字>.html（只能用 /^projects\\/[a-z0-9][a-z0-9-]*\\.html$/）`);
      } else if (!pageExists(p.page)) {
        errors.push(`${at}：落地页文件不存在 —— ${p.page}`);
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

    validatePreview(p, at, errors);

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
    iconExists: (rel) => existsSync(join(ROOT, rel)),
    pageExists: (rel) => existsSync(join(ROOT, rel))
  });

  if (errors.length) {
    console.error('projects.js 校验未通过：');
    errors.forEach((e) => console.error('  ✗ ' + e));
    process.exit(1);
  }
  console.log(`projects.js 校验通过（${projects.length} 个项目）`);
}
