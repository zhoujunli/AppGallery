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
 * 纯函数：要从 GitHub 拉哪些仓库 —— 去重，并跳过没填 releasesRepo 的项目。
 * releasesRepo 是可选字段（小程序项目没有 GitHub Releases）；漏掉这一步就会去请求
 * https://api.github.com/repos/undefined/releases，然后整个脚本 exit 1、versions.json 不写。
 */
export function releaseRepos(projects) {
  if (!Array.isArray(projects)) return [];
  return [
    ...new Set(
      projects
        .map((p) => (p && typeof p.releasesRepo === 'string' ? p.releasesRepo.trim() : ''))
        .filter((repo) => repo !== '')
    )
  ];
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
  const repos = releaseRepos(projects);
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
