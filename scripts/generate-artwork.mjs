import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const output = path.resolve(process.cwd(), 'public', 'film-expo-art')
await mkdir(output, { recursive: true })

const escapeXml = (value) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
})[character])

function svgPage(title, colors, body, { width = 960, height = 640, extra = '' } = {}) {
  const [base, accent, warm] = colors
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${base}"/><stop offset="1" stop-color="#07141f"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0.9" y2="1"><stop stop-color="${accent}" stop-opacity=".62"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>
<linearGradient id="warm" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${warm}"/><stop offset="1" stop-color="${warm}" stop-opacity="0"/></linearGradient>
<radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".52"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
<pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" stroke="#fff" stroke-opacity=".055"/></pattern>
<filter id="soft"><feGaussianBlur stdDeviation="24"/></filter>
</defs>
<rect width="${width}" height="${height}" fill="url(#bg)"/>
<ellipse cx="${width * .74}" cy="${height * .23}" rx="${width * .31}" ry="${height * .36}" fill="url(#glow)"/>
<rect width="${width}" height="${height}" fill="url(#grid)"/>
<path d="M0 ${height * .77}L${width * .5} ${height * .61}L${width} ${height * .73}V${height}H0Z" fill="#07111a"/>
<path d="M0 ${height * .82}L${width * .5} ${height * .7}L${width} ${height * .81}" stroke="${accent}" stroke-opacity=".38" stroke-width="2"/>
${body}
<rect width="${width}" height="${height}" fill="url(#warm)" opacity=".075"/>
<rect width="${width}" height="${height}" fill="url(#fade)"/>
<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#020c14" stop-opacity=".08"/><stop offset=".61" stop-color="#020c14" stop-opacity="0"/><stop offset="1" stop-color="#020c14" stop-opacity=".76"/></linearGradient></defs>
<g opacity=".77"><rect x="32" y="32" width="24" height="3" rx="1.5" fill="${warm}"/><text x="68" y="39" fill="#f3f4ef" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="3">${escapeXml(title.toUpperCase())}</text></g>
${extra}
</svg>`
}

function people(count, start = 0) {
  return Array.from({ length: count }, (_, index) => {
    const x = 70 + index * 63 + (index % 2) * 14 + start
    const y = 446 + (index % 3) * 9
    const size = 1 + (index % 3) * .1
    const jacket = ['#071522', '#102436', '#182a37', '#282a2c'][index % 4]
    return `<g transform="translate(${x} ${y}) scale(${size})"><ellipse cx="0" cy="0" rx="19" ry="7" fill="#020912" opacity=".5"/><path d="M-10-47Q0-57 10-47L17 0H-17Z" fill="${jacket}"/><path d="M-7-49Q0-59 7-49L5-31H-5Z" fill="#b87a56"/><circle cy="-59" r="7" fill="#c28a63"/><path d="M-7-64Q0-72 7-64V-60H-7Z" fill="#12171d"/></g>`
  }).join('')
}

function cameraRig(x, y, scale = 1, color = '#111d27') {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
<path d="M-48 42H49L39-3H-37Z" fill="${color}" stroke="#71818b" stroke-opacity=".6" stroke-width="3"/>
<path d="M-26-4L-13-22H16L28-4" fill="#172734" stroke="#a9b7bd" stroke-opacity=".45" stroke-width="3"/>
<circle cx="56" cy="18" r="28" fill="#0c1822" stroke="#596976" stroke-width="5"/>
<circle cx="56" cy="18" r="17" fill="#142b3c" stroke="#f5a623" stroke-width="2"/>
<circle cx="56" cy="18" r="8" fill="#2f9bc4" opacity=".7"/>
<path d="M-10 44L-43 125M14 44L43 125M2 43L2 126" stroke="#65737c" stroke-width="5"/>
<rect x="-27" y="53" width="55" height="5" rx="2" fill="#71818b"/>
</g>`
}

