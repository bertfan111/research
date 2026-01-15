import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { ConnectionState, Message, AutomationCandidate } from '../types';
import { createBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';

const API_KEY = process.env.API_KEY || '';

// Define the tool for reporting candidates
const reportCandidateTool: FunctionDeclaration = {
  name: 'reportAutomationCandidate',
  description: '当以 95% 的置信度识别出一个明确的自动化候选任务时调用此函数。',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: '自动化的简短、面向行动的标题（中文）。' },
      description: { type: Type.STRING, description: '痛点的一句话总结（中文）。' },
      frequency: { type: Type.STRING, description: '此任务执行的频率（例如：每天、每周）。' },
      estimatedTimeSaved: { type: Type.STRING, description: '估计节省的时间（例如：2小时/周）。' },
      complexity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'], description: '实施复杂度 (Low=低, Medium=中, High=高)。' },
      steps: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: '工作流的逐步逻辑（中文）。' 
      }
    },
    required: ['title', 'description', 'frequency', 'steps']
  }
};

const SYSTEM_INSTRUCTION = `
你叫 "Atlas"，虽然你的职位是企业工作流架构师，但在与用户对话时，请把自己当成一位**极具亲和力、善于倾听的同事**。
你的目标是通过轻松自然的对话（约10-20分钟），引导用户分享日常工作，并从中敏锐地捕捉那些**机械、重复、令人疲惫**的浏览器操作任务。

**核心对话策略（循序渐进）：**

1.  **暖场阶段**：
    *   不要一上来就谈“自动化”或“效率”。
    *   先做简短温暖的自我介绍（例如：“嗨，我是 Atlas。我的工作就是帮大家从繁琐的鼠标点击中解脱出来。不用把它当成正式访谈，就当是随便聊聊你的工作日常。”）。
    *   询问用户今天的状态，或者简单问问他们主要负责什么业务。

2.  **探索阶段**：
    *   引导用户像讲故事一样描述他们的一天：“比如，你早上打开电脑第一件事通常是做什么？”
    *   **倾听痛点**：当用户提到“复制粘贴”、“导出报表”、“填系统”、“核对数据”等关键词时，表现出同理心（“听起来这很消磨耐心啊”，“这步骤是不是特别容易出错？”）。
    *   询问感受：“做这部分工作的时候，你会不会觉得自己在当一个机器人？”

3.  **深入挖掘（确认自动化机会）**：
    *   一旦发现疑似重复工作，温和地追问细节：“如果我要帮你的话，你得教教我，这具体是先点哪里，再点哪里？”
    *   确认频率和耗时：“这事儿你每天都得来一遍吗？”

4.  **确认与记录**：
    *   当你脑海中已经清晰地形成了这个工作流的逻辑（步骤、频率、价值）并且有 95% 的把握可以用浏览器自动化（Form filling, Data scraping, Cross-tab navigation）解决时，调用 \`reportAutomationCandidate\` 工具。
    *   调用工具后，告诉用户：“我把你刚才说的这个流程记下来了，感觉这完全可以交给机器人去做，你就能省下时间喝杯咖啡了。”

**注意事项**：
*   **默认语言**：简体中文。
*   **语气**：温暖、幽默、不机械。多用口语化的表达，少用技术术语。
*   **上下文**：用户主要在企业浏览器中使用 Web 应用（如 CRM、OA、ERP、飞书/钉钉后台等）。
*   **控制节奏**：如果用户跑题，礼貌地把话题拉回到具体的操作细节上。
`;

export const useLiveSession = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [candidates, setCandidates] = useState<AutomationCandidate[]>([]);
  const [volume, setVolume] = useState<number>(0);
  
  // Refs for audio processing to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Text transcript accumulation
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const disconnect = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // We can't strictly "close" the session object from the SDK easily if we don't have the instance,
    // but the sessionPromise resolution will be orphaned.
    // In a real app, we might signal via a variable to ignore future messages.
    
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
  }, []);

  const connect = useCallback(async () => {
    if (!API_KEY) {
      alert("API Key is missing in environment variables.");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);

      // 1. Audio Setup
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inputCtx;
      
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      // 2. Gemini Client Setup
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          tools: [{ functionDeclarations: [reportCandidateTool] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setConnectionState(ConnectionState.CONNECTED);
            
            // Start Audio Streaming
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume calculation for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1)); // Amplify for visual effect

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            if (message.serverContent?.inputTranscription) {
               currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
               currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
               const userText = currentInputTranscription.current;
               const modelText = currentOutputTranscription.current;
               
               if (userText.trim()) {
                 setMessages(prev => [...prev, { id: Date.now().toString() + 'u', role: 'user', text: userText, timestamp: new Date() }]);
               }
               if (modelText.trim()) {
                 setMessages(prev => [...prev, { id: Date.now().toString() + 'm', role: 'model', text: modelText, timestamp: new Date() }]);
               }

               currentInputTranscription.current = '';
               currentOutputTranscription.current = '';
            }

            // Handle Audio Output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              const audioBytes = base64ToUint8Array(audioData);
              const buffer = await decodeAudioData(audioBytes, outputCtx, 24000, 1);
              
              // Simple output volume visualization simulation (randomized when audio is present)
              // In a real app we'd use an AnalyzerNode on the output
              
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              
              // Scheduling
              const currentTime = outputCtx.currentTime;
              const startTime = Math.max(nextStartTimeRef.current, currentTime);
              source.start(startTime);
              nextStartTimeRef.current = startTime + buffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'reportAutomationCandidate') {
                  const args = fc.args as any;
                  const newCandidate: AutomationCandidate = {
                    id: fc.id,
                    title: args.title,
                    description: args.description,
                    frequency: args.frequency,
                    estimatedTimeSaved: args.estimatedTimeSaved || '未知',
                    complexity: args.complexity || 'Medium',
                    steps: args.steps || []
                  };
                  
                  setCandidates(prev => [...prev, newCandidate]);
                  
                  // Send confirmation back
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Success: Candidate logged in dashboard." }
                      }
                    });
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log('Session closed');
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error('Session error', err);
            setConnectionState(ConnectionState.ERROR);
            disconnect();
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (e) {
      console.error(e);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [disconnect]);

  const sendText = useCallback((text: string) => {
    if (sessionPromiseRef.current) {
        // Optimistic update
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: text, timestamp: new Date() }]);
        
        sessionPromiseRef.current.then(session => {
            session.sendRealtimeInput({
                content: { parts: [{ text }] }
            });
        });
    }
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    sendText,
    messages,
    candidates,
    volume
  };
};