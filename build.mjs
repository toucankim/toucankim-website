import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const root = process.cwd();
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = value => String(value).replace(/\.(md|markdown|json)$/i, '').replace(/[^\p{L}\p{N}_-]/gu, '-');
const validImage = value => {
  if (!value) return '';
  const s=String(value).trim();
  if (/^(https?:\/\/|\/)(?!\/)/i.test(s)) return s;
  if (/^[a-zA-Z0-9_./-]+$/.test(s) && !s.startsWith('../')) return '/' + s.replace(/^\.\//,'');
  return '';
};
const safeBody = markdown => sanitizeHtml(marked.parse(String(markdown||'')), {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'figure', 'figcaption'],
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, a: ['href','title','target','rel'], img:['src','alt','title','loading'] },
  allowedSchemes: ['http','https','mailto']
});
function loadCollection(which) {
  const folder=path.join(root,'content',which);
  if(!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(md|markdown)$/i.test(e.name))
    .map(e=> {
      const file=path.join(folder,e.name), parsed=matter(fs.readFileSync(file,'utf8'));
      const meta=parsed.data||{};
      return { slug: slug(e.name), title: String(meta.title||e.name.replace(/\.(md|markdown)$/i,'')), date: meta.date && !Number.isNaN(new Date(meta.date).getTime()) ? new Date(meta.date).toISOString().slice(0,10) : '', cover: validImage(meta.cover), body: parsed.content, gallery: Array.isArray(meta.gallery) ? meta.gallery.map(validImage).filter(Boolean) : [] };
    }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.title.localeCompare(b.title));
}
const entries={journal:loadCollection('journal'),works:loadCollection('works')};
const bodyClass='cms-entry';
const style=`<style>
.cms-article{max-width:800px;margin:0 auto;padding:80px 22px 110px;color:#f2eee7;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}
.cms-back{font-size:13px;color:#bcbeb9;text-decoration:none}.cms-eyebrow{font-size:12px;color:#a2a7a3;letter-spacing:.14em;margin-top:48px}.cms-article h1{font-size:clamp(31px,5vw,51px);font-weight:400;line-height:1.3;margin:15px 0 30px}.cms-article .cms-cover{width:100%;height:auto;max-height:650px;object-fit:contain;margin:12px 0 35px}.cms-article .cms-content{font-size:16px;line-height:1.95;color:#d6d8d3;overflow-wrap:anywhere}.cms-content img{max-width:100%;height:auto}.cms-content a{color:#f3efe7;text-decoration:underline}.cms-content h2,.cms-content h3{font-weight:500;color:#fff;margin-top:35px}.cms-content pre{white-space:pre-wrap}.cms-content blockquote{border-left:2px solid #777;padding-left:16px;margin-left:0}.cms-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:32px 0}.cms-gallery img{width:100%;height:auto}
.cms-list{max-width:1080px;margin:0 auto;padding:75px 22px 110px}.cms-list h1{font-size:42px;font-weight:400}.cms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:30px;margin-top:45px}.cms-card{border-top:1px solid #484c49;padding:16px 0;color:inherit;text-decoration:none}.cms-card img{width:100%;aspect-ratio:1.25;object-fit:cover;margin-bottom:12px}.cms-card h2{font-size:19px;font-weight:400;margin:7px 0}.cms-card p{font-size:12px;color:#adb0aa}
</style>`;
function htmlDocument(title, content) {
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | TOUCANKIM</title><meta name="description" content="TOUCANKIM 오석 점묘화와 제작 기록">${style}</head><body style="margin:0;background:#111312;color:#f2eee7"><header style="border-bottom:1px solid #343735;padding:26px max(22px,calc((100% - 1100px)/2));display:flex;gap:35px;justify-content:space-between;font:13px Arial,'Malgun Gothic',sans-serif"><a style="color:#f2eee7;text-decoration:none;letter-spacing:.2em" href="/">TOUCANKIM</a><nav style="display:flex;gap:20px"><a style="color:#d1d2cd;text-decoration:none" href="/works/">WORKS</a><a style="color:#d1d2cd;text-decoration:none" href="/journal/">JOURNAL</a></nav></header>${content}<footer style="border-top:1px solid #343735;text-align:center;padding:36px;color:#888;font:12px Arial">© ${new Date().getFullYear()} TOUCANKIM</footer></body></html>`;
}
for(const type of ['journal','works']) {
 const name=type==='journal'?'제작 일지 및 글':'작품 포트폴리오';
 const list=entries[type];
 const listing=`<main class="cms-list"><a class="cms-back" href="/">← HOME</a><p class="cms-eyebrow">${type.toUpperCase()}</p><h1>${name}</h1><div class="cms-grid">${list.length ? list.map(a=>`<a class="cms-card" href="/${type}/${encodeURIComponent(a.slug)}/">${a.cover?`<img src="${esc(a.cover)}" alt="">`:''}<h2>${esc(a.title)}</h2><p>${esc(a.date)}</p></a>`).join('') : '<p>아직 등록된 글이 없습니다.</p>'}</div></main>`;
 const dir=path.join(dist,type);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),htmlDocument(name,listing));
 for(const a of list){
  const gallery=a.gallery.length?`<div class="cms-gallery">${a.gallery.map(img=>`<img loading="lazy" src="${esc(img)}" alt="${esc(a.title)}">`).join('')}</div>`:'';
  const article=`<main class="cms-article"><a class="cms-back" href="/${type}/">← ${name}</a><p class="cms-eyebrow">${type.toUpperCase()} ${esc(a.date)}</p><h1>${esc(a.title)}</h1>${a.cover?`<img class="cms-cover" src="${esc(a.cover)}" alt="${esc(a.title)}">`:''}<div class="cms-content">${safeBody(a.body)}</div>${gallery}</main>`;
  const dest=path.join(dir,a.slug);fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'index.html'),htmlDocument(a.title,article));
 }
}
// Keep the existing landing page, but add an obvious menu and a recent journal section.
let home=fs.readFileSync(path.join(root,'index.html'),'utf8');
home=home.replace('<a href="#works">WORKS</a>', '<a href="/works/">WORKS</a><a href="/journal/">JOURNAL</a>');
const latest=entries.journal.slice(0,3);
const journalSection=`<div class="divider"></div><section class="section wrap" id="journal"><div class="sectiontitle"><div><div class="eyebrow">JOURNAL</div><h2>제작 일지 및 글</h2></div><a class="cta" href="/journal/">전체 글 보기 ↗</a></div><div class="cards">${latest.length?latest.map(a=>`<a class="work" href="/journal/${encodeURIComponent(a.slug)}/"><div class="thumb">${a.cover?`<img src="${esc(a.cover)}" alt="" style="width:100%;height:100%;object-fit:cover">`:'<span>JOURNAL</span>'}</div><h3>${esc(a.title)}</h3><p>${esc(a.date)}</p></a>`).join(''):'<p class="muted">아직 작성된 글이 없습니다.</p>'}</div></section>`;
home=home.replace('<div class="divider"></div><section class="section wrap" id="process">',journalSection+'<div class="divider"></div><section class="section wrap" id="process">');
fs.writeFileSync(path.join(dist,'index.html'),home);
// Copy uploaded media into deployment output; do not publish raw content and admin config.
const media=path.join(root,'media');if(fs.existsSync(media))fs.cpSync(media,path.join(dist,'media'),{recursive:true});
console.log(`Built TOUCANKIM: ${entries.journal.length} journal entries, ${entries.works.length} works`);
