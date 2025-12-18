# 🎨 Sprite GIF Generator - Next.js版

使用 Next.js 14 + Shadcn UI + TypeScript 重构的精灵图动画生成器

## 📦 技术栈

- **框架**: Next.js 14 (App Router)
- **UI组件**: Shadcn UI
- **样式**: Tailwind CSS
- **语言**: TypeScript
- **图标**: Lucide React

## 🚀 快速开始

### 1. 安装依赖

```bash
cd sprite-gif-nextjs
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 📁 项目结构

```
sprite-gif-nextjs/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx             # 主页（步骤1：生成精灵图）
│   ├── generate-gif/
│   │   └── page.tsx         # 步骤2：制作GIF
│   └── globals.css          # 全局样式
├── components/
│   ├── ui/                  # Shadcn UI 组件
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── card.tsx
│   │   └── toast.tsx
│   ├── sprite-generator.tsx # 精灵图生成组件
│   └── gif-converter.tsx    # GIF转换组件
├── lib/
│   ├── utils.ts             # 工具函数
│   ├── dify-api.ts          # Dify API 调用
│   └── gif-encoder.ts       # GIF 编码器（嵌入gifenc）
├── public/                  # 静态资源
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## 🎯 功能特性

### 步骤1：生成精灵图
- ✅ 使用 Shadcn UI 组件构建
- ✅ 拖拽上传图片
- ✅ API 配置管理（localStorage）
- ✅ 调用 Dify API 生成精灵图
- ✅ 实时状态反馈
- ✅ 错误处理和提示

### 步骤2：制作GIF动画
- ✅ 自动加载精灵图
- ✅ 实时预览动画
- ✅ 可调节帧率和缩放
- ✅ 生成并下载GIF
- ✅ 完全客户端处理

## 📝 Shadcn UI 组件安装

需要安装以下 Shadcn 组件：

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add toast
```

## 🔧 CORS 问题解决方案

本项目使用 **Next.js API 路由代理** 来避免 CORS 跨域问题：

```
浏览器 → /api/dify/* → Dify API
        (同域请求)   (服务器请求，无CORS限制)
```

**API 路由**：
- `/api/dify/upload` - 代理文件上传
- `/api/dify/generate` - 代理精灵图生成

详细说明请查看 [CORS_FIX.md](./CORS_FIX.md)

## 🔧 环境变量配置

### 方式1: 使用环境变量（推荐用于生产环境）

1. 复制示例文件：
```bash
cp env.example.txt .env.local
```

2. 编辑 `.env.local` 文件，填入你的配置：
```env
# Dify API 配置
NEXT_PUBLIC_DIFY_API_KEY=your-api-key-here
NEXT_PUBLIC_DIFY_API_ENDPOINT=https://api.dify.ai/v1/chat-messages
```

3. 重启开发服务器生效

**优点**：
- ✅ 配置集中管理
- ✅ 适合团队协作
- ✅ API Key 不会暴露在界面
- ✅ 支持多环境配置

### 方式2: 在界面输入（适合个人使用）

如果没有设置环境变量，可以直接在网页界面输入 API Key：
- 点击 "⚙️ API 配置" 展开配置区
- 输入 API Key 和端点
- 配置会自动保存在浏览器本地

**优先级**：环境变量 > 浏览器本地存储

## 💻 开发说明

### API 调用

所有 Dify API 调用都在 `lib/dify-api.ts` 中封装：

- `uploadFile()` - 上传文件
- `generateSprite()` - 生成精灵图
- API 配置存储在 localStorage

### GIF 生成

GIF 生成使用内嵌的 `gifenc` 库：
- 完全客户端处理
- 支持进度显示
- 可调节质量和尺寸

## 🎨 样式设计

- 简洁的白色主题
- 遵循现代设计规范
- 响应式布局
- 流畅的交互动画

## 📖 使用流程

1. **配置 API**
   - 输入 Dify API Key
   - 自动保存配置

2. **生成精灵图**
   - 上传原始图片
   - 填写提示词
   - 选择风格和尺寸
   - 生成精灵图

3. **制作动画**
   - 自动加载精灵图
   - 调整参数预览
   - 生成并下载GIF

## 🔨 构建生产版本

```bash
npm run build
npm start
```

## 📄 许可证

MIT License

