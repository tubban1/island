import * as THREE from 'three';
import {DIFFICULTIES,START,ARRIVAL,FRAME_POSITIONS,validateGift,nextCheckpoint,canLand} from './gift-schema.js';
import {canMove} from './navigation.js';
import {createMemoryRoom} from './memory-room.js';
import {createGiftWorld} from './gift-world.js';
import {synth,TRACKS} from './midi-synth.js';

const EMPTY_ROOM = {
  id: 'room_default',
  version: 1,
  title: '留给你的一座岛',
  recipient: '',
  sender: '',
  occasion: '',
  greeting: '有些话，想等你亲自到达，再慢慢告诉你。',
  letter: '谢谢你，成为我生命里特别的人。\n\n这座小岛，收藏着属于我们的时光。未来还想和你一起，留下更多回忆。',
  difficulty: 'easy',
  theme: 'warm',
  music: 'music_box',
  photos: [],
  giftId: null,
  updatedAt: new Date().toISOString()
};

function createNewRoomData(recipient = '') {
  return {
    id: 'room_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    version: 1,
    title: recipient ? `留给 ${recipient} 的一座岛` : '留给你的一座岛',
    recipient: recipient,
    sender: '',
    occasion: '',
    greeting: '有些话，想等你亲自到达，再慢慢告诉你。',
    letter: '谢谢你，成为我生命里特别的人。\n\n这座小岛，收藏着属于我们的时光。未来还想和你一起，留下更多回忆。',
    difficulty: 'easy',
    theme: 'warm',
    music: 'music_box',
    photos: [],
    giftId: null,
    updatedAt: new Date().toISOString()
  };
}

const $ = id => document.getElementById(id);
function text(id, value) { if ($(id) && $(id).textContent !== value) $(id).textContent = value; }

async function photoData(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
    throw new Error('请选择 15 MB 以内的 JPG、PNG 或 WebP 照片。');
  }
  const image = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1100 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff7e7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = .78, src = canvas.toDataURL('image/jpeg', quality);
    while (src.length > 260000 && quality > .42) {
      quality -= .08;
      src = canvas.toDataURL('image/jpeg', quality);
    }
    if (src.length > 260000) throw new Error('这张照片细节太多，请换一张尺寸较小的照片。');
    return src;
  } finally {
    image.close();
  }
}