function stageScene(title, accent, warm, variant = 0, showScreenBrand = true) {
  const screenX = variant % 2 ? 400 : 446
  const screenColor = variant % 2 ? '#087ca5' : '#f5a623'
  return `<path class="animated-beam beam-a" d="M155 55L600 385H188Z" fill="url(#beam)"/>
<path class="animated-beam beam-b" d="M745 43L460 406H886Z" fill="url(#beam)" opacity=".65"/>
<path d="M87 118V405M87 118H871M871 118V405" stroke="#405361" stroke-width="10"/>
<path d="M109 139H850V372H109Z" fill="#081721" stroke="#6f7780" stroke-width="4"/>
<path class="screen-glow" d="M${screenX} 157H805V342H${screenX}Z" fill="${screenColor}" opacity=".62"/>
<path d="M${screenX + 12} 170H790V329H${screenX + 12}Z" fill="#0a2030" opacity=".83"/>
${showScreenBrand ? `<text x="${screenX + 30}" y="228" fill="${warm}" font-family="Georgia,serif" font-size="43" font-weight="bold">FILM EXPO</text>
<text x="${screenX + 45}" y="274" fill="#fff" font-family="Arial,sans-serif" font-size="25" font-weight="bold" letter-spacing="12">INDIA</text>
<path d="M${screenX + 88} 291H${screenX + 236}" stroke="${warm}" stroke-width="3"/>` : ''}
<g fill="${warm}" opacity=".84"><circle cx="203" cy="174" r="20"/><circle cx="245" cy="174" r="20"/><circle cx="287" cy="174" r="20"/></g>
<path d="M125 372H835L930 484H32Z" fill="#121e26" stroke="#50606b" stroke-width="3"/>
<path d="M242 383H709L776 448H179Z" fill="#172631"/>
${cameraRig(154, 334, .88)}
<g class="moving-light"><circle cx="741" cy="218" r="76" fill="url(#glow)"/></g>
${people(12, -6)}`
}

