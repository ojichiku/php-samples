import { codepoints } from './text-tools-engine.js';
import { downloadText } from './text-tools-download.js';

const root = document.querySelector('#text-tools');
if (root) {
const $ = selector => root.querySelector(selector);
    const analytics = document.querySelector('[data-text-analytics]');
    if (analytics) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        const id = analytics.dataset.textAnalytics;
        window.gtag('js', new Date());
        window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ignore_referrer: true });
        window.gtag('event', 'page_view', { page_location: location.origin + location.pathname, page_referrer: '', page_title: 'テキスト便利ツール集' });
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
        document.head.append(script);
    }
    const track = (tool, outcome) => {
        if (analytics) window.gtag('event', 'text_tool_run', { tool_name: tool, outcome, page_location: location.origin + location.pathname, page_referrer: '' });
    };

const states = {};
let active = 'format', regexMode = 'build', worker, timer, currentResult = null, tableText = '';
let inputRevision = 0;
const titles = { format:['テキスト整形','空白や空行をまとめて整理します。','整形する'], replace:['置換・文字変換','必要な処理を選ぶと、その設定が表示されます。','置換・変換する'], lines:['行の整理','重複の削除と並べ替えを組み合わせられます。','行を整理する'], regex:['正規表現','作成・確認・サンプル生成を切り替えられます。','実行する'] };
const checkbox = (key,label,checked=false) => `<label><input type="checkbox" name="${key}" ${checked?'checked':''}> ${label}</label>`;
const radios = (key,title,values) => `<fieldset><legend>${title}</legend><div class="choices">${values.map(([value,label],i)=>`<label><input type="radio" name="${key}" value="${value}" ${!i?'checked':''}> ${label}</label>`).join('')}</div></fieldset>`;
const textField = (key,label,placeholder='') => `<label class="field"><span>${label}</span><input type="text" name="${key}" placeholder="${placeholder}" autocomplete="off"></label>`;
const formatOptions = () => `<div class="choices">${checkbox('trim','各行の前後空白を除く',true)}</div>${radios('blank','空行',['none:変更しない','blank:削除する','collapse:連続する空行を1行に'].map(s=>s.split(':')))}`;
const lineOptions = () => `<div class="choices">${checkbox('unique','重複行を削除する',true)}</div>${radios('sort','並べ替え',[['none','しない'],['asc','昇順'],['desc','降順']])}<p class="hint">大小文字と空白を区別。並べ替えは文字コード順です。</p>`;
const conversionOptions = () => `<div class="choices">${checkbox('caseEnabled','大小文字を変換')}${checkbox('widthEnabled','全角・半角を変換')}</div><div data-detail="caseEnabled" class="detail" hidden>${radios('letterCase','英字を',[['upper','大文字に'],['lower','小文字に']])}</div><div data-detail="widthEnabled" class="detail" hidden>${radios('width','変換先',[['half','半角に'],['full','全角に']])}<fieldset><legend>変換する文字</legend><div class="choices">${checkbox('letters','英字',true)}${checkbox('numbers','数字',true)}${checkbox('symbols','記号')}${checkbox('space','スペース')}</div></fieldset><p class="hint">カタカナは変換しません。</p></div><details data-conversion-scope hidden><summary>文字変換する部分を正規表現で絞る</summary>${checkbox('scopeEnabled','一致する部分だけを変換')}<div data-detail="scopeEnabled" hidden>${textField('pattern','正規表現','例：[a-z]+')}<a href="#help">書き方</a></div></details>`;
const replacementOptions = (enabled=true) => `<div class="choices">${checkbox('replaceEnabled','文字列を置換',enabled)}</div><div data-detail="replaceEnabled"><div id="rules"></div><button type="button" id="add-rule" class="small-button">＋ 置換ルールを追加</button><p class="hint">上から順に適用。置換語が空欄なら削除します。</p></div>${conversionOptions()}`;
function regexOptions() {
 if(regexMode==='build') return radios('buildMode','作り方',[['exact','入力そのものに一致'],['general','英字・数字を同じ種類・文字数にする']])+`<details class="verification"><summary>一致する例・しない例で確かめる</summary><label class="field"><span>一致してほしい例（1行1件）</span><textarea name="positive"></textarea></label><label class="field"><span>一致してほしくない例（1行1件）</span><textarea name="negative"></textarea></label></details>`;
 if(regexMode==='match') return textField('pattern','正規表現','例：([0-9]{4})-([0-9]{2})')+`<details><summary>検索の詳しい設定</summary><div class="choices">${checkbox('flagI','大小文字を区別しない')}${checkbox('flagM','行ごとの先頭・末尾')}${checkbox('flagS','ドットが改行にも一致')}${checkbox('flagU','Unicodeとして扱う',true)}</div></details><a href="#help">正規表現の書き方</a>`;
 return `<label class="field"><span>生成件数（1〜10）</span><input type="number" name="amount" min="1" max="10" value="3"></label><p class="hint">ASCII文字・文字クラス・選択・グループ・回数指定に対応。先読み等は生成できません。</p>`;
}
function readSettings() {
 const settings={};
 for (const el of $('#options').querySelectorAll('input,textarea')) {
  if(el.type==='radio'&&!el.checked)continue;
  if(el.name)settings[el.name]=el.type==='checkbox'?el.checked:el.value;
 }
 settings.rules=[...root.querySelectorAll('[data-rule]')].map(row=>({mode:row.querySelector('[data-rule-regex]').checked?'regex':'literal',search:row.querySelector('[data-search]').value,replacement:row.querySelector('[data-replacement]').value}));
 return settings;
}
        const renderMatches = result => {
            const highlight = $('#highlight'), rows = $('#matches');
            let previous = 0;
            const rowFragment = document.createDocumentFragment(), textFragment = document.createDocumentFragment();
            const lines = ['番号\t一致文字列\t行\t列\tキャプチャ'];
            result.matches.forEach((match, i) => {
                textFragment.append(document.createTextNode(result.text.slice(previous, match.index)));
                const mark = document.createElement('mark');
                mark.textContent = match.value === '' ? '│' : match.value;
                mark.title = `${i + 1}件目${match.value === '' ? '（空文字）' : ''}`;
                textFragment.append(mark); previous = match.index + match.value.length;
                const showValue = value => value === null ? '未一致' : value === '' ? '空文字' : value;
                const captures = [
                    ...match.captures.map((value, index) => `グループ${index + 1}：${showValue(value)}`),
                    ...Object.entries(match.groups ?? {}).map(([key, value]) => `${key}：${showValue(value ?? null)}`),
                ].join(' ／ ') || 'グループの指定なし';
                const row = document.createElement('tr');
                for (const value of [String(i + 1), match.value === '' ? '（空文字）' : match.value, `${match.row}行${match.column}列`, captures]) {
                    const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
                }
                rowFragment.append(row); lines.push([i + 1, JSON.stringify(match.value), match.row, match.column, captures].join('\t'));
            });
            textFragment.append(document.createTextNode(result.text.slice(previous)));
            highlight.replaceChildren(textFragment); rows.replaceChildren(rowFragment);
            $('#match-results').hidden = false;
            tableText = lines.join('\n'); $('#copy-list').disabled = result.count === 0;
        };

