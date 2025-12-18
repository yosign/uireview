# 🚀 快速开始

## 1. 配置 API Key

```bash
# 复制配置文件
cp env.example.txt .env.local

# 编辑 .env.local，填入你的 Dify API Key
NEXT_PUBLIC_DIFY_API_KEY=your-api-key-here
```

## 2. 安装并启动

```bash
npm install
npm run dev
```

## 3. 使用

访问 http://localhost:3000

### 步骤1: 生成精灵图
1. 上传图片
2. 描述动作（例如：跑步、跳跃、挥手）
3. 点击生成

### 步骤2: 制作GIF
1. 预览动画
2. 调整参数（帧率、缩放）
3. 生成并下载

## 📝 动作描述示例

- 跑步
- 跳跃
- 挥手
- 攻击
- 转身
- 蹲下
- 飞行
- 旋转

越简洁具体，效果越好！

## ⚠️ 注意事项

- API Key 必须在 .env.local 中配置
- 风格和尺寸由服务器控制
- 生成时间约 10-30 秒

