# 🚀 Next.js + Shadcn UI 迁移指南

## 第一步：初始化项目

```bash
cd /Users/yosign/Library/CloudStorage/Dropbox/Github/Gif/sprite-gif-nextjs
npm install
```

## 第二步：安装 Shadcn UI

```bash
npx shadcn-ui@latest init
```

选择配置：
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes

## 第三步：添加 Shadcn 组件

```bash
npx shadcn-ui@latest add button card input label select textarea toast
```

## 第四步：复制 GIF 编码库

将原项目中的 `gifenc.js` 库内容复制到 `lib/gif-encoder.ts`

## 完整文件清单

我已经创建了以下文件：
- ✅ package.json
- ✅ tsconfig.json
- ✅ tailwind.config.ts
- ✅ next.config.mjs
- ✅ postcss.config.mjs
- ✅ app/globals.css
- ✅ app/layout.tsx
- ✅ lib/utils.ts
- ✅ README.md

还需要创建：
1. `app/page.tsx` - 步骤1页面
2. `app/generate-gif/page.tsx` - 步骤2页面
3. `lib/dify-api.ts` - API 调用
4. `lib/gif-encoder.ts` - GIF 编码

由于篇幅限制，我提供简化指南和关键代码结构。

## 关键代码结构

### 1. Dify API 调用 (lib/dify-api.ts)

```typescript
export async function uploadFile(file: File, apiKey: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', 'user-' + Date.now());

  const response = await fetch('https://api.dify.ai/v1/files/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData
  });

  if (!response.ok) throw new Error('上传失败');
  return (await response.json()).id;
}

export async function generateSprite(params) {
  // 使用之前验证成功的请求格式
}
```

### 2. 步骤1页面 (app/page.tsx)

使用 Shadcn 组件：
- Card - 容器
- Input - API Key 输入
- Select - 尺寸/风格选择
- Textarea - 提示词输入
- Button - 操作按钮
- Toast - 通知提示

### 3. GIF 生成页面 (app/generate-gif/page.tsx)

- Canvas 预览
- Slider 控制帧率/缩放
- 生成和下载按钮

## 完整代码仓库

如果需要完整的代码实现，请告诉我，我可以：
1. 创建完整的页面组件
2. 实现所有功能
3. 添加类型定义
4. 优化用户体验

需要我继续完成吗？

