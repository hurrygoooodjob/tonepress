(() => {
  'use strict';
  const {rows,summary,source,localVersion,online,defaultVersion,coverage}=window.comparisonData;
  const byId=id=>document.getElementById(id);
  const list=byId('effectList');
  const sides=byId('sides');
  const mediaButtons=[byId('photoView'),byId('videoView')];
  const number=Number.isFinite;
  const storageKey='tonepress-language';
  const supported=new Set(['en','ja','zh','ko']);
  let language='zh';
  if(online) {
    try {
      const preferred=localStorage.getItem(storageKey);
      language=supported.has(preferred)?preferred:'en';
    }
    catch {language='en';}
  }
  const phrases={
    '秒':['秒','초'],'同步视频':['同期再生','동기 재생'],'双边实测':['両方の実測','양쪽 실측'],
    '原版实测':['オリジナルのみ','원본만'],'印相室实测':['Tonepress のみ','Tonepress만'],'待实测':['未検証','검증 대기'],
    '缺少实测媒体':['記録なし','녹화 없음'],'界面录屏':['ゲスト画面の録画','게스트 화면 녹화'],
    '实际成片':['書き出し動画','내보낸 영상'],'视频':['動画','동영상'],
    '暂缺原版在该媒体类型下的同源实测。':['同一素材の Mosh-Pro 録画はまだありません。','동일 소스의 Mosh-Pro 녹화가 아직 없습니다.'],
    '暂缺印相室在该媒体类型下的实测文件。':['このバージョンの書き出し動画はまだありません。','이 버전의 내보낸 영상이 아직 없습니다.'],
    '查看完整界面':['画面全体を表示','전체 인터페이스 보기'],'放大工作画面':['プレビューを拡大','미리보기 확대'],
    '当前浏览器无法解码此文件。可打开媒体文件使用系统播放器。':['このブラウザで再生できません。システムのプレーヤーでファイルを開いてください。','브라우저에서 재생할 수 없습니다. 시스템 플레이어로 파일을 여세요.'],
    '源':['素材','소스'],'打开媒体文件':['メディアファイルを開く','미디어 파일 열기'],
    '在 v11 实际调试':['v11 エディターで調整','v11 편집기에서 조정'],'采集与设置':['記録と設定','캡처 및 설정'],
    '同步播放':['同期再生','동기 재생'],'从开头':['最初から','처음부터'],'暂停':['一時停止','일시 정지'],
    '共享源视频进度':['共通素材の再生位置','공통 소스의 재생 위치'],'同步播放音轨':['同期再生の音声','동기 재생 오디오'],
    '静音':['ミュート','음소거'],'原版声轨':['オリジナルの音声','원본 오디오'],'印相室声轨':['Tonepress の音声','Tonepress 오디오'],
    '浏览器未能同时开始播放。可分别使用媒体控制。':['同時に再生できなかったため、個別に再生できます。','동시에 재생하지 못했습니다. 각각 재생할 수 있습니다.'],
    '解码时长与采集锚点不重叠。':['共通タイムライン上で有効な時間が重なりません。','공통 타임라인에서 재생 구간이 겹치지 않습니다.'],
    '有一侧的视频无法解码。':['一方の動画を再生できません。','한쪽 동영상을 재생할 수 없습니다.'],
    '公开手册的示例使用其参考素材。这里只用于核实效果机制，未纳入同源对照。':['公式ガイドの作例は別素材です。この同一素材比較とは区別しています。','공식 가이드 예시는 별도 소재를 사용하므로 동일 소스 비교와 구분합니다.'],
    '原版':['オリジナル','원본'],'印相室':['Tonepress','Tonepress'],
    '源轨 → 成片或录屏时间':['素材時刻 → メディア時刻','소스 시간 → 미디어 시간'],
    '同步仅在两条时间轴的重叠区间内运行，中间时刻按已记录锚点插值。完整录屏保留可见界面及水印。':['同期は共通する素材時刻のみで、記録した基準点の間を補間します。画面全体の録画には透かしと操作画面が残ります。','공통 구간에서 기준점 사이를 보간해 동기화합니다. 전체 녹화에는 워터마크와 인터페이스가 유지됩니다.'],
    '时间与帧':['時間とフレーム','시간과 프레임'],' · 重点视频':[' · 重点比較',' · 중점 비교'],
    '同一源视频时间，可同步播放':['同一素材で同期再生できます','동일 소스로 동기 재생할 수 있습니다'],
    '尚无可确认的同源同步视频':['確認できる共通タイムラインがありません','확인된 공통 타임라인이 없습니다'],
    'Mosh-Pro 原版':['Mosh-Pro オリジナル','Mosh-Pro 원본'],
    'Mosh-Pro / 印相室三项视频对照':['Mosh-Pro / Tonepress 動画比較','Mosh-Pro / Tonepress 동영상 비교'],
    '官方效果手册 ↗':['公式エフェクトガイド ↗','공식 효과 안내 ↗'],'相关页面':['関連ページ','관련 페이지'],
    '印相室版本':['Tonepress のバージョン','Tonepress 버전'],'74 项逐个看':['全74エフェクトを見る','74개 효과 모두 보기'],
    '语言':['言語','언어'],'官方说明及示例':['公式ガイドと作例','공식 안내 및 예시'],
    '测试输入与取帧依据':['テスト素材と同期時刻','테스트 소스와 동기화 시간'],
    '官方手册用于核实效果目录，右侧媒体是实际成片。':['エフェクト名は公式ガイドに準拠します。右側は Tonepress の書き出し動画です。','효과 이름은 공식 가이드를 따릅니다. 오른쪽은 Tonepress에서 내보낸 영상입니다.'],
    '素材摄影':['素材写真','소스 사진 촬영'],'摄影原作与授权':['元写真とライセンス','원본 사진 및 라이선스'],
    '。测试视频含画面变换及合成音轨，处理结果应用了对应效果。':['。テスト動画にカメラの動きと合成音を加え、出力にエフェクトを適用しました。','. 테스트 영상에는 카메라 움직임과 합성 오디오를 추가했으며 출력에 효과를 적용했습니다.']
  };
  function l(zh,en,ja,ko) {
    if(language==='ja') return ja || phrases[zh]?.[0] || en;
    if(language==='ko') return ko || phrases[zh]?.[1] || en;
    return language==='en'?en:zh;
  }
  const sec=time=>`${time.toFixed(3)} ${l('秒','s')}`;
  const timeKey=time=>Math.round(time*1000);
  let current=rows.find(row=>`#${row.id}`===location.hash) || rows.find(row=>row.priority) || rows[0];
  let tab='video';
  let frameTime=null;
  let version=defaultVersion || 'v11';
  let closePlayer=()=>{};

  function node(tag, text, className) {
    const element=document.createElement(tag);
    if(text) element.textContent=text;
    if(className) element.className=className;
    return element;
  }
  function button(text,action) {
    const item=node('button',text);
    item.type='button';
    item.addEventListener('click',action);
    return item;
  }
  function link(text,href) {
    const item=node('a',text);
    item.href=href;
    item.target='_blank';
    item.rel='noopener noreferrer';
    return item;
  }
  function available(row) {
    if(row.sync) return l('同步视频','Synced');
    if(row.original.present&&row.tonepress.present) return l('双边实测','Recorded');
    if(row.original.present) return l('原版实测','Original only');
    if(row.tonepress.present) return l('印相室实测','Tonepress only');
    return l('待实测','Pending');
  }
  function matchFilter(row,filter) {
    if(filter==='sync') return Boolean(row.sync);
    if(filter==='original') return row.original.present;
    if(filter==='local') return row.tonepress.present&&!row.original.present;
    if(filter==='missing') return !row.original.present&&!row.tonepress.present;
    return true;
  }
  function renderList() {
    const query=byId('search').value.trim().toLowerCase();
    const category=byId('category').value;
    const filter=byId('status').value;
    const results=rows.filter(row=>(!category||category===row.group)&&matchFilter(row,filter)&&
      [row.name,row.group,row.groupEnglish,row.id].some(value=>value.toLowerCase().includes(query)));
    const buttons=results.map(row=>{
      const item=button('',()=>select(row,true));
      item.className='effect-button';
      item.dataset.effect=row.id;
      item.setAttribute('aria-current',String(current.id===row.id));
      item.append(node('span',row.name),node('small',available(versionRow(row))));
      return item;
    });
    list.replaceChildren(...(buttons.length?buttons:[node('p','没有符合条件的效果。')]));
  }
  function versionRow(row) { return row.versions ? {...row,...row.versions[version]} : row; }
  function select(row,fromList=false) {
    current=versionRow(row);
    resetFrame();
    renderList();
    render();
    if(`${location.hash}`!==`#${row.id}`) history.replaceState(null,'',`#${row.id}`);
    if(fromList) byId('effectTitle').focus({preventScroll:true});
  }

  function clips(row) { return Boolean(row.original.video?.path || row.tonepress.video?.path); }
  function observedFrames(side) { return (side.video?.frames||[]).filter(media=>media?.path); }
  function frameMark(media) { return media.targetTime ?? media.sourceTime; }
  function keys(row) {
    return [...new Map([...observedFrames(row.original),...observedFrames(row.tonepress)]
      .filter(media=>number(frameMark(media))).map(media=>[timeKey(frameMark(media)),frameMark(media)])).values()].sort((a,b)=>a-b);
  }
  function resetFrame() { frameTime=clips(current)?null:keys(current)[0]??null; }
  function atFrame(side) {return observedFrames(side).find(media=>number(frameMark(media))&&timeKey(frameMark(media))===timeKey(frameTime));}
  function mediaFor(side) {
    if(tab==='photo') return side.photo;
    if(frameTime===null) return side.video;
    return atFrame(side);
  }

  function describeCapture(media,side) {
    if(!media?.path) return l('缺少实测媒体','No recording');
    const tag=media.capture.toLowerCase();
    if(/record|screen|interface|original-ui|full-ui|界面|录屏|截图/.test(tag)&&!/canvas/.test(tag)) return tab==='video' && frameTime===null ? l('界面录屏','Visitor recording') : '界面截图';
    if(tab==='video'&&frameTime===null&&(/export|mp4|编码|导出/.test(tag)||side==='tonepress')) return l('实际成片','Rendered export');
    if(/canvas|render|画布|渲染/.test(tag)) return tab==='photo' ? '实测渲染' : '实际取帧';
    return '实测媒体';
  }
  function noteMissing(record,media,side) {
    if(media?.notes) return media.notes;
    if(tab==='video' && frameTime===null && observedFrames(record).length) return '这一侧保留了取帧。选择上方源时刻查看。';
    if(tab==='video' && frameTime!==null && record.video?.path) return '这一侧有完整视频。当前时刻没有已核准的单帧证据。';
    if(record.notes) return record.notes;
    return side==='original' ? l('暂缺原版在该媒体类型下的同源实测。','No same-source recording from Mosh-Pro is available.') :
      l('暂缺印相室在该媒体类型下的实测文件。','No rendered recording for this version is available.');
  }
  function video(path, controls=true) {
    const player=node('video');
    player.src=path;
    player.controls=controls;
    player.preload='metadata';
    player.playsInline=true;
    player.muted=true;
    return player;
  }
  function photo(path,alt) {
    const image=node('img');
    image.src=path;
    image.alt=alt;
    return image;
  }
  function fitPicture(heading,frame,player,media) {
    const [x,y,w,h]=media.viewport;
    const toggle=button('',()=>set(!zoom));
    toggle.className='preview-toggle';
    let zoom=true;
    function set(enabled) {
      zoom=enabled;
      toggle.setAttribute('aria-pressed',String(!zoom));
      toggle.textContent=zoom?l('查看完整界面','Show full interface'):l('放大工作画面','Show picture area');
      frame.style.aspectRatio=`${w} / ${h}`;
      if(zoom) Object.assign(player.style,{position:'absolute',left:`${-100*x/w}%`,top:`${-100*y/h}%`,
        width:`${100*media.width/w}%`,height:`${100*media.height/h}%`,objectFit:'fill'});
      else player.removeAttribute('style');
    }
    heading.append(toggle);
    set(true);
  }
  function buildSide(side,name) {
    const record=current[side];
    const media=mediaFor(record);
    const article=node('article','','side');
    article.dataset.side=side;
    const head=node('header');
    head.append(node('h3',name),node('span',describeCapture(media,side)));
    const figure=node('figure');
    const frame=node('div','','frame');
    let player=null;
    if(media?.path) {
      if(tab==='video'&&frameTime===null) {
        player=video(media.path,!current.sync);
        player.setAttribute('aria-label',`${name} ${current.name} ${l('视频','video')}`);
        player.addEventListener('error',()=>{frame.append(node('p',l('当前浏览器无法解码此文件。可打开媒体文件使用系统播放器。','The browser could not decode this file. Try opening it in a system media player.')));},{once:true});
        frame.append(player);
        if(online&&current.sync&&media.width&&media.height) {
          if(side==='original'&&media.viewport) fitPicture(head,frame,player,media);
          else frame.style.aspectRatio=`${media.width} / ${media.height}`;
        }
      } else frame.append(photo(media.path,`${name} ${current.name}${number(frameTime)&&tab==='video'?` · ${sec(frameTime)}`:''}`));
    } else frame.append(node('p',noteMissing(record,media,side)));
    figure.append(frame);
    if(media?.path) {
      const fields=[];
      if(media.width&&media.height) fields.push(`${media.width} × ${media.height}`);
      if(number(media.sourceTime)&&tab==='video') fields.push(`源 ${sec(media.sourceTime)}`);
      if(Number.isInteger(media.sourceFrame)) fields.push(`源帧 #${media.sourceFrame}`);
      if(media.timeline) fields.push(`${l('源','Source')} ${sec(media.timeline[0].sourceTime)}–${sec(media.timeline.at(-1).sourceTime)}`);
      if(media.fps&&tab==='video'&&frameTime===null) fields.push(`${media.fps} fps`);
      const caption=node('figcaption');
      if(fields.length) caption.append(document.createTextNode(fields.join(' · ')+'　'));
      caption.append(link(l('打开媒体文件','Open media file'),media.path));
      figure.append(caption);
    }
    article.append(head,figure);
    if(online&&side==='tonepress') {
      const editor=link(l('在 v11 实际调试','Tune in the v11 editor'),`../?mosh&sample=motion&effect=${encodeURIComponent(current.id)}`);
      editor.className='open-editor';
      article.append(editor);
    }
    if(record.gate) {
      const limitation=node('p','','notes');
      limitation.append(link('原版导出需要登录的实测截图',record.gate));
      article.append(limitation);
    }
    if(media?.settings||media?.notes&&media.path||media?.timingNotes) {
      const parameters=node('details');
      parameters.append(node('summary',l('采集与设置','Capture and settings')));
      if(media.notes&&(!online||language==='zh')) parameters.append(node('p',media.notes,'notes'));
      if(media.timingNotes) parameters.append(node('p',media.timingNotes,'notes'));
      if(media.settings) parameters.append(node('pre',typeof media.settings==='string'?media.settings:JSON.stringify(media.settings,null,2)));
      article.append(parameters);
    }
    return {article,player};
  }

  // Play both media timelines against confirmed source anchors and correct decoder drift.
  function interpolate(points,value,from,to) {
    let stop=points.findIndex(point=>point[from]>value);
    if(stop===-1) stop=points.length-1;
    if(stop===0) stop=1;
    const a=points[stop-1],b=points[stop];
    const rate=(b[to]-a[to])/(b[from]-a[from]);
    return a[to]+(value-a[from])*rate;
  }
  function mediaAt(points,time) { return interpolate(points,time,'sourceTime','mediaTime'); }
  function sourceAt(points,time) { return interpolate(points,time,'mediaTime','sourceTime'); }
  function playbackRate(points,time) {
    const next=Math.min(time+.022,points.at(-1).sourceTime);
    return next>time ? (mediaAt(points,next)-mediaAt(points,time))/(next-time) : 1;
  }
  function clamp(value,min,max) {return Math.max(min,Math.min(max,value));}

  function connectPlayback(left,right,sync,host) {
    const play=button(l('同步播放','Play together'),()=>running?pause():start());
    play.className='primary';
    const reset=button(l('从开头','Restart'),()=>seek(sync.start));
    const range=node('input');
    range.type='range'; range.min=sync.start; range.max=sync.end; range.step='any';
    range.setAttribute('aria-label',l('共享源视频进度','Shared source-video position'));
    const time=node('output');
    const sound=node('select');
    sound.setAttribute('aria-label',l('同步播放音轨','Synced audio track'));
    sound.add(new Option(l('静音','Muted'),'mute'));
    if(current.original.video.hasAudio!==false) sound.add(new Option(l('原版声轨','Original sound'),'a'));
    if(current.tonepress.video.hasAudio!==false) sound.add(new Option(l('印相室声轨','Tonepress sound'),'b'));
    sound.addEventListener('change',()=>{
      left.muted=sound.value!=='a'; right.muted=sound.value!=='b';
    });
    const note=node('span','','notes');
    note.setAttribute('role','status');
    host.append(play,reset,range,time,sound,note);
    host.hidden=false;
    const sources=[left,right];
    const maps=[sync.a,sync.b];
    let running=false,disposed=false,frame=0;
    let end=sync.end;
    let cursor=sync.start;
    const loaded=new Set();
    function show(t) {
      cursor=clamp(t,sync.start,end);
      range.value=cursor;
      time.value=`${l('源','Source')} ${sec(cursor)} / ${sec(end)}`;
    }
    function seek(pos) {
      show(pos);
      for(let i=0;i<sources.length;i++) if(loaded.has(sources[i])) sources[i].currentTime=mediaAt(maps[i],cursor);
    }
    function pause(pos) {
      running=false;
      cancelAnimationFrame(frame);
      for(const source of sources) source.pause();
      play.textContent=l('同步播放','Play together');
      if(number(pos)) seek(pos);
    }
    function tick() {
      if(!running||disposed) return;
      const t=sourceAt(sync.a,left.currentTime);
      if(t>=end-.012||left.ended) { pause(end); return; }
      show(t);
      const desired=mediaAt(sync.b,t);
      const drift=right.currentTime-desired;
      if(Math.abs(drift)>.12&&!right.seeking) right.currentTime=desired;
      left.playbackRate=clamp(playbackRate(sync.a,t),.25,4);
      right.playbackRate=clamp(playbackRate(sync.b,t)-clamp(drift*.55,-.12,.12),.25,4);
      frame=requestAnimationFrame(tick);
    }
    async function start() {
      if(loaded.size!==2||disposed) return;
      note.textContent='';
      if(cursor>=end-.025) seek(sync.start);
      try {
        running=true;
        play.textContent=l('暂停','Pause');
        await Promise.all(sources.map(source=>source.play()));
        if(running&&!disposed) frame=requestAnimationFrame(tick);
      } catch {
        if(disposed) return;
        pause();
        note.textContent=l('浏览器未能同时开始播放。可分别使用媒体控制。','The browser could not start both videos together. Independent playback is available.');
        for(const source of sources) source.controls=true;
      }
    }
    function onMeta(source,i) {
      loaded.add(source);
      if(number(source.duration)) end=Math.min(end,sourceAt(maps[i],source.duration));
      if(loaded.size===2) {
        range.max=end;
        if(end<=sync.start) note.textContent=l('解码时长与采集锚点不重叠。','The decoded durations do not overlap on the shared timeline.');
        else {play.disabled=reset.disabled=range.disabled=false; seek(sync.start);}
      }
    }
    play.disabled=reset.disabled=range.disabled=true;
    range.addEventListener('input',()=>seek(Number(range.value)));
    sources.forEach((source,i)=>{
      if(source.readyState>=1) onMeta(source,i);
      else source.addEventListener('loadedmetadata',()=>onMeta(source,i),{once:true});
      source.addEventListener('error',()=>{note.textContent=l('有一侧的视频无法解码。','One video could not be decoded.');},{once:true});
    });
    show(sync.start);
    return ()=>{ disposed=true; pause(); };
  }

  function renderFrames() {
    const host=byId('frameControls');
    const found=keys(current);
    host.replaceChildren();
    host.hidden=tab!=='video'||!found.length;
    if(host.hidden) return;
    if(clips(current)) {
      const show=button('连续视频',()=>{frameTime=null;render();});
      show.setAttribute('aria-pressed',String(frameTime===null));
      host.append(show);
    }
    host.append(node('span','目标取帧时刻'));
    found.forEach(t=>{
      const view=button(sec(t),()=>{frameTime=t;render();});
      view.setAttribute('aria-pressed',String(frameTime===t));
      host.append(view);
    });
  }
  function renderMeasurements() {
    const host=byId('measurements');
    if(online) {host.hidden=true;return;}
    host.replaceChildren(node('h3','画面差异'));
    const readings=current.measurements;
    const pairs=tab==='photo'?[readings?.photo]:readings?.frames || [];
    const measured=pairs.filter(x=>x?.status==='measured');
    if(!measured.length) {
      const reason=pairs.find(x=>x?.reason)?.reason;
      host.append(node('p',reason || '没有两侧同一输入、同一时刻且取画面区明确的帧，暂不计算差异。'));
      return;
    }
    const table=node('table','','metric-table');
    const header=node('tr');
    for(const label of ['源时刻','RGB 平均绝对差','亮度 SSIM','亮度直方图距离']) {
      const th=node('th',label);
      th.scope='col'; header.append(th);
    }
    const thead=node('thead'); thead.append(header); table.append(thead);
    const body=node('tbody');
    for(const m of measured) {
      const tr=node('tr');
      for(const cell of [number(m.sourceTime)?sec(m.sourceTime):'同源照片',`${m.rgbMae} / 255`,String(m.lumaSSIM),String(m.lumaHistogramDistance)]) tr.append(node('td',cell));
      body.append(tr);
    }
    table.append(body);
    host.append(table,node('p','数值只描述像素和结构差异。RGB 差与直方图距离越低，亮度 SSIM 越高，画面越接近；录屏压缩和采样也会影响读数。'));
  }

  function renderOfficial() {
    const content=byId('official').lastElementChild;
    content.replaceChildren();
    const official=current.official;
    content.append(link(l(`查看 ${current.name} 的官方说明`,`Read the official ${current.name} guide`,
      `${current.name} の公式ガイドを見る`,`${current.name} 공식 안내 보기`),official.href));
    content.append(node('p',official.notes || l('公开手册的示例使用其参考素材。这里只用于核实效果机制，未纳入同源对照。',
      'The official guide uses its own reference material. Its examples are separate from this same-source comparison.')));
    if(official.image) content.append(photo(official.image,'官方样例，独立参考'));
    if(official.video) content.append(video(official.video));
  }
  function appendSource(content,media,label) {
    if(!media) return;
    const code=node('p',`${label} SHA-256 `);
    code.append(node('code',media.sha256));
    content.append(code);
    if(media===source.video) {
      const details=[media.width&&media.height?`${media.width} × ${media.height}`:'',media.fps?`${media.fps} fps`:'',media.durationSeconds?sec(media.durationSeconds):''].filter(Boolean);
      if(details.length) content.append(node('p',details.join(' · ')));
    }
    content.append(media===source.video?video(media.path):photo(media.path,'共用输入照片'));
  }
  function renderSource() {
    const content=byId('source').lastElementChild;
    content.replaceChildren();
    appendSource(content,tab==='photo'?source.photo:source.video,tab==='photo'?'照片':l('视频','Video'));
    if(tab!=='video') return;
    if(!online) content.append(node('p','原版逐项图片来自暂停后的公开播放头。播放头与画布真正送显的源帧可能相差，未证实源帧编号时只展示证据。'));
    for(const [key,label] of [['original',l('原版','Mosh-Pro','Mosh-Pro','Mosh-Pro')],['tonepress',l('印相室','Tonepress')]]) {
      const media=current[key].video;
      if(!media?.timeline) continue;
      const anchors=media.timeline.map(mark=>`${sec(mark.sourceTime)} → ${sec(mark.mediaTime)}`).join('；');
      content.append(node('p',`${label} ${l('源轨 → 成片或录屏时间','source time → media time')} ${anchors}`));
    }
    if(current.sync) content.append(node('p',l('同步仅在两条时间轴的重叠区间内运行，中间时刻按已记录锚点插值。完整录屏保留可见界面及水印。',
      'Sync uses the overlapping source times and interpolates between the recorded anchors. The complete recording retains the watermark and interface.')));
  }
  function render() {
    closePlayer();
    closePlayer=()=>{};
    if(!current) return;
    byId('group').textContent=l(current.group,current.groupEnglish)+(current.priority?l(' · 重点视频',' · Focus comparison'):'');
    byId('effectTitle').textContent=current.name;
    mediaButtons.forEach((item,i)=>item.setAttribute('aria-pressed',String(tab===(i===0?'photo':'video'))));
    const chosenA=number(frameTime)&&atFrame(current.original);
    const chosenB=number(frameTime)&&atFrame(current.tonepress);
    const frameVerified=chosenA&&chosenB&&current.matches.some(pair=>pair.a.path===chosenA.path&&pair.b.path===chosenB.path);
    const same=tab==='photo'?current.samePhoto:frameTime===null?!!current.sync:frameVerified;
    const simpleStatus=tab==='photo'?'确认同一照片输入':frameTime===null?l('同一源视频时间，可同步播放','Same source video, ready to play together'):`同一源视频 ${sec(frameTime)} 的双边取帧`;
    const description=same?simpleStatus:`${available(current)} · ${tab==='photo'?'尚无可确认的同源照片对照':frameTime===null?l('尚无可确认的同源同步视频','No confirmed shared timeline is available'):chosenA&&chosenB?'两侧按目标播放头取帧，未证实为同一源帧':'当前时刻缺少一侧实测'}`;
    byId('effectStatus').textContent=description;
    const controls=byId('playerControls');
    controls.replaceChildren(); controls.hidden=true;
    renderFrames();
    const original=buildSide('original',l('Mosh-Pro 原版','Mosh-Pro original'));
    const tonepress=buildSide('tonepress',[l('印相室','Tonepress'),online?version:localVersion].filter(Boolean).join(' '));
    sides.replaceChildren(original.article,tonepress.article);
    if(tab==='video'&&frameTime===null&&current.sync&&original.player&&tonepress.player) {
      closePlayer=connectPlayback(original.player,tonepress.player,current.sync,controls);
    }
    renderMeasurements();
    renderOfficial();
    renderSource();
  }

  function paintOnlineLanguage() {
    document.documentElement.lang=language==='zh'?'zh-CN':language;
    document.title=l('Mosh-Pro / 印相室三项视频对照','Mosh-Pro / Tonepress video comparison');
    document.querySelector('.intro h1').textContent=document.title;
    document.querySelector('.guide').textContent=l('官方效果手册 ↗','Official effect guide ↗');
    document.querySelector('.head-links').setAttribute('aria-label',l('相关页面','Related pages'));
    document.querySelector('#versionSwitch span').textContent=l('印相室版本','Tonepress version');
    byId('catalogLink').textContent=l('74 项逐个看','Browse all 74 effects');
    byId('reportLanguage').setAttribute('aria-label',l('语言','Language'));
    byId('reportLanguage').value=language;
    byId('summary').textContent=l(`同一测试视频 · ${summary.originalClips} 项原版访客录屏 · v10 ${coverage.v10} 项 · v11 ${coverage.v11} 项`,
      `One source video · ${summary.originalClips} Mosh-Pro visitor recordings · ${coverage.v10} v10 exports · ${coverage.v11} v11 exports`,
      `同一素材 · Mosh-Pro ゲスト録画 ${summary.originalClips} 本 · v10 ${coverage.v10} 本 · v11 ${coverage.v11} 本`,
      `동일 소스 · Mosh-Pro 게스트 녹화 ${summary.originalClips}개 · v10 ${coverage.v10}개 · v11 ${coverage.v11}개`);
    byId('onlineNotes').textContent=l('原版为访客界面实录，放大画面保留水印，完整界面随时可看。原版导出需登录。两侧从确认的源起点同步，录屏帧率可变，可能跳过源帧。',
      'Mosh-Pro is a visitor preview recording. The picture view preserves the watermark, and the full interface remains available. Original export requires sign-in. Both videos start from the verified source start; the recording may skip source frames.',
      'Mosh-Pro はゲスト画面の録画です。プレビュー拡大時も透かしを残し、画面全体に戻せます。書き出しにはログインが必要です。両側とも確認した素材の先頭から再生し、録画はフレームを飛ばす場合があります。',
      'Mosh-Pro는 게스트 화면 녹화입니다. 확대 화면에도 워터마크를 유지하며 전체 화면으로 전환할 수 있습니다. 원본 내보내기는 로그인이 필요합니다. 양쪽 모두 확인된 소스 시작점에서 재생되며 녹화에서 일부 프레임이 건너뛰어질 수 있습니다.');
    byId('official').querySelector('summary').textContent=l('官方说明及示例','Official guide and examples');
    byId('source').querySelector('summary').textContent=l('测试输入与取帧依据','Test input and timing');
    byId('coverFooter').textContent=l('官方手册用于核实效果目录，右侧媒体是实际成片。','The official guide identifies the effects. The right side plays actual Tonepress exports.');
    byId('attributionLabel').textContent=l('素材摄影','Source photography');
    byId('attributionSource').textContent=l('摄影原作与授权','Original photo and license');
    byId('attributionChanges').textContent=l('。测试视频含画面变换及合成音轨，处理结果应用了对应效果。',
      '. The test video adds camera motion and a synthetic sound track. Effects are applied to the output.');
  }
  if(online) {
    paintOnlineLanguage();
    document.querySelector('.filters').hidden=true;
    byId('catalogLink').hidden=false;
    byId('reportLanguage').hidden=false;
    byId('versionSwitch').hidden=false;
    byId('version').value=version;
    mediaButtons.forEach(item=>item.hidden=true);
    byId('onlineNotes').hidden=false;
    byId('reportLanguage').addEventListener('change',event=>{
      language=event.currentTarget.value;
      try {localStorage.setItem(storageKey,language);} catch { /* The choice still applies to this page. */ }
      paintOnlineLanguage();
      select(rows.find(row=>row.id===current.id));
    });
    addEventListener('storage',event=>{
      if(event.key!==storageKey) return;
      language=supported.has(event.newValue)?event.newValue:'en';
      paintOnlineLanguage();
      select(rows.find(row=>row.id===current.id));
    });
    byId('version').addEventListener('change',event=>{
      version=event.currentTarget.value;
      select(rows.find(row=>row.id===current.id));
    });
  } else {
    byId('summary').textContent=`${summary.total} 项效果 · ${summary.original} 项有原版实测 · ${summary.tonepress} 项有印相室实测 · ${summary.videoSync} 项双边视频可同步`;
  }
  for(const group of new Set(rows.map(row=>row.group))) byId('category').add(new Option(group,group));
  for(const key of ['search','category','status']) byId(key).addEventListener(key==='search'?'input':'change',renderList);
  mediaButtons.forEach((item,i)=>item.addEventListener('click',()=>{
    tab=i===0?'photo':'video';
    if(tab==='video') resetFrame();
    render();
  }));
  addEventListener('hashchange',()=>{
    const row=rows.find(item=>`#${item.id}`===location.hash);
    if(row) select(row);
  });
  addEventListener('pagehide',()=>closePlayer());
  select(current);
})();