const categories = [
  { id: 'exhibit', title: 'Exhibit / showcase', colors: ['#163547', '#35a9ca', '#f5a623'], body: `${stageScene('Exhibition floor', '#35a9ca', '#f5a623', 0)}<path d="M620 366V288H862V366" fill="#152d3d" stroke="#f5a623" stroke-width="4"/><path d="M647 298H838V347H647Z" fill="#0d5b7c"/><text x="661" y="329" fill="#fff" font-family="Arial" font-size="16" letter-spacing="3">EXPO BOOTH</text>` },
  { id: 'highlights', title: 'Cinema highlights and cameras', colors: ['#0d2636', '#277bac', '#f5a623'], body: `${stageScene('Cinema in motion', '#277bac', '#f5a623', 2)}${cameraRig(723, 352, 1.35, '#0d1720')}` },
  { id: 'venue', title: 'Mumbai convention centre', colors: ['#183142', '#448fa8', '#f2ac54'], body: `<path d="M80 377H876V490H80Z" fill="#111c24"/><path d="M128 377V207L490 106L849 207V377Z" fill="#182a35" stroke="#c39158" stroke-width="5"/><path d="M128 207H849M185 222V376M789 222V376" stroke="#d2a06a" stroke-opacity=".8" stroke-width="6"/><path d="M204 238H770V361H204Z" fill="#203c4a"/><path d="M240 258H343V354H240ZM385 258H487V354H385ZM532 258H636V354H532ZM675 258H740V354H675Z" fill="#e2a45e"/><path d="M251 273H332V350H251ZM395 273H477V350H395ZM544 273H625V350H544ZM684 273H731V350H684Z" fill="#0d2635"/><text x="276" y="191" fill="#ffe0a7" font-family="Georgia,serif" font-size="27" letter-spacing="2">CONVENTION CENTRE</text><path d="M180 412H800M251 443H735" stroke="#f2ac54" stroke-opacity=".5" stroke-width="3"/><circle cx="167" cy="396" r="5" fill="#f5a623"/><circle cx="821" cy="396" r="5" fill="#f5a623"/>` },
  { id: 'visit', title: 'Visitors / networking', colors: ['#163443', '#35a9ca', '#f5a623'], body: `${stageScene('Meet the industry', '#35a9ca', '#f5a623', 1)}<g transform="translate(402 423)"><circle cx="-22" cy="-50" r="12" fill="#c58b67"/><path d="M-39-37L-53 43H-8L-10-38Z" fill="#345c6b"/><circle cx="35" cy="-52" r="12" fill="#a96f50"/><path d="M19-40L3 42H52L49-40Z" fill="#6b3942"/><path d="M-7-5L17-11" stroke="#f3bd80" stroke-width="8" stroke-linecap="round"/></g>` },
  { id: 'film-submission', title: 'Film production', colors: ['#233143', '#6277ac', '#f4ad39'], body: `${stageScene('Behind the scenes', '#6277ac', '#f4ad39', 2)}${cameraRig(664, 354, 1.42, '#101923')}<path d="M754 114L610 355H803Z" fill="url(#beam)" opacity=".45"/>` },
  { id: 'sponsorship', title: 'Film sponsorship', colors: ['#253449', '#a67756', '#f5a623'], body: `${stageScene('Creative partnerships', '#a67756', '#f5a623', 3)}<g transform="translate(500 392)"><path d="M-92 5Q-72-18-50 1L-16 26Q2 38 13 22L45-11Q61-26 77-6L104 22" stroke="#f5c090" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/><path d="M-82 12L-40 42M76-4L103 24" stroke="#d59c6b" stroke-width="7"/></g>` },
  { id: 'conference', title: 'Conference stage', colors: ['#201d42', '#706bf5', '#f5a623'], body: `${stageScene('Conference / live', '#706bf5', '#f5a623', 4)}<path d="M240 390H740V433H240Z" fill="#17152d" stroke="#8a77ff" stroke-width="3"/><g transform="translate(486 350)"><circle cy="-29" r="14" fill="#bc805c"/><path d="M-18-10Q0-20 18-10L26 30H-26Z" fill="#172533"/><path d="M-20 0H-42V-50" stroke="#f5a623" stroke-width="4"/><circle cx="-42" cy="-52" r="6" fill="#f5a623"/></g>` },
  { id: 'production', title: 'Film production', colors: ['#172b3c', '#38a6c5', '#f4ac39'], body: `${stageScene('Film production', '#38a6c5', '#f4ac39', 5)}${cameraRig(485, 358, 1.5, '#101b24')}<path d="M257 192L418 360H279Z" fill="url(#beam)" opacity=".48"/>` },
  { id: 'post-production', title: 'Post-production and VFX', colors: ['#151f3b', '#646ef2', '#f5a623'], body: `<rect x="145" y="145" width="675" height="298" rx="10" fill="#111a28" stroke="#8290a4" stroke-width="6"/><rect x="165" y="166" width="635" height="214" rx="4" fill="#091423"/><path d="M185 339L270 272L352 303L449 218L541 295L655 224L779 282V371H185Z" fill="#17415a"/><path d="M185 340L270 272L352 303L449 218L541 295L655 224L779 282" stroke="#54d3f0" stroke-width="5"/><rect x="168" y="388" width="630" height="10" rx="5" fill="#f5a623"/><rect x="168" y="405" width="460" height="9" rx="4" fill="#766cf6"/><rect x="168" y="422" width="555" height="8" rx="4" fill="#37a7c9"/><path d="M358 444V484M600 444V484" stroke="#77858d" stroke-width="10"/>` },
  { id: 'content-ip', title: 'Content and IP', colors: ['#14253c', '#5c70df', '#f5a623'], body: `<path d="M340 131L611 201V407L340 474L69 407V201Z" fill="#14293d" stroke="#61738a" stroke-width="5"/><path d="M340 131V338L69 407V201Z" fill="#213d58"/><path d="M340 131L611 201L340 269L69 201Z" fill="#385776"/><path d="M265 252L447 306L345 361L164 307Z" fill="#0e1724" stroke="#f5a623" stroke-width="4"/><path d="M230 291L287 275V310L230 326Z" fill="#f5a623"/><path d="M372 304L403 313" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` },
  { id: 'streaming', title: 'Streaming and digital platforms', colors: ['#111f3f', '#347df2', '#f5a623'], body: `<rect x="127" y="128" width="706" height="352" rx="18" fill="#111a2b" stroke="#6f8291" stroke-width="6"/><rect x="153" y="153" width="654" height="298" rx="6" fill="#0c1523"/><g fill="#182a3c" stroke="#3b566b" stroke-width="2"><rect x="173" y="174" width="180" height="109" rx="5"/><rect x="369" y="174" width="180" height="109" rx="5"/><rect x="565" y="174" width="220" height="109" rx="5"/><rect x="173" y="301" width="180" height="109" rx="5"/><rect x="369" y="301" width="180" height="109" rx="5"/><rect x="565" y="301" width="220" height="109" rx="5"/></g><g fill="#f5a623" opacity=".83"><path d="M249 206L249 252L288 229Z"/><path d="M442 206L442 252L481 229Z"/><path d="M660 334L660 380L699 357Z"/></g><path d="M470 480V515M315 516H645" stroke="#788792" stroke-width="12" stroke-linecap="round"/>` },
  { id: 'animation-gaming', title: 'Animation and gaming', colors: ['#172344', '#8671f2', '#38c5dc'], body: `<path d="M204 225Q220 179 281 179H680Q741 179 757 225L796 357Q810 410 759 415Q734 417 709 385L683 355H279L251 385Q227 417 202 415Q151 410 166 357Z" fill="#20294a" stroke="#9e8df7" stroke-width="6"/><path d="M263 230V312M222 271H304" stroke="#edf3ff" stroke-width="17" stroke-linecap="round"/><circle cx="640" cy="250" r="16" fill="#42e1d6"/><circle cx="698" cy="286" r="16" fill="#f370bd"/><circle cx="640" cy="319" r="16" fill="#f5a623"/><circle cx="582" cy="286" r="16" fill="#60a8ff"/><path d="M417 219Q470 172 523 219V353Q470 393 417 353Z" fill="#1b3550" stroke="#54d3f0" stroke-width="4"/><path d="M439 319L468 264L493 300L509 277" stroke="#f5a623" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` },
  { id: 'film-tourism', title: 'Film tourism and locations', colors: ['#182c44', '#4e9eb4', '#f0a950'], body: `<path d="M0 371L146 230L224 315L371 155L477 285L580 196L765 365V500H0Z" fill="#24495a"/><path d="M0 410L165 305L289 381L432 240L590 366L755 275L960 417V520H0Z" fill="#152f40"/><path d="M608 208H801V415H608Z" fill="#d08a49"/><path d="M586 208L705 133L824 208Z" fill="#f0b56c"/><path d="M650 252H684V293H650ZM719 252H753V293H719ZM650 323H684V365H650ZM719 323H753V365H719Z" fill="#0e2638"/><circle cx="175" cy="146" r="53" fill="#eea951" opacity=".72"/><path d="M0 480H960" stroke="#edae64" stroke-opacity=".48" stroke-width="4"/>` },
]

