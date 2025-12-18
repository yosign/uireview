'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export default function GenerateAvatar() {
  const router = useRouter();
  const [spriteUrl, setSpriteUrl] = useState('');
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLCanvasElement | null>(null);
  
  const [scale, setScale] = useState(100);
  const [transparentMode, setTransparentMode] = useState('none'); // none, white, black
  const [gifText, setGifText] = useState(''); // 头像文字
  const [showStroke, setShowStroke] = useState(true); // 是否显示描边
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  const GRID_SIZE = 2;
  const TOTAL_FRAMES = 4;

  // 加载头像拆分逻辑
  const avatarCanvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);

  // 加载头像源图
  useEffect(() => {
    const url = sessionStorage.getItem('sprite_image_url');
    if (!url) {
      setStatus('未找到源图片，请先完成步骤1');
      return;
    }
    setSpriteUrl(url);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setStatus('图片加载成功');
    };
    img.onerror = () => {
      setStatus('图片加载失败');
    };
    img.src = url;
  }, []);

  // 处理图片背景 (抠图逻辑)
  useEffect(() => {
    if (!originalImage) return;

    const processImage = () => {
      const canvas = document.createElement('canvas');
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(originalImage, 0, 0);

      if (transparentMode !== 'none') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const threshold = 30; // 容差值

        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const isMatch = (index: number) => {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          if (transparentMode === 'white') {
            return r > 255 - threshold && g > 255 - threshold && b > 255 - threshold;
          } else { // black
            return r < threshold && g < threshold && b < threshold;
          }
        };

        for (let x = 0; x < width; x++) {
          let idx = (0 * width + x) * 4;
          if (isMatch(idx)) {
            queue.push(0 * width + x);
            visited[0 * width + x] = 1;
          }
          idx = ((height - 1) * width + x) * 4;
          if (isMatch(idx)) {
            queue.push((height - 1) * width + x);
            visited[(height - 1) * width + x] = 1;
          }
        }
        for (let y = 0; y < height; y++) {
          let idx = (y * width + 0) * 4;
          if (isMatch(idx)) {
            if (!visited[y * width + 0]) {
              queue.push(y * width + 0);
              visited[y * width + 0] = 1;
            }
          }
          idx = (y * width + (width - 1)) * 4;
          if (isMatch(idx)) {
            if (!visited[y * width + (width - 1)]) {
              queue.push(y * width + (width - 1));
              visited[y * width + (width - 1)] = 1;
            }
          }
        }

        let head = 0;
        while (head < queue.length) {
          const pixelIndex = queue[head++];
          const x = pixelIndex % width;
          const y = Math.floor(pixelIndex / width);
          
          const idx = pixelIndex * 4;
          data[idx + 3] = 0;

          const neighbors = [
            { nx: x - 1, ny: y },
            { nx: x + 1, ny: y },
            { nx: x, ny: y - 1 },
            { nx: x, ny: y + 1 }
          ];

          for (const { nx, ny } of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nPixelIndex = ny * width + nx;
              if (!visited[nPixelIndex]) {
                const nIdx = nPixelIndex * 4;
                if (isMatch(nIdx)) {
                  visited[nPixelIndex] = 1;
                  queue.push(nPixelIndex);
                }
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
      }

      setProcessedImage(canvas);
    };

    processImage();
  }, [originalImage, transparentMode]);

  // 初始化并绘制所有头像
  useEffect(() => {
    if (!processedImage) return;
    
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      drawAvatar(i);
    }
  }, [processedImage, scale, gifText, showStroke]);

  // 绘制单个头像到对应画布
  const drawAvatar = (index: number) => {
    const canvas = avatarCanvasesRef.current[index];
    if (!processedImage || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const frameWidth = processedImage.width / GRID_SIZE;
    const frameHeight = processedImage.height / GRID_SIZE;
    
    canvas.width = frameWidth * (scale / 100);
    canvas.height = frameHeight * (scale / 100);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    
    ctx.drawImage(
      processedImage,
      col * frameWidth,
      row * frameHeight,
      frameWidth,
      frameHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // 绘制文字
    if (gifText) {
      const fontSize = Math.floor(canvas.height / 8);
      ctx.font = `${fontSize}px "ChillBitmap", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      const x = canvas.width / 2;
      const y = canvas.height - (canvas.height / 16);

      if (showStroke) {
        ctx.fillStyle = 'white';
        const baseOffset = Math.max(1, Math.floor(scale / 40));
        const actualStrokeWidth = baseOffset * 4;
        
        const offsets = [];
        for (let ox = -actualStrokeWidth; ox <= actualStrokeWidth; ox++) {
          for (let oy = -actualStrokeWidth; oy <= actualStrokeWidth; oy++) {
            if (ox !== 0 || oy !== 0) {
              offsets.push([ox, oy]);
            }
          }
        }

        offsets.forEach(([ox, oy]) => {
          ctx.fillText(gifText, x + ox, y + oy);
        });
      }

      ctx.fillStyle = 'black';
      ctx.fillText(gifText, x, y);
    }
  };

  // 保存所有头像图片
  const handleDownloadAll = async () => {
    if (!processedImage) return;
    setLoading(true);
    setStatus('正在准备下载...');

    try {
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const canvas = avatarCanvasesRef.current[i];
        if (canvas) {
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = url;
          link.download = `avatar-${i + 1}-${Date.now()}.png`;
          link.click();
        }
      }
      setStatus('头像保存成功');
    } catch (error) {
      console.error('保存头像失败:', error);
      setStatus('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border border-gray-100 shadow-sm rounded-xl bg-white overflow-hidden">
        {/* 精致的头部 */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h1 className="text-xl font-bold text-gray-900">生成结果</h1>
            <p className="text-sm text-gray-500 mt-1">预览并保存你的手绘头像</p>
          </div>
        </div>

        <CardContent className="p-8 space-y-8 bg-white">
          {/* 预览网格 */}
          <div className="flex justify-center">
            <div className="relative group w-full">
              <div className="relative p-2 grid grid-cols-2 gap-4 min-h-[300px]">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <canvas
                      ref={(el) => { avatarCanvasesRef.current[i] = el; }}
                      className="rounded-lg"
                      style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
                    />
                    <span className="text-[10px] text-gray-400 font-mono">Avatar {i + 1}</span>
                  </div>
                ))}
                {!processedImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-400 font-medium">正在加载你的头像...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="h-11 flex-1 rounded-lg text-base font-medium border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              重新制作
            </Button>
          </div>

          {/* 参数控制 */}
          <div className="grid grid-cols-1 gap-6 bg-gray-50/80 rounded-xl p-6 border border-gray-100">
            {/* 文字添加 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">添加文字</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-stroke" className="text-xs text-gray-500 cursor-pointer">描边</Label>
                  <Switch
                    id="show-stroke"
                    checked={showStroke}
                    onCheckedChange={setShowStroke}
                    className="scale-75"
                  />
                </div>
              </div>
              <Input
                value={gifText}
                onChange={(e) => setGifText(e.target.value)}
                placeholder="输入文字..."
                className="bg-white border-gray-200"
              />
            </div>
          </div>

          {/* 状态显示 */}
          {status && (
            <div className={`py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-1 border ${
              status.includes('失败') ? 'bg-red-50 text-red-700 border-red-100' :
              status.includes('成功') ? 'bg-green-50 text-green-700 border-green-100' :
              'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
              {(status.includes('正在') || status.includes('加载')) && !status.includes('成功') && (
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"/>
              )}
              {status}
            </div>
          )}

          {/* 底部操作栏 */}
          <div className="pt-2">
            <Button
              onClick={handleDownloadAll}
              disabled={loading || !processedImage}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-lg h-12 text-lg font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:shadow-none"
              size="lg"
            >
              {loading ? '正在保存...' : '下载所有头像'}
            </Button>
            <p className="text-center text-xs text-gray-400 mt-4">
              提示：生成的头像将作为独立的 PNG 文件下载到您的设备
            </p>
          </div>

        </CardContent>
      </Card>
    </main>
  );
}
