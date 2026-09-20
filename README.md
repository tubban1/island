<div align="center">

# 🏝️ The Atoll · 岛屿与回忆

<p align="center">
  <strong>「 把回忆藏进一座岛，只等一个人抵达。」</strong><br>
  <em>Hide your memories inside a sun-drenched 3D island, waiting for someone special to arrive.</em>
</p>

<p align="center">
  <a href="https://island.fde.fan" target="_blank">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-island.fde.fan-22675c?style=for-the-badge&logoColor=white" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Three.js-r128-orange?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/WebGL-3D_Interactive-blue?style=for-the-badge&logo=webgl&logoColor=white" alt="WebGL" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge" alt="License" />
</p>

<br>

<p align="center">
  <img src="docs/images/harbour.png" alt="The Atoll Harbour & Pier" width="92%" style="border-radius: 12px; box-shadow: 0 16px 40px rgba(0,71,69,0.25);" />
</p>

</div>

---

## 🌊 遇见一座岛 · About

> 每一座岛，都是一段不曾褪色的时光。<br>
> 你可以在这里布置专属的照片与信笺，刻下属于你们的岛屿名字；<br>
> 生成一份远航邀请函，让 TA 穿过蔚蓝海浪与斑斓鱼群，登岛走进小屋，亲手开启这份心意。

**The Atoll** 是一个基于 **Three.js** 和 **WebGL** 打造的高保真 3D 交互式海岛礼物空间。它融合了水体物理渲染、鱼群生态算法、第一人称 360° 全景漫步以及完整的「布置－邀请－启航－登岛－拆礼」浪漫体验。

<br>

<div align="center">

| ⛵ 远航启程 · 碧海波光 | 🏝️ 环礁全貌 · 梦幻浅滩 |
| :---: | :---: |
| <img src="docs/images/sailing.png" width="100%" alt="Sailing Boat" style="border-radius: 8px;" /> | <img src="docs/images/island.png" width="100%" alt="Atoll Island" style="border-radius: 8px;" /> |

</div>

---

## ✨ 亮点特性 · Highlights

### 1. 🌊 次世代 WebGL 逼真海洋与生态
- **深度光线吸收与焦散**：随着海水深度渐变的多层吸光效果，阳光透过水面在珊瑚沙床投下灵动的动态焦散光斑（Caustics）。
- **生机勃勃的海底世界**：珊瑚花园之间穿梭着 4 种形态各异的热带鱼群（共 96 条基于 InstancedMesh 的群游鱼类），支持靠近散开、航行跟随与点击水面聚拢。
- **沙滩与海岸动态**：浅滩处裸露的细腻沙纹、贝壳与爬行小蟹，随风摇曳的棕榈树与热带花丛。

### 2. 🪵 码头招牌与个性化岛屿
- **个性化岛屿命名**：支持为岛屿自定义名字，沙滩木质招牌实时动态雕刻呈现。
- **大字双行智能排版**：无论长短均以最高对比度与饱满字体呈现，不受逆光影响，海风轻拂微微摇晃。
- **专属远航邀请函**：以岛屿之名生成专属分享主标题与元数据，仪式感满满。

### 3. 🏡 第一人称 360° 沉浸式木屋
- **全封闭温馨实木小屋**：告别传统的外部模型俯视感，以 1.62m 真实人眼视角与 72° 沉浸广角置身室内。
- **自由探索与交互**：
  - 支持 `W / A / S / D` 室内漫步，配合柔和墙体边界碰撞；
  - 拖拽屏幕 360° 环顾四周，欣赏茶几上的信笺、墙壁挂画与吊灯微光；
  - 动态舷窗实时倒映窗外波光粼粼的无垠海景。

### 4. 🎁 浪漫心意传递流程
1. **布置回忆**：上传珍藏照片，装入木屋各个独立相框，附上温暖留言与亲笔信笺；
2. **邀请远航**：选择航海难度（平静内湾 / 晴朗微风 / 挑战海峡），一键生成专属航行邀请；
3. **破浪抵达**：收信人执舵驾驶木舟，顺着浮标驶向海岛，鸣笛靠岸；
4. **进屋揭晓**：漫步上岛，推门入室，在悠扬乐声中揭开每一张回忆相片与来信。

---

## 🎮 操作指南 · Controls

| 场景 | 操作方式 | 功能说明 |
| :--- | :--- | :--- |
| **海面航行** | `W / A / S / D` 或 `方向键` | 控制帆船前进、后退与转向 |
| | `Space` 空格键 | 紧急停船减速 |
| | 点击海面任意位置 | 自动驶向目标水域；吸引附近鱼群聚拢 |
| | 移动端虚拟方向盘 | 触屏一键无障碍驾驶 |
| **海岛俯瞰** | 鼠标左键拖拽 / 触屏滑动 | 360° 旋转观察岛屿与海浪 |
| | 鼠标滚轮 / 双指缩放 | 远近视角拉近与拉远 |
| **室内全景** | 鼠标拖拽 / 触屏滑动 | 360° 自由转头环顾室内四周 |
| | `W / A / S / D` | 在木屋室内自由漫步 |
| | 点击相框 / 信封 | 查看照片大图特写与信件全文 |

---

## 🛠️ 技术栈 · Tech Stack

- **核心渲染**：[Three.js](https://threejs.org/) (WebGL / GLTF / InstancedMesh / Custom Shader / RenderTarget)
- **前端构建**：[Vite](https://vitejs.dev/) · 原生现代 ES Modules · CSS3 磨砂玻璃（Frosted Glass）
- **资产管线**：Python · NumPy · Trimesh（程序化模型与地形生成）
- **数据持久化**：Supabase Postgres (JSONB 邀请存储) · Vercel Serverless Function
- **音频交互**：Web Audio API · MIDI 合成引擎

---

## 🚀 快速开始 · Quick Start

### 1. 克隆与安装

```bash
git clone https://github.com/tubban1/island.git
cd island
npm install
```

### 2. 本地开发

```bash
# 启动本地开发服务器
npm run dev

# 访问本地体验地址：http://127.0.0.1:5173
```

### 3. 构建与部署

```bash
# 运行单元测试
npm test

# 生产环境打包
npm run build

# 本地启动生产包预览
npm start
```

---

## 📁 目录结构 · Project Structure

```text
├── api/                    # Vercel Serverless Functions (礼物存储/反馈接口)
├── docs/                   # 视觉参考设计与文档截图
│   └── images/             # README 与展示用高保真图集
├── public/                 # 静态资源 (GLB 模型、Favicon、WebManifest)
├── src/
│   ├── gift-game.js        # 礼物流程主控制器 (创建、布置、邀请、交互)
│   ├── main.js             # 3D 场景引擎 (海洋着色器、鱼群算法、船只物理)
│   ├── memory-room.js      # 第一人称 360° 小屋全景与舷窗渲染管线
│   ├── gift.css            # 现代毛玻璃 UI 样式体系
│   └── gift-schema.js      # 礼物数据协议与校验逻辑
├── generate_assets.py      # 程序化模型生成脚本 (NumPy/Trimesh)
└── package.json
```

---

## 🌟 体验地址 · Live Demo

在线体验：👉 **[island.fde.fan](https://island.fde.fan)**

> *“愿你穿过海浪，找到属于你的岛屿。”*

---

<div align="center">
  <sub>Made with ❤️ and Three.js · Copyright © 2026 The Atoll Project</sub>
</div>
