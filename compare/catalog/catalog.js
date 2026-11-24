(() => {
  'use strict';
  const dict={
    en:{play:'Motion comparisons',photo:'Photo',edit:'Try this effect ↗',official:'Open original studio ↗',still:'Same photograph',reference:'Visitor preview',output:'Rendered frame',loading:'Loading comparison…',fail:'Could not open this comparison.',stillNote:'Both sides use the same harbor photograph. Mosh-Pro was captured in its visitor preview with its watermark. Transparent areas are shown on black.',videoNote:'Both sides use the same 4-second clip. The left time is the original studio playhead observed at capture. Screen updates can differ from this clock. The right time is the decoded Tonepress frame.'},
    zh:{play:'三项动态对照',photo:'照片',edit:'用这个效果试作 ↗',official:'打开原版工作台 ↗',still:'同一张照片',reference:'原版预览',output:'成片取帧',loading:'正在读取对照图…',fail:'这张对照图未能加载。',stillNote:'两边使用同一张海港照片。左侧保留 Mosh-Pro 访客预览的水印，透明区域统一显示在黑底上。',videoNote:'两边使用同一段 4 秒测试片。左侧标注采集时原版界面的播放头读数，画面可能晚于读数更新。右侧标注 Tonepress 的解码帧时间。'},
    ja:{play:'動画の比較',photo:'写真',edit:'この効果を試す ↗',official:'元のスタジオを開く ↗',still:'同じ写真',reference:'プレビュー',output:'処理フレーム',loading:'比較画像を読み込み中…',fail:'比較画像を読み込めません。',stillNote:'どちらも同じ港の写真です。左は透かし付きの Mosh-Pro ゲストプレビューです。透明部分は黒で表示しています。',videoNote:'両側で同じ4秒の動画を使用。左は撮影時の再生ヘッドの値で、表示フレームの更新にはずれがあります。右は Tonepress がデコードしたフレームです。'},
    ko:{play:'동영상 비교',photo:'사진',edit:'이 효과 사용 ↗',official:'원본 스튜디오 열기 ↗',still:'같은 사진',reference:'방문자 미리보기',output:'처리된 프레임',loading:'비교 이미지 불러오는 중…',fail:'비교 이미지를 열 수 없습니다.',stillNote:'양쪽 모두 같은 항구 사진을 사용합니다. 왼쪽은 워터마크가 있는 Mosh-Pro 방문자 미리보기입니다. 투명한 부분은 검게 표시됩니다.',videoNote:'양쪽 모두 같은 4초 영상을 사용합니다. 왼쪽은 캡처 시 원본 재생 헤드의 시간으로 화면 갱신과 차이가 있을 수 있습니다. 오른쪽은 Tonepress에서 디코딩한 프레임의 시간입니다.'}
  };
  const $=id=>document.getElementById(id),rows=window.catalogRows,query=new URLSearchParams(location.search);
  let lang='en',ticket=0,asset=-1,current,frame=Math.max(0,Math.min(3,Math.trunc(Number(query.get('frame')))||0));
  let index=Math.max(0,rows.findIndex(row=>row.id===query.get('effect')));
  try{const saved=localStorage.getItem('tonepress-language');if(dict[saved])lang=saved;}catch{}
  rows.forEach(row=>{const option=new Option(row.name,row.id);$('effect').add(option);});
  async function render() {
    const serial=++ticket,r=rows[index],label=dict[lang];
    document.documentElement.lang=lang==='zh'?'zh-CN':lang;
    $('language').value=lang;$('name').textContent=r.name;$('effect').value=r.id;
    $('group').textContent=(index+1)+' / '+rows.length+' · '+r.group;
    for(const el of document.querySelectorAll('[data-t]'))el.textContent=label[el.dataset.t];
    for(const el of document.querySelectorAll('[data-frame]'))el.setAttribute('aria-pressed',String(Number(el.dataset.frame)===frame));
    $('edit').href='../../?mosh&effect='+encodeURIComponent(r.id)+(frame?'&sample=motion':'');
    $('origTime').textContent=frame?label.reference+' · '+r.clock[frame-1].toFixed(3)+' s':label.still;
    $('localTime').textContent=frame?label.output+' · '+frame.toFixed(3)+' s':label.still;
    const notes={
      'mosh-data-mosh':{en:'Watch the red target as it passes the striped column. The held frame and block release match more closely, but the edges break up differently.',zh:'看红色标记经过条纹立柱时的残影。新版已能先留住画面、再让区块散开，两侧碎块的边缘形状仍有差异。',ja:'赤いマーカーが縞の柱を横切る部分に注目してください。フレームの保持と解放は近づきましたが、塊の崩れ方には差があります。',ko:'빨간 표식이 줄무늬 기둥을 지나는 부분을 보세요. 화면 유지와 블록 갱신은 가까워졌지만 경계가 무너지는 모양은 다릅니다.'},
      'mosh-feedback':{en:'Watch the fading copies behind the target. The default now keeps the source colors, zoom and rotation neutral.',zh:'留意红色标记身后的几层淡影。新版的默认缩放与旋转保持中性，拖影保留原色。',ja:'マーカーの後ろに重なる薄い残像を確認できます。初期状態では色、倍率、回転を変えません。',ko:'표식 뒤로 겹쳐지는 옅은 잔상을 보세요. 기본 설정에서 원색과 크기, 회전이 유지됩니다.'},
      'mosh-slit-scan':{en:'Follow the target through eight vertical slices. The newest slice is on the left, with earlier frames towards the right.',zh:'跟着标记穿过八条竖向切片。左边取最新画面，越往右取到的帧越早。',ja:'8本の縦帯を通るマーカーを追ってください。左側が新しく、右に行くほど古いフレームです。',ko:'표식이 여덟 개의 세로 띠를 지나는 모습을 보세요. 왼쪽이 가장 최근 프레임이고 오른쪽으로 갈수록 이전 프레임입니다.'},
      'mosh-super8':{en:'The reference was captured after the film assets loaded. Look at the film gate, dust and light leaks at the edges.',zh:'这里取的是原版胶片素材加载完成后的画面。可以重点比较片门、灰尘以及画面边缘的漏光。',ja:'フィルム素材の読み込み後に記録しました。フィルムゲート、ほこり、端の光漏れを比較できます。',ko:'원본 필름 소재가 로드된 뒤 캡처했습니다. 필름 게이트와 먼지, 가장자리의 빛샘을 비교하세요.'},
      'mosh-strobe':{en:'Dark-frame brightness was calibrated. The original can be in a different phase at the same playhead time.',zh:'暗帧亮度已校准。在相同的播放头读数上，原版有时会处于不同的明暗阶段。',ja:'暗いコマの明るさを調整しました。同じ再生時刻でも元の点滅位相は異なることがあります。',ko:'어두운 프레임의 밝기를 맞췄습니다. 같은 재생 위치에서도 원본의 점멸 위상은 다를 수 있습니다.'}
    };
    $('note').textContent=(notes[r.id]?.[lang] ? notes[r.id][lang]+' ' : '')+(frame?label.videoNote:label.stillNote);
    const motionIds=['mosh-data-mosh','mosh-feedback','mosh-slit-scan'];
    document.querySelector('a[data-t="play"]').href=motionIds.includes(r.id)?'../#'+r.id:'../';
    const url=new URL(location.href);url.searchParams.set('effect',r.id);url.searchParams.set('frame',frame);history.replaceState(null,'',url);
    $('status').textContent=label.loading;
    try{
      const sheet=Math.floor(index/6);
      if(asset!==sheet||!current){const img=new Image();img.src='pairs-'+String(sheet).padStart(2,'0')+'.webp';await img.decode();if(serial!==ticket)return;current=img;asset=sheet;}
      const y=((index%6)*4+frame)*256;
      ['left','right'].forEach((id,i)=>{$(id).getContext('2d').drawImage(current,i*384,y,384,256,0,0,384,256);$(id).setAttribute('aria-label',r.name+' · '+(i?'Tonepress v11':'Mosh-Pro'));});
      $('status').textContent='';
    }catch{if(serial===ticket)$('status').textContent=label.fail;}
  }
  $('effect').onchange=e=>{index=rows.findIndex(r=>r.id===e.target.value);render();};
  $('prev').onclick=()=>{index=(index+rows.length-1)%rows.length;render();};
  $('next').onclick=()=>{index=(index+1)%rows.length;render();};
  $('language').onchange=e=>{lang=e.target.value;try{localStorage.setItem('tonepress-language',lang);}catch{}render();};
  for(const b of document.querySelectorAll('[data-frame]'))b.onclick=()=>{frame=Number(b.dataset.frame);render();};
  render();
})();