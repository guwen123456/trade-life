# 外贸人生

从一封开发信，到一纸提单。一款从 SOHO 起步的外贸经营模拟游戏：2018 年 3 月，你二十四岁，选一座城、选一种出身，挂上工牌——汇率、疫情、缺箱和客户的已读不回，都会来。进度自动保存在浏览器本地。

## 在线试玩

**https://guwen123456.github.io/trade-life/**

打开就能玩，不用注册。点一下页面后会有港口环境底噪，右上角可以关掉音乐。

## 如何运行

需要 Node.js 18+。

```bash
npm install     # 安装依赖
npm run dev     # 本地开发（默认 http://localhost:5173）
npm run build   # 生产构建，产物在 dist/
npm run preview # 预览生产构建
npm run typecheck # 类型检查
```

## 技术栈

- React 19 + TypeScript + Vite 6
- TanStack Router（文件路由，hash history，方便静态子路径部署）
- Tailwind CSS v4
- Recharts（净资产曲线）、Lucide（图标）
- 游戏状态纯前端计算，存档在 localStorage（含备份槽）

## 代码结构

- `src/game/engine.ts` — 每月结算、订单、压力和结局
- `src/game/content.ts` — 城市、品类、市场和 2018 年起的行情
- `src/game/types.ts` — 游戏状态与订单等类型定义
- `src/game/save.ts` — 本地存档读写
- `src/game/ambience.ts` — 背景音乐（WebAudio 合成的港口底噪）
- `src/components/trade/TradeApp.tsx` — 界面
- `src/routes/` — TanStack Router 文件路由（`__root.tsx` + `index.tsx`）
- `public/harbor.jpg`、`public/desk.jpg` — 封面和工位

## 部署

`master` 是源码；生产构建产物发布在 `gh-pages` 分支，由 GitHub Pages 提供服务。构建时 Vite 的 `base` 为 `/trade-life/`，与 Pages 的仓库子路径对应。
