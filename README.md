# 外贸人生

这是游戏源码，方便在桌面版直接打开。

- `src/game/engine.ts` 每月结算、订单、压力和结局
- `src/game/content.ts` 城市、品类、市场和 2018 年起的行情
- `src/game/ambience.ts` 背景音乐
- `src/components/trade/TradeApp.tsx` 界面
- `public/harbor.jpg`、`public/desk.jpg` 封面和工位

游戏逻辑和界面在 `src/`。本地试玩：

```bash
npm install
npm run dev
```

`src/routes/index.tsx` 仍是给 TanStack Router 宿主用的入口。这个 Vite 壳直接渲染 `TradeApp`，不替换原来的引擎。
