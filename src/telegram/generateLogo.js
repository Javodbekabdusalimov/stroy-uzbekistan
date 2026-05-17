const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '../../uploads/logo.png');

const SVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0a1f3c"/>
      <stop offset="100%" stop-color="#1a4a8c"/>
    </linearGradient>
    <linearGradient id="buildG" x1="0" y1="0" x2="0" y2="172" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f5a623"/>
      <stop offset="100%" stop-color="#e0720c"/>
    </linearGradient>
    <linearGradient id="roofG" x1="0" y1="0" x2="0" y2="114" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f9c846"/>
      <stop offset="100%" stop-color="#f5a623"/>
    </linearGradient>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" fill="url(#bgG)" rx="72"/>

  <!-- Subtle grid lines (blueprint feel) -->
  <line x1="0" y1="256" x2="512" y2="256" stroke="#ffffff" stroke-width="0.5" opacity="0.05"/>
  <line x1="256" y1="0" x2="256" y2="512" stroke="#ffffff" stroke-width="0.5" opacity="0.05"/>

  <!-- Ground shadow -->
  <ellipse cx="256" cy="398" rx="130" ry="10" fill="#000000" opacity="0.2"/>

  <!-- Building body -->
  <rect x="152" y="226" width="208" height="172" fill="url(#buildG)" rx="4"/>

  <!-- Window grid row 1 -->
  <rect x="176" y="246" width="36" height="42" fill="#0a1f3c" rx="4" opacity="0.8"/>
  <rect x="238" y="246" width="36" height="42" fill="#0a1f3c" rx="4" opacity="0.8"/>
  <rect x="300" y="246" width="36" height="42" fill="#0a1f3c" rx="4" opacity="0.8"/>

  <!-- Window reflections row 1 -->
  <rect x="178" y="248" width="10" height="8" fill="#ffffff" rx="2" opacity="0.2"/>
  <rect x="240" y="248" width="10" height="8" fill="#ffffff" rx="2" opacity="0.2"/>
  <rect x="302" y="248" width="10" height="8" fill="#ffffff" rx="2" opacity="0.2"/>

  <!-- Window grid row 2 -->
  <rect x="176" y="304" width="36" height="42" fill="#0a1f3c" rx="4" opacity="0.8"/>
  <rect x="238" y="304" width="36" height="42" fill="#0a1f3c" rx="4" opacity="0.8"/>
  <rect x="300" y="304" width="36" height="42" fill="#0a1f3c" rx="4" opacity="0.8"/>

  <!-- Window reflections row 2 -->
  <rect x="178" y="306" width="10" height="8" fill="#ffffff" rx="2" opacity="0.2"/>
  <rect x="240" y="306" width="10" height="8" fill="#ffffff" rx="2" opacity="0.2"/>
  <rect x="302" y="306" width="10" height="8" fill="#ffffff" rx="2" opacity="0.2"/>

  <!-- Door -->
  <rect x="232" y="356" width="48" height="42" fill="#0a1f3c" rx="4" opacity="0.85"/>
  <rect x="254" y="368" width="4" height="12" fill="#f5a623" rx="2" opacity="0.6"/>

  <!-- Roof triangle -->
  <polygon points="124,228 256,112 388,228" fill="url(#roofG)"/>
  <!-- Roof edge highlight -->
  <polygon points="124,228 256,112 388,228" fill="none" stroke="#f9c846" stroke-width="2" opacity="0.4"/>

  <!-- Crane vertical mast -->
  <rect x="344" y="52" width="14" height="184" fill="#f5a623" rx="3"/>

  <!-- Crane horizontal jib -->
  <rect x="270" y="52" width="92" height="13" fill="#f9c846" rx="3"/>

  <!-- Crane counter-jib -->
  <rect x="344" y="52" width="38" height="10" fill="#f5a623" rx="3"/>

  <!-- Crane diagonal support -->
  <line x1="351" y1="58" x2="291" y2="95" stroke="#e0720c" stroke-width="5" stroke-linecap="round"/>

  <!-- Crane trolley -->
  <rect x="282" y="62" width="16" height="10" fill="#e0720c" rx="2"/>

  <!-- Crane hoist rope -->
  <line x1="290" y1="72" x2="290" y2="148" stroke="#f9c846" stroke-width="3"/>

  <!-- Crane hook block -->
  <rect x="278" y="146" width="24" height="16" fill="#e0720c" rx="3"/>
  <rect x="285" y="138" width="4" height="10" fill="#f5a623" rx="1"/>
  <rect x="293" y="138" width="4" height="10" fill="#f5a623" rx="1"/>

  <!-- Crane tip signal light -->
  <circle cx="362" cy="52" r="5" fill="#ff4444" opacity="0.9"/>
  <circle cx="362" cy="52" r="8" fill="#ff4444" opacity="0.2"/>

  <!-- Decorative dots / rivets on building -->
  <circle cx="152" cy="226" r="4" fill="#e0720c"/>
  <circle cx="360" cy="226" r="4" fill="#e0720c"/>

  <!-- Separator line above text -->
  <rect x="60" y="412" width="392" height="2" fill="#f5a623" opacity="0.35" rx="1"/>

  <!-- Text: STROY MARKET -->
  <text x="256" y="450"
        font-family="Arial Black, Arial, sans-serif"
        font-size="40"
        font-weight="900"
        fill="#ffffff"
        text-anchor="middle"
        letter-spacing="2">STROY MARKET</text>

  <!-- Text: UZBEKISTAN -->
  <text x="256" y="486"
        font-family="Arial, sans-serif"
        font-size="20"
        fill="#f9c846"
        text-anchor="middle"
        letter-spacing="8">UZBEKISTAN</text>
</svg>`;

async function generateLogo() {
  const dir = path.dirname(LOGO_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await sharp(Buffer.from(SVG))
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(LOGO_PATH);

  return LOGO_PATH;
}

async function ensureLogo() {
  if (!fs.existsSync(LOGO_PATH)) {
    await generateLogo();
  }
  return LOGO_PATH;
}

if (require.main === module) {
  generateLogo()
    .then((p) => console.log('✅ Logo yaratildi:', p))
    .catch(console.error);
}

module.exports = { generateLogo, ensureLogo, LOGO_PATH };
