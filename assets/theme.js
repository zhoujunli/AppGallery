/**
 * 站点外观：两条正交的轴。
 *
 *   data-skin  = brutal | glass    —— 版式与材质，第一次来随机定一套，之后记住
 *   data-theme = light | dark      —— system 只解析成这两者之一，不是第五套
 *
 * 必须在 <head> 里**同步**加载，不加 defer/async：文件一执行就把两个属性
 * 写到 <html> 上，赶在首帧之前 —— 晚了会先闪一套再跳。
 * 这也是它没有并进 assets/app.js 的原因：那个是放在 </body> 前的延迟脚本。
 *
 * 切换器自己接：DOM 一就绪就找 [data-theme-toggle] / [data-skin-toggle] 并挂上
 * 点击与系统偏好的监听。页面不需要调任何东西。**别在外面再调一次 init** ——
 * 会挂上第二个监听，点一下跳两档。
 *
 * URL 上的 ?skin= / ?theme= 只影响这一次打开，不写回存储，用来在手机上对比四套；
 * 用户一旦点了切换按钮，就回到正常持久化。
 */
(function (root, doc) {
  'use strict';

  var SKIN_KEY = 'appgallery-skin';
  var THEME_KEY = 'appgallery-theme';

  var SKINS = ['brutal', 'glass'];
  var MODES = ['system', 'light', 'dark'];

  var THEME_ICON = { system: '◐', light: '☀', dark: '☾' };
  var MODE_LABEL = { system: '跟随系统', light: '浅色', dark: '深色' };
  var SKIN_ICON = { brutal: '✳', glass: '◍' };
  var SKIN_LABEL = { brutal: '粗野', glass: '玻璃' };

  var params = null;
  try { params = new URLSearchParams(root.location.search); } catch (e) { /* 老浏览器 */ }

  // 截图 / 静态验收用：?static=1 把入场动画和计数直接停在终态，
  // 免得 headless 在动画中途按快门，拍到一张半透明的页面。
  if (params && params.get('static') === '1') {
    doc.documentElement.classList.add('static');
  }

  function fromQuery(name, allowed) {
    if (!params) return null;
    var value = params.get(name);
    return allowed.indexOf(value) !== -1 ? value : null;
  }

  function read(key) {
    try {
      var value = localStorage.getItem(key);
      if (value !== null) return value;
    } catch (e) { /* 隐私模式 */ }
    try { return sessionStorage.getItem(key); } catch (e) { /* 还是不行 */ }
    return null;
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); return; } catch (e) { /* 隐私模式 */ }
    try { sessionStorage.setItem(key, value); } catch (e) { /* 放弃持久化 */ }
  }

  function resolve(mode) {
    if (mode !== 'system') return mode;
    try {
      return root.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) {
      return 'dark';   // 老浏览器没有 matchMedia 时兜底深色
    }
  }

  // ---------- 首次定值 ----------
  // 查询参数 > 上次的选择 > 随机。随机只在「这次不是查询参数指定的」时写回，
  // 所以同一个浏览器从第二页起看到的一定还是同一套。
  var forcedSkin = fromQuery('skin', SKINS);
  var forcedMode = fromQuery('theme', MODES);

  var savedSkin = read(SKIN_KEY);
  var skin = forcedSkin || (SKINS.indexOf(savedSkin) !== -1 ? savedSkin : null);
  if (!skin) {
    skin = SKINS[Math.floor(Math.random() * SKINS.length)];
    write(SKIN_KEY, skin);
  }

  var current = forcedMode || read(THEME_KEY);
  if (MODES.indexOf(current) === -1) current = 'system';

  // ---------- 绘制 ----------
  function paint() {
    var theme = resolve(current);
    var el = doc.documentElement;

    el.setAttribute('data-skin', skin);
    el.setAttribute('data-theme', theme);

    // 安卓部分浏览器会把浅色页面强行暗化；把页面实际支持的 color-scheme
    // 同步给 meta。静态写的是 only light，深色解析出来后再改成 only dark。
    var meta = doc.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? 'only light' : 'only dark');

    var themeBtn = doc.querySelector('[data-theme-toggle]');
    if (themeBtn) {
      themeBtn.textContent = THEME_ICON[current];
      themeBtn.title = '当前：' + MODE_LABEL[current];
      themeBtn.setAttribute('aria-label', '当前：' + MODE_LABEL[current] + '，点击切换明暗模式');
    }

    var skinBtn = doc.querySelector('[data-skin-toggle]');
    if (skinBtn) {
      skinBtn.textContent = SKIN_ICON[skin];
      skinBtn.title = '当前皮肤：' + SKIN_LABEL[skin];
      skinBtn.setAttribute('aria-label', '当前皮肤：' + SKIN_LABEL[skin] + '，点击切换');
    }
  }

  // 首帧定值。万一哪个环节抛错，至少保证页面有一套完整的属性。
  try {
    paint();
  } catch (e) {
    doc.documentElement.setAttribute('data-skin', 'glass');
    doc.documentElement.setAttribute('data-theme', 'dark');
  }

  function nextMode(mode) {
    return MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  }

  function init() {
    // 首帧那次 paint 跑在 <head> 里，按钮还没解析出来，只能定 <html> 上的属性。
    // DOM 就绪后再画一次，把两个按钮的图标/文案同步过来 —— 不做的话，
    // 玻璃皮肤会一直顶着 HTML 里写死的 ✳，要等用户点一下才变对。
    paint();

    var themeBtn = doc.querySelector('[data-theme-toggle]');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        current = nextMode(current);
        forcedMode = null;
        write(THEME_KEY, current);
        paint();
      });
    }

    var skinBtn = doc.querySelector('[data-skin-toggle]');
    if (skinBtn) {
      skinBtn.addEventListener('click', function () {
        skin = skin === 'brutal' ? 'glass' : 'brutal';
        forcedSkin = null;
        write(SKIN_KEY, skin);
        paint();
      });
    }

    if (root.matchMedia) {
      var mq = root.matchMedia('(prefers-color-scheme: light)');
      var onSystemChange = function () {
        if (current === 'system') paint();
      };
      if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
      else if (mq.addListener) mq.addListener(onSystemChange); // 老 Safari
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.AppGalleryTheme = {
    SKINS: SKINS.slice(),
    MODES: MODES.slice(),
    skin: function () { return skin; },
    mode: function () { return current; }
  };
})(typeof window !== 'undefined' ? window : this, document);
