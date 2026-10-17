import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = path.join(root, 'out/style-mockups');
fs.mkdirSync(out, { recursive: true });

const styles = {
  orthographic: {
    title: '正交软玩具',
    subtitle: '圆润体块 · 软阴影 · 低龄友好',
    bg: '#FFF7E7', wall: '#F7E7C8', wall2: '#F0DDB6', floor: '#DDBA8A', ink: '#596A67',
    sofa: '#E58C72', sofaDark: '#B96D5E', tv: '#263B45', screen: '#6FA8AD', plant: '#75B48D', pot: '#EABF7D',
    pet: '#F4C96B', accent: '#F3D77B', mode: 'soft'
  },
  papercut: {
    title: '3D 剪纸分层',
    subtitle: '纸张层级 · 折边 · 明确前后关系',
    bg: '#F9F2DF', wall: '#F4DDAF', wall2: '#EBCF9B', floor: '#CFA274', ink: '#574F47',
    sofa: '#E78E6C', sofaDark: '#B96658', tv: '#2E3740', screen: '#6F9FA0', plant: '#6AA77A', pot: '#D89568',
    pet: '#F1BF67', accent: '#F3CE6D', mode: 'paper'
  },
  twopoint5d: {
    title: '2.5D 程序化',
    subtitle: '正交透视 · 轻量体积 · UI 友好',
    bg: '#F7F4E9', wall: '#F2E6C9', wall2: '#E8D7B2', floor: '#D6B887', ink: '#536966',
    sofa: '#D98373', sofaDark: '#A95D56', tv: '#233A44', screen: '#78B5B5', plant: '#6CAC86', pot: '#E2AC6E',
    pet: '#F1C76C', accent: '#9ACAB4', mode: 'flat'
  },
  watercolor: {
    title: '程序化水彩绘本',
    subtitle: '纸张肌理 · 水彩晕染 · 手绘边缘',
    bg: '#F9F4E9', wall: '#F3E3C5', wall2: '#EAD5B0', floor: '#DAB990', ink: '#68766D',
    sofa: '#D98672', sofaDark: '#A9695C', tv: '#38545A', screen: '#79B7B0', plant: '#77A888', pot: '#D5A173',
    pet: '#EEC570', accent: '#D9C377', mode: 'wash'
  }
};

function defs(s) {
  const texture = s.mode === 'wash'
    ? `<filter id="wash"><feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="3" seed="8" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="g"/><feComponentTransfer><feFuncA type="table" tableValues="0 .13"/></feComponentTransfer><feBlend in="SourceGraphic" in2="g" mode="multiply"/></filter>`
    : '';
  const shadow = s.mode === 'soft'
    ? `<filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="9"/><feComponentTransfer><feFuncA type="linear" slope=".28"/></feComponentTransfer><feOffset dy="10" dx="7"/></filter>`
    : `<filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="3"/><feComponentTransfer><feFuncA type="linear" slope=".25"/></feComponentTransfer><feOffset dy="6" dx="4"/></filter>`;
  const grain = s.mode === 'paper' ? `<filter id="grain"><feTurbulence baseFrequency=".08" numOctaves="2" seed="5"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .11"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>` : '';
  return `<defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${s.wall}"/><stop offset="1" stop-color="${s.wall2}"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${s.floor}"/><stop offset="1" stop-color="${s.wall2}"/></linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${s.screen}"/><stop offset="1" stop-color="#2E5962"/></linearGradient>
    ${shadow}${texture}${grain}
  </defs>`;
}

function label(s) {
  return `<g class="label"><rect x="30" y="28" width="740" height="66" rx="18" fill="${s.bg}" opacity=".92"/><text x="54" y="59" fill="${s.ink}" font-size="24" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" font-weight="700">${s.title}</text><text x="54" y="82" fill="${s.ink}" opacity=".72" font-size="14" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif">${s.subtitle}</text></g>`;
}

