/* v6: preview collapsed by default using <details> */
localforage.config({name:'text-to-codes',storeName:'langdb'})
const DB_KEY='db-flat-v6'
const LAST_LANG_KEY='last-language-v6'

// UI refs
const fileInput=document.getElementById('xlsxFile')
const dropZone=document.getElementById('dropZone')
const clrDbBtn=document.getElementById('clearDbBtn')
const langSel=document.getElementById('languageSelect')
const toggleCase=document.getElementById('caseSensitiveToggle')
const input=document.getElementById('inputText')
const upperOut=document.getElementById('upperOut')
const codedOut=document.getElementById('codedOut')
const status=document.getElementById('statusMsg')
const dbBadge=document.getElementById('dbBadge')
const previewDetails=document.getElementById('previewDetails')
const previewTable=document.getElementById('previewTable')
const rowCountPill=document.getElementById('rowCountPill')
const toast=document.getElementById('toast')
const clearTextBtn=document.getElementById('clearTextBtn')

let rows=[],activeLang='',compiler=null

function setStatus(msg, ok=false){ status.textContent=msg; if(ok){ showToast(msg) } }
function setBadge(saved){ dbBadge.textContent = saved? 'Lokal gespeichert' : 'Nicht gespeichert'; dbBadge.classList.toggle('ok', saved) }
function showToast(text){ toast.textContent=text; toast.classList.remove('hidden'); clearTimeout(showToast._t); showToast._t=setTimeout(()=>toast.classList.add('hidden'), 1500) }

function norm(v){ return String(v==null?'':v).trim() }
function parseAsSchemaA(arr){
  const header=arr.length? Object.keys(arr[0]):[]
  const lower=header.map(h=>h.toLowerCase())
  const hasLang=lower.includes('language')
  const hasPhrase=lower.includes('phrase')
  const hasNumber=lower.includes('number') || lower.includes('code') || lower.includes('id') || lower.includes('nummer')
  if(!(hasLang && hasPhrase && hasNumber)) return null
  const out=[]
  for(const r of arr){
    const language=norm(r.language ?? r.lang ?? r.sprache)
    const phrase=norm(r.phrase ?? r.wort ?? r.term ?? r.text)
    const number=norm(r.number ?? r.code ?? r.id ?? r.nummer)
    if(language && phrase && number) out.push({language, phrase, number})
  }
  return out.length? out : null
}
function parseAsSchemaB(arr){
  const header=arr.length? Object.keys(arr[0]):[]
  const low=header.map(h=>h.toLowerCase())
  let idCol=null, descCol=null
  header.forEach((h,i)=>{
    const l=low[i]
    if(['id','code','nummer','number'].includes(l)) idCol=h
    if(['description','beschreibung','desc','bezeichnung'].includes(l)) descCol=h
  })
  if(!idCol) return null
  const langCols=header.filter(h=>h!==idCol && h!==descCol)
  if(!langCols.length) return null
  const out=[]
  for(const r of arr){
    const idVal=norm(r[idCol]); if(!idVal) continue
    for(const lc of langCols){
      const phrase=norm(r[lc])
      if(!phrase) continue
      out.push({language: lc, phrase, number: idVal})
    }
  }
  return out.length? out : null
}
async function parseXlsx(file){
  const data=new Uint8Array(await file.arrayBuffer())
  const wb=XLSX.read(data,{type:'array'})
  const allRows=[]
  for(const name of wb.SheetNames){
    const ws=wb.Sheets[name]
    const arr=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false})
    allRows.push(...arr)
  }
  const a=parseAsSchemaA(allRows)
  if(a) return {rows:a, schema:'A'}
  const b=parseAsSchemaB(allRows)
  if(b) return {rows:b, schema:'B'}
  return {rows:[], schema:'unknown'}
}