function portrait(title, colors, variant) {
  const [base, accent, warm] = colors
  const hair = ['#161923', '#392327', '#201b19', '#323142', '#1b2025'][variant % 5]
  const skin = ['#b97855', '#d19a79', '#965f48', '#c58762', '#e0aa82'][variant % 5]
  const jacket = ['#172533', '#5e3340', '#253a4a', '#242739', '#473829'][variant % 5]
  return svgPage(title, colors, `<rect x="77" y="74" width="806" height="490" rx="12" fill="#ffffff" fill-opacity=".055"/>
<circle cx="700" cy="197" r="147" fill="url(#glow)"/>
<path d="M0 443L251 258L427 381L616 251L960 475V640H0Z" fill="#0b1721" opacity=".83"/>
<path d="M265 587Q281 378 479 365Q680 375 702 587Z" fill="${jacket}"/>
<path d="M404 364L482 491L558 365L535 344H431Z" fill="${warm}" opacity=".74"/>
<path d="M444 319H519V402Q481 440 444 402Z" fill="${skin}"/>
<ellipse cx="481" cy="269" rx="95" ry="116" fill="${skin}"/>
<path d="M385 276Q354 136 484 132Q613 129 576 275L552 213L516 205L438 226L403 212Z" fill="${hair}"/>
<path d="M404 280Q390 223 435 207M557 274Q565 228 538 209" stroke="${hair}" stroke-width="18" stroke-linecap="round"/>
<path d="M440 283H458M504 283H523" stroke="#3b2520" stroke-width="7" stroke-linecap="round"/>
<path d="M459 330Q481 341 502 329" stroke="#743e37" stroke-width="5" stroke-linecap="round"/>
<path d="M472 290L464 317L480 319" stroke="#995f4b" stroke-width="4" stroke-linejoin="round"/>
<path d="M442 415L480 474L519 415" stroke="${accent}" stroke-opacity=".86" stroke-width="4"/>
<path d="M366 591H598" stroke="${warm}" stroke-opacity=".65" stroke-width="4"/>
`, { extra: `<g opacity=".72"><circle cx="95" cy="518" r="42" fill="url(#glow)"/><circle cx="862" cy="122" r="6" fill="${warm}"/><circle cx="828" cy="151" r="3" fill="#fff"/></g>` })
}

