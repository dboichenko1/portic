// Портик: виджеты для Scriptable. В настройках виджета в поле Parameter напиши один из вариантов:
//   quote      цитата дня                 exercise   упражнение дня
//   virtue     грань добродетели дня      doctrine   основоположение дня
//   harbor     пристань дня, школа        ritual     утром вопросы утра, вечером вопросы вечера
//   life:1996-03-14:80:16:120             жизнь в неделях: дата рождения, горизонт лет, часов бодрствования, минут в день на пустое
//   memento:1996-03-14:80                 memento mori
// Эти виджеты берут данные с сайта один раз и кэшируют, дальше работают офлайн.
// Виджеты ниже читают последнюю резервную копию Портика. Сохрани копию из приложения
// (Дневник, Резервная копия) в Файлы, в папку iCloud Drive/Scriptable. Чем свежее копия, тем точнее.
//   level      уровень, опыт, серия       exp        активные эксперименты с таймерами
//   today      сводка: серия, уровень, пустое за сегодня, принцип дня
//   word       слово дня из твоего словаря
//   principle  принцип дня из цитадели

const SITE_RAW = 'https://ник.github.io/portik/'; // впиши адрес своего Портика
/* берем только адрес сайта: без ?параметров, #якоря и имени файла вроде w.html или index.html */
const SITE = SITE_RAW.trim().replace(/[?#].*$/, '').replace(/\/[^\/]*\.[a-z0-9]+$/i, '').replace(/\/+$/, '') + '/';
const VERSION = 'виджет v5';

const param = (args.widgetParameter || 'quote').trim();
const parts = param.split(':');
const kind = parts[0] || 'quote';
const fam = config.widgetFamily || 'medium';

const bg = Color.dynamic(new Color('#F5F5F2'), new Color('#000000'));
const ink = Color.dynamic(new Color('#000000'), new Color('#FFFFFF'));
const stone = Color.dynamic(new Color('#6B6A64'), new Color('#9A9992'));
const rule = Color.dynamic(new Color('#DAD9D3'), new Color('#2C2C2A'));
const accent = Color.dynamic(new Color('#6E2B3A'), new Color('#D58C99'));
const green = Color.dynamic(new Color('#2F6A57'), new Color('#88C2AC'));
const serif = size => new Font('Georgia', size);
const serifItalic = size => new Font('Georgia-Italic', size);

function dayIdx(){ const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
function plural(n, a, b, c){ const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b; return c; }
function fmtNum(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
function fmtDec(n){ return String(Math.round(n * 10) / 10).replace('.', ','); }
function yearsWord(x){ const r = Math.round(x * 10) / 10; return r % 1 !== 0 ? fmtDec(r) + ' года' : r + ' ' + plural(r, 'год', 'года', 'лет'); }
function parseDate(k){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || ''); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d.getTime()) ? null : d; }
function todayKey(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmtMin(m){ m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), mm = m % 60; return h ? h + ' ч' + (mm ? ' ' + mm + ' мин' : '') : mm + ' мин'; }
function fmtElapsed(ms){ ms = Math.max(0, ms); const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000); if (d > 0) return d + ' ' + plural(d, 'день', 'дня', 'дней') + ' ' + h + ' ч'; if (h > 0) return h + ' ч ' + m + ' мин'; return m + ' мин'; }
function firstSentence(t){ const m = /^(.*?[.!?])(\s|$)/.exec(t || ''); return m ? m[1] : (t || ''); }

let LAST_ERR = '';
async function fetchText(url){
  const req = new Request(url); req.timeoutInterval = 10;
  const txt = await req.loadString();
  const code = req.response ? req.response.statusCode : 0;
  if (code !== 200) throw new Error('HTTP ' + code + ' ' + url);
  return txt;
}
async function loadData(){
  const fm = FileManager.local();
  const path = fm.joinPath(fm.documentsDirectory(), 'portik-w.json');
  if (/ник|nick|USERNAME/i.test(SITE)){ LAST_ERR = 'в SITE остался шаблон, впиши свой адрес'; }
  else {
    try {
      const d = JSON.parse(await fetchText(SITE + 'w.json'));
      if (d && d.quotes && d.exs){ fm.writeString(path, JSON.stringify(d)); return d; }
      throw new Error('w.json без данных');
    } catch (e) { LAST_ERR = 'w.json: ' + String(e.message || e); }
    try {
      const html = await fetchText(SITE + 'w.js');
      const m = /const D = (\{[\s\S]*?\});\n/.exec(html);
      if (m){ const d = JSON.parse(m[1]); if (d && d.quotes && d.exs){ fm.writeString(path, JSON.stringify(d)); return d; } }
      LAST_ERR += '; w.js без данных';
    } catch (e) { LAST_ERR += '; w.js: ' + String(e.message || e); }
  }
  if (fm.fileExists(path)){ try { const d = JSON.parse(fm.readString(path)); if (d && d.quotes){ return d; } } catch (e) {} }
  return null;
}
async function loadBackup(){
  const managers = [];
  try { managers.push(FileManager.iCloud()); } catch (e) {}
  managers.push(FileManager.local());
  let best = null;
  for (const fm of managers){
    let dir; try { dir = fm.documentsDirectory(); } catch (e) { continue; }
    let names = []; try { names = fm.listContents(dir); } catch (e) { continue; }
    for (const n of names){
      if (!/^portik-\d{4}-\d{2}-\d{2}.*\.json$/i.test(n)) continue;
      const p = fm.joinPath(dir, n);
      let mod = 0; try { mod = fm.modificationDate(p).getTime(); } catch (e) {}
      if (!best || mod > best.mod || (mod === best.mod && n > best.n)) best = { fm, p, n, mod };
    }
  }
  if (!best) return null;
  try { if (best.fm.isFileStoredIniCloud && best.fm.isFileStoredIniCloud(best.p) && !best.fm.isFileDownloaded(best.p)) await best.fm.downloadFileFromiCloud(best.p); } catch (e) {}
  try { const d = JSON.parse(best.fm.readString(best.p)); d.__file = best.n; return d; } catch (e) { LAST_ERR = 'не прочитался ' + best.n; return null; }
}

const w = new ListWidget();
w.backgroundColor = bg;
w.setPadding(14, 16, 14, 16);
w.url = SITE;

function kicker(t){ const k = w.addText(t); k.font = Font.regularSystemFont(11); k.textColor = stone; w.addSpacer(6); }
function big(t, size, lines){ const x = w.addText(t); x.font = serif(size); x.textColor = ink; x.minimumScaleFactor = 0.6; if (lines) x.lineLimit = lines; return x; }
function body(t, lines){ const x = w.addText(t); x.font = Font.regularSystemFont(13); x.textColor = ink; x.lineLimit = lines || 3; x.minimumScaleFactor = 0.8; return x; }
function small(t, lines){ const x = w.addText(t); x.font = Font.regularSystemFont(12); x.textColor = stone; x.minimumScaleFactor = 0.7; if (lines) x.lineLimit = lines; return x; }
function cite(t){ const c = w.addText(t); c.font = serifItalic(12); c.textColor = stone; c.lineLimit = 1; c.minimumScaleFactor = 0.7; return c; }
function noData(msg){
  kicker('Портик, ' + VERSION); big('Нет данных', 18); small(msg, 2);
  const site = w.addText('SITE: ' + SITE); site.font = Font.regularSystemFont(11); site.textColor = stone; site.lineLimit = 1; site.minimumScaleFactor = 0.6;
  if (LAST_ERR){ const er = w.addText(LAST_ERR); er.font = Font.regularSystemFont(11); er.textColor = accent; er.lineLimit = 4; er.minimumScaleFactor = 0.7; }
  if (!config.runsInWidget) console.log('SITE=' + SITE + '\n' + LAST_ERR);
}
function bar(frac, color){
  const W = fam === 'small' ? 130 : 300, H = 6;
  const ctx = new DrawContext(); ctx.size = new Size(W, H); ctx.opaque = false; ctx.respectScreenScale = true;
  ctx.setFillColor(rule); ctx.fillRect(new Rect(0, 0, W, H));
  ctx.setFillColor(color || accent); ctx.fillRect(new Rect(0, 0, Math.max(2, Math.round(W * Math.max(0, Math.min(1, frac)))), H));
  const img = w.addImage(ctx.getImage()); img.leftAlignImage();
}
function stale(d){ const k = d && d.exportedAt ? String(d.exportedAt).slice(0, 10) : ''; return k && k !== todayKey() ? ' по копии от ' + k.slice(8, 10) + '.' + k.slice(5, 7) : ''; }

const dataKinds = ['quote', 'exercise', 'virtue', 'doctrine', 'harbor'];
const backupKinds = ['level', 'exp', 'today', 'word', 'principle'];

if (dataKinds.includes(kind)){
  const D = await loadData();
  if (!D){ noData('Не удалось взять данные с сайта'); }
  else if (kind === 'quote'){
    const q = D.quotes[(dayIdx() * 7) % D.quotes.length];
    w.url = SITE + '#note';
    kicker('Цитата дня'); big(q.t, fam === 'small' ? 15 : fam === 'medium' ? 18 : 24, fam === 'small' ? 6 : fam === 'medium' ? 5 : 10); w.addSpacer(8); cite(q.r);
  } else if (kind === 'exercise'){
    const e = D.exs[(dayIdx() * 5 + 3) % D.exs.length];
    w.url = SITE + '#note-ex';
    kicker('Упражнение дня'); big(e.title, fam === 'small' ? 16 : 22, 2); small(e.who + ', ' + e.ref, 1);
    if (fam !== 'small'){ w.addSpacer(8); body(e.idea, fam === 'medium' ? 3 : 5); }
    if (fam === 'large'){ w.addSpacer(10); (e.steps || []).slice(0, 5).forEach((st, i) => { const t = w.addText((i + 1) + '. ' + st); t.font = Font.regularSystemFont(13); t.textColor = ink; t.lineLimit = 2; w.addSpacer(3); }); }
  } else if (kind === 'virtue'){
    const v = D.virtues[dayIdx() % D.virtues.length]; const sub = v.sub[Math.floor(dayIdx() / 4) % v.sub.length]; const ex = v.ex[dayIdx() % Math.max(1, v.ex.length)];
    kicker('Грань дня'); big(v.name, fam === 'small' ? 20 : 26, 1); small(v.gr, 1);
    if (fam !== 'small'){ w.addSpacer(8); body(v.modern, fam === 'medium' ? 2 : 4); w.addSpacer(8); body('Составляющая: ' + sub.name + '. ' + sub.modern, fam === 'medium' ? 2 : 3); }
    if (fam === 'large' && ex){ w.addSpacer(8); small('Упражнение: ' + ex, 2); }
  } else if (kind === 'doctrine'){
    const d = D.doctrines[dayIdx() % D.doctrines.length];
    kicker('Основоположение дня'); big(d.title, fam === 'small' ? 17 : 22, 2); small(d.term + ', ' + d.short, 2);
    if (fam !== 'small'){ w.addSpacer(8); body(fam === 'medium' ? firstSentence(d.modern) : d.modern, fam === 'medium' ? 3 : 7); }
    if (fam === 'large' && d.quote){ w.addSpacer(8); cite(d.quote.t.length > 90 ? d.quote.r : d.quote.t + ' ' + d.quote.r); }
  } else if (kind === 'harbor'){
    const h = D.harbors[(dayIdx() * 11) % D.harbors.length];
    kicker('Пристань дня'); big(h.name, fam === 'small' ? 17 : 22, 2); small(h.era, 1);
    if (fam !== 'small'){ w.addSpacer(8); body(h.theses[dayIdx() % Math.max(1, h.theses.length)] || h.summary, fam === 'medium' ? 3 : 4); }
    if (fam === 'large'){ w.addSpacer(8); body(h.summary, 4); if (h.quote){ w.addSpacer(8); cite(h.quote.t.length > 90 ? h.quote.r : h.quote.t); } }
  }
} else if (kind === 'ritual'){
  const hour = new Date().getHours(); const evening = hour >= 15;
  w.url = SITE + '#' + (evening ? 'evening' : 'morning');
  kicker(evening ? 'Вечер, разбор дня' : 'Утро, подготовка к дню');
  const qs = evening ? ['Что я сегодня сделал хорошо?', 'Где я оступился?', 'Что сделаю иначе в следующий раз?', 'Что было в моей власти, а что нет?'] : ['Что сегодня может пойти не так?', 'Как я хочу ответить, если так случится?', 'Что из сегодняшнего в моей власти?', 'Какую добродетель практикую сегодня?'];
  qs.slice(0, fam === 'small' ? 2 : 4).forEach(q => { const t = w.addText(q); t.font = serif(fam === 'small' ? 14 : 16); t.textColor = ink; t.lineLimit = 2; w.addSpacer(4); });
  w.addSpacer(4); small(evening ? 'Нажми, чтобы открыть вечер в Портике' : 'Нажми, чтобы открыть утро в Портике', 1);
} else if (backupKinds.includes(kind)){
  const d = await loadBackup();
  const S = d && d.summary;
  if (!S){ noData('Сохрани копию из Портика в Файлы, в папку iCloud Drive/Scriptable'); }
  else if (kind === 'level'){
    kicker('Уровень' + stale(d));
    big(S.levelName, fam === 'small' ? 18 : 24, 1);
    small(S.xp + ' XP, уровень ' + S.level + (S.next ? ', до следующего ' + (S.next - S.xp) : ''), 1);
    w.addSpacer(8); bar(S.frac, accent); w.addSpacer(8);
    small('серия ' + S.streak + ' ' + plural(S.streak, 'день', 'дня', 'дней') + (S.bestStreak > S.streak ? ', лучшая ' + S.bestStreak : '') + ', практика ' + S.practiceStreak + ' ' + plural(S.practiceStreak, 'день', 'дня', 'дней'), 2);
  } else if (kind === 'exp'){
    kicker('Эксперименты' + stale(d));
    const list = (S.exps || []).slice(0, fam === 'small' ? 1 : fam === 'medium' ? 2 : 5);
    if (!list.length) small('Активных экспериментов нет', 2);
    list.forEach((e, i) => {
      const t = w.addText(e.title); t.font = Font.semiboldSystemFont(14); t.textColor = ink; t.lineLimit = 1;
      const v = w.addText(e.type === 'avoid' ? 'держусь ' + fmtElapsed(Date.now() - e.anchor) : 'серия ' + e.streak + ' ' + plural(e.streak, 'день', 'дня', 'дней') + ', в зачет ' + e.okDays); v.font = serif(fam === 'small' ? 18 : 22); v.textColor = ink; v.lineLimit = 1;
      if (e.target){ bar(Math.min(1, (e.type === 'avoid' ? Math.max(e.okDays, (Date.now() - e.anchor) / 86400000) : e.okDays) / e.target), green); }
      if (i < list.length - 1) w.addSpacer(8);
    });
  } else if (kind === 'today'){
    kicker('Портик' + stale(d));
    const line1 = w.addText('серия ' + S.streak + ' ' + plural(S.streak, 'день', 'дня', 'дней') + ', уровень ' + S.level); line1.font = serif(fam === 'small' ? 16 : 20); line1.textColor = ink; line1.lineLimit = 1;
    small(S.levelName + ', ' + S.xp + ' XP', 1);
    w.addSpacer(6);
    if (S.wasteDay === todayKey()) body('Сегодня на пустое: ' + fmtMin(S.todayWaste) + (S.running ? ', таймер идет' : ''), 1); else body('За сегодня отметок времени нет', 1);
    if ((S.exps || []).length) body('Эксперименты: ' + S.exps.length + ', ' + S.exps.map(e => e.title).slice(0, 2).join(', '), 1);
    if (fam !== 'small' && S.principles && S.principles.length){ w.addSpacer(8); const p = w.addText(S.principles[dayIdx() % S.principles.length]); p.font = serifItalic(14); p.textColor = ink; p.lineLimit = fam === 'medium' ? 2 : 4; }
  } else if (kind === 'word'){
    const words = (S.words || []).filter(x => x.term);
    kicker('Слово дня' + stale(d));
    if (!words.length) small('В словаре пока пусто', 2);
    else { const x = words[(dayIdx() * 13) % words.length]; big(x.term, fam === 'small' ? 22 : 28, 2); small(x.tr || x.def || '', 2); if (fam !== 'small' && x.ctx){ w.addSpacer(8); const c = w.addText(x.ctx); c.font = serifItalic(13); c.textColor = stone; c.lineLimit = 3; } }
  } else if (kind === 'principle'){
    const ps = (S.principles || []).filter(Boolean);
    kicker('Принцип дня');
    if (!ps.length) small('Принципы пока не записаны', 2);
    else big(ps[dayIdx() % ps.length], fam === 'small' ? 15 : fam === 'medium' ? 18 : 22, fam === 'small' ? 5 : 6);
  }
} else { kicker('Портик'); big('Неизвестный параметр', 18); small('quote, exercise, virtue, doctrine, harbor, ritual, life:дата:80:16:120, memento:дата:80, level, exp, today, word, principle', 4); }

if (config.runsInWidget) Script.setWidget(w);
else if (fam === 'large') await w.presentLarge();
else if (fam === 'small') await w.presentSmall();
else await w.presentMedium();
Script.complete();