const key=()=>active==='regex'?'regex-'+regexMode:active;
function save() {states[key()]={text:$('#input').value,output:$('#output').value,settings:readSettings(),status:$('#status').textContent,details:$('#result-details').textContent,result:currentResult};}
function stop(){worker?.terminate();worker=null;clearTimeout(timer);$('#run').disabled=!('Worker' in window);$('#cancel').hidden=true;}
function invalidate(){stop();currentResult=null;$('#match-results').hidden=true;$('#highlight').replaceChildren();$('#matches').replaceChildren();$('#copy-list').disabled=true;tableText='';$('#output').value='';$('#result-details').textContent='';$('#status').textContent='';syncOutput();}
function addRule(value={}) {
 const container=$('#rules');if(container.children.length>=20){$('#status').textContent='置換ルールは20件までです。';return;}
 const row=document.createElement('div');row.className='rule';row.dataset.rule='';
 row.innerHTML='<div class="rule-head"><label class="choices"><input type="checkbox" data-rule-regex> 正規表現</label><button type="button" class="small-button" data-remove>削除</button></div><div class="rule-grid"><label class="field"><span>検索する文字列</span><input type="text" autocomplete="off" data-search placeholder="例：りんご"></label><label class="field"><span>置換後の文字列</span><input type="text" autocomplete="off" data-replacement placeholder="例：リンゴ"></label></div>';
 row.querySelector('[data-search]').value=value.search||'';row.querySelector('[data-replacement]').value=value.replacement||'';row.querySelector('[data-rule-regex]').checked=value.mode==='regex';
 row.querySelector('[data-remove]').onclick=()=>{row.remove();invalidate();};container.append(row);
}
function syncDetails() {
 for(const detail of root.querySelectorAll('[data-detail]'))detail.hidden=!$('#options').querySelector(`[name="${detail.dataset.detail}"]`)?.checked;
 const scope=$('[data-conversion-scope]');if(scope)scope.hidden=!$('[name=caseEnabled]').checked&&!$('[name=widthEnabled]').checked;
 const order=active==='replace';$('#order').hidden=!order;
 if(order){const s=readSettings();const steps=[];if(s.widthEnabled)steps.push('全角・半角');if(s.caseEnabled)steps.push('大小文字');if(s.replaceEnabled)steps.push('置換（ルール順）');$('#order').hidden=steps.length<2;$('#order').textContent=steps.length?'実行順：'+steps.join(' → '):'処理が選ばれていません。';}
}
function syncOutput(){
 const empty=$('#output').value==='';$('#copy').disabled=empty;$('#use-regex').disabled=empty;$('#download').disabled=currentResult===null;
 $('#output-stats').textContent=`結果：${codepoints($('#output').value).toLocaleString('ja-JP')}文字／UTF-8：${new Blob([$('#output').value]).size.toLocaleString('ja-JP')}バイト（最大100万文字）`;
}