const partners = [
  ['CINEMA TECH', '#d08a34', '◉'],
  ['CAMERA GEAR', '#388baf', '▣'],
  ['STUDIO PARTNER', '#7466c9', '✦'],
  ['MEDIA PARTNER', '#bd6652', '▶'],
  ['LIGHTING LAB', '#d89f39', '✳'],
  ['POST HOUSE', '#457f9d', '▤'],
  ['FRAME WORKS', '#9a6947', '▧'],
  ['PIXEL UNION', '#7668c7', '✦'],
  ['SOUND STAGE', '#338c7d', '◖'],
  ['FILM CRAFT', '#be7843', '▰'],
  ['CREATOR HUB', '#4483b5', '✺'],
  ['SCREEN GUILD', '#9b6c43', '◈'],
]

const assets = [...categories]
for (const asset of assets) {
  const filename = `${asset.id}.svg`
  await writeFile(path.join(output, filename), svgPage(asset.title, asset.colors, asset.body), 'utf8')
}

const heroScene = stageScene('Film Expo India', '#2374a4', '#f5a623', 1, false)
await writeFile(
  path.join(output, 'hero-expo.svg'),
  svgPage('Film Expo India 2027 · Mumbai', ['#0a2131', '#2374a4', '#f5a623'], `<g transform="scale(1.667 1.406)">${heroScene}</g>`, {
    width: 1600,
    height: 900,
    extra: `<style>
      .animated-beam{transform-box:fill-box;transform-origin:center;animation:sweep 8s ease-in-out infinite alternate}
      .beam-b{animation-delay:-3.5s;animation-duration:9.5s}
      .screen-glow{transform-box:fill-box;transform-origin:center;animation:screenPulse 5s ease-in-out infinite alternate}
      .moving-light{animation:lightDrift 12s ease-in-out infinite alternate}
      @keyframes sweep{from{opacity:.24;transform:rotate(-4deg) translateX(-28px)}to{opacity:.8;transform:rotate(5deg) translateX(42px)}}
      @keyframes screenPulse{from{opacity:.44}to{opacity:.8}}
      @keyframes lightDrift{from{transform:translateX(-90px)}to{transform:translateX(75px)}}
      @media(prefers-reduced-motion:reduce){.animated-beam,.screen-glow,.moving-light{animation:none}}
    </style>`,
  }),
  'utf8',
)