export function createGiftGame({scene, boat, keys, onIslandTitleChange}) {
  const root = $('gift-root');
  root.innerHTML = `
  <header class="gift-header">
    <a class="gift-brand" href="/">一座岛<span>A LITTLE ISLAND, JUST FOR YOU</span></a>
    <div class="nav-menu-wrap">
      <button id="nav-menu-btn" class="nav-menu-btn" type="button" aria-expanded="false" aria-controls="nav-menu-panel" aria-label="菜单" title="菜单">
        <span class="nav-menu-icon">☰</span>
      </button>
      <div id="nav-menu-panel" class="nav-menu-panel" hidden>
        <button id="room-preview" type="button">🏠 预览小屋</button>
        <button id="gift-edit" type="button">🎁 布置礼物</button>
        <button id="feedback-toggle" type="button">💬 反馈</button>
      </div>
    </div>
  </header>

  <section id="creator-intro" class="intro-card">
    <button id="intro-toggle" class="intro-toggle" type="button" aria-expanded="true" aria-label="收起说明" title="收起说明">−</button>
    <span class="eyebrow">把回忆藏进一座岛</span>
    <h1>有一座小岛，<br>只等一个人抵达。</h1>
    <p>装好你们的照片，写下想说的话。<br>让 TA 穿过海浪，找到属于你们的惊喜。</p>
    <button id="create-start" class="primary">开始布置小岛 <span>→</span></button>
    <div class="intro-steps">01 布置回忆　／　02 邀请远航　／　03 进屋揭晓</div>
  </section>

  <div id="game-status" class="journey-card" hidden aria-live="polite">
    <span class="eyebrow" id="journey-stage"></span>
    <h2 id="journey-title"></h2>
    <p id="journey-hint"></p>
    <div class="journey-progress" id="journey-progress"></div>
    <button id="journey-action" class="primary" hidden></button>
    <button id="journey-rescue" class="quiet">返回上一处安全水域</button>
  </div>

  <div id="sail-controls" hidden>
    <div class="sail-help">点击海面驶向那里 · 拖拽圆盘驾驶 · 空格停船</div>
    <div id="steering-wheel" class="steering-wheel" aria-label="方向盘驾驶圆盘" role="slider">
      <div class="wheel-ring"></div>
      <div id="wheel-knob" class="wheel-knob">
        <span class="wheel-icon">☸</span>
      </div>
    </div>
  </div>

  <dialog id="gift-editor" class="gift-dialog editor">
    <form id="gift-form">
      <div class="sheet-heading">
        <div>
          <span class="eyebrow">FOR SOMEONE SPECIAL</span>
          <h2>布置你的礼物</h2>
        </div>
        <button type="button" class="close" id="editor-close" aria-label="关闭布置面板">×</button>
      </div>

      <!-- 多岛屿管理切换栏 -->
      <div class="room-selector-bar">
        <div class="room-selector-left">
          <span class="room-bar-label">🏝️ 岛屿：</span>
          <select id="room-switcher" aria-label="选择要布置的岛屿"></select>
        </div>
        <div class="room-selector-right">
          <button type="button" id="room-new-btn" class="room-pill-btn" title="为另一位朋友新建一座岛屿">＋ 新建岛屿</button>
          <button type="button" id="room-delete-btn" class="room-pill-btn danger" title="删除当前岛屿">删除</button>
        </div>
      </div>

      <div id="room-gift-link-bar" class="room-gift-link-bar" hidden>
        <span class="room-link-tip">💌 此岛屿已生成邀请：</span>
        <a id="room-gift-link" href="#" target="_blank" rel="noopener">查看邀请</a>
        <button type="button" id="room-gift-copy" class="room-link-copy-btn">复制链接</button>
      </div>

      <p class="subtle">照片会放进小屋的相框里，信件在抵达后揭晓。</p>

      <div class="field-pair">
        <label>送给谁<input name="recipient" maxlength="40" required placeholder="TA 的名字 / 昵称"></label>
        <label>你是谁<input name="sender" maxlength="40" required placeholder="你的名字 / 昵称"></label>
      </div>

      <label>岛屿名字<small class="subtle">（最多 20 字，牌子支持 1-2 行大字清晰呈现）</small><input name="title" maxlength="20" required placeholder="例如：留给你的一座岛" value="留给你的一座岛"></label>
      <label>纪念的日子或事情<input name="occasion" maxlength="60" placeholder="例如：相识的第 1000 天"></label>
      <label>邀请上的一句话<textarea name="greeting" maxlength="180" rows="2"></textarea></label>

      <fieldset>
        <legend>这趟航程的难度</legend>
        <div class="difficulty-options">
          ${Object.entries(DIFFICULTIES).map(([key, value], i) => `
            <label><input type="radio" name="difficulty" value="${key}"><span><b>${'✦'.repeat(i + 1)} ${value.name}</b><small>${value.description}</small></span></label>
          `).join('')}
        </div>
      </fieldset>

      <fieldset>
        <legend>回忆小屋 <small>最多 6 张 · 点击位置添加照片</small></legend>
        <div id="photo-slots" class="photo-slots">
          ${FRAME_POSITIONS.map((label, slot) => `
            <div class="photo-slot">
              <label class="photo-upload">
                <span>${label}</span>
                <img id="photo-img-${slot}" alt="${label}的照片" hidden>
                <strong id="photo-add-${slot}">＋ 添加照片</strong>
                <input type="file" data-slot="${slot}" accept="image/jpeg,image/png,image/webp" aria-label="上传${label}照片">
              </label>
              <input id="photo-caption-${slot}" maxlength="160" placeholder="写下这张照片的回忆" aria-label="${label}照片说明">
              <button type="button" class="quiet photo-remove" data-remove="${slot}" hidden>移除照片</button>
            </div>
          `).join('')}
        </div>
      </fieldset>

      <div class="field-pair">
        <label>小屋氛围
          <select name="theme">
            <option value="warm">暖阳 · 奶油与木色</option>
            <option value="sea">海风 · 青绿与亚麻</option>
          </select>
        </label>
        <label>背景音乐
          <div class="music-control-row">
            <select name="music" id="music-select">
              <option value="music_box">🎵 浪漫八音盒 (推荐)</option>
              <option value="sea_breeze">🌊 海风与吉他</option>
              <option value="canon">✨ 卡农微光</option>
              <option value="starry">🌌 星空夜曲</option>
              <option value="none">🔇 仅海浪声</option>
            </select>
            <button type="button" id="music-preview-btn" class="music-btn" title="试听音乐">▶ 试听</button>
          </div>
        </label>
      </div>

      <label>留在桌上的信<textarea name="letter" maxlength="4000" rows="6" required></textarea></label>

      <p id="editor-message" class="form-message" role="status"></p>
      <div class="editor-footer">
        <button type="button" id="editor-preview" class="secondary">进屋看看</button>
        <button type="submit" id="gift-save" class="primary">生成专属邀请 →</button>
      </div>
    </form>
  </dialog>

  <dialog id="share-dialog" class="gift-dialog share">
    <span class="eyebrow">YOUR ISLAND IS READY</span>
    <h2>小岛已为 TA 准备好。</h2>
    <p class="subtle">复制链接后，发送给 TA 即可开启专属小岛之旅。</p>
    <label>专属邀请链接<input id="share-url" readonly></label>
    <p id="share-status" role="status"></p>
    <div class="button-row">
      <button id="share-copy" class="primary">复制链接</button>
      <a id="share-open" class="secondary" target="_blank" rel="noopener">体验收礼流程 ↗</a>
    </div>
    <button id="share-close" class="quiet">继续布置</button>
  </dialog>

  <dialog id="feedback-dialog" class="gift-dialog feedback">
    <form id="feedback-form">
      <div class="sheet-heading">
        <div>
          <span class="eyebrow">FEEDBACK</span>
          <h2>写下你的想法</h2>
        </div>
        <button type="button" class="close" id="feedback-close" aria-label="关闭反馈">×</button>
      </div>
      <p class="subtle">无论是功能建议、遇到问题，还是想对小岛说的话，我们都会认真倾听。</p>
      <label>反馈类型
        <select name="category" id="feedback-category">
          <option value="suggestion">💡 功能建议与想法</option>
          <option value="bug">🐛 遇到了问题或Bug</option>
          <option value="message">💌 想对小岛说的话</option>
        </select>
      </label>
      <label>内容
        <textarea name="content" id="feedback-content" rows="4" maxlength="1500" required placeholder="请详细写下你的想法或遇到的情况..."></textarea>
      </label>
      <label>联系方式 (选填)
        <input name="contact" id="feedback-contact" maxlength="100" placeholder="微信 / 邮箱 / 手机号，方便我们回复你" />
      </label>
      <p id="feedback-message" class="form-message" role="status"></p>
      <div class="editor-footer">
        <button type="button" class="secondary" id="feedback-cancel">取消</button>
        <button type="submit" id="feedback-submit" class="primary">发送反馈 →</button>
      </div>
    </form>
  </dialog>

  <dialog id="invitation" class="gift-dialog invitation">
    <div class="seal">✦</div>
    <span class="eyebrow">A LITTLE VOYAGE FOR YOU</span>
    <h1 id="invitation-title"></h1>
    <p id="invitation-greeting"></p>
    <p class="signature" id="invitation-from"></p>
    <div class="invitation-trip">
      <b id="invitation-level"></b>
      <p>从大陆码头出发，依次找到引航浮标，再驶向小岛码头。<br>登岛后，房间里有一份专属于你的惊喜。</p>
    </div>
    <button id="journey-start" class="primary">收下邀请，启航 →</button>
    <p id="invitation-error" role="alert"></p>
  </dialog>

  <section id="room-ui" hidden>
    <button id="room-leave" class="room-corner room-exit" aria-label="回到小岛" title="回到小岛">←</button>
    <div class="room-menu-wrap">
      <button id="room-menu" class="room-corner" aria-label="房间选项" aria-expanded="false" aria-controls="room-menu-panel" title="房间选项">···</button>
      <div id="room-menu-panel" class="room-menu-panel" hidden>
        <button id="room-reset" type="button">重置视角</button>
        <button id="window-toggle" type="button" aria-pressed="true">窗外动态 · 开启</button>
        <button id="room-music-toggle" type="button" aria-pressed="true">背景音乐 · 开启</button>
        <button id="room-edit" type="button">继续布置</button>
      </div>
    </div>
    <div id="room-intro-hint" class="room-intro-hint" role="status">拖动环顾 · 滚轮靠近 · WASD 平移 · 点击相框或信</div>
    <div id="room-hotspot-hint" class="room-hotspot-hint" hidden></div>
    <output id="window-debug" hidden></output>
  </section>

  <dialog id="memory-dialog" class="gift-dialog memory">
    <button id="memory-close" class="close" aria-label="关闭回忆">×</button>
    <img id="memory-image" alt="">
    <h2 id="memory-title"></h2>
    <p id="memory-copy"></p>
  </dialog>

  <div id="gift-toast" class="gift-toast" role="status" hidden></div>
  <div id="view-hint" class="view-hint">拖拽旋转视角 · 滚轮缩放</div>`;

  const world = createGiftWorld(scene), room = createMemoryRoom(scene);
  const state = {phase: 'creator', difficulty: 'easy', checkpoint: 0};
  
  // ---------- 多房间数据加载与管理 ----------
  let rooms = [];
  let currentRoomId = null;
  try {
    const savedRooms = localStorage.getItem('island-gift-rooms');
    if (savedRooms) {
      rooms = JSON.parse(savedRooms);
    }
    if (!rooms || !rooms.length) {
      const oldDraft = localStorage.getItem('island-gift-draft');
      if (oldDraft) {
        const parsed = JSON.parse(oldDraft);
        const r = createNewRoomData(parsed.recipient || '');
        Object.assign(r, parsed);
        rooms = [r];
      }
    }
  } catch (e) {}

  if (!rooms || !rooms.length) {
    rooms = [createNewRoomData()];
  }

  currentRoomId = localStorage.getItem('island-current-room-id');
  if (!rooms.some(r => r.id === currentRoomId)) {
    currentRoomId = rooms[0].id;
  }

  let draft = rooms.find(r => r.id === currentRoomId) || rooms[0];
  let gift = draft, recipientMode = false, steer = 0, speed = 0, target = null, walking = 0;
  let safe = {...START}, pendingUploads = 0, toastTimer, roomHintTimer, lastHint = '', lastDraftError = false;
  let isPreviewing = false, roomMusicEnabled = true;

  function getIslandTitle() {
    const active = recipientMode ? gift : draft;
    return (active?.title || '').trim() || (active?.recipient ? `留给 ${active.recipient} 的一座岛` : '留给你的一座岛');
  }

  function notifyTitleChange() {
    if (typeof onIslandTitleChange === 'function') {
      onIslandTitleChange(getIslandTitle());
    }
  }

  const form = $('gift-form');

  function toast(message) {
    text('gift-toast', message);
    $('gift-toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('gift-toast').hidden = true, 4000);
  }

  function updateRoomSwitcher() {
    const switcher = $('room-switcher');
    if (!switcher) return;
    switcher.innerHTML = rooms.map(r => {
      const label = r.title || (r.recipient ? `送给：${r.recipient}` : '未命名岛屿');
      return `<option value="${r.id}" ${r.id === draft.id ? 'selected' : ''}>${label}</option>`;
    }).join('');

    const linkBar = $('room-gift-link-bar');
    if (linkBar) {
      if (draft.giftId) {
        const url = new URL(location.href);
        url.search = '?gift=' + draft.giftId;
        url.hash = '';
        linkBar.hidden = false;
        $('room-gift-link').href = url.href;
      } else {
        linkBar.hidden = true;
      }
    }
  }

  function saveRooms() {
    try {
      draft.updatedAt = new Date().toISOString();
      const idx = rooms.findIndex(r => r.id === draft.id);
      if (idx >= 0) rooms[idx] = draft;
      else rooms.push(draft);
      localStorage.setItem('island-gift-rooms', JSON.stringify(rooms));
      localStorage.setItem('island-current-room-id', draft.id);
      localStorage.setItem('island-gift-draft', JSON.stringify(draft));
      lastDraftError = false;
      updateRoomSwitcher();
    } catch (e) {
      if (!lastDraftError) toast('浏览器草稿空间不足，请生成邀请以妥善保存。');
      lastDraftError = true;
    }
  }

  function readForm() {
    for (const key of ['recipient', 'sender', 'title', 'occasion', 'greeting', 'letter', 'theme', 'difficulty', 'music']) {
      const item = form.elements.namedItem(key);
      if (item) {
        if (key === 'title') {
          draft.title = (item.value.trim().slice(0, 20)) || (draft.recipient ? `留给 ${draft.recipient} 的一座岛` : '留给你的一座岛');
        } else {
          draft[key] = item.value;
        }
      }
    }
    saveRooms();
    notifyTitleChange();
  }

  function fillForm() {
    for (const key of ['recipient', 'sender', 'title', 'occasion', 'greeting', 'letter', 'theme', 'difficulty', 'music']) {
      const item = form.elements.namedItem(key);
      if (item) {
        if (key === 'title') {
          item.value = (draft.title || (draft.recipient ? `留给 ${draft.recipient} 的一座岛` : '留给你的一座岛')).slice(0, 20);
        } else if (draft[key] !== undefined) {
          item.value = draft[key];
        }
      }
    }
    for (let i = 0; i < 6; i++) refreshPhoto(i);
    updateRoomSwitcher();
    notifyTitleChange();
  }

  function refreshPhoto(slot) {
    const photo = draft.photos.find(p => p.slot === slot);
    const img = $(`photo-img-${slot}`);
    img.hidden = !photo;
    $(`photo-add-${slot}`).hidden = !!photo;
    if (photo) img.src = photo.src;
    else img.removeAttribute('src');
    $(`photo-caption-${slot}`).value = photo?.caption || '';
    root.querySelector(`[data-remove="${slot}"]`).hidden = !photo;
  }

  form.addEventListener('input', event => {
    if (event.target.type !== 'file' && !event.target.id.startsWith('photo-caption')) {
      readForm();
      if (event.target.name === 'title' || event.target.name === 'recipient') {
        updateRoomSwitcher();
      }
    }
  });

  for (let slot = 0; slot < 6; slot++) {
    const input = root.querySelector(`[data-slot="${slot}"]`);
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      pendingUploads++;
      $('gift-save').disabled = true;
      input.disabled = true;
      text('editor-message', '正在准备照片…');
      try {
        const src = await photoData(file);
        const previous = draft.photos.find(p => p.slot === slot);
        draft.photos = draft.photos.filter(p => p.slot !== slot);
        draft.photos.push({slot, src, caption: previous?.caption || ''});
        refreshPhoto(slot);
        saveRooms();
        text('editor-message', '照片已放进相框。');
      } catch (error) {
        text('editor-message', error.message);
      } finally {
        pendingUploads--;
        input.disabled = false;
        input.value = '';
        $('gift-save').disabled = pendingUploads > 0;
      }
    });
    $(`photo-caption-${slot}`).addEventListener('input', e => {
      const photo = draft.photos.find(p => p.slot === slot);
      if (photo) {
        photo.caption = e.target.value;
        saveRooms();
      }
    });
    root.querySelector(`[data-remove="${slot}"]`).onclick = () => {
      draft.photos = draft.photos.filter(p => p.slot !== slot);
      refreshPhoto(slot);
      saveRooms();
    };
  }

  // 多岛屿交互事件
  $('room-switcher').onchange = e => {
    readForm();
    const target = rooms.find(r => r.id === e.target.value);
    if (target) {
      draft = target;
      currentRoomId = draft.id;
      saveRooms();
      fillForm();
      toast(`已切换至：${draft.title || (draft.recipient ? '送给 ' + draft.recipient : '未命名岛屿')}`);
    }
  };

  $('room-new-btn').onclick = () => {
    readForm();
    const r = createNewRoomData();
    rooms.unshift(r);
    draft = r;
    currentRoomId = r.id;
    saveRooms();
    fillForm();
    toast('已创建新岛屿，现在可以为另一位朋友布置了！');
  };

  $('room-delete-btn').onclick = () => {
    if (rooms.length <= 1) {
      if (confirm('确认清空当前岛屿的内容吗？')) {
        draft = createNewRoomData();
        rooms = [draft];
        saveRooms();
        fillForm();
        toast('当前岛屿内容已清空重置。');
      }
      return;
    }
    const name = draft.title || (draft.recipient ? `送给「${draft.recipient}」的岛屿` : '未命名岛屿');
    if (confirm(`确定要删除岛屿「${name}」吗？`)) {
      rooms = rooms.filter(r => r.id !== draft.id);
      draft = rooms[0];
      currentRoomId = draft.id;
      saveRooms();
      fillForm();
      toast('已删除岛屿。');
    }
  };

  $('room-gift-copy').onclick = async () => {
    if (draft.giftId) {
      const url = new URL(location.href);
      url.search = '?gift=' + draft.giftId;
      url.hash = '';
      try {
        await navigator.clipboard.writeText(url.href);
        toast('已复制此岛屿的邀请链接！');
      } catch {
        prompt('请复制此岛屿的邀请链接：', url.href);
      }
    }
  };

  // 音乐试听与切换
  $('music-preview-btn').onclick = () => {
    const trackId = $('music-select').value;
    if (isPreviewing) {
      synth.stop();
      isPreviewing = false;
      text('music-preview-btn', '▶ 试听');
    } else {
      if (trackId === 'none') {
        toast('此选项不播放旋律，仅保留大自然的海浪声。');
      }
      isPreviewing = true;
      text('music-preview-btn', '⏹ 停止');
      synth.preview(trackId, () => {
        isPreviewing = false;
        text('music-preview-btn', '▶ 试听');
      });
    }
  };

  $('music-select').onchange = () => {
    if (isPreviewing) {
      synth.stop();
      isPreviewing = false;
      text('music-preview-btn', '▶ 试听');
    }
    readForm();
  };

  function editor() {
    if (recipientMode) return;
    fillForm();
    $('gift-editor').showModal();
  }

  $('intro-toggle').onclick = () => {
    const card = $('creator-intro');
    const collapsed = card.classList.toggle('is-collapsed');
    $('intro-toggle').textContent = collapsed ? '+' : '−';
    $('intro-toggle').setAttribute('title', collapsed ? '展开说明' : '收起说明');
    $('intro-toggle').setAttribute('aria-label', collapsed ? '展开说明' : '收起说明');
    $('intro-toggle').setAttribute('aria-expanded', String(!collapsed));
  };
  $('create-start').onclick = editor;
  $('gift-edit').onclick = editor;
  $('editor-close').onclick = () => {
    if (isPreviewing) {
      synth.stop();
      isPreviewing = false;
      text('music-preview-btn', '▶ 试听');
    }
    $('gift-editor').close();
  };

  // 反馈弹窗关闭与提交逻辑
  $('feedback-close').onclick = () => $('feedback-dialog').close();
  $('feedback-cancel').onclick = () => $('feedback-dialog').close();
  $('feedback-form').onsubmit = async event => {
    event.preventDefault();
    const category = $('feedback-category').value;
    const content = $('feedback-content').value.trim();
    const contact = $('feedback-contact').value.trim();
    if (!content) return;
    $('feedback-submit').disabled = true;
    text('feedback-message', '正在提交反馈…');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({category, content, contact})
      });
      const data = await res.json().catch(() => ({}));
      text('feedback-message', data.message || '感谢你的反馈，我们会用心让这座小岛更美好！');
      setTimeout(() => {
        $('feedback-dialog').close();
        $('feedback-submit').disabled = false;
      }, 1600);
    } catch (err) {
      text('feedback-message', '已在本地记录你的反馈，谢谢你的宝贵建议！');
      setTimeout(() => {
        $('feedback-dialog').close();
        $('feedback-submit').disabled = false;
      }, 1600);
    }
  };

  function openPhoto(entry) {
    $('room-hotspot-hint').hidden = true;
    $('memory-image').hidden = false;
    $('memory-image').src = entry.src;
    $('memory-image').alt = entry.caption || '回忆照片';
    text('memory-title', FRAME_POSITIONS[entry.slot]);
    text('memory-copy', entry.caption || '值得收藏的一刻。');
    $('memory-dialog').showModal();
  }

  function showRoom(preview = false) {
    if (preview) {
      readForm();
      gift = draft;
    }
    if (isPreviewing) {
      synth.stop();
      isPreviewing = false;
      text('music-preview-btn', '▶ 试听');
    }

    keys.clear();
    speed = 0;
    state.phase = 'room';
    root.classList.add('room-active');
    $('creator-intro').hidden = true;
    $('game-status').hidden = true;
    $('sail-controls').hidden = true;
    $('room-ui').hidden = false;
    $('room-edit').hidden = recipientMode;
    $('view-hint').hidden = true;

    $('gift-editor').close();
    room.update(gift);
    room.resetView();
    $('room-menu-panel').hidden = true;
    $('room-menu').setAttribute('aria-expanded', 'false');

    // 播放房间背景音乐
    if (roomMusicEnabled && gift.music && gift.music !== 'none') {
      synth.play(gift.music, true);
    } else {
      synth.stop();
    }

    clearTimeout(roomHintTimer);
    $('room-intro-hint').hidden = false;
    roomHintTimer = setTimeout(() => $('room-intro-hint').hidden = true, 3800);
  }

  $('room-menu').onclick = () => {
    const panel = $('room-menu-panel');
    panel.hidden = !panel.hidden;
    $('room-menu').setAttribute('aria-expanded', String(!panel.hidden));
  };
  $('room-reset').onclick = () => {
    room.resetView();
    $('room-menu-panel').hidden = true;
    $('room-menu').setAttribute('aria-expanded', 'false');
  };
  $('window-toggle').onclick = () => {
    room.windowView.setEnabled(!room.windowView.enabled);
    $('window-toggle').setAttribute('aria-pressed', String(room.windowView.enabled));
    text('window-toggle', room.windowView.enabled ? '窗外动态 · 开启' : '窗外动态 · 静止');
  };
  $('room-music-toggle').onclick = () => {
    roomMusicEnabled = !roomMusicEnabled;
    $('room-music-toggle').setAttribute('aria-pressed', String(roomMusicEnabled));
    text('room-music-toggle', roomMusicEnabled ? '背景音乐 · 开启' : '背景音乐 · 静音');
    if (roomMusicEnabled && gift.music && gift.music !== 'none') {
      synth.play(gift.music, true);
    } else {
      synth.stop();
    }
  };
  $('editor-preview').onclick = () => showRoom(true);
  $('room-edit').onclick = editor;

  function openLetter() {
    $('room-hotspot-hint').hidden = true;
    $('memory-image').hidden = true;
    $('memory-image').removeAttribute('src');
    text('memory-title', `亲爱的 ${gift.recipient || '你'}：`);
    text('memory-copy', gift.letter + `\n\n—— ${gift.sender || '送你小岛的人'}`);
    $('memory-dialog').showModal();
  }

  $('memory-close').onclick = () => $('memory-dialog').close();

  function leaveRoom() {
    synth.stop();
    state.phase = recipientMode ? 'ashore' : 'creator';
    root.classList.remove('room-active');
    $('room-ui').hidden = true;
    $('creator-intro').hidden = recipientMode;
    $('game-status').hidden = !recipientMode;
    $('view-hint').hidden = recipientMode;
    clearTimeout(roomHintTimer);
  }

  $('room-leave').onclick = leaveRoom;

  // 首页右上角弹出菜单交互（包含预览小屋、布置礼物、反馈）
  const navMenuBtn = $('nav-menu-btn');
  const navMenuPanel = $('nav-menu-panel');
  if (navMenuBtn && navMenuPanel) {
    navMenuBtn.onclick = event => {
      event.stopPropagation();
      const isHidden = navMenuPanel.hidden;
      navMenuPanel.hidden = !isHidden;
      navMenuBtn.setAttribute('aria-expanded', String(isHidden));
    };

    $('room-preview').onclick = () => {
      navMenuPanel.hidden = true;
      navMenuBtn.setAttribute('aria-expanded', 'false');
      showRoom(true);
    };

    $('gift-edit').onclick = () => {
      navMenuPanel.hidden = true;
      navMenuBtn.setAttribute('aria-expanded', 'false');
      editor();
    };

    $('feedback-toggle').onclick = () => {
      navMenuPanel.hidden = true;
      navMenuBtn.setAttribute('aria-expanded', 'false');
      $('feedback-form').reset();
      text('feedback-message', '');
      $('feedback-dialog').showModal();
    };

    document.addEventListener('click', event => {
      if (!navMenuPanel.hidden && !navMenuPanel.contains(event.target) && event.target !== navMenuBtn && !navMenuBtn.contains(event.target)) {
        navMenuPanel.hidden = true;
        navMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  addEventListener('keydown', event => {
    if (state.phase !== 'room' || document.querySelector('dialog[open]') || event.code !== 'Escape') return;
    event.preventDefault();
    if (!$('room-menu-panel').hidden) {
      $('room-menu-panel').hidden = true;
      $('room-menu').setAttribute('aria-expanded', 'false');
    } else leaveRoom();
  });

  form.onsubmit = async event => {
    event.preventDefault();
    if (pendingUploads) return;
    readForm();
    $('gift-save').disabled = true;
    text('editor-message', '正在保存这份小岛礼物…');
    try {
      const payload = validateGift(draft);
      const response = await fetch('/api/gifts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '保存失败，请重试。');

      // 记录到当前房间的 giftId
      draft.giftId = result.id;
      saveRooms();

      const url = new URL(location.href);
      url.search = '?gift=' + result.id;
      url.hash = '';
      $('share-url').value = url.href;
      $('share-open').href = url.href;
      $('gift-editor').close();
      text('share-status', '专属邀请已准备就绪！');
      $('share-dialog').showModal();
    } catch (error) {
      text('editor-message', error.message.includes('JSON') ? '服务暂时繁忙，请稍后重试。' : error.message);
    } finally {
      $('gift-save').disabled = false;
    }
  };

  $('share-close').onclick = () => $('share-dialog').close();
  $('share-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText($('share-url').value);
      text('share-status', '已复制专属邀请链接！');
    } catch {
      $('share-url').select();
      text('share-status', '请按 Ctrl/Cmd+C 复制选中的链接。');
    }
  };

  function start() {
    $('invitation').close();
    state.phase = 'sailing';
    state.difficulty = gift.difficulty;
    state.checkpoint = 0;
    speed = 0;
    steer = 0;
    target = null;
    keys.clear();
    boat.position.set(START.x, .17, START.z);
    boat.rotation.y = Math.PI / 2;
    world.group.visible = true;
    world.person.visible = false;
    world.setDifficulty(gift.difficulty);
    safe = {...START};
    $('game-status').hidden = false;
    $('sail-controls').hidden = false;
    lastHint = '';
  }

  $('journey-start').onclick = start;
  $('journey-rescue').onclick = () => {
    if (state.phase !== 'sailing') return;
    boat.position.set(safe.x, .17, safe.z);
    speed = 0;
    target = null;
    keys.clear();
    toast('已回到上一处安全水域，可以继续航行。');
  };

  $('journey-action').onclick = () => {
    if (canLand(state, boat.position)) {
      state.phase = 'landing';
      speed = 0;
      target = null;
      walking = 0;
      keys.clear();
      world.person.position.set(ARRIVAL.x, .62, 15.55);
      world.person.visible = true;
      $('sail-controls').hidden = true;
    } else if (state.phase === 'ashore') {
      showRoom();
    }
  };

  let joyThrottle = 0, joyTurn = 0;
  const wheel = $('steering-wheel');
  const knob = $('wheel-knob');
  if (wheel && knob) {
    let activePointerId = null;
    const maxRadius = 34;

    const updateKnob = (clientX, clientY) => {
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      joyTurn = -(dx / maxRadius);
      joyThrottle = -(dy / maxRadius);
    };

    const resetKnob = () => {
      activePointerId = null;
      joyThrottle = 0;
      joyTurn = 0;
      knob.style.transform = 'translate(0px, 0px)';
    };

    wheel.onpointerdown = e => {
      e.preventDefault();
      activePointerId = e.pointerId;
      wheel.setPointerCapture(e.pointerId);
      target = null;
      updateKnob(e.clientX, e.clientY);
    };

    wheel.onpointermove = e => {
      if (activePointerId === e.pointerId) {
        e.preventDefault();
        target = null;
        updateKnob(e.clientX, e.clientY);
      }
    };

    wheel.onpointerup = e => {
      if (activePointerId === e.pointerId) {
        e.preventDefault();
        try { wheel.releasePointerCapture(e.pointerId); } catch (_) {}
        resetKnob();
      }
    };

    wheel.onpointercancel = resetKnob;
    wheel.onlostpointercapture = resetKnob;
  }

  addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) target = null;
    if (e.code === 'Space') {
      speed = 0;
      target = null;
    }
  });

  const token = new URLSearchParams(location.search).get('gift');
  if (token !== null) {
    recipientMode = true;
    const navWrap = root.querySelector('.nav-menu-wrap') || root.querySelector('.gift-header nav');
    if (navWrap) navWrap.hidden = true;
    state.phase = 'loading';
    $('creator-intro').hidden = true;
    $('view-hint').hidden = true;
    $('gift-edit').hidden = true;
    $('room-preview').hidden = true;

    text('invitation-title', '正在打开你的邀请…');
    $('journey-start').disabled = true;
    $('invitation').showModal();
    $('invitation').addEventListener('cancel', e => e.preventDefault());

    (async () => {
      try {
        if (!/^[A-Za-z0-9_-]{32}$/.test(token)) throw new Error('邀请链接不完整，请向送礼的人确认。');
        const response = await fetch('/api/gifts?id=' + encodeURIComponent(token));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '邀请暂时无法读取。');
        gift = validateGift(data);
        state.phase = 'invitation';

        // 使用岛屿名字做主标题
        const islandTitle = gift.title || '留给你的一座岛';
        text('invitation-title', islandTitle);
        document.title = `${islandTitle} · 送给特别的你`;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = islandTitle;
        const twTitle = document.querySelector('meta[name="twitter:title"]');
        if (twTitle) twTitle.content = islandTitle;
        notifyTitleChange();

        text('invitation-greeting', gift.greeting);
        text('invitation-from', `来自 ${gift.sender} 的专属邀请`);
        text('invitation-level', DIFFICULTIES[gift.difficulty].name);
        $('journey-start').disabled = false;
      } catch (error) {
        text('invitation-title', '暂时无法打开这份邀请');
        text('invitation-error', error.message);
        $('journey-start').hidden = true;
        const retry = document.createElement('button');
        retry.className = 'secondary';
        retry.textContent = '重新加载';
        retry.onclick = () => location.reload();
        $('invitation').append(retry);
      }
    })();
  }

  fillForm();
  if (!recipientMode && new URLSearchParams(location.search).get('room') === 'preview') showRoom(true);
  $('window-debug').hidden = !new URLSearchParams(location.search).has('perf');

  function update(dt, t) {
    world.update(t, state, boat);
    if (state.phase === 'sailing') {
      const config = DIFFICULTIES[state.difficulty];
      let throttle = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + joyThrottle;
      let turn = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) + joyTurn;
      throttle = THREE.MathUtils.clamp(throttle, -1, 1);
      turn = THREE.MathUtils.clamp(turn, -1, 1);
      if (target) {
        const distance = Math.hypot(target.x - boat.position.x, target.z - boat.position.z);
        if (distance < .6) {
          target = null;
          speed = 0;
        } else {
          const angle = Math.atan2(target.x - boat.position.x, target.z - boat.position.z);
          const delta = Math.atan2(Math.sin(angle - boat.rotation.y), Math.cos(angle - boat.rotation.y));
          turn = THREE.MathUtils.clamp(delta * 2, -1, 1);
          throttle = Math.abs(delta) < .8 ? 1 : 0;
          if (Math.abs(delta) > .8) speed *= .90;
        }
      }
      speed = THREE.MathUtils.clamp(speed + throttle * dt * .48, -.18, .46);
      speed *= Math.pow(.983, dt * 60);
      steer = THREE.MathUtils.lerp(steer, turn, 1 - Math.exp(-9 * dt));
      boat.rotation.y += steer * dt * (1.15 + Math.abs(speed) * 2);
      const candidate = {
        x: boat.position.x + Math.sin(boat.rotation.y) * speed * dt * 12 + Math.sin(t * .4) * config.current * dt,
        z: boat.position.z + Math.cos(boat.rotation.y) * speed * dt * 12 + Math.cos(t * .31) * config.current * dt
      };
      if (candidate.x > -28.8 && canMove(boat.position, candidate)) {
        boat.position.x = candidate.x;
        boat.position.z = candidate.z;
      } else {
        speed = 0;
        if (target) {
          target = null;
          toast('前方是浅滩或码头，请绕到开阔水面。');
        }
      }
      const distToArrival = Math.hypot(boat.position.x - ARRIVAL.x, boat.position.z - ARRIVAL.z);
      if (distToArrival < 2.5 && state.checkpoint < config.checkpoints.length) {
        state.checkpoint = config.checkpoints.length;
        safe = {x: boat.position.x, z: boat.position.z};
        toast('已经找到小岛！驶向码头外侧，准备靠岸。');
      }
      if (canLand(state, boat.position)) {
        speed = 0;
        target = null;
      }
      const next = nextCheckpoint(state, boat.position);
      if (next !== state.checkpoint) {
        state.checkpoint = next;
        safe = {x: boat.position.x, z: boat.position.z};
        toast(next === config.checkpoints.length ? '已经找到小岛！驶向码头外侧，准备靠岸。' : `找到第 ${next} 座浮标，继续前行。`);
      }
      const destination = config.checkpoints[state.checkpoint] || [ARRIVAL.x, ARRIVAL.z];
      const dx = destination[0] - boat.position.x, dz = destination[1] - boat.position.z, distance = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz) - boat.rotation.y;
      const delta = Math.atan2(Math.sin(angle), Math.cos(angle));
      const direction = Math.abs(delta) < .3 ? '正前方' : delta > 0 ? '左转方向' : '右转方向';
      text('journey-stage', `${config.name} · ${state.checkpoint}/${config.checkpoints.length} 座浮标`);
      text('journey-title', canLand(state, boat.position) ? '你到了。小岛在等你。' : state.checkpoint === config.checkpoints.length ? '把船停在码头外侧' : '寻找下一座引航浮标');
      const hint = state.difficulty === 'hard' && distance > 10 ? `罗盘提示：${direction}，沿海面探索。` : `${direction} · 距离约 ${Math.ceil(distance)} 米。点击海面也能驾驶。`;
      if (hint !== lastHint) {
        text('journey-hint', hint);
        lastHint = hint;
      }
      $('journey-progress').style.setProperty('--progress', `${state.checkpoint / config.checkpoints.length * 100}%`);
      $('journey-action').hidden = !canLand(state, boat.position);
      text('journey-action', '靠岸登岛 →');
      $('journey-rescue').hidden = false;
    } else if (state.phase === 'landing') {
      walking = Math.min(1, walking + dt / 7);
      const p = world.person.position;
      p.z = THREE.MathUtils.lerp(15.55, 2.75, walking);
      p.y = p.z > 9.5 ? .62 : p.z > 4.2 ? .43 : THREE.MathUtils.lerp(.43, 1.04, Math.min(1, (4.2 - p.z) / 1.2));
      world.person.rotation.y = Math.PI;
      world.person.rotation.z = Math.sin(t * 9) * .035;
      text('journey-stage', '已经登岛');
      text('journey-title', '沿着石板路，走向小屋');
      text('journey-hint', '熟悉的回忆，就在门后。');
      $('journey-action').hidden = true;
      $('journey-rescue').hidden = true;
      if (walking === 1) {
        state.phase = 'ashore';
        world.person.rotation.z = 0;
      }
    } else if (state.phase === 'ashore') {
      text('journey-stage', '惊喜就在门后');
      text('journey-title', `${gift.recipient}，欢迎回家。`);
      text('journey-hint', '打开房门，看看 TA 为你准备了什么。');
      $('journey-action').hidden = false;
      text('journey-action', '推开房门 →');
      $('journey-rescue').hidden = true;
    }
  }

  notifyTitleChange();

  return {
    state,
    update,
    get islandTitle() { return getIslandTitle(); },
    updateSignTitle: notifyTitleChange,
    get speed() { return speed; },
    get steer() { return steer; },
    get isRoom() { return state.phase === 'room'; },
    clickRoom(event) {
      $('room-intro-hint').hidden = true;
      $('room-menu-panel').hidden = true;
      $('room-menu').setAttribute('aria-expanded', 'false');
      const hit = room.pick(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
      if (hit?.action === 'letter') openLetter();
      else if (hit && Number.isInteger(hit.slot)) {
        const entry = gift.photos.find(p => p.slot === hit.slot);
        if (entry) openPhoto(entry);
        else if (!recipientMode) toast('这个相框还空着，可以在「继续布置」中添加照片。');
      }
    },
    hoverRoom(event) {
      if (document.querySelector('dialog[open]')) {
        $('room-hotspot-hint').hidden = true;
        return false;
      }
      const hit = room.pick(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
      const label = hit?.action === 'letter' ? '打开桌上的信' : Number.isInteger(hit?.slot) ? '查看相框' : '';
      $('room-hotspot-hint').hidden = !label;
      if (label) text('room-hotspot-hint', label);
      return !!label;
    },
    dragRoom(dx, dy, pan) {
      $('room-intro-hint').hidden = true;
      $('room-hotspot-hint').hidden = true;
      if (pan) room.pan(dx, dy);
      else room.orbit(dx, dy);
    },
    zoomRoom(delta) {
      $('room-intro-hint').hidden = true;
      room.zoom(delta);
    },
    moveRoom(dt) {
      room.move(keys, dt);
    },
    renderRoom: (renderer, t) => {
      room.render(renderer, t);
      const stats = room.stats;
      if (!$('window-debug').hidden) {
        text('window-debug', `窗景 CPU ${stats.windowCpuMs.toFixed(2)} ms / GPU ${stats.windowGpuMs === null ? '不支持计时' : stats.windowGpuMs.toFixed(2) + ' ms'} / ${stats.windowCalls} 次绘制 / ${stats.windowTriangles} 三角形 / 更新 ${stats.windowRenders} 次`);
      }
    },
    get focus() {
      if (['sailing', 'invitation', 'loading'].includes(state.phase)) return new THREE.Vector3(boat.position.x, 0, boat.position.z);
      if (['landing', 'ashore'].includes(state.phase)) return world.person.position.clone();
      return new THREE.Vector3(12.3, 0, 1.8);
    },
    get zoom() {
      return ['landing', 'ashore'].includes(state.phase) ? 1.15 : .85;
    },
    clickWater(hit) {
      if (state.phase === 'sailing' && !document.querySelector('dialog[open]')) {
        if (Math.hypot(hit.x - ARRIVAL.x, hit.z - ARRIVAL.z) < 3.5) {
          target = {x: ARRIVAL.x, z: ARRIVAL.z};
        } else {
          target = {x: hit.x, z: hit.z};
        }
        return true;
      }
      return false;
    }
  };
}