function updateCount(){
 const text=$('#input').value,limit=active==='regex'&&regexMode!=='match'?1000:100000;
 $('#count').textContent=`${codepoints(text).toLocaleString('ja-JP')}文字・${text?text.split('\n').length:0}行／UTF-8：${new Blob([text]).size.toLocaleString('ja-JP')}バイト`;
 $('#input-limit').textContent=`入力上限：${limit.toLocaleString('ja-JP')}文字（改行を含むコードポイント数）`;
}
function render() {
 const config=titles[active];$('#tool-title').textContent=config[0];$('#tool-description').textContent=config[1];$('#run').textContent=config[2];
 $('#regex-modes').hidden=active!=='regex';
 for(const tab of root.querySelectorAll('[data-tab]'))tab.setAttribute('aria-pressed',String(active===tab.dataset.tab));
 for(const mode of root.querySelectorAll('[data-regex]'))mode.setAttribute('aria-pressed',String(regexMode===mode.dataset.regex));
 $('#input-label').textContent=active==='regex'?(regexMode==='build'?'元になる入力例':regexMode==='generate'?'正規表現':'対象テキスト'):'入力テキスト';
 $('#output-label').textContent=active==='regex'&&regexMode==='build'?'正規表現の候補':'結果';
 $('#use-regex').hidden=!(active==='regex'&&regexMode==='build');
 let html=active==='format'?formatOptions():active==='replace'?replacementOptions():active==='lines'?lineOptions():regexOptions();
 $('#options').innerHTML=html;
 const state=states[key()];
 if($('#rules')){for(const rule of state?.settings?.rules??[{}])addRule(rule);$('#add-rule').onclick=()=>{addRule();invalidate();};}
 if(state) for(const el of $('#options').querySelectorAll('[name]')){
  const value=state.settings?.[el.name];if(value===undefined)continue;
  if(el.type==='radio')el.checked=el.value===value;else if(el.type==='checkbox')el.checked=value;else el.value=value;
 }
 $('#input').value=state?.text??'';$('#output').value=state?.output??'';$('#status').textContent=state?.status??'';$('#result-details').textContent=state?.details??'';
 currentResult=state?.result??null;$('#match-results').hidden=true;if(active==='regex'&&regexMode==='match'&&currentResult)renderMatches(currentResult);inputRevision++;
 $('#options').oninput=()=>{invalidate();syncDetails();};syncDetails();syncOutput();updateCount();
}
function switchTo(next){save();stop();active=next;render();}
for(const tab of root.querySelectorAll('[data-tab]'))tab.onclick=()=>switchTo(tab.dataset.tab);
for(const mode of root.querySelectorAll('[data-regex]'))mode.onclick=()=>{save();stop();regexMode=mode.dataset.regex;render();};
$('#input').oninput=()=>{inputRevision++;invalidate();updateCount();};
$('#cancel').onclick=()=>{stop();$('#status').textContent='中止しました。入力は残っています。';};
$('#clear').onclick=()=>{
 if(($('#input').value||$('#output').value)&&!confirm('この用途の入力・検索語・正規表現・置換語・結果をクリアしますか？ 選択設定は保持します。'))return;
 inputRevision++;invalidate();$('#input').value='';for(const el of $('#options').querySelectorAll('input[type=text],textarea'))el.value='';updateCount();$('#status').textContent='入力と結果をクリアしました。';
};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#output').value);$('#status').textContent='コピーしました。';}catch{$('#output').focus();$('#output').select();$('#status').textContent='結果を選択しました。右クリックまたは長押しで手動でコピーしてください。';}};
$('#download').onclick=()=>{
 if(currentResult===null)return;
 try{downloadText($('#output').value);$('#status').textContent='保存を開始しました。端末のダウンロード・保存画面を確認してください。';}
 catch{$('#status').textContent='保存を開始できませんでした。結果をコピーして保存してください。';}
};
$('#copy-list').onclick=async()=>{
 try{await navigator.clipboard.writeText(tableText);$('#status').textContent='一致一覧をコピーしました。';}
 catch{$('#result-details').textContent=tableText;$('#status').textContent='自動コピーできませんでした。下の一致一覧を選択して手動でコピーしてください。';}
};
$('#paste').onclick=async()=>{
 const revision=inputRevision, destination=key();
 try{
  if(!navigator.clipboard?.readText)throw new Error();
  const text=await navigator.clipboard.readText();
  if(destination!==key()||revision!==inputRevision){$('#status').textContent='入力が変わったため貼り付けを中止しました。もう一度操作してください。';return;}
  if(!text){$('#status').textContent='クリップボードにテキストがありません。';return;}
  if($('#input').value&&!confirm('入力欄全体をクリップボードのテキストに置き換えますか？'))return;
  $('#input').value=text.replace(/\r\n?/g,'\n');$('#input').dispatchEvent(new Event('input',{bubbles:true}));$('#status').textContent='貼り付けました。';$('#input').focus();
 }catch{$('#input').focus();$('#status').textContent='自動で貼り付けできません。入力欄を右クリック、または長押しして「貼り付け」を選んでください。';}
};
$('#use-regex').onclick=()=>{
 const pattern=$('#output').value,previous=states['regex-match'];
 if(previous?.settings?.pattern&&!confirm('一致確認の正規表現をこの候補に置き換えますか？'))return;
 save();states['regex-match']={...previous,text:previous?.text??$('#input').value,output:'',settings:{...previous?.settings,pattern},status:'候補を設定しました。対象テキストで確認できます。'};regexMode='match';render();
};
$('#run').onclick=()=>{
 invalidate();const s=readSettings(),text=$('#input').value;
 let options={tool:'edit',text,flags:'u',width:s.widthEnabled?s.width:'none',letterCase:s.caseEnabled?s.letterCase:'none',targets:['letters','numbers','symbols','space'].filter(key=>s[key]),scope:s.scopeEnabled?'regex':'all',pattern:s.pattern,rules:s.rules,replaceEnabled:!!s.replaceEnabled,trim:!!s.trim,blank:s.blank,unique:!!s.unique,sort:s.sort};
 if(active==='regex')options={...s,text,tool:regexMode,flags:(regexMode==='match'?(s.flagU?'u':''):'u')+(s.flagI?'i':'')+(s.flagM?'m':'')+(s.flagS?'s':''),pattern:regexMode==='generate'?text:s.pattern,amount:s.amount};
 try{
  worker=new Worker(new URL('./text-tools-worker.js',import.meta.url),{type:'module'});$('#run').disabled=true;$('#cancel').hidden=false;$('#status').textContent='処理中…';
  worker.onmessage=({data})=>{
   stop();if(!data.ok){$('#status').textContent=data.error;track(active,'error');return;}
   const result=data.result;currentResult=result;$('#output').value=result.output;track(active,'success');
   $('#status').textContent=result.output===text?'変更はありません。':result.output===''?'結果は空です。':'処理しました。';
   if(active==='regex'&&regexMode==='build'){
    $('#status').textContent='候補を作りました。意図に合うか確認してください。';$('#result-details').textContent=result.checks.length?result.checks.map((c,i)=>`${i+1}件目：${c.passed?'OK':'期待と異なります'}`).join('\n'):'検証例は未指定です。';
   }
   if(active==='regex'&&regexMode==='match'){
    $('#status').textContent=result.truncated?'先頭1,000件を表示・以降は未確認です。':`${result.count}件一致しました。`;
    renderMatches(result);
   }
   syncOutput();
  };
  worker.onerror=()=>{stop();$('#status').textContent='処理を開始できません。ページを再読み込みしてください。';};
  worker.postMessage(options);timer=setTimeout(()=>{stop();$('#status').textContent='時間がかかるため中止しました。入力は残っています。';track(active,'timeout');},1000);
 }catch{stop();$('#status').textContent='このブラウザーでは処理を開始できません。';}
};
for(const link of root.querySelectorAll('a[href="#help"]'))link.onclick=()=>{$('#help').open=true;};
window.addEventListener('pagehide',()=>{inputRevision++;invalidate();for(const key of Object.keys(states))delete states[key];for(const field of root.querySelectorAll('textarea,input[type=text]'))field.value='';updateCount();});
render();
if(!('Worker' in window))$('#status').textContent='このブラウザーはWeb Workerに対応していません。';

}