for (let index = 0; index < 5; index++) {
  const colors = [
    ['#20283b', '#4f8ca4', '#f5a623'],
    ['#35243c', '#9974b2', '#efaa50'],
    ['#1b3640', '#55a8b1', '#f3b653'],
    ['#312b46', '#8677bd', '#e9a14c'],
    ['#26333d', '#7298aa', '#f0b157'],
  ][index]
  await writeFile(path.join(output, `speaker-${index + 1}.svg`), portrait(`Film Expo India · speaker ${index + 1}`, colors, index), 'utf8')
}

for (const [index, [name, accent, symbol]] of partners.entries()) {
  await writeFile(path.join(output, `partner-${String(index + 1).padStart(2, '0')}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" fill="none">
<rect width="320" height="120" rx="10" fill="#f7f7f4"/>
<circle cx="57" cy="60" r="34" fill="${accent}" fill-opacity=".11"/>
<circle cx="57" cy="60" r="26" stroke="${accent}" stroke-width="3"/>
<text x="57" y="69" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" font-size="27" font-weight="700">${escapeXml(symbol)}</text>
<text x="103" y="55" fill="#20313c" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="1">${escapeXml(name)}</text>
<text x="104" y="78" fill="#8a9295" font-family="Arial,sans-serif" font-size="9" font-weight="700" letter-spacing="2">SAMPLE PARTNER LOGO</text>
</svg>`, 'utf8')
}

const newsScenes = [
`${stageScene('Production technology', '#3c92b7', '#f5a623', 5)}${cameraRig(690, 364, 1.45)}`,
stageScene('Film Expo event updates', '#7463c7', '#f1ad59', 3),
`${stageScene('India and global cinema', '#3b9c91', '#f1ad59', 1)}<path d="M602 193L677 152L748 194L677 235Z" fill="#f5a623" fill-opacity=".7"/><path d="M677 235V312" stroke="#f5a623" stroke-width="5"/>`,
]
for (let index = 0; index < newsScenes.length; index++) {
const colors = ['#152d3e', '#24213c', '#153633'][index]
await writeFile(path.join(output, `news-${index + 1}.svg`), svgPage(`Illustrated industry insight ${index + 1}`, [colors, '#438fb1', '#f2ae53'], newsScenes[index]), 'utf8')
}

const galleryScenes = [
  stageScene('The exhibition floor', '#368db7', '#f5a623', 0),
  stageScene('Cinema on the big screen', '#725ce3', '#f5a623', 3),
  `${stageScene('Meet the makers', '#47aab7', '#f0ae52', 2)}<g transform="translate(455 410)"><circle cx="-30" cy="-34" r="15" fill="#ca8a62"/><circle cx="12" cy="-42" r="15" fill="#a86e50"/><path d="M-53-17H-3L6 37H-62ZM-8-24H42L52 30H1Z" fill="#213b4b" stroke="#f2ae55" stroke-width="3"/></g>`,
  `${stageScene('Production technology', '#4192b4', '#efa949', 5)}${cameraRig(690, 363, 1.7)}`,
  stageScene('Film Expo India in Mumbai', '#438caa', '#f1ad59', 4),
]
for (let index = 0; index < galleryScenes.length; index++) {
  const colors = ['#132b3d', '#291e3c', '#13323a', '#15273d', '#302a37'][index]
  await writeFile(path.join(output, `gallery-${index + 1}.svg`), svgPage(`Film Expo India · illustration ${index + 1}`, [colors, '#438fb1', '#f2ae53'], galleryScenes[index]), 'utf8')
}

await writeFile(
  path.join(output, 'closing.svg'),
  svgPage('Be a part of Film Expo India', ['#112536', '#327d9d', '#f2ae53'], `${stageScene('Join the film community', '#327d9d', '#f2ae53', 3)}<path d="M105 506H855" stroke="#f2ae53" stroke-opacity=".7" stroke-width="3"/>`),
  'utf8',
)

console.log(`Generated ${assets.length + 5 + partners.length + galleryScenes.length + newsScenes.length + 2} original Film Expo India SVG artworks in public/film-expo-art.`)
