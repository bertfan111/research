import React, { useRef, useEffect, useState } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { ConnectionState } from './types';
import { ChatMessage } from './components/ChatMessage';
import { CandidateCard } from './components/CandidateCard';
import { Visualizer } from './components/Visualizer';

const App: React.FC = () => {
  const { 
    connect, 
    disconnect, 
    sendText, 
    connectionState, 
    messages, 
    candidates, 
    volume 
  } = useLiveSession();

  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track previous connection state to detect "Session Ended" event
  const prevConnectionStateRef = useRef<ConnectionState>(ConnectionState.DISCONNECTED);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-open sidebar when session ends if candidates exist
  useEffect(() => {
    const prev = prevConnectionStateRef.current;
    if (prev === ConnectionState.CONNECTED && connectionState === ConnectionState.DISCONNECTED) {
      if (candidates.length > 0) {
        setIsSidebarOpen(true);
      }
    }
    prevConnectionStateRef.current = connectionState;
  }, [connectionState, candidates.length]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    sendText(inputText);
    setInputText('');
  };

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="h-screen w-full bg-[#0f172a] text-gray-100 flex overflow-hidden">
      
      {/* Left Sidebar: Analysis & Results */}
      <aside 
        className={`border-r border-gray-800 bg-[#0d1117] flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-96 translate-x-0' : 'w-0 -translate-x-full border-none opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-6 border-b border-gray-800 min-w-[24rem]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </div>
              <h1 className="font-bold text-lg tracking-tight whitespace-nowrap">自动化架构师</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 whitespace-nowrap">企业浏览器工作流引擎</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-w-[24rem]">
          {candidates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
              <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              <h3 className="text-sm font-semibold mb-1">未识别到工作流</h3>
              <p className="text-xs">开始对话以检测重复性任务。</p>
            </div>
          ) : (
            candidates.map(candidate => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-800 min-w-[24rem]">
           <div className="bg-gray-800/50 rounded p-3 text-xs text-gray-400 border border-gray-700/50">
             <strong>状态：</strong> 发现 {candidates.length} 个候选任务。
           </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
        
        {/* Toggle Sidebar Button (Desktop) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-all shadow-lg"
            title="显示工作流列表"
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              {candidates.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                </span>
              )}
            </div>
          </button>
        )}

        {/* Header (Mobile only mainly) */}
        <div className="md:hidden p-4 border-b border-gray-800 flex justify-between items-center bg-[#0d1117]">
          <span className="font-bold">工作流架构师</span>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-xs bg-gray-800 px-2 py-1 rounded">
            发现 {candidates.length} 个
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {messages.length === 0 && (
             <div className="mt-20 text-center max-w-lg mx-auto">
               <div className="w-20 h-20 bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-brand-500/30">
                 <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
               </div>
               <h2 className="text-2xl font-bold text-white mb-2">来聊聊你的工作日常</h2>
               <p className="text-gray-400 mb-8 leading-relaxed">
                 嗨！我是 Atlas。不用把这当成正式访谈，我们就随便聊聊。<br/>
                 你可以和我讲讲你平时在公司都在忙些什么，有没有哪些操作让你觉得<br/>
                 “天啊，怎么又要重复一遍”，我们一起看看能不能把它们变简单。
               </p>
               {!isConnected && (
                  <button 
                    onClick={connect} 
                    disabled={isConnecting}
                    className="bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 px-8 rounded-full transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        连接中...
                      </>
                    ) : (
                      <>
                        开始聊天
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                      </>
                    )}
                  </button>
               )}
             </div>
          )}
          
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        {isConnected && (
          <div className="p-4 md:p-6 border-t border-gray-800 bg-[#0d1117]">
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              
              <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                    {isConnected ? 'Atlas 在线中' : '已断开'}
                  </span>
                </div>
                <Visualizer active={isConnected} volume={volume} />
                <button 
                  onClick={disconnect}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 bg-red-900/20 px-3 py-1.5 rounded transition-colors"
                >
                  结束对话
                </button>
              </div>

              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="畅所欲言..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl py-4 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder-gray-500"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-3 top-3 p-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-brand-600 hover:text-white disabled:opacity-50 disabled:hover:bg-gray-700 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </button>
              </form>

              <div className="text-center">
                 <p className="text-[10px] text-gray-500">
                   Atlas 正在学习中，请核对自动化建议。
                 </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;