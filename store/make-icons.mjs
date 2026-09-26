import sharp from 'sharp';

// One footprint: sole + heel + 5 toes, drawn pointing up, centered at (0,0).
const foot = (fill) => `
  <ellipse cx="0" cy="10" rx="46" ry="78" fill="${fill}"/>
  <ellipse cx="4" cy="112" rx="36" ry="40" fill="${fill}"/>
  <circle cx="-30" cy="-90" r="20" fill="${fill}"/>
  <circle cx="2" cy="-100" r="17" fill="${fill}"/>
  <circle cx="30" cy="-94" r="15" fill="${fill}"/>
  <circle cx="52" cy="-78" r="13" fill="${fill}"/>
  <circle cx="66" cy="-56" r="11" fill="${fill}"/>`;

function svg({bg, track, ring, feet}) {
  const r = 360, c = 2 * Math.PI * r, done = 0.75;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  <circle cx="512" cy="512" r="${r}" fill="none" stroke="${track}" stroke-width="96"/>
  <circle cx="512" cy="512" r="${r}" fill="none" stroke="${ring}" stroke-width="96" stroke-linecap="round"
    stroke-dasharray="${c * done} ${c}" transform="rotate(-90 512 512)"/>
  <g transform="translate(430 560) rotate(-12) scale(1.15)">${foot(feet)}</g>
  <g transform="translate(600 440) rotate(12) scale(-1.15 1.15)">${foot(feet)}</g>
</svg>`;
}

const variants = {
  'icon-light.png': {bg: '#FFFFFF', track: '#D7EFEC', ring: '#0F9D8A', feet: '#10302C'},
  'icon-dark.png': {bg: '#0B1413', track: '#1E3A36', ring: '#2EE6C8', feet: '#FFFFFF'},
};
for (const [name, colors] of Object.entries(variants)) {
  await sharp(Buffer.from(svg(colors))).png().toFile(`store/${name}`);
  await sharp(`store/${name}`).resize(24, 24).png().toFile(`store/${name.replace('.png', '-24px.png')}`);
  console.log('wrote', name);
}
