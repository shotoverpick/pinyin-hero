// 数据来源：人教版（六三学制）《数学》一年级上册（2024 新版教材）
// 包含：准备课（数学游戏）+ 第一~六单元全部核心知识点、口诀儿歌、互动学具配置与智能题库生成

const STICKERS = [
  '🦁', '🐯', '🐼', '🐨', '🦊', '🐰', '🐸', '🐵', '🦄', '🦖',
  '🦕', '🐳', '🐬', '🐙', '🦋', '🐞', '🐝', '🦉', '🐧', '🐥',
  '🚀', '🛸', '🚂', '🏎️', '🚒', '✈️', '⛵', '🎡', '🏰', '🌈',
  '🍓', '🍉', '🍑', '🍒', '🍍', '🥝', '🍦', '🍩', '🎂', '🍭',
  '⚽', '🏀', '🏆', '🥇', '🎖️', '👑', '💎', '🔮', '🧸', '🎈',
  '🌟', '☀️', '🌙', '⛄', '🎄', '🎆', '🎨', '🎸', '🥁', '🦸'
];

// 数字书写儿歌（课本第15、30、36、54页）
const NUMBER_RHYMES = {
  0: { emoji: '🥚', rhyme: '0 像鸡蛋圆溜溜，一个也没有就写 0', items: '空盘子 🍽️' },
  1: { emoji: '✏️', rhyme: '1 像铅笔细又长，直直一竖写中央', items: '☀️ 1 个太阳' },
  2: { emoji: '🦆', rhyme: '2 像小鸭水上漂，弯弯脖子翘尾巴', items: '🦆🦆 2 只小鸭' },
  3: { emoji: '👂', rhyme: '3 像耳朵听声音，两个半圆连一起', items: '🐦🐦🐦 3 只小鸟' },
  4: { emoji: '🚩', rhyme: '4 像红旗迎风飘，一竖一横再一竖', items: '🌻🌻🌻🌻 4 朵向日葵' },
  5: { emoji: '🪝', rhyme: '5 像秤钩来买菜，肚儿圆圆戴小帽', items: '🌽🌽🌽🌽🌽 5 个玉米' },
  6: { emoji: '🎵', rhyme: '6 像哨子吹得响，上头弯弯下头圆', items: '🐠🐠🐠🐠🐠🐠 6 条小鱼' },
  7: { emoji: '镰', rhyme: '7 像镰刀割青草，一横一斜真好写', items: '🐋🐋🐋🐋🐋🐋🐋 7 只魔鬼鱼' },
  8: { emoji: '葫芦', rhyme: '8 像葫芦藤上挂，上下两个小圆圈', items: '🐚🐚🐚🐚🐚🐚🐚🐚 8 个贝壳' },
  9: { emoji: '🥄', rhyme: '9 像勺子能吃饭，圆圆脑袋长尾巴', items: '🦄🦄🦄🦄🦄🦄🦄🦄🦄 9 只海马' },
  10: { emoji: '🥢', rhyme: '10 像油条加鸡蛋，左边写 1 右边 0', items: '👐 10 根手指头' },
};

// 凑十儿歌（课本第三单元 10的认识 & 第五单元 20以内进位加法核心口诀）
const MAKE_TEN_SONGS = [
  { a: 1, b: 9, text: '一九一九好朋友', emoji: '🤝', color: '#ff6b6b' },
  { a: 2, b: 8, text: '二八二八手拉手', emoji: '👫', color: '#ffa94d' },
  { a: 3, b: 7, text: '三七三七真亲密', emoji: '💖', color: '#ffd43b' },
  { a: 4, b: 6, text: '四六四六一起走', emoji: '🚶', color: '#5cc68d' },
  { a: 5, b: 5, text: '五五凑成一双手', emoji: '👐', color: '#4fb3e8' },
];

