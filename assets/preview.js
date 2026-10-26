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
   * 表头有 n 列时，前 n-1 列平分剩余宽度；最后一列是状态列（胶囊），宽度取固定值。
   *
   * 这里必须是固定宽度，不能写 auto。.pv-cols 和每个 .pv-row 是各自独立的
   * grid，auto 轨道只按「本网格自己的内容」定宽：表头那格是「状态」两个字（19px），
   * 行里那格是最宽的胶囊（40.5px）。于是两个网格的 1fr 分到不同的剩余宽度，
   * 中间每一列的起点都会错开十来像素 —— 表头和数据行对不齐。
   * 固定宽度让所有网格算出同一组轨道，对齐问题就没有了。
   *
   * 胶囊本身是 justify-self: start，仍然只有内容那么宽、不会被拉满整列。
   * 万一最后一格里不是状态词而是普通文本，.pv-cell 的 ellipsis 会兜住。
   */
  function gridTemplate(columnCount) {
    var parts = [];
    for (var i = 0; i < columnCount - 1; i++) parts.push('1fr');
    parts.push('var(--pv-status-w, 52px)');
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

  /**
   * 手机屏的导航条：居中的标题 + 右角那个胶囊。
   * 不是窗口那三个点 —— 小程序里没有窗口边框，只有一条导航条和一个胶囊。
   */
  function phoneHeadNode(title) {
    var head = el('span', 'pv-head pv-phone-head');
    head.appendChild(el('span', 'pv-phone-title', title));

    var capsule = el('span', 'pv-capsule');
    capsule.appendChild(el('span', 'pv-capsule-ring'));
    capsule.appendChild(el('span', 'pv-capsule-dot'));
    head.appendChild(capsule);
    return head;
  }

  /**
   * 手机屏：导航条 + 每行两格（左主文案、右进度）。
   * 没有底栏 —— 博物游的 app 里没有底栏，「我的」是点头像进的。
   */
  function phoneNode(preview) {
    var box = el('span', 'pv pv-phone');
    box.appendChild(phoneHeadNode(preview.title));

    var body = el('span', 'pv-phone-body');
    preview.rows.forEach(function (row) {
      var line = el('span', 'pv-phone-row');
      line.appendChild(el('span', 'pv-phone-main', row[0]));
      line.appendChild(el('span', 'pv-phone-val', row[1]));
      body.appendChild(line);
    });
    box.appendChild(body);
    return box;
  }

  function build(preview) {
    if (!preview || typeof preview !== 'object') return null;
    if (preview.kind === 'terminal') return terminalNode(preview);
    if (preview.kind === 'admin') return adminNode(preview);
    if (preview.kind === 'phone') return phoneNode(preview);
    return null;
  }

  root.AppGalleryPreview = { build: build };
})(typeof globalThis !== 'undefined' ? globalThis : this);
