'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Home() {
  const router = useRouter();
  // 从环境变量读取配置
  const apiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';
  const apiEndpoint = process.env.NEXT_PUBLIC_DIFY_API_ENDPOINT || 'https://api.dify.ai/v1/chat-messages';
  
  // 调试:在组件加载时打印环境变量(仅开发环境)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('API Key 检测:', apiKey ? `已配置 (前缀: ${apiKey.substring(0, 6)}...)` : '未配置');
    console.log('API Endpoint:', apiEndpoint);
  }
  
  const [file, setFile] = useState<File | null>(null);
  const [cachedFileId, setCachedFileId] = useState<string | null>(null); // 新增：缓存的文件 ID
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(0);

  // 页面加载时恢复状态
  useEffect(() => {
    // 确保在客户端环境中执行
    if (typeof window === 'undefined') return;
    
    try {
      const savedPrompt = sessionStorage.getItem('sprite_prompt');
      const savedPreviewUrl = sessionStorage.getItem('sprite_preview_url');
      const savedFileId = sessionStorage.getItem('sprite_file_id');

      console.log('恢复状态:', { savedPrompt, hasPreview: !!savedPreviewUrl, savedFileId });

      if (savedPrompt) setPrompt(savedPrompt);
      if (savedPreviewUrl) {
        setPreviewUrl(savedPreviewUrl);
        // 如果有预览图，说明之前上传过文件，设置状态提示用户
        setStatus('已恢复上次上传的图片和设置，可直接生成或重新上传');
      }
      if (savedFileId) setCachedFileId(savedFileId);
    } catch (error) {
      console.error('恢复状态失败:', error);
    }
  }, []);


  // 监听粘贴事件
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // 如果正在加载或者在输入框中粘贴，不处理（除非在输入框中也想支持粘贴图片，但通常输入框是粘贴文字）
      // 这里我们允许全局粘贴，但如果有 input focus 且粘贴的是纯文本，浏览器默认行为会处理
      // 我们主要关心的是粘贴板里的 items 是否包含图片
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            // 复用校验逻辑
            if (blob.size > 4 * 1024 * 1024) {
              alert('粘贴的文件大小不能超过 4MB');
              return;
            }
            
            // 设置文件
            setFile(blob);
            setCachedFileId(null); // 新文件粘贴了，清除之前的 fileId 缓存
            
            // 清除旧的预览图
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('sprite_preview_url');
            }
            
            try {
              // 创建压缩后的预览图
              const compressedPreview = await compressImageForPreview(blob);
              setPreviewUrl(compressedPreview);
              console.log('粘贴图片已压缩');
            } catch (error) {
              console.error('粘贴图片压缩失败:', error);
              // 如果压缩失败，使用原始图片
              const reader = new FileReader();
              reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
              };
              reader.readAsDataURL(blob);
            }
            
            // 阻止默认粘贴行为（防止图片被粘贴到输入框等地方）
            e.preventDefault();
            return; // 只处理第一张图片
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);


  // 模拟进度条
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setProgress(0);
      // 预估40s，我们设定一个分段进度
      // 0-5s: 0-20%
      // 5-20s: 20-60%
      // 20-35s: 60-90%
      // 35s+: 90-95%
      
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000; // 秒
        
        setProgress(prev => {
           let target = prev;
           let speed = 0;
           
           if (elapsed < 5) {
             target = 20;
             speed = 0.5; // 每100ms增加
           } else if (elapsed < 20) {
             target = 60;
             speed = 0.3;
           } else if (elapsed < 35) {
             target = 90;
             speed = 0.2;
           } else {
             target = 95;
             speed = 0.05;
           }
           
           if (prev >= target) return prev;
           // 增加随机波动
           return Math.min(prev + speed + Math.random() * 0.1, target);
        });
        
      }, 100);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading]);


  // 压缩图片用于预览（减少 sessionStorage 占用）
  const compressImageForPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 创建 canvas 进行压缩
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 canvas context'));
            return;
          }
          
          // 计算压缩后的尺寸，最大宽度或高度为 800px
          const maxSize = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 绘制压缩后的图片
          ctx.drawImage(img, 0, 0, width, height);
          
          // 转换为 base64，使用较低的质量以减少体积
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) { // 4MB 限制
        alert('文件大小不能超过 4MB');
        return;
      }
      setFile(selectedFile);
      setCachedFileId(null); // 新文件选择了，清除之前的 fileId 缓存，确保重新上传
      
      // 清除 sessionStorage 中旧的预览图，避免恢复时显示旧数据
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('sprite_preview_url');
      }
      
      try {
        // 创建压缩后的预览图
        const compressedPreview = await compressImageForPreview(selectedFile);
        setPreviewUrl(compressedPreview);
        console.log('预览图已压缩，原始大小:', selectedFile.size, '压缩后 base64 长度:', compressedPreview.length);
      } catch (error) {
        console.error('图片压缩失败:', error);
        // 如果压缩失败，使用原始图片
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  // 上传文件到 Dify（通过 Next.js API 路由代理，避免 CORS 问题）
  const uploadFile = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user', 'user-' + Date.now());

      // 使用我们自己的 API 路由，避免 CORS 问题
      const response = await fetch('/api/dify/upload', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey // 通过自定义 header 传递 API Key
        },
        body: formData
      });

      if (!response.ok) {
        // 尝试解析为 JSON，如果失败则读取为文本
        const contentType = response.headers.get('content-type');
        let errorMessage = '文件上传失败';
        
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } else {
          const text = await response.text();
          if (text.trim().startsWith('<')) {
            if (response.status === 413) {
              errorMessage = '文件过大，请上传更小的图片';
            } else if (response.status === 504) {
              errorMessage = '上传超时，请检查网络或稍后重试';
            } else {
              errorMessage = `上传服务异常 (${response.status})`;
            }
          } else {
             errorMessage = text.substring(0, 100);
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.id;
    } catch (error: any) {
      console.error('上传错误:', error);
      throw new Error(error.message || '文件上传失败');
    }
  };

  // 生成头像
  const generateSprite = async () => {
    // 检查是否有文件或缓存的文件 ID
    if (!file && !cachedFileId) {
      alert('请上传图片');
      return;
    }

    if (!apiKey) {
      alert('请在 .env.local 文件中配置 NEXT_PUBLIC_DIFY_API_KEY');
      return;
    }

    setLoading(true);

    try {
      let fileId = cachedFileId;

      // 步骤1: 上传文件 (只有当有新文件时才上传)
      if (file) {
        setStatus('正在上传图片...');
        fileId = await uploadFile(file);
        console.log('文件上传成功，ID:', fileId);
        // 更新缓存
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('sprite_file_id', fileId);
        }
        setCachedFileId(fileId);
      } else {
        console.log('使用缓存的文件 ID:', fileId);
      }

      if (!fileId) {
        throw new Error('未获取到文件 ID');
      }

      // 保存当前输入状态到 sessionStorage
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('sprite_prompt', prompt);
          // sessionStorage.setItem('sprite_preview_url', previewUrl); // 移到成功后处理，并增加大小检查
        } catch (e) {
          console.warn('SessionStorage quota exceeded during state save:', e);
        }
      }

      // 步骤2: 调用工作流（通过 Next.js API 路由代理）
      setStatus('正在生成手绘头像...');
      
      // 处理背景参数 - 固定为纯白背景
      const backgroundValue = 'Isolated on a pure white background.';

      // 强制加入手绘风格描述
      const handDrawnStyle = "Hand-drawn artistic style, clean lines, high quality avatar.";
      const apiPrompt = prompt ? `${handDrawnStyle} Details: ${prompt}` : handDrawnStyle;
      
      const requestBody = {
        query: apiPrompt,
        response_mode: 'blocking',
        user: 'user-' + Date.now(),
        inputs: {
          prompt: apiPrompt,
          // size: '1K', // 默认使用 1K 尺寸 (已废弃)
          background: backgroundValue,
          inputimage: [{
            type: 'image',
            transfer_method: 'local_file',
            upload_file_id: fileId
          }]
        }
      };

      console.log('请求数据:', JSON.stringify(requestBody, null, 2));

      // 使用我们自己的 API 路由，避免 CORS 问题
      const response = await fetch('/api/dify/generate', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'x-api-endpoint': apiEndpoint,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'API 请求失败';

        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } else {
          // 处理非 JSON 响应（如 HTML 错误页面）
          const text = await response.text();
          if (text.trim().startsWith('<')) {
            if (response.status === 504) {
               errorMessage = '生成超时，请简化描述或稍后重试';
            } else if (response.status === 500) {
               errorMessage = '服务器内部错误，请稍后重试';
            } else {
               errorMessage = `服务器响应异常 (${response.status})，可能是生成时间过长`;
            }
          } else {
             errorMessage = text.substring(0, 100); // 截取前100个字符避免太长
          }
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
        console.log('API 响应:', result);
      } catch (jsonError) {
        // JSON 解析失败，通常是因为 API 超时返回了 HTML 错误页面
        console.error('JSON 解析失败:', jsonError);
        throw new Error('哎呀AI太忙了，一直没回我，请再试一次吧');
      }

      // 提取图片 URL
      let imageUrl = null;
      if (result.data?.outputs) {
        imageUrl = result.data.outputs.image_url || 
                   result.data.outputs.imageUrl || 
                   result.data.outputs.image;
      } else if (typeof result.answer === 'string' && result.answer.startsWith('http')) {
        imageUrl = result.answer;
      }

      if (!imageUrl) {
        throw new Error('未能从响应中提取图片URL');
      }

      // 保存到 sessionStorage 并跳转
      setStatus('生成成功，正在跳转...');
      setProgress(100); // 瞬间完成
      
      if (typeof window !== 'undefined') {
        try {
          // 尝试保存图片 URL
          sessionStorage.setItem('sprite_image_url', imageUrl);
          
          // 先清除旧的预览图，避免恢复时显示旧数据
          sessionStorage.removeItem('sprite_preview_url');
          
          // 尝试保存新预览图
          // 由于我们已经在上传时压缩了预览图，这里应该可以正常保存
          if (previewUrl) {
             try {
               sessionStorage.setItem('sprite_preview_url', previewUrl);
               console.log('预览图已保存到 sessionStorage，大小:', previewUrl.length, '字符');
             } catch (storageError) {
               console.warn('预览图保存失败（可能超出 sessionStorage 配额）:', storageError);
               // 保存失败也没关系，不影响功能
             }
          }
          
          console.log('状态已保存到 sessionStorage');
        } catch (e) {
          console.warn('SessionStorage quota exceeded, some state may not be saved:', e);
          // 不阻断跳转，只是无法恢复预览图
        }
      }
      
      setTimeout(() => {
        router.push('/generate-gif');
      }, 1000);

    } catch (error) {
      console.error('生成失败:', error);
      setStatus('生成失败: ' + (error as Error).message);
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
            <h1 className="text-xl font-bold text-gray-900">手绘头像生成 by Nesslabs</h1>
            <p className="text-sm text-gray-500 mt-1">上传图片，一键转化为精美手绘风格头像</p>
          </div>
        </div>

        <CardContent className="p-8 space-y-8 bg-white">
          
          {/* 上传区域 */}
          <div className="relative group">
            <Input
              id="file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden" 
            />
            <label 
              htmlFor="file" 
              className={`
                flex flex-col items-center justify-center w-full h-64
                border-2 border-dashed rounded-xl cursor-pointer 
                transition-all duration-200 ease-in-out
                ${previewUrl 
                  ? 'border-orange-500 bg-orange-50/10' 
                  : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50'
                }
              `}
            >
              {previewUrl ? (
                <div className="relative w-full h-full p-2 flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="预览" 
                    className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <span className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">更换图片</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-500">
                  {/* 上传图标容器 */}
                  <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center mb-4 group-hover:shadow-md transition-shadow">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    拖拽图片到这里 或 <span className="text-orange-600 hover:text-orange-700 underline decoration-2 underline-offset-2 decoration-orange-100 hover:decoration-orange-200 transition-all">点击上传</span>
                  </p>
                  <p className="text-sm text-gray-400">支持 Ctrl+V 粘贴 · JPG, PNG · 最大 4MB</p>
                </div>
              )}
            </label>
          </div>

          {/* 手绘头像细节描述 */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-sm font-medium text-gray-500 ml-1">手绘头像细节描述 (选填)</Label>
            <div className="relative">
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：戴眼镜，闭眼睛...（留空则生成默认手绘头像）"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 text-base p-4 transition-all placeholder:text-gray-300 font-normal shadow-sm"
              />
            </div>
          </div>

          {/* 状态显示 */}
          {status && (
            <div className={`py-3 px-4 rounded-lg text-sm font-medium flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-1 ${
              status.includes('失败') ? 'bg-red-50 text-red-700 border border-red-100' :
              status.includes('成功') ? 'bg-green-50 text-green-700 border border-green-100' :
              'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
              <div className="flex items-center gap-2">
                {(status.includes('正在') || status.includes('上传')) && <span className="w-2 h-2 rounded-full bg-current animate-pulse"/>}
                {status}
              </div>
              
              {loading && !status.includes('失败') && (
                <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-current transition-all duration-300 rounded-full opacity-60"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 底部操作栏 */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button 
              variant="outline" 
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg h-10 px-6 font-medium"
              onClick={() => {
                setFile(null);
                setCachedFileId(null);
                setPrompt('');
                setPreviewUrl('');
                setStatus('');
                // 清除 sessionStorage
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('sprite_prompt');
                  sessionStorage.removeItem('sprite_preview_url');
                  sessionStorage.removeItem('sprite_file_id');
                }
              }}
            >
              重置
            </Button>
            <Button 
              onClick={generateSprite}
              disabled={loading || (!file && !cachedFileId)}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg h-10 px-8 font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  生成中...
                </span>
              ) : '开始生成'}
            </Button>
          </div>
          
          {/* API Key 提示 */}
          {!apiKey && (
            <div className="text-center pt-2">
               <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                未检测到 API Key 配置
              </span>
            </div>
          )}

        </CardContent>
      </Card>
    </main>
  );
}
