/**
 * AppGallery DOM 层。
 * 纯计算都在 assets/logic.js 里，这里只负责碰 DOM。
 */
(function () {
  'use strict';

  var L = window.AppGalleryLogic;

  /* 主题（data-theme 的定值与切换）在 assets/theme.js —— 四个页面共用一份，
     它自己接 DOM，这里不用管。 */

  // ---------- 数据 ----------
  // 两个词汇表是两套 key，别混。这张表的键是 projects.js 里声明的平台名。
  // versions.json 里的系统 token（windows/macos/android）走 Task 7 的 OS_LABEL。
  var PLATFORM_LABEL = { android: 'Android', desktop: '桌面端', web: 'Web', miniprogram: '小程序' };
  var PLATFORM_ORDER = ['android', 'desktop', 'web', 'miniprogram'];

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
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // 项目色圆点的光晕。hex 来自 projects.js，非法值就安静地退回透明。
  function hexToRgba(hex, alpha) {
    var match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!match) return 'transparent';
    return 'rgba(' + parseInt(match[1], 16) + ', ' +
                    parseInt(match[2], 16) + ', ' +
                    parseInt(match[3], 16) + ', ' + alpha + ')';
  }

  // 没有发布渠道的小程序是「已下线」，有线上地址的是「在线」。
  // 这不是新数据，只是从 projects.js 现有的字段里读出来。
  function statusLabel(project) {
    if (project.liveUrl) return '在线';
    if (!project.releasesRepo) return '已下线';
    return '';
  }

  function cardNode(project, index) {
    var card = document.createElement('a');
    card.className = 'card reveal';
    // 声明了落地页就直接去落地页；没声明的项目仍旧走生成的详情页。
    // 这是「增强项」口径（Review Focus 1）：page 缺失或为空都安静地退回老路径。
    card.href = project.page || ('project.html?p=' + encodeURIComponent(project.id));
    card.setAttribute('data-platforms', (project.platforms || []).join(' '));

    var theme = project.theme || ['#6366f1', '#8b5cf6'];
    card.style.setProperty('--c', theme[0]);

    var top = document.createElement('span');
    top.className = 'card-top';

    var no = document.createElement('span');
    no.className = 'card-index';
    no.textContent = pad2(index + 1);
    top.appendChild(no);

    var iconWrap = document.createElement('span');
    iconWrap.className = 'icon-wrap';
    iconWrap.appendChild(iconNode(project, 'card-icon'));
    top.appendChild(iconWrap);

    var dot = document.createElement('span');
    dot.className = 'card-dot';
    dot.style.background = theme[0];
    dot.style.boxShadow = '0 0 0 5px ' + hexToRgba(theme[0], .16);
    top.appendChild(dot);

    card.appendChild(top);

    var name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = project.name || project.id;
    card.appendChild(name);

    var tagline = document.createElement('span');
    tagline.className = 'card-tagline';
    tagline.textContent = project.tagline || '';
    card.appendChild(tagline);

    var tags = document.createElement('span');
    tags.className = 'card-tags';
    PLATFORM_ORDER.forEach(function (p) {
      if ((project.platforms || []).indexOf(p) === -1) return;
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = PLATFORM_LABEL[p];
      tags.appendChild(chip);
    });

    var status = statusLabel(project);
    if (status) {
      var statusChip = document.createElement('span');
      statusChip.className = 'chip chip-status';
      statusChip.textContent = status;
      tags.appendChild(statusChip);
    }

    var slot = document.createElement('span');
    slot.className = 'chip card-version';
    slot.setAttribute('data-version-slot', project.id);
    slot.innerHTML = '<span class="version-loading"></span>';
    tags.appendChild(slot);
    card.appendChild(tags);

    // 预览是增强项：任何一个环节缺了都安静地跳过，退化成纯色块（Review Focus 1）
    var thumb = document.createElement('span');
    thumb.className = 'card-thumb';
    var preview = L.normalizePreview(project);
    var Preview = window.AppGalleryPreview;
    if (preview && Preview && typeof Preview.build === 'function') {
      var stage = Preview.build(preview);
      if (stage) {
        stage.setAttribute('aria-hidden', 'true');   // 纯装饰，不进读屏、不进 tab 顺序
        thumb.appendChild(stage);
      }
    }
    if (!thumb.firstChild) {
      thumb.style.background = 'linear-gradient(135deg, ' + theme[0] + ', ' + theme[1] + ')';
      thumb.style.minHeight = '92px';
    }
    card.appendChild(thumb);

    var go = document.createElement('span');
    go.className = 'card-go';
    var goText = document.createElement('span');
    goText.textContent = '看看这个项目';
    var goArrow = document.createElement('em');
    goArrow.textContent = '→';
    go.appendChild(goText);
    go.appendChild(goArrow);
    card.appendChild(go);

    return card;
  }

  function fillVersionSlots(state) {
    document.querySelectorAll('[data-version-slot]').forEach(function (slot) {
      var id = slot.getAttribute('data-version-slot');
      var label = L.versionLabel(L.findProject(projects(), id), state);
      slot.textContent = label;
      // 只有"拉不到"那句话才灰。版本号本身按正常色显示。
      slot.classList.toggle('is-unavailable', label === '版本信息暂不可用');
    });
  }

  // ---------- 筛选 ----------
  function initFilters() {
    var bar = document.querySelector('[data-filters]');
    if (!bar) return;
    var list = projects();
    var swapTimer = null;
    bar.textContent = '';

    var used = PLATFORM_ORDER.filter(function (p) {
      return list.some(function (item) {
        return (item.platforms || []).indexOf(p) !== -1;
      });
    });

    function countFor(key) {
      if (key === 'all') return list.length;
      return list.filter(function (item) {
        return (item.platforms || []).indexOf(key) !== -1;
      }).length;
    }

    [{ key: 'all', label: '全部' }]
      .concat(used.map(function (p) { return { key: p, label: PLATFORM_LABEL[p] }; }))
      .forEach(function (item, index) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter';
        btn.setAttribute('data-filter', item.key);
        btn.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');

        var label = document.createElement('span');
        label.textContent = item.label;
        btn.appendChild(label);

        var count = document.createElement('span');
        count.className = 'filter-n';
        count.textContent = pad2(countFor(item.key));
        btn.appendChild(count);

        btn.addEventListener('click', function () {
          bar.querySelectorAll('.filter').forEach(function (b) {
            b.setAttribute('aria-pressed', 'false');
          });
          btn.setAttribute('aria-pressed', 'true');

          var apply = function () {
            document.querySelectorAll('.card').forEach(function (card) {
              var platforms = (card.getAttribute('data-platforms') || '').split(' ');
              card.hidden = item.key !== 'all' && platforms.indexOf(item.key) === -1;
            });
          };

          // 整片网格先一起淡出半拍再换内容。动作是「换了一张清单」，
          // 不是十几张卡片各自飞走 —— 后者在只有三张卡时尤其像出了故障。
          var grid = document.querySelector('.grid');
          var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (!grid || reduce) { apply(); return; }

          grid.classList.add('is-swapping');
          if (swapTimer) clearTimeout(swapTimer);
          swapTimer = setTimeout(function () {
            apply();
            window.requestAnimationFrame(function () {
              grid.classList.remove('is-swapping');
            });
          }, 150);
        });
        bar.appendChild(btn);
      });
  }

  // ---------- 首页 ----------
  /* 项目数从 0 滚到 N。只滚一次，800ms 内结束；关掉动效就直接写终值。 */
  function animateCount(el, target) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var still = document.documentElement.classList.contains('static');
    if (reduce || still || !window.requestAnimationFrame) {
      el.textContent = String(target);
      return;
    }
    var start = performance.now();
    var duration = 780;
    el.textContent = '0';
    function tick(now) {
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function fillCounts(list) {
    var total = list.length;
    var platforms = list.reduce(function (sum, project) {
      return sum + (project.platforms || []).length;
    }, 0);

    document.querySelectorAll('[data-count]').forEach(function (el) {
      animateCount(el, total);
    });
    document.querySelectorAll('[data-count-pad]').forEach(function (el) {
      el.textContent = pad2(total);
    });
    document.querySelectorAll('[data-platforms-count]').forEach(function (el) {
      el.textContent = pad2(platforms);
    });
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function renderHome() {
    var grid = document.querySelector('[data-grid]');
    if (!grid) return;

    var list = projects();
    fillCounts(list);

    grid.textContent = '';
    list.forEach(function (project, index) {
      grid.appendChild(cardNode(project, index));
    });

    initFilters();

    loadVersions().then(function (state) {
      fillVersionSlots(state);
    });
  }

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

  function renderNotice(project, state) {
    var host = document.querySelector('[data-notice]');
    if (!host) return;
    host.innerHTML = '';
    if (!L.shouldShowVersionNotice(project, state)) return;

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
      var repoUrl = L.releasesPageUrl(project);
      var empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = L.downloadEmptyText(project, state);
      panel.appendChild(empty);
      if (repoUrl) {
        panel.appendChild(makeQuietButton('去 GitHub Releases 看看', repoUrl, project.releasesRepo));
      }
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
      renderNotice(project, state);
      renderDownload(project, state);
    });

    // 版本区先渲染加载态，避免加载期间布局跳动
    renderDownload(project, { status: 'loading', byProject: {} });
    renderIntro(project);
  }

  // ---------- 顶栏状态 ----------
  // 首页 / 详情页 / 404 的顶栏是吸顶的，滚过 8px 才给它毛玻璃底。
  // 落地页有自己的一套（.stuck），不走这里。
  function initNavScroll() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var update = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      nav.classList.toggle('is-scrolled', y > 8);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ---------- 卡片高光 ----------
  // 只在真有鼠标的设备上挂：触屏上 pointermove 会跟着手指乱跑，
  // 既没意义又很耗。位置算成百分比交给 CSS，JS 不碰样式值以外的任何东西。
  function initSpotlight() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.card').forEach(function (card) {
      var queued = false;
      var x = 50;
      var y = 0;

      card.addEventListener('pointermove', function (event) {
        if (queued) return;
        // 每次现量：鼠标停着、页面被滚走时，缓存的矩形就过期了。
        // 三张卡片做一次 getBoundingClientRect 的开销可以忽略。
        var rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        x = ((event.clientX - rect.left) / rect.width) * 100;
        y = ((event.clientY - rect.top) / rect.height) * 100;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          card.style.setProperty('--mx', x.toFixed(1) + '%');
          card.style.setProperty('--my', y.toFixed(1) + '%');
        });
      }, { passive: true });
    });
  }

  // ---------- 入场动效 ----------
  // .reveal 的起始态是 opacity:0（见 style.css），得由这里打上 .in 才显形。
  // 所以这段一旦没跑到，正文会整片隐形 —— 各页那条 <noscript> 兜的是「JS 整个
  // 关了」，这里兜的是「JS 在跑、但环境老到没有 IntersectionObserver」。
  function revealIndex(el) {
    // 同父元素下数一数自己是第几个 .reveal，交给 CSS 当错开延迟用。
    var i = 0;
    var n = el.previousElementSibling;
    while (n) {
      if (n.classList && n.classList.contains('reveal')) i++;
      n = n.previousElementSibling;
    }
    return i;
  }

  function revealNodes() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!nodes.length) return;
    nodes.forEach(function (el) {
      el.style.setProperty('--rv-i', String(revealIndex(el)));
    });

    // 没有 IntersectionObserver 就一次性全显形。这比「停在透明态」好得多：
    // 动效是增强项，内容不是（Review Focus 1）。
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);   // 只入一次，滚回去不重播
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

    nodes.forEach(function (el) { io.observe(el); });
  }

  // ---------- 入口 ----------
  function boot() {
    var year = document.querySelector('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());

    // 渲染逻辑在后续任务里补上
    if (document.querySelector('[data-grid]')) {
      renderHome();
    }
    if (document.querySelector('[data-project]')) {
      renderDetail();
    }

    initNavScroll();
    initSpotlight();

    // 必须排在两个 render 之后：卡片和详情区块都是脚本现建的，
    // 早于它们调用会一个 .reveal 都找不到。
    revealNodes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
