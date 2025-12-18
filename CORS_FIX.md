# 🔧 CORS 问题修复说明

## 问题描述

用户遇到的错误：
```
❌ 生成失败: Failed to fetch
```

但后台日志显示生成成功了。

## 原因分析

这是一个典型的 **CORS（跨域资源共享）** 问题：

1. **浏览器安全策略**
   - 浏览器阻止前端 JavaScript 直接调用不同域名的 API
   - `api.dify.ai` 可能没有设置正确的 CORS 头

2. **表现症状**
   - 前端显示 "Failed to fetch"
   - 后端实际已经处理成功
   - 浏览器控制台可能显示 CORS 错误

## 解决方案

### ✅ 使用 Next.js API 路由代理

我们创建了两个 API 路由来代理 Dify API 请求：

```
/api/dify/upload    → 代理文件上传
/api/dify/generate  → 代理精灵图生成
```

**工作原理**：
```
浏览器 → Next.js API 路由 → Dify API
        (同域请求)      (服务器请求，无CORS限制)
```

### 📂 新增文件

1. **`app/api/dify/upload/route.ts`**
   - 代理文件上传请求
   - 转发到 `https://api.dify.ai/v1/files/upload`

2. **`app/api/dify/generate/route.ts`**
   - 代理工作流请求
   - 转发到配置的 API 端点

### 🔄 代码改动

**之前（直接调用）**：
```typescript
const response = await fetch('https://api.dify.ai/v1/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  },
  body: formData
});
```

**之后（通过代理）**：
```typescript
const response = await fetch('/api/dify/upload', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey  // 通过自定义 header 传递
  },
  body: formData
});
```

## 优势

### ✅ 解决 CORS 问题
- 浏览器到 Next.js 是同域请求
- Next.js 到 Dify 是服务器请求，无 CORS 限制

### ✅ 更安全
- API Key 只在服务器端和请求头中传递
- 减少客户端暴露

### ✅ 易于扩展
- 可以添加请求日志
- 可以添加缓存
- 可以添加请求限流
- 可以统一错误处理

### ✅ 支持环境变量
- API Key 可以在服务器端从环境变量读取
- 不需要在客户端传递（可选优化）

## API 路由详解

### 1. 上传文件 API

**路径**: `/api/dify/upload`

**请求**:
```typescript
POST /api/dify/upload
Headers:
  x-api-key: your-api-key
Body:
  FormData with file
```

**响应**:
```json
{
  "id": "file-id-here"
}
```

### 2. 生成精灵图 API

**路径**: `/api/dify/generate`

**请求**:
```typescript
POST /api/dify/generate
Headers:
  x-api-key: your-api-key
  x-api-endpoint: https://api.dify.ai/v1/chat-messages
  Content-Type: application/json
Body:
  {
    "query": "prompt",
    "inputs": { ... },
    ...
  }
```

**响应**:
```json
{
  "data": {
    "outputs": {
      "image_url": "https://..."
    }
  }
}
```

## 错误处理

### 1. API Key 缺失

```json
{
  "error": "API Key is required"
}
```

**状态码**: 401

### 2. Dify API 错误

API 路由会透传 Dify API 的错误响应：

```json
{
  "code": "invalid_param",
  "message": "..."
}
```

### 3. 网络错误

```json
{
  "error": "Upload failed"
}
```

**状态码**: 500

## 测试验证

### 1. 检查 API 路由

在浏览器控制台：

```javascript
// 测试上传 API
fetch('/api/dify/upload', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-key'
  }
}).then(r => console.log(r.status));

// 应该返回 200 或 400，而不是 CORS 错误
```

### 2. 检查网络请求

打开开发者工具 → Network：

**修复前**:
- 看到 `api.dify.ai` 请求，状态可能是 `(failed)` 或 CORS error

**修复后**:
- 看到 `/api/dify/upload` 和 `/api/dify/generate` 请求
- 状态应该是 `200` 或其他明确的 HTTP 状态码

### 3. 查看控制台

**修复前**:
```
Access to fetch at 'https://api.dify.ai/v1/files/upload' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**修复后**:
- 应该没有 CORS 相关错误
- 只有正常的请求日志

## 进一步优化

### 1. 服务器端使用环境变量

可以将 API Key 完全放在服务器端：

```typescript
// app/api/dify/upload/route.ts
export async function POST(request: NextRequest) {
  // 优先使用服务器环境变量
  const apiKey = process.env.DIFY_API_KEY || 
                 request.headers.get('x-api-key');
  // ...
}
```

**环境变量**:
```env
# .env.local
DIFY_API_KEY=sk-xxx  # 服务器端使用，不需要 NEXT_PUBLIC_ 前缀
NEXT_PUBLIC_DIFY_API_KEY=  # 可以留空
```

### 2. 添加请求日志

```typescript
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // ... 处理请求
  
  const duration = Date.now() - startTime;
  console.log(`Upload completed in ${duration}ms`);
}
```

### 3. 添加缓存

对于相同的请求，可以缓存结果：

```typescript
const cache = new Map();

export async function POST(request: NextRequest) {
  const cacheKey = await generateCacheKey(request);
  
  if (cache.has(cacheKey)) {
    return NextResponse.json(cache.get(cacheKey));
  }
  
  // ... 处理请求并缓存
}
```

### 4. 添加速率限制

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 最多100个请求
});
```

## 部署注意事项

### Vercel 部署

API 路由会自动部署为 Serverless Functions，无需额外配置。

### 环境变量

确保在部署平台设置环境变量：
```
DIFY_API_KEY=your-production-key
```

### 域名配置

如果使用自定义域名，确保：
- API 路由和前端在同一域名下
- 不需要额外的 CORS 配置

## 总结

✅ **问题已修复**
- 使用 Next.js API 路由代理
- 完全避免 CORS 问题

✅ **架构更优**
- 前后端分离清晰
- 更安全的 API Key 管理
- 易于扩展和维护

✅ **用户体验**
- 不再出现 "Failed to fetch" 错误
- 请求更稳定可靠
- 错误信息更明确

现在重新启动开发服务器，问题应该已经解决！🎉

