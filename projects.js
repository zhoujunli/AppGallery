window.PROJECTS = [
  {
    id: 'claudepocket',
    name: 'ClaudePocket',
    tagline: '把 Claude Code 装进兜里',
    description: [
      '手机变成 Mac 上 Claude Code 会话的一块远程终端。会话在电脑上活着 —— 熄屏、断网、退出应用，回来它还在原处。',
      '两个应用，各干各的。Mac 上是一个菜单栏常驻的小应用，打开它服务就跟着起来了，不用开终端、也不用先装 Node；启动时它会自己检查这台机器上的 tmux 和 claude，缺了哪一条就直接告诉你该装什么。手机上是扫码就能用的终端，主界面只有终端一样东西。',
      '配对过一次就不用再配。菜单栏点「配对」要过一次系统验证 —— Touch ID，没有指纹的机器退回登录密码，密码从头到尾都在系统手里，应用既不读也不存；过了验证，面板上才出二维码。码是五分钟一次性的票，不是钥匙。之后每次打开手机应用，它自己就连上。'
    ],
    icon: 'icons/claudepocket.png',
    theme: ['#059669', '#5eead4'],
    // 落地页。卡片直接指向它，取代 project.html?p=<id> 那个生成页。
    page: 'projects/claudepocket.html',
    platforms: ['desktop', 'android'],
    stack: ['SwiftUI', 'Flutter', 'Node', 'tmux', 'xterm.js'],
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
    releasesRepo: 'zhoujunli/claudepocket-releases'
  },
  {
    id: 'chamberconnect',
    name: '商会通',
    tagline: '一个后台，一张地图，管好一个商会',
    description: [
      '会员那一端在手机上：提交入会申请、看商会地图、记备忘录。会长和秘书那一端在浏览器里：审批入会、管成员和企业、发公告、配权限。两边是同一套数据、同一套权限。',
      '商会是一棵树，每个商会都有上级商会 —— 省、市、区可以是各自独立的一级。会长和秘书只看得见自己商会的人和事；换一个商会，系统根本不会把数据端出来，不是界面上藏起来。入会必须走审批，批准的那一刻才做两件事：授予角色、建立企业关联。',
      '地图用高德底图，商会、企业、会员三类标记，游客默认看 20 公里内、会员 50 公里内，也可以只看自己加入的商会。角色按商会授权，除了五个固定角色，还能自建角色、逐项勾权限。'
    ],
    icon: 'icons/chamberconnect.png',
    theme: ['#b45309', '#f59e0b'],
    // 落地页。卡片直接指向它，取代 project.html?p=<id> 那个生成页。
    page: 'projects/chamberconnect.html',
    platforms: ['web', 'android'],
    stack: ['uni-app', 'Vue', 'JeecgBoot', 'Spring Boot', '高德地图'],
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
    releasesRepo: 'zhoujunli/chamberconnect-releases',
    liveUrl: 'http://47.112.24.248:10090/index.html'
  },
  {
    id: 'bowuyou',
    name: '博物游',
    tagline: '逛博物馆，一关一关把文物找出来',
    description: [
      '微信小程序。观众在展厅里对着展品拍一张照、或者答一道关于它的题，就算把文物「打卡」下来；一个展览拆成若干关，一关里的文物都打卡完，这一关才算走完。',
      '博物馆、展览、关卡三层套着：一个馆挂着它的展览，一个展览拆成若干关，一关是一串文物 —— 文物是最小的、能被打卡的那个单位。打卡进度挂在「角色」上而不是账号上，所以一个手机号可以给几个人各打各的。',
      '小程序端从 0 到 v1 是我一个人写的（2025 年 5 月到 8 月）：页面、请求层、共用组件、登录态与角色切换、开发/体验/正式三套环境的切换。后台和服务器是同事写的。它现在下线了 —— 后端接口已关，落地页是一份存档。'
    ],
    // 真图标：白底一只青绿小鼎。来源只有一张 —— 用户 2026-10 发来的微信
    // 「最近使用的小程序」截图，从上面 1:1 裁下来的（原盘直径 122px，没放大；
    // 圆外的角补白做成方块，让卡片那个 12px 圆角去裁）。
    // 这个项目没有图标源文件可找：小程序工程里的 logo.png 是 uni-app 脚手架
    // 自带的那张绿方块，后台那份是 JeecgBoot 模板的。别再照着产品气质自己画一枚。
    icon: 'icons/bowuyou.png',
    theme: ['#0d6b52', '#f6e9c9'],
    // 落地页。卡片直接指向它，取代 project.html?p=<id> 那个生成页。
    page: 'projects/bowuyou.html',
    // 只有小程序一种形态：没有安装包，也没有可点的线上地址。
    platforms: ['miniprogram'],
    stack: ['uni-app', 'Vue 3', 'uview-plus', 'vuex', '微信小程序'],
    // 关卡页。左边一列文案、右边一列进度，两边都是 app 里真实的两句话：
    // 关卡名取自展览详情，进度那格是它右上方那行「主线文物 x/y」。
    preview: {
      kind: 'phone',
      title: '博物游 · 展览详情',
      rows: [
        ['第一关 · 青铜时代', '文物 3/3'],
        ['第二关 · 玉器与礼制', '文物 1/2']
      ]
    }
    // 没有 releasesRepo：小程序不在 GitHub Releases 上。
    // 「查看版本」那条路会因此安静地跳过，而不是拼出一条死链。
  }
];