// 立体图形数据（课本第三单元 p.67~72）
const SHAPES_3D = [
  {
    id: 'cuboid',
    name: '长方体',
    color: '#4fb3e8',
    trait: '长长的、方方的，有 6 个平平的面，不能滚动，立着放高、平着放稳。',
    examples: [
      { name: '香皂盒', emoji: '🧼' },
      { name: '牛奶盒', emoji: '🧃' },
      { name: '牙膏盒', emoji: '🪥' },
      { name: '纸巾盒', emoji: ' Tissues ' },
      { name: '书本', emoji: '📕' },
      { name: '鞋盒', emoji: '📦' },
    ]
  },
  {
    id: 'cube',
    name: '正方体',
    color: '#f5a623',
    trait: '四四方方的，有 6 个平平的面，而且每个面都一样大，不能滚动。',
    examples: [
      { name: '魔方', emoji: '🧊' },
      { name: '骰子', emoji: '🎲' },
      { name: '方木块', emoji: '🟨' },
      { name: '方礼盒', emoji: '🎁' },
    ]
  },
  {
    id: 'cylinder',
    name: '圆柱',
    color: '#5cc68d',
    trait: '直直的，上下一样粗，两头是圆圆的、平平的面。立着能站稳，躺着能来回滚动！',
    examples: [
      { name: '易拉罐', emoji: '🥫' },
      { name: '保温杯', emoji: '🧴' },
      { name: '圆笔筒', emoji: '🗑️' },
      { name: '电池', emoji: '🔋' },
      { name: '固体胶', emoji: '🖍️' },
    ]
  },
  {
    id: 'sphere',
    name: '球',
    color: '#e86b9a',
    trait: '圆圆鼓鼓的，没有平平的面，能向四面八方到处滚动！',
    examples: [
      { name: '足球', emoji: '⚽' },
      { name: '篮球', emoji: '🏀' },
      { name: '乒乓球', emoji: '🏓' },
      { name: '玻璃珠', emoji: '🔮' },
      { name: '网球', emoji: '🎾' },
    ]
  }
];