function buildCompiler(language, rows, caseSensitive){
  const filtered=rows.filter(r=>r.language===language && r.phrase && r.number)
                     .sort((a,b)=>b.phrase.length-a.phrase.length)
  if(!filtered.length) return null
  const map=new Map(), parts=[]
  for(const r of filtered){
    const key=caseSensitive? r.phrase : r.phrase.toUpperCase()
    if(!map.has(key)) map.set(key, r.number)
    parts.push(r.phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
  }
  const flags=(caseSensitive? 'gu':'giu')
  const regex=new RegExp(parts.join('|'), flags)
  return {regex,map,caseSensitive}
}
function applyReplace(text, comp){
  if(!comp) return text
  const src=comp.caseSensitive? text : text.toUpperCase()
  return src.replace(comp.regex, (m)=>{
    const key=comp.caseSensitive? m : m.toUpperCase()
    const code=comp.map.get(key)
    return code? `&#${code};` : m
  })
}
function refresh(){
  const raw=input.value||''
  upperOut.textContent=raw.toUpperCase()
  codedOut.textContent=compiler? applyReplace(raw, compiler) : raw
}
function rebuild(){ compiler=buildCompiler(activeLang, rows, toggleCase.checked); refresh() }
function fillLanguageSelect(){
  const langs=[...new Set(rows.map(r=>r.language))].sort((a,b)=>a.localeCompare(b))
  if(!langs.length){
    langSel.disabled=true
    langSel.innerHTML='<option value="">— keine Daten —</option>'
    compiler=null; return
  }
  langSel.disabled=false
  langSel.innerHTML=langs.map(l=>`<option value="${l}">${l}</option>`).join('')
  const fallback=langs[0]
  const wanted=window._lastLang && langs.includes(window._lastLang) ? window._lastLang : fallback
  activeLang=wanted
  langSel.value=activeLang
  rebuild()
  rowCountPill.textContent = `${rows.length} Zeilen`
}
function toPreviewTable(items){
  const head=['language','phrase','number']
  const first=items.slice(0,12)
  let html='<table><thead><tr>'+head.map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>'
  html+=first.map(r=>`<tr><td>${r.language}</td><td>${r.phrase}</td><td>${r.number}</td></tr>`).join('')
  html+='</tbody></table>'
  return html
}
async function handleFile(file){
  try{
    setStatus('Lese Datei …')
    const {rows:parsed, schema}=await parseXlsx(file)
    if(!parsed.length){
      setStatus('Keine gültigen Zeilen gefunden. Prüfe Spalten-ID & Sprachspalten.')
      setBadge(false)
      return
    }
    rows=parsed
    await localforage.setItem(DB_KEY, rows) // auto-save
    setBadge(true)
    fillLanguageSelect()
    previewTable.innerHTML=toPreviewTable(rows)
    // keep details collapsed by default; user can open to peek
    setStatus(`${rows.length} Zeilen geladen (Schema ${schema}).`, true)
  }catch(err){
    console.error(err)
    setStatus('Fehler beim Lesen der XLSX: '+(err?.message||err))
    setBadge(false)
  }
}

// Events
fileInput.addEventListener('change', e=>{ const f=e.target.files?.[0]; if(f) handleFile(f) })
;['dragenter','dragover'].forEach(ev=>dropZone.addEventListener(ev,(e)=>{ e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag') }))
;['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev,(e)=>{ e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag') }))
dropZone.addEventListener('drop', (e)=>{ const f=e.dataTransfer.files?.[0]; if(f) handleFile(f) })

langSel.addEventListener('change', async e=>{
  activeLang=e.target.value
  window._lastLang=activeLang
  await localforage.setItem(LAST_LANG_KEY, activeLang)
  rebuild()
})
toggleCase.addEventListener('change', rebuild)
input.addEventListener('input', refresh)
clearTextBtn.addEventListener('click', ()=>{ input.value=''; refresh(); showToast('Text geleert') })

clrDbBtn.addEventListener('click', async()=>{
  await localforage.removeItem(DB_KEY)
  setBadge(false)
  rows=[]
  langSel.disabled=true
  langSel.innerHTML='<option value=\"\">— keine Daten —</option>'
  compiler=null
  setStatus('Lokale Datenbank gelöscht.')
})

// copy buttons
document.body.addEventListener('click', (e)=>{
  const id=e.target.getAttribute?.('data-copy')
  if(!id) return
  const el=document.getElementById(id)
  navigator.clipboard.writeText(el.textContent||'')
  showToast('Kopiert')
})

// init from local db
;(async function init(){
  try{
    const stored=await localforage.getItem(DB_KEY)
    const last=await localforage.getItem(LAST_LANG_KEY)
    window._lastLang = last || ''
    if(Array.isArray(stored) && stored.length){
      rows=stored
      fillLanguageSelect()
      previewTable.innerHTML=toPreviewTable(rows)
      setStatus(`Lokal geladen: ${rows.length} Zeilen.`)
      setBadge(true)
    }else{
      setBadge(false)
    }
  }catch(e){
    setBadge(false)
  }
  refresh()
})()
