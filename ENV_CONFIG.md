# 🔐 环境变量配置指南

## 快速开始

### 1. 创建配置文件

```bash
cd sprite-gif-nextjs
cp env.example.txt .env.local
```

### 2. 编辑配置

打开 `.env.local` 文件，填入你的配置：

```env
# Dify API 配置
NEXT_PUBLIC_DIFY_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_DIFY_API_ENDPOINT=https://api.dify.ai/v1/chat-messages
```

### 3. 重启服务器

```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
npm run dev
```

## 配置说明

### NEXT_PUBLIC_DIFY_API_KEY

- **必需**: 是（除非在界面输入）
- **说明**: 你的 Dify API 密钥
- **获取方式**: 登录 [Dify 平台](https://dify.ai) 获取
- **示例**: `sk-xxxxxxxxxxxxxxxxxxxx`

### NEXT_PUBLIC_DIFY_API_ENDPOINT

- **必需**: 否
- **默认值**: `https://api.dify.ai/v1/chat-messages`
- **说明**: Dify API 端点地址
- **何时修改**: 
  - 使用私有部署的 Dify
  - 使用不同的 API 版本
  - 使用代理服务器

## 配置优先级

系统按以下优先级加载配置：

1. **环境变量** (.env.local)
   - 最高优先级
   - 推荐用于生产环境
   - API Key 不会显示在界面

2. **浏览器本地存储** (localStorage)
   - 用户在界面输入的配置
   - 自动保存
   - 仅在本地浏览器有效

3. **默认值**
   - API 端点的默认值

## 安全建议

### ✅ 推荐做法

1. **使用环境变量**
   ```bash
   # 添加到 .gitignore
   echo ".env.local" >> .gitignore
   ```

2. **不要提交敏感信息**
   - 永远不要将 `.env.local` 提交到 Git
   - 使用 `env.example.txt` 作为模板

3. **定期更换密钥**
   - 定期更换 API Key
   - 不同环境使用不同的密钥

### ❌ 避免做法

1. **不要在代码中硬编码**
   ```typescript
   // ❌ 不要这样做
   const apiKey = "sk-xxxxxxxxxxxxxxxxxxxx";
   ```

2. **不要在公共仓库暴露**
   - 检查 Git 历史
   - 使用 `git-secrets` 等工具

3. **不要在客户端日志中打印**
   ```typescript
   // ❌ 不要这样做
   console.log('API Key:', apiKey);
   ```

## 多环境配置

### 开发环境

```bash
# .env.local
NEXT_PUBLIC_DIFY_API_KEY=sk-dev-xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_DIFY_API_ENDPOINT=https://api-dev.dify.ai/v1/chat-messages
```

### 生产环境

```bash
# .env.production.local
NEXT_PUBLIC_DIFY_API_KEY=sk-prod-xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_DIFY_API_ENDPOINT=https://api.dify.ai/v1/chat-messages
```

## 故障排查

### 问题1: 环境变量不生效

**原因**: 环境变量更改后需要重启服务器

**解决**:
```bash
# 停止服务器 (Ctrl+C)
npm run dev
```

### 问题2: API Key 被界面输入覆盖

**原因**: 环境变量名称前缀必须是 `NEXT_PUBLIC_`

**解决**:
```env
# ❌ 错误
DIFY_API_KEY=sk-xxx

# ✅ 正确
NEXT_PUBLIC_DIFY_API_KEY=sk-xxx
```

### 问题3: 配置文件不生效

**原因**: 文件名错误或位置不对

**检查**:
```bash
# 确认文件存在
ls -la .env.local

# 确认在项目根目录
pwd
# 应该显示: /path/to/sprite-gif-nextjs
```

## 界面配置说明

如果不使用环境变量，可以在界面配置：

1. 打开网页 http://localhost:3000
2. 点击 "⚙️ API 配置"
3. 输入 API Key
4. 配置会自动保存在浏览器

**注意**: 
- 界面配置仅在当前浏览器有效
- 清除浏览器数据会丢失配置
- 换电脑需要重新配置

## 常见问题

### Q: 为什么环境变量名要以 NEXT_PUBLIC_ 开头？

A: Next.js 的安全机制。只有以 `NEXT_PUBLIC_` 开头的环境变量才会暴露给浏览器端代码。

### Q: 可以同时使用环境变量和界面配置吗？

A: 可以。环境变量优先级更高。如果设置了环境变量，界面的 API Key 输入框会被禁用。

### Q: 如何查看当前使用的配置？

A: 打开浏览器开发者工具（F12），在 Console 中输入：
```javascript
console.log({
  apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY ? '已设置' : '未设置',
  endpoint: process.env.NEXT_PUBLIC_DIFY_API_ENDPOINT
});
```

## 参考链接

- [Next.js 环境变量文档](https://nextjs.org/docs/basic-features/environment-variables)
- [Dify API 文档](https://docs.dify.ai)
- [.env 文件最佳实践](https://github.com/motdotla/dotenv#readme)