// 课本同步单元与课时定义（严格对齐 2024 人教版一年级上册目录）
const MATH_UNITS = [
  {
    unit: '准备课 · 数学游戏',
    color: '#20c997',
    badge: '∞',
    desc: '在校园、操场、教室里找数学：数一数、比多少、认方位（上下前后左右）',
    lessons: [
      {
        id: 'u0_1',
        name: '1 在校园和操场找数学',
        sub: '数一数 1~10 · 比多少',
        pages: '课本第 1~5 页',
        teachType: 'count_intro',
        qTypes: ['count_1_5', 'compare_pic_1_5', 'count_6_9']
      },
      {
        id: 'u0_2',
        name: '2 在教室里认方位',
        sub: '前后、上下、左右、第几',
        pages: '课本第 6~11 页',
        teachType: 'position_intro',
        qTypes: ['position_quiz', 'ordinal_1_5']
      }
    ]
  },
  {
    unit: '第一单元 · 5以内数的认识和加、减法',
    color: '#4fb3e8',
    badge: '一',
    desc: '认识 0~5，学会比大小（> < =）、第几、分与合，掌握 5 以内加减法',
    lessons: [
      {
        id: 'u1_1',
        name: '1 1~5的认识与比大小',
        sub: '点数 1~5 · 等号、大于号、小于号',
        pages: '课本第 14~18 页',
        teachType: 'num_1_5_compare',
        qTypes: ['count_1_5', 'compare_1_5', 'compare_pic_1_5']
      },
      {
        id: 'u1_2',
        name: '2 第几与 5 以内的分与合',
        sub: '区分“几个”和“第几” · 2~5 的分成与组成',
        pages: '课本第 19~23 页',
        teachType: 'bonds_1_5',
        qTypes: ['ordinal_1_5', 'bond_2_5']
      },
      {
        id: 'u1_3',
        name: '3 1~5的加法',
        sub: '把两部分合起来 · 认识加号“+”',
        pages: '课本第 24~25 页',
        teachType: 'add_1_5',
        qTypes: ['pic_add_1_5', 'calc_add_1_5']
      },
      {
        id: 'u1_4',
        name: '4 1~5的减法',
        sub: '从总数里去掉一部分 · 认识减号“-”',
        pages: '课本第 26~29 页',
        teachType: 'sub_1_5',
        qTypes: ['pic_sub_1_5', 'calc_sub_1_5', 'calc_mix_1_5']
      },
      {
        id: 'u1_5',
        name: '5 0的认识和加、减法',
        sub: '一个也没有用 0 表示 · 相同的数相减得 0',
        pages: '课本第 30~33 页',
        teachType: 'zero_intro',
        qTypes: ['calc_zero', 'calc_mix_0_5']
      }
    ]
  },
  {
    unit: '第二单元 · 6~10的认识和加、减法',
    color: '#5cc68d',
    badge: '二',
    desc: '认识 6~10，掌握大括号看图列式、凑十歌、10以内加减法、连加连减与加减混合',
    lessons: [
      {
        id: 'u2_1',
        name: '1 6~9的认识、比大小与第几',
        sub: '海洋世界数一数 · 鱼缸排第几',
        pages: '课本第 34~38 页',
        teachType: 'num_6_9',
        qTypes: ['count_6_9', 'compare_6_9', 'ordinal_6_9']
      },
      {
        id: 'u2_2',
        name: '2 6~9的分与合',
        sub: '按顺序成对分一分 · 6、7、8、9 的组成',
        pages: '课本第 39~43 页',
        teachType: 'bonds_6_9',
        qTypes: ['bond_6_9']
      },
      {
        id: 'u2_3',
        name: '3 6和7的加减法 · 大括号问题',
        sub: '一图四式 · 认识大括号“{”和问号“?”',
        pages: '课本第 44~49 页',
        teachType: 'brace_6_7',
        qTypes: ['brace_6_7', 'calc_6_7']
      },
      {
        id: 'u2_4',
        name: '4 8和9的加减法',
        sub: '8 和 9 的看图列式与加减计算',
        pages: '课本第 50~53 页',
        teachType: 'add_sub_8_9',
        qTypes: ['brace_8_9', 'calc_8_9', 'missing_6_9']
      },
      {
        id: 'u2_5',
        name: '5 10的认识和加、减法（凑十歌）',
        sub: '一九一九好朋友 · 10 的分与合及加减法',
        pages: '课本第 54~58 页',
        teachType: 'make_10_intro',
        qTypes: ['bond_10', 'calc_10', 'missing_10']
      },
      {
        id: 'u2_6',
        name: '6 连加、连减与加减混合',
        sub: '喂小鸡与天鹅湖 · 从左到右按顺序算两步',
        pages: '课本第 59~66 页',
        teachType: 'chain_calc',
        qTypes: ['chain_add_sub', 'chain_mix']
      }
    ]
  },
  {
    unit: '第三单元 · 认识立体图形',
    color: '#f5a623',
    badge: '三',
    desc: '认识长方体、正方体、圆柱和球，拼搭积木与数正方体',
    lessons: [
      {
        id: 'u3_1',
        name: '1 认识长方体、正方体、圆柱、球',
        sub: '按形状分一分 · 摸一摸滚一滚猜图形',
        pages: '课本第 67~69 页',
        teachType: 'shapes_intro',
        qTypes: ['shape_identify', 'shape_feature']
      },
      {
        id: 'u3_2',
        name: '2 立体图形拼搭与数积木',
        sub: '看谁搭得又稳又高 · 数小正方体（含隐藏积木）',
        pages: '课本第 70~72 页',
        teachType: 'shapes_count',
        qTypes: ['cube_count', 'shape_pattern']
      }
    ]
  },
  {
    unit: '第四单元 · 11~20的认识',
    color: '#9b7be0',
    badge: '四',
    desc: '10个一是1个十，认识十位和个位，10加几、十几加几和相应减法，排队“之间”问题',
    lessons: [
      {
        id: 'u4_1',
        name: '1 10的再认识与 11~20 各数的组成',
        sub: '10根小棒捆成1捆 · 计数器上的十位和个位',
        pages: '课本第 74~80 页',
        teachType: 'place_value_11_20',
        qTypes: ['place_value_quiz', 'num_order_11_20', 'compare_11_20']
      },
      {
        id: 'u4_2',
        name: '2 10加几、十几加几与相应减法',
        sub: '加数+加数=和 · 被减数-减数=差',
        pages: '课本第 81 页',
        teachType: 'teen_add_sub',
        qTypes: ['calc_10_plus', 'calc_teen_no_carry']
      },
      {
        id: 'u4_3',
        name: '3 解决问题：两人“之间”有几人',
        sub: '小悦排第10，小宇排第15，中间有几人？（画图数一数）',
        pages: '课本第 82~87 页',
        teachType: 'between_problem',
        qTypes: ['between_quiz', 'calc_teen_no_carry']
      }
    ]
  },
  {
    unit: '第五单元 · 20以内的进位加法',
    color: '#e86b9a',
    badge: '五',
    desc: '全册核心重难点！用“凑十法”（看大数、拆小数、凑成十、加剩数）算 20 以内进位加法',
    lessons: [
      {
        id: 'u5_1',
        name: '1 9加几（凑十法大揭秘）',
        sub: '9加1得10，10加几得十几！',
        pages: '课本第 88~90 页',
        teachType: 'carry_9',
        qTypes: ['make10_step_9', 'calc_9_plus', 'compare_carry']
      },
      {
        id: 'u5_2',
        name: '2 8、7、6加几（凑十法进阶）',
        sub: '8凑2、7凑3、6凑4，凑成10再相加',
        pages: '课本第 91~92 页',
        teachType: 'carry_8_7_6',
        qTypes: ['make10_step_876', 'calc_876_plus']
      },
      {
        id: 'u5_3',
        name: '3 5、4、3、2加几与逆向求和问题',
        sub: '小数加大数巧算 · 求“原来有多少”用加法',
        pages: '课本第 93~102 页',
        teachType: 'carry_5432_word',
        qTypes: ['calc_5432_plus', 'word_original_total', 'word_multi_angle']
      }
    ]
  },
  {
    unit: '第六单元 · 复习与关联（全册总挑战）',
    color: '#ff7a45',
    badge: '六',
    desc: '综合运用 20 以内数的认识、加减法、图形与解决问题，成为数学小博士！',
    lessons: [
      {
        id: 'u6_1',
        name: '1 20以内加减法全能王',
        sub: '10以内加减 + 20以内不进位与进位加法 + 填未知数',
        pages: '课本第 103~110 页',
        teachType: 'review_all',
        qTypes: ['calc_all_mix', 'missing_all', 'compare_carry', 'chain_mix']
      }
    ]
  }
];

