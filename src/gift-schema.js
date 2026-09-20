export const DIFFICULTIES = {
 easy: {name:'轻松赴约', description:'两座引航浮标，始终显示方向，平静海面。', checkpoints:[[-14,21],[6,22]], current:0},
 medium: {name:'循迹寻岛', description:'三座引航浮标，靠近才亮起，带一点海流。', checkpoints:[[-18,15],[-7,21],[6,22]], current:.16},
 hard: {name:'远航冒险', description:'四座引航浮标，循罗盘探索，海流更明显。', checkpoints:[[-21,8],[-12,12],[-5,22],[7,22]], current:.38}
};
export const START={x:-27,z:20};
export const ARRIVAL={x:15.05,z:18.8};
export const FRAME_POSITIONS=['阅读角 · 上方','阅读角 · 旁侧','沙发墙 · 左侧','沙发墙 · 中间','沙发墙 · 右侧','窗边矮柜'];
export function validateGift(input){
 if(!input || typeof input!=='object')throw new Error('请填写小岛邀请。');
 const text=(name,max,required=false)=>{
  const value=input[name];
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error(`请检查${{recipient:'收礼人',sender:'送礼人',title:'小岛名字',letter:'信件',occasion:'纪念日',greeting:'欢迎语'}[name]}。`);
  return value.trim();
 };
 const gift={version:1,recipient:text('recipient',40,true),sender:text('sender',40,true),title:text('title',20,true),greeting:text('greeting',180),letter:text('letter',4000,true),occasion:text('occasion',60)};
 gift.difficulty=input.difficulty;
 gift.theme=input.theme==='sea'?'sea':'warm';
 const validMusics=['music_box','sea_breeze','canon','starry','none'];
 gift.music=validMusics.includes(input.music)?input.music:'music_box';
 if(!Array.isArray(input.photos)||input.photos.length>6)throw new Error('最多布置 6 张照片。');
 const slots=new Set();
 gift.photos=input.photos.map(photo=>{
  if(!photo||typeof photo.caption!=='string'||photo.caption.length>160||!Number.isInteger(photo.slot)||photo.slot<0||photo.slot>5||slots.has(photo.slot))throw new Error('照片位置或描述不正确。');
  slots.add(photo.slot);
  if(typeof photo.src!=='string'||photo.src.length>260000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(photo.src))throw new Error('照片需要压缩到 200 KB 以内，请重新选择照片。');
  return {slot:photo.slot,src:photo.src,caption:photo.caption.trim()};
 });
 return gift;
}
export function nextCheckpoint(state,position){
 const points=DIFFICULTIES[state.difficulty].checkpoints;
 if(state.checkpoint<points.length){const [x,z]=points[state.checkpoint];if(Math.hypot(position.x-x,position.z-z)<2.8)return state.checkpoint+1;}
 return state.checkpoint;
}
export function canLand(state,position){
 return state.phase==='sailing'&&state.checkpoint===DIFFICULTIES[state.difficulty].checkpoints.length&&Math.hypot(position.x-ARRIVAL.x,position.z-ARRIVAL.z)<2.5;
}
