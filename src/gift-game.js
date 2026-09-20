import * as THREE from 'three';
import {DIFFICULTIES,START,ARRIVAL,FRAME_POSITIONS,validateGift,nextCheckpoint,canLand} from './gift-schema.js';
import {canMove} from './navigation.js';
import {createMemoryRoom} from './memory-room.js';
import {createGiftWorld} from './gift-world.js';

const EMPTY={version:1,title:'留给你的一座岛',recipient:'',sender:'',occasion:'',greeting:'有些话，想等你亲自到达，再慢慢告诉你。',letter:'谢谢你，成为我生命里特别的人。\n\n这座小岛，收藏着属于我们的时光。未来还想和你一起，留下更多回忆。',difficulty:'easy',theme:'warm',photos:[]};
const $=id=>document.getElementById(id);
function text(id,value){if($(id).textContent!==value)$(id).textContent=value;}
async function photoData(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)throw new Error('请选择 15 MB 以内的 JPG、PNG 或 WebP 照片。');
 const image=await createImageBitmap(file);
 try{const ratio=Math.min(1,1100/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff7e7';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);let quality=.78,src=canvas.toDataURL('image/jpeg',quality);while(src.length>260000&&quality>.42){quality-=.08;src=canvas.toDataURL('image/jpeg',quality);}if(src.length>260000)throw new Error('这张照片细节太多，请换一张尺寸较小的照片。');return src;}finally{image.close();}
}
export function createGiftGame({scene,boat,keys}){
 const root=$('gift-root');root.innerHTML=`
 <header class="gift-header"><a class="gift-brand" href="/">一座岛<span>A LITTLE ISLAND, JUST FOR YOU</span></a><nav><button id="island-view" class="quiet">看小岛</button><button id="room-preview" class="quiet">预览小屋</button><button id="gift-edit" class="primary">布置礼物 ↗</button></nav></header>
 <section id="creator-intro" class="intro-card"><span class="eyebrow">把回忆藏进一座岛</span><h1>有一座小岛，<br>只等一个人抵达。</h1><p>装好你们的照片，写下想说的话。<br>让 TA 穿过海浪，找到属于你们的惊喜。</p><button id="create-start" class="primary">开始布置小岛 <span>→</span></button><div class="intro-steps">01 布置回忆　／　02 邀请远航　／　03 进屋揭晓</div></section>
 <div id="game-status" class="journey-card" hidden aria-live="polite"><span class="eyebrow" id="journey-stage"></span><h2 id="journey-title"></h2><p id="journey-hint"></p><div class="journey-progress" id="journey-progress"></div><button id="journey-action" class="primary" hidden></button><button id="journey-rescue" class="quiet">返回上一处安全水域</button></div>
 <div id="sail-controls" hidden><div class="sail-help">点击海面驶向那里 · WASD / 方向键驾驶 · 空格停船</div><div class="dpad" aria-label="驾驶控制"><button data-key="ArrowUp" aria-label="前进">↑</button><button data-key="ArrowLeft" aria-label="左转">↶</button><button data-key="Space" aria-label="停船">■</button><button data-key="ArrowRight" aria-label="右转">↷</button><button data-key="ArrowDown" aria-label="后退">↓</button></div></div>
 <dialog id="gift-editor" class="gift-dialog editor"><form id="gift-form"><div class="sheet-heading"><div><span class="eyebrow">FOR SOMEONE SPECIAL</span><h2>布置你的礼物</h2></div><button type="button" class="close" id="editor-close" aria-label="关闭布置面板">×</button></div>
 <p class="subtle">照片会放进小屋的相框里，信件在抵达后揭晓。</p>
 <div class="field-pair"><label>送给谁<input name="recipient" maxlength="40" required placeholder="TA 的名字 / 昵称"></label><label>你是谁<input name="sender" maxlength="40" required placeholder="你的名字 / 昵称"></label></div>
 <label>小岛名字<input name="title" maxlength="60" required></label><label>纪念的日子或事情<input name="occasion" maxlength="60" placeholder="例如：相识的第 1000 天"></label><label>邀请上的一句话<textarea name="greeting" maxlength="180" rows="2"></textarea></label>
 <fieldset><legend>这趟航程的难度</legend><div class="difficulty-options">${Object.entries(DIFFICULTIES).map(([key,value],i)=>`<label><input type="radio" name="difficulty" value="${key}"><span><b>${'✦'.repeat(i+1)} ${value.name}</b><small>${value.description}</small></span></label>`).join('')}</div></fieldset>
 <fieldset><legend>回忆小屋 <small>最多 6 张 · 点击位置添加照片</small></legend><div id="photo-slots" class="photo-slots">${FRAME_POSITIONS.map((label,slot)=>`<div class="photo-slot"><label class="photo-upload"><span>${label}</span><img id="photo-img-${slot}" alt="${label}的照片" hidden><strong id="photo-add-${slot}">＋ 添加照片</strong><input type="file" data-slot="${slot}" accept="image/jpeg,image/png,image/webp" aria-label="上传${label}照片"></label><input id="photo-caption-${slot}" maxlength="160" placeholder="写下这张照片的回忆" aria-label="${label}照片说明"><button type="button" class="quiet photo-remove" data-remove="${slot}" hidden>移除照片</button></div>`).join('')}</div></fieldset>
 <label>小屋氛围<select name="theme"><option value="warm">暖阳 · 奶油与木色</option><option value="sea">海风 · 青绿与亚麻</option></select></label>
 <label>留在桌上的信<textarea name="letter" maxlength="4000" rows="6" required></textarea></label>
 <p id="editor-message" class="form-message" role="status"></p><div class="editor-footer"><button type="button" id="editor-preview" class="secondary">进屋看看</button><button type="submit" id="gift-save" class="primary">生成专属邀请 →</button></div><p class="local-note">本机原型：邀请和照片保存在当前电脑，链接发布上线后才能发给远方的朋友。</p></form></dialog>
 <dialog id="share-dialog" class="gift-dialog share"><span class="eyebrow">YOUR ISLAND IS READY</span><h2>小岛已为 TA 准备好。</h2><p>这是一份独立的邀请。之后修改草稿，不会改变已生成的礼物。</p><label>专属邀请链接<input id="share-url" readonly></label><p class="local-note">这是本机体验链接。现在可以在本机的新窗口中扮演收礼者；线上分享将在后续发布时接入。</p><p id="share-status" role="status"></p><div class="button-row"><button id="share-copy" class="primary">复制链接</button><a id="share-open" class="secondary" target="_blank" rel="noopener">体验收礼流程 ↗</a></div><button id="share-close" class="quiet">继续布置</button></dialog>
 <dialog id="invitation" class="gift-dialog invitation"><div class="seal">✦</div><span class="eyebrow">A LITTLE VOYAGE FOR YOU</span><h1 id="invitation-title"></h1><p id="invitation-greeting"></p><p class="signature" id="invitation-from"></p><div class="invitation-trip"><b id="invitation-level"></b><p>从大陆码头出发，依次找到引航浮标，再驶向小岛码头。<br>登岛后，房间里有一份专属于你的惊喜。</p></div><button id="journey-start" class="primary">收下邀请，启航 →</button><p id="invitation-error" role="alert"></p></dialog>
 <section id="room-ui" hidden><div class="room-heading"><span class="eyebrow">WELCOME HOME</span><h1 id="room-title"></h1><p id="room-occasion"></p></div><div class="room-actions"><button id="read-letter" class="primary">打开桌上的信 ✉</button><button id="room-leave" class="secondary">回到小岛</button><button id="room-edit" class="quiet">继续布置</button></div><div class="window-controls"><button id="window-toggle" class="quiet" aria-pressed="true">窗外动态 · 开启</button><span id="window-health"></span><output id="window-debug" hidden></output></div><div id="memory-gallery" class="memory-gallery" aria-label="房间里的回忆照片"></div></section>
 <dialog id="memory-dialog" class="gift-dialog memory"><button id="memory-close" class="close" aria-label="关闭回忆">×</button><img id="memory-image" alt=""><h2 id="memory-title"></h2><p id="memory-copy"></p></dialog>
 <div id="gift-toast" class="gift-toast" role="status" hidden></div>`;
 const world=createGiftWorld(scene),room=createMemoryRoom(scene);
 const state={phase:'creator',difficulty:'easy',checkpoint:0};
 let draft=structuredClone(EMPTY),gift=draft,recipientMode=false,steer=0,speed=0,target=null,walking=0,safe={...START},pendingUploads=0,toastTimer,lastHint='',lastDraftError=false;
 try{const saved=localStorage.getItem('island-gift-draft');if(saved){const parsed=JSON.parse(saved);draft={...EMPTY,...validateGift({...parsed,recipient:parsed.recipient||'收礼人',sender:parsed.sender||'送礼人',title:parsed.title||EMPTY.title,letter:parsed.letter||EMPTY.letter})};draft.recipient=parsed.recipient||'';draft.sender=parsed.sender||'';draft.title=parsed.title??EMPTY.title;draft.letter=parsed.letter??EMPTY.letter;}}catch{/* An incomplete or older draft is safely ignored. */}
 gift=draft;
 const form=$('gift-form');
 function toast(message){text('gift-toast',message);$('gift-toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('gift-toast').hidden=true,4000);}
 function saveDraft(){try{localStorage.setItem('island-gift-draft',JSON.stringify(draft));lastDraftError=false;}catch{if(!lastDraftError)toast('浏览器草稿空间不足，请生成邀请以保存照片。');lastDraftError=true;}}
 function readForm(){for(const key of ['recipient','sender','title','occasion','greeting','letter','theme','difficulty'])draft[key]=form.elements.namedItem(key).value;saveDraft();}
 function fillForm(){for(const key of ['recipient','sender','title','occasion','greeting','letter','theme','difficulty'])form.elements.namedItem(key).value=draft[key];for(let i=0;i<6;i++)refreshPhoto(i);}
 function refreshPhoto(slot){const photo=draft.photos.find(p=>p.slot===slot),img=$(`photo-img-${slot}`);img.hidden=!photo;$(`photo-add-${slot}`).hidden=!!photo;if(photo)img.src=photo.src;else img.removeAttribute('src');$(`photo-caption-${slot}`).value=photo?.caption||'';root.querySelector(`[data-remove="${slot}"]`).hidden=!photo;}
 form.addEventListener('input',event=>{if(event.target.type!=='file'&&!event.target.id.startsWith('photo-caption'))readForm();});
 for(let slot=0;slot<6;slot++){
  const input=root.querySelector(`[data-slot="${slot}"]`);
  input.addEventListener('change',async()=>{const file=input.files[0];if(!file)return;pendingUploads++;$('gift-save').disabled=true;input.disabled=true;text('editor-message','正在准备照片…');try{const src=await photoData(file);const previous=draft.photos.find(p=>p.slot===slot);draft.photos=draft.photos.filter(p=>p.slot!==slot);draft.photos.push({slot,src,caption:previous?.caption||''});refreshPhoto(slot);saveDraft();text('editor-message','照片已放进相框。');}catch(error){text('editor-message',error.message);}finally{pendingUploads--;input.disabled=false;input.value='';$('gift-save').disabled=pendingUploads>0;}});
  $(`photo-caption-${slot}`).addEventListener('input',e=>{const photo=draft.photos.find(p=>p.slot===slot);if(photo){photo.caption=e.target.value;saveDraft();}});
  root.querySelector(`[data-remove="${slot}"]`).onclick=()=>{draft.photos=draft.photos.filter(p=>p.slot!==slot);refreshPhoto(slot);saveDraft();};
 }
 function editor(){if(recipientMode)return;fillForm();$('gift-editor').showModal();}
 $('create-start').onclick=editor;$('gift-edit').onclick=editor;$('editor-close').onclick=()=>$('gift-editor').close();
 function openPhoto(entry){$('memory-image').hidden=false;$('memory-image').src=entry.src;$('memory-image').alt=entry.caption||'回忆照片';text('memory-title',FRAME_POSITIONS[entry.slot]);text('memory-copy',entry.caption||'值得收藏的一刻。');$('memory-dialog').showModal();}
 function showRoom(preview=false){
  if(preview){readForm();gift=draft;}
  keys.clear();speed=0;state.phase='room';$('creator-intro').hidden=true;$('game-status').hidden=true;$('sail-controls').hidden=true;$('room-ui').hidden=false;$('room-edit').hidden=recipientMode;
  $('gift-editor').close();room.update(gift);text('room-title',gift.title);text('room-occasion',gift.occasion||`为 ${gift.recipient||'特别的你'} 留下的回忆`);
  const gallery=$('memory-gallery');gallery.replaceChildren();
  if(!gift.photos.length){const note=document.createElement('p');note.className='empty-photos';note.textContent=recipientMode?'这间小屋里，藏着一封写给你的信。':'这里等着你们的照片。点击「继续布置」添加回忆。';gallery.append(note);}
  for(const entry of [...gift.photos].sort((a,b)=>a.slot-b.slot)){
   const button=document.createElement('button');const image=document.createElement('img');image.src=entry.src;image.alt=entry.caption||FRAME_POSITIONS[entry.slot];const caption=document.createElement('span');caption.textContent=entry.caption||'打开这段回忆';button.append(image,caption);button.onclick=()=>openPhoto(entry);gallery.append(button);
  }
 }
 $('window-toggle').onclick=()=>{room.windowView.setEnabled(!room.windowView.enabled);$('window-toggle').setAttribute('aria-pressed',String(room.windowView.enabled));text('window-toggle',room.windowView.enabled?'窗外动态 · 开启':'窗外动态 · 静止');};
 $('room-preview').onclick=()=>showRoom(true);$('editor-preview').onclick=()=>showRoom(true);$('room-edit').onclick=editor;
 $('read-letter').onclick=()=>{$('memory-image').hidden=true;$('memory-image').removeAttribute('src');text('memory-title',`亲爱的 ${gift.recipient||'你'}：`);text('memory-copy',gift.letter+`\n\n—— ${gift.sender||'送你小岛的人'}`);$('memory-dialog').showModal();};
 $('memory-close').onclick=()=>$('memory-dialog').close();
 function leaveRoom(){state.phase=recipientMode?'ashore':'creator';$('room-ui').hidden=true;$('creator-intro').hidden=recipientMode;$('game-status').hidden=!recipientMode;}
 $('room-leave').onclick=leaveRoom;$('island-view').onclick=leaveRoom;
 form.onsubmit=async event=>{event.preventDefault();if(pendingUploads)return;readForm();$('gift-save').disabled=true;text('editor-message','正在保存这份小岛礼物…');try{const payload=validateGift(draft);const response=await fetch('/api/gifts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||'保存失败，请重试。');const url=new URL(location.href);url.search='?gift='+result.id;url.hash='';$('share-url').value=url.href;$('share-open').href=url.href;$('gift-editor').close();text('share-status','邀请和照片已保存在本机服务。');$('share-dialog').showModal();}catch(error){text('editor-message',error.message.includes('JSON')?'本机保存服务暂时不可用，请重启开发服务。':error.message);}finally{$('gift-save').disabled=false;}};
 $('share-close').onclick=()=>$('share-dialog').close();$('share-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('share-url').value);text('share-status','已复制本机邀请链接。');}catch{$('share-url').select();text('share-status','请按 Ctrl/Cmd+C 复制选中的链接。');}};
 function start(){
  $('invitation').close();state.phase='sailing';state.difficulty=gift.difficulty;state.checkpoint=0;speed=0;steer=0;target=null;keys.clear();boat.position.set(START.x,.17,START.z);boat.rotation.y=Math.PI/2;world.group.visible=true;world.person.visible=false;world.setDifficulty(gift.difficulty);safe={...START};$('game-status').hidden=false;$('sail-controls').hidden=false;lastHint='';
 }
 $('journey-start').onclick=start;
 $('journey-rescue').onclick=()=>{if(state.phase!=='sailing')return;boat.position.set(safe.x,.17,safe.z);speed=0;target=null;keys.clear();toast('已回到上一处安全水域，可以继续航行。');};
 $('journey-action').onclick=()=>{if(canLand(state,boat.position)){state.phase='landing';speed=0;target=null;walking=0;keys.clear();world.person.position.set(ARRIVAL.x,.62,15.55);world.person.visible=true;$('sail-controls').hidden=true;}else if(state.phase==='ashore')showRoom();};
 root.querySelectorAll('[data-key]').forEach(button=>{const release=()=>keys.delete(button.dataset.key);button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);target=null;if(button.dataset.key==='Space'){speed=0;keys.clear();}else keys.add(button.dataset.key);};button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;});
 addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))target=null;if(e.code==='Space'){speed=0;target=null;}});
 const token=new URLSearchParams(location.search).get('gift');
 if(token!==null){
  recipientMode=true;root.querySelector('.gift-header nav').hidden=true;state.phase='loading';$('creator-intro').hidden=true;$('gift-edit').hidden=true;$('room-preview').hidden=true;$('island-view').hidden=true;
  text('invitation-title','正在打开你的邀请…');$('journey-start').disabled=true;$('invitation').showModal();$('invitation').addEventListener('cancel',e=>e.preventDefault());
  (async()=>{try{if(!/^[A-Za-z0-9_-]{32}$/.test(token))throw new Error('邀请链接不完整，请向送礼的人确认。');const response=await fetch('/api/gifts?id='+encodeURIComponent(token));const data=await response.json();if(!response.ok)throw new Error(data.error||'邀请暂时无法读取。');gift=validateGift(data);state.phase='invitation';text('invitation-title',`${gift.recipient}，有一座岛在等你。`);text('invitation-greeting',gift.greeting);text('invitation-from',`来自 ${gift.sender} 的专属邀请`);text('invitation-level',DIFFICULTIES[gift.difficulty].name);$('journey-start').disabled=false;}catch(error){text('invitation-title','暂时无法打开这份邀请');text('invitation-error',error.message);$('journey-start').hidden=true;const retry=document.createElement('button');retry.className='secondary';retry.textContent='重新加载';retry.onclick=()=>location.reload();$('invitation').append(retry);}})();
 }
 fillForm();
 if(!recipientMode&&new URLSearchParams(location.search).get('room')==='preview')showRoom(true);
 $('window-debug').hidden=!new URLSearchParams(location.search).has('perf');
 function update(dt,t){
  world.update(t,state,boat);
  if(state.phase==='sailing'){
   const config=DIFFICULTIES[state.difficulty];
   let throttle=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
   let turn=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
   if(target){const distance=Math.hypot(target.x-boat.position.x,target.z-boat.position.z);if(distance<.6){target=null;speed=0;}else{const angle=Math.atan2(target.x-boat.position.x,target.z-boat.position.z);const delta=Math.atan2(Math.sin(angle-boat.rotation.y),Math.cos(angle-boat.rotation.y));turn=THREE.MathUtils.clamp(delta*2,-1,1);throttle=Math.abs(delta)<.8?1:0;if(Math.abs(delta)>.8)speed*=.90;}}
   speed=THREE.MathUtils.clamp(speed+throttle*dt*.48,-.18,.46);speed*=Math.pow(.983,dt*60);steer=THREE.MathUtils.lerp(steer,turn,1-Math.exp(-9*dt));boat.rotation.y+=steer*dt*(1.15+Math.abs(speed)*2);
   const candidate={x:boat.position.x+Math.sin(boat.rotation.y)*speed*dt*12+Math.sin(t*.4)*config.current*dt,z:boat.position.z+Math.cos(boat.rotation.y)*speed*dt*12+Math.cos(t*.31)*config.current*dt};
   if(candidate.x>-28.8&&canMove(boat.position,candidate)){boat.position.x=candidate.x;boat.position.z=candidate.z;}else{speed=0;if(target){target=null;toast('前方是浅滩或码头，请绕到开阔水面。');}}
   if(canLand(state,boat.position)){speed=0;target=null;}
   const next=nextCheckpoint(state,boat.position);if(next!==state.checkpoint){state.checkpoint=next;safe={x:boat.position.x,z:boat.position.z};toast(next===config.checkpoints.length?'已经找到小岛！驶向码头外侧，准备靠岸。':`找到第 ${next} 座浮标，继续前行。`);}
   const destination=config.checkpoints[state.checkpoint]||[ARRIVAL.x,ARRIVAL.z];const dx=destination[0]-boat.position.x,dz=destination[1]-boat.position.z,distance=Math.hypot(dx,dz);const angle=Math.atan2(dx,dz)-boat.rotation.y;const delta=Math.atan2(Math.sin(angle),Math.cos(angle));const direction=Math.abs(delta)<.3?'正前方':delta>0?'左转方向':'右转方向';
   text('journey-stage',`${config.name} · ${state.checkpoint}/${config.checkpoints.length} 座浮标`);text('journey-title',canLand(state,boat.position)?'你到了。小岛在等你。':state.checkpoint===config.checkpoints.length?'把船停在码头外侧':'寻找下一座引航浮标');
   const hint=state.difficulty==='hard'&&distance>10?`罗盘提示：${direction}，沿海面探索。`:`${direction} · 距离约 ${Math.ceil(distance)} 米。点击海面也能驾驶。`;
   if(hint!==lastHint){text('journey-hint',hint);lastHint=hint;}
   $('journey-progress').style.setProperty('--progress',`${state.checkpoint/config.checkpoints.length*100}%`);$('journey-action').hidden=!canLand(state,boat.position);text('journey-action','靠岸登岛 →');$('journey-rescue').hidden=false;
  }else if(state.phase==='landing'){
   walking=Math.min(1,walking+dt/7);const p=world.person.position;p.z=THREE.MathUtils.lerp(15.55,2.75,walking);p.y=p.z>9.5?.62:p.z>4.2?.43:THREE.MathUtils.lerp(.43,1.04,Math.min(1,(4.2-p.z)/1.2));world.person.rotation.y=Math.PI;world.person.rotation.z=Math.sin(t*9)*.035;
   text('journey-stage','已经登岛');text('journey-title','沿着石板路，走向小屋');text('journey-hint','熟悉的回忆，就在门后。');$('journey-action').hidden=true;$('journey-rescue').hidden=true;
   if(walking===1){state.phase='ashore';world.person.rotation.z=0;}
  }else if(state.phase==='ashore'){
   text('journey-stage','惊喜就在门后');text('journey-title',`${gift.recipient}，欢迎回家。`);text('journey-hint','打开房门，看看 TA 为你准备了什么。');$('journey-action').hidden=false;text('journey-action','推开房门 →');$('journey-rescue').hidden=true;
  }
 }
 return {state,update,get speed(){return speed;},get steer(){return steer;},get isRoom(){return state.phase==='room';},clickRoom(event){const hit=room.pick(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);if(hit?.action==='letter')$('read-letter').click();else if(hit&&Number.isInteger(hit.slot)){const entry=gift.photos.find(p=>p.slot===hit.slot);if(entry)openPhoto(entry);else if(!recipientMode)toast('这个相框还空着，可以在「继续布置」中添加照片。');}},renderRoom:(renderer,t)=>{room.render(renderer,t);const stats=room.stats;if(!$('window-debug').hidden)text('window-debug',`窗景 CPU ${stats.windowCpuMs.toFixed(2)} ms / GPU ${stats.windowGpuMs===null?'不支持计时':stats.windowGpuMs.toFixed(2)+' ms'} / ${stats.windowCalls} 次绘制 / ${stats.windowTriangles} 三角形 / 更新 ${stats.windowRenders} 次`);text('window-health',`${Math.round(stats.roomFps)} fps · ${room.windowView.enabled?'轻量窗景':'静态窗景'}`);},get focus(){if(['sailing','invitation','loading'].includes(state.phase))return new THREE.Vector3(boat.position.x,0,boat.position.z);if(['landing','ashore'].includes(state.phase))return world.person.position.clone();return new THREE.Vector3(12.3,0,1.8);},get zoom(){return ['landing','ashore'].includes(state.phase)?1.15:.85;},clickWater(hit){if(state.phase==='sailing'&&!document.querySelector('dialog[open]')){target={x:hit.x,z:hit.z};return true;}return false;}};
}