// 题库用可爱的物品图标池
const ITEM_THEMES = [
  { emoji: '🍎', name: '苹果', unit: '个' },
  { emoji: '🍑', name: '桃子', unit: '个' },
  { emoji: '🍓', name: '草莓', unit: '颗' },
  { emoji: '🍌', name: '香蕉', unit: '根' },
  { emoji: '🌽', name: '玉米', unit: '个' },
  { emoji: '🥕', name: '胡萝卜', unit: '根' },
  { emoji: '🌻', name: '向日葵', unit: '朵' },
  { emoji: '🎈', name: '气球', unit: '个' },
  { emoji: '🦆', name: '小鸭', unit: '只' },
  { emoji: '🐰', name: '小兔', unit: '只' },
  { emoji: '🐿️', name: '松鼠', unit: '只' },
  { emoji: '🐸', name: '青蛙', unit: '只' },
  { emoji: '🐦', name: '小鸟', unit: '只' },
  { emoji: '🐠', name: '小鱼', unit: '条' },
  { emoji: '🐼', name: '熊猫', unit: '只' },
  { emoji: '🐥', name: '小鸡', unit: '只' },
];

// 街机游乐场的题目范围预设
const ARCADE_POOLS = [
  { id: 'add_sub_5', label: '🌱 5以内加减法（第一单元）', defaultChecked: true },
  { id: 'add_sub_10', label: '🌿 6~10的加减法（第二单元）', defaultChecked: true },
  { id: 'make_10', label: '🔟 凑十好朋友：几加几等于10', defaultChecked: false },
  { id: 'teen_simple', label: '🎋 10加几、十几加减几（第四单元）', defaultChecked: false },
  { id: 'carry_20', label: '🔥 20以内进位加法：9/8/7/6加几（第五单元）', defaultChecked: false },
  { id: 'chain_10', label: '⛓️ 10以内连加、连减、加减混合', defaultChecked: false },
];