function room(s) {
  const paper = s.mode === 'paper';
  const wash = s.mode === 'wash';
  const soft = s.mode === 'soft';
  const outline = s.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560" role="img" aria-label="${s.title} style mockup">
  ${defs(s)}
  <rect width="800" height="560" fill="${s.bg}"/>
  ${label(s)}
  <g transform="translate(54,113)" ${wash ? 'filter="url(#wash)"' : ''}>
    <!-- two open walls and a shallow isometric floor -->
    <polygon points="0,40 360,0 690,86 333,145" fill="url(#wall)" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="333,145 690,86 690,332 333,420" fill="${s.wall2}" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="0,40 333,145 333,420 0,298" fill="${s.wall}" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="0,298 333,420 690,332 360,210" fill="url(#floor)" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
    ${paper ? `<g opacity=".28" fill="none" stroke="#FFFFFF" stroke-width="10"><path d="M23 52 L330 150"/><path d="M349 156 L665 96"/><path d="M32 292 L331 405"/></g>` : ''}
    <!-- window -->
    <g transform="translate(85,80)"><polygon points="0,0 150,46 150,128 0,80" fill="#A9DADB" stroke="${outline}" stroke-width="4"/><path d="M74 22V103M4 39L146 82" stroke="#FDF4D7" stroke-width="6"/><path d="M16 22 Q44 6 69 28 T128 26" fill="none" stroke="#F6FBF4" stroke-width="12" opacity=".7"/></g>
    <!-- TV: strong bezel, glass, reflection and soundbar -->
    <g transform="translate(360,46)"><polygon points="0,0 170,-28 170,62 0,92" fill="#000" opacity=".13" filter="url(#shadow)"/><polygon points="0,0 170,-28 170,58 0,88" rx="5" fill="${s.tv}" stroke="${outline}" stroke-width="4"/><polygon points="11,10 159,-14 159,44 11,72" fill="url(#screen)"/><path d="M34 56 L92 8" stroke="#D8F3EC" stroke-width="10" opacity=".7"/><circle cx="82" cy="76" r="3" fill="${s.accent}"/><polygon points="42,97 130,83 130,91 42,105" fill="#4C575A" stroke="${outline}" stroke-width="2"/></g>
    <!-- corner plant, deliberately anchored to the wall corner -->
    <g transform="translate(585,243)"><ellipse cx="34" cy="46" rx="60" ry="18" fill="#5D6E61" opacity=".2"/><path d="M11 6 Q31 -45 38 -82 M35 8 Q66 -27 78 -55 M29 8 Q2 -22 -10 -44" stroke="${s.plant}" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="-9" cy="-45" rx="22" ry="10" transform="rotate(-38 -9 -45)" fill="${s.plant}"/><ellipse cx="38" cy="-80" rx="24" ry="11" transform="rotate(-72 38 -80)" fill="${s.plant}"/><ellipse cx="78" cy="-55" rx="23" ry="11" transform="rotate(-28 78 -55)" fill="${s.plant}"/><path d="M-13 2 L78 2 L65 59 Q32 77 0 59Z" fill="${s.pot}" stroke="${outline}" stroke-width="3"/><path d="M-8 15 Q34 27 73 12" fill="none" stroke="#F3D19A" stroke-width="4" opacity=".65"/></g>
    <!-- sofa, with an unmistakable raised backrest -->
    <g transform="translate(88,250)"><ellipse cx="185" cy="122" rx="225" ry="46" fill="#50605A" opacity=".18" filter="url(#shadow)"/><polygon points="0,17 238,73 238,143 0,87" fill="${s.sofaDark}" stroke="${outline}" stroke-width="4"/><polygon points="14,-40 230,8 230,74 14,26" fill="${s.sofaDark}" stroke="${outline}" stroke-width="4"/><polygon points="14,-30 230,17 230,29 14,-18" fill="${s.sofa}" opacity=".65"/><polygon points="17,38 115,60 115,106 17,84" fill="${s.sofa}" stroke="${outline}" stroke-width="3"/><polygon points="124,62 222,84 222,130 124,108" fill="${s.sofa}" stroke="${outline}" stroke-width="3"/><polygon points="-12,12 17,19 17,92 -12,85" fill="${s.sofaDark}" stroke="${outline}" stroke-width="4"/><polygon points="230,68 258,74 258,147 230,141" fill="${s.sofaDark}" stroke="${outline}" stroke-width="4"/><circle cx="78" cy="66" r="18" fill="${s.accent}" opacity=".78"/><circle cx="174" cy="91" r="18" fill="${s.accent}" opacity=".72"/></g>
    <!-- coffee table and pet anchor -->
    <g transform="translate(350,292)"><ellipse cx="75" cy="64" rx="94" ry="26" fill="#53645C" opacity=".14"/><polygon points="0,0 124,29 124,72 0,43" fill="#E8C48F" stroke="${outline}" stroke-width="3"/><polygon points="14,49 27,52 27,100 14,97M102,67 115,70 115,118 102,115" fill="#B8865E" stroke="${outline}" stroke-width="2"/><ellipse cx="70" cy="-5" rx="27" ry="24" fill="${s.pet}" stroke="${outline}" stroke-width="3"/><circle cx="61" cy="-7" r="4" fill="${outline}"/><circle cx="79" cy="-3" r="4" fill="${outline}"/><path d="M64 5 Q71 12 80 5" fill="none" stroke="${outline}" stroke-width="3"/></g>
    <!-- black striped wall opening -->
    <g transform="translate(493,112)"><path d="M0 0 L105 -18 L105 65 L0 83Z" fill="#303A39" opacity=".16"/><path d="M7 5L93 -10M7 26L93 11M7 47L93 32M7 68L93 53" stroke="#161D1C" stroke-width="7"/><path d="M0 83 L105 65" stroke="#E1BD82" stroke-width="8"/></g>
  </g>
  ${paper ? `<rect x="30" y="30" width="740" height="500" fill="none" stroke="#A36F4F" stroke-width="2" opacity=".24" filter="url(#grain)"/>` : ''}
  </svg>`;
}

function page() {
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#eee8db;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#44534f}main{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:28px;max-width:1660px;margin:auto}figure{margin:0;background:#fff;border-radius:22px;padding:12px;box-shadow:0 8px 24px #665c4b18}img{width:100%;display:block;border-radius:16px}figcaption{padding:10px 10px 3px;font-size:14px;color:#68746d}h1{grid-column:1/-1;margin:5px 8px 0;font-size:26px}p{grid-column:1/-1;margin:0 8px 8px;color:#6e786f}</style><main><h1>芽芽房间 · 质感方向对比</h1><p>同一间客厅、同一套家具、同一视角；变化只来自材质、阴影和轮廓语言。</p>${Object.values(styles).map((s,i)=>`<figure><img src="${s.title.replaceAll(' ','-')}.svg"><figcaption>${i+1}. ${s.title}：${s.subtitle}</figcaption></figure>`).join('')}</main>`;
}

for (const [key, s] of Object.entries(styles)) fs.writeFileSync(path.join(out, `${s.title.replaceAll(' ','-')}.svg`), room(s));
fs.writeFileSync(path.join(out, 'index.html'), page());

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1360, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(out, 'index.html')).href);
  await page.screenshot({ path: path.join(out, 'contact-sheet.png'), fullPage: true });
  for (const s of Object.values(styles)) {
    const p = await browser.newPage(); await p.setViewport({ width: 800, height: 560, deviceScaleFactor: 1 });
    await p.goto(pathToFileURL(path.join(out, `${s.title.replaceAll(' ','-')}.svg`)).href); await p.screenshot({ path: path.join(out, `${s.title.replaceAll(' ','-')}.png`) }); await p.close();
  }
} finally { await browser.close(); }
console.log(`generated ${out}`);
