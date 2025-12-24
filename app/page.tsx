'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// JSON 数据类型定义 - 所有字段都是可选的，适配不同 Prompt 版本
interface BasicQualityCheck {
  title?: string;
  status?: string;
  content?: string[];
}

interface Section {
  title?: string;
  content?: string | string[];
}

interface Interface {
  source_image_index?: number;
  interface_index_in_image?: number;
  interface_id?: string;
  ui_type?: string;
  primary_goal?: string;
  overall_evaluation?: Section;
  basic_quality_check?: BasicQualityCheck;
  critical_issues?: Section;
  ux_logic_review?: Section;
  visual_design_review?: Section;
  conversion_and_trust?: Section;
  summary?: Section;
}

interface ApiResponse {
  interfaces?: Interface[];
  global_summary?: Section;
}

export default function Home() {
  // 从环境变量读取配置
  const apiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';
  const apiEndpoint = process.env.NEXT_PUBLIC_DIFY_API_ENDPOINT || 'https://api.dify.ai/v1/chat-messages';
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ApiResponse | null>(null);

  // 监听粘贴事件
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            if (blob.size > 4 * 1024 * 1024) {
              alert('粘贴的文件大小不能超过 4MB');
              return;
            }
            
            setFile(blob);
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              setPreviewUrl(dataUrl);
            };
            reader.readAsDataURL(blob);
            
            e.preventDefault();
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // 模拟进度条
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setProgress(0);
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        
        setProgress(prev => {
           let target = prev;
           let speed = 0;
           
           if (elapsed < 5) {
             target = 20;
             speed = 0.5;
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
           return Math.min(prev + speed + Math.random() * 0.1, target);
        });
        
      }, 100);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) {
        alert('文件大小不能超过 4MB');
        return;
      }
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewUrl(dataUrl);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // 上传文件到 Dify
  const uploadFile = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user', 'user-' + Date.now());

      const response = await fetch('/api/dify/upload', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey
        },
        body: formData
      });

      if (!response.ok) {
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

  // 分析 UI
  const analyzeUI = async () => {
    if (!file) {
      alert('请上传图片');
      return;
    }

    if (!apiKey) {
      alert('请在 .env.local 文件中配置 NEXT_PUBLIC_DIFY_API_KEY');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // 步骤1: 上传文件
        setStatus('正在上传图片...');
      const fileId = await uploadFile(file);
        console.log('文件上传成功，ID:', fileId);

      // 步骤2: 调用 Dify API
      setStatus('正在分析 UI...');
      
      const requestBody = {
        query: '请分析这个UI界面',
        response_mode: 'blocking',
        user: 'user-' + Date.now(),
        inputs: {
          inputimage: [{
            type: 'image',
            transfer_method: 'local_file',
            upload_file_id: fileId
          }]
        }
      };

      console.log('请求数据:', JSON.stringify(requestBody, null, 2));

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
          const text = await response.text();
          if (text.trim().startsWith('<')) {
            if (response.status === 504) {
               errorMessage = '分析超时，请稍后重试';
            } else if (response.status === 500) {
               errorMessage = '服务器内部错误，请稍后重试';
            } else {
               errorMessage = `服务器响应异常 (${response.status})`;
            }
          } else {
             errorMessage = text.substring(0, 100);
          }
        }
        throw new Error(errorMessage);
      }

      let apiResult;
      try {
        apiResult = await response.json();
        console.log('API 响应:', apiResult);
      } catch (jsonError) {
        console.error('JSON 解析失败:', jsonError);
        throw new Error('API 响应格式错误，请重试');
      }

      // 提取 JSON 数据 - 尝试从 answer 字段解析
      let parsedData: ApiResponse | null = null;
      
      if (apiResult.answer) {
        try {
          // 尝试直接解析 answer
          parsedData = JSON.parse(apiResult.answer);
        } catch (e) {
          // 如果 answer 包含 markdown 代码块，提取其中的 JSON
          const jsonMatch = apiResult.answer.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[1]);
          } else {
            throw new Error('无法从响应中提取 JSON 数据');
          }
        }
      }

      if (!parsedData) {
        throw new Error('未能从响应中提取分析结果');
      }

      setStatus('分析完成！');
      setProgress(100);
      setResult(parsedData);

    } catch (error) {
      console.error('分析失败:', error);
      setStatus('分析失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 渲染内容部分（支持字符串或字符串数组）
  const renderContent = (content: string | string[]) => {
    if (Array.isArray(content)) {
      return (
        <ul className="list-decimal list-inside space-y-1">
          {content.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }
    return <p>{content}</p>;
  };

  return (
    <main className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* 头部 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">UI 审查工具</h1>
          <p className="text-muted-foreground">上传界面截图，获取专业的 UI/UX 分析报告</p>
        </div>

        {/* 上传区域 */}
        <div className="space-y-4">
          <Input
            id="file"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden" 
          />
          <label 
            htmlFor="file" 
            className={cn(
              "flex flex-col items-center justify-center w-full min-h-[200px] p-6",
              "border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              previewUrl 
                ? "border-primary" 
                : "border-input hover:border-primary hover:bg-accent"
            )}
          >
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="预览" 
                className="max-h-[300px] rounded-md object-contain"
              />
            ) : (
              <div className="flex flex-col items-center text-center space-y-2">
                <p className="text-sm font-medium">点击上传或拖拽图片</p>
                <p className="text-xs text-muted-foreground">
                  支持 JPG、PNG，最大 4MB，或按 Ctrl+V 粘贴
                </p>
              </div>
            )}
          </label>
        </div>

        {/* 状态显示 */}
        {status && (
          <div className={cn(
            "p-4 rounded-lg border text-sm space-y-2",
            status.includes('失败') && "bg-destructive/10 text-destructive border-destructive/20",
            status.includes('完成') && "bg-primary/10 text-primary border-primary/20",
            !status.includes('失败') && !status.includes('完成') && "bg-secondary text-secondary-foreground"
          )}>
            <p className="font-medium">{status}</p>
            {loading && !status.includes('失败') && (
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setFile(null);
              setPreviewUrl('');
              setStatus('');
              setResult(null);
            }}
          >
            重置
          </Button>
          <Button 
            onClick={analyzeUI}
            disabled={loading || !file}
          >
            {loading ? '分析中...' : '开始审查'}
          </Button>
        </div>
        
        {!apiKey && (
          <p className="text-xs text-muted-foreground text-center">
            未检测到 API Key 配置
          </p>
        )}

        {/* 分析结果展示 */}
        {result && result.interfaces && result.interfaces.length > 0 && (
          <div className="space-y-6">
            {result.interfaces.map((iface, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                {/* 头部 */}
                <div className="bg-muted px-4 py-3 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>界面 #{index + 1}</span>
                    {iface.ui_type && (
                      <>
                        <span>·</span>
                        <span>{iface.ui_type}</span>
                      </>
                    )}
                  </div>
                  {iface.interface_id && (
                    <h2 className="text-lg font-semibold">{iface.interface_id}</h2>
                  )}
                </div>

                {/* 内容 */}
                <div className="p-4 space-y-4">
                  {/* 原图展示 */}
                  {previewUrl && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">原图</h3>
                      <img 
                        src={previewUrl} 
                        alt={`界面 ${index + 1} 原图`}
                        className="rounded-lg max-w-full h-auto max-h-[400px]"
                      />
                    </div>
                  )}

                  {/* 主要目标 */}
                  {iface.primary_goal && (
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">界面目标</h3>
                      <p className="text-sm">{iface.primary_goal}</p>
                    </div>
                  )}

                  {/* 整体评价 */}
                  {iface.overall_evaluation && (
                    <div className="rounded-lg border bg-orange-50 dark:bg-orange-950 p-4 space-y-2">
                      {iface.overall_evaluation.title && (
                        <h3 className="text-sm font-semibold">{iface.overall_evaluation.title}</h3>
                      )}
                      {iface.overall_evaluation.content && (
                        <div className="text-sm text-muted-foreground">
                          {renderContent(iface.overall_evaluation.content)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 基础质量审查 */}
                  {iface.basic_quality_check && (
                    <div className={cn(
                      "rounded-lg border p-4 space-y-2",
                      iface.basic_quality_check.status === 'fail' 
                        ? "bg-destructive/10 border-destructive/20" 
                        : "bg-primary/10 border-primary/20"
                    )}>
                      <div className="flex items-center justify-between">
                        {iface.basic_quality_check.title && (
                          <h3 className="text-sm font-semibold">{iface.basic_quality_check.title}</h3>
                        )}
                        {iface.basic_quality_check.status && (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            iface.basic_quality_check.status === 'fail'
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-primary text-primary-foreground"
                          )}>
                            {iface.basic_quality_check.status === 'fail' ? '不合格' : '通过'}
                          </span>
                        )}
                      </div>
                      {iface.basic_quality_check.content && (
                        <div className="text-sm text-muted-foreground">
                          {renderContent(iface.basic_quality_check.content)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 致命问题 */}
                  {iface.critical_issues && (
                    <div className="rounded-lg bg-destructive text-destructive-foreground p-4 space-y-2">
                      {iface.critical_issues.title && (
                        <h3 className="text-sm font-semibold">{iface.critical_issues.title}</h3>
                      )}
                      {iface.critical_issues.content && (
                        <div className="text-sm opacity-90">
                          {renderContent(iface.critical_issues.content)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* 用户体验审查 */}
                    {iface.ux_logic_review && (
                      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
                        {iface.ux_logic_review.title && (
                          <h3 className="text-sm font-semibold">{iface.ux_logic_review.title}</h3>
                        )}
                        {iface.ux_logic_review.content && (
                          <div className="text-sm text-muted-foreground">
                            {renderContent(iface.ux_logic_review.content)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 视觉设计审查 */}
                    {iface.visual_design_review && (
                      <div className="rounded-lg border bg-purple-50 dark:bg-purple-950 p-4 space-y-2">
                        {iface.visual_design_review.title && (
                          <h3 className="text-sm font-semibold">{iface.visual_design_review.title}</h3>
                        )}
                        {iface.visual_design_review.content && (
                          <div className="text-sm text-muted-foreground">
                            {renderContent(iface.visual_design_review.content)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 转化与信任 */}
                  {iface.conversion_and_trust && (
                    <div className="rounded-lg border bg-amber-50 dark:bg-amber-950 p-4 space-y-2">
                      {iface.conversion_and_trust.title && (
                        <h3 className="text-sm font-semibold">{iface.conversion_and_trust.title}</h3>
                      )}
                      {iface.conversion_and_trust.content && (
                        <div className="text-sm text-muted-foreground">
                          {renderContent(iface.conversion_and_trust.content)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 单界面总结 */}
                  {iface.summary && (
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                      {iface.summary.title && (
                        <h3 className="text-sm font-semibold">{iface.summary.title}</h3>
                      )}
                      {iface.summary.content && (
                        <div className="text-sm text-muted-foreground">
                          {renderContent(iface.summary.content)}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            ))}

            {/* 全局总结 */}
            {result.global_summary && (
              <div className="rounded-lg bg-muted p-6 space-y-4">
                <div className="space-y-1">
                  {result.global_summary.title && (
                    <h2 className="text-xl font-semibold">{result.global_summary.title}</h2>
                  )}
                  <p className="text-sm text-muted-foreground">最终审查结论</p>
                </div>

                {result.global_summary.content && (
                  <div className="text-sm leading-relaxed">
                    {renderContent(result.global_summary.content)}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
