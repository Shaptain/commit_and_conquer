import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import Hero from './components/Hero';
import Features from './components/features';

const App = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [researchData, setResearchData] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('report');
  const mindMapRef = useRef(null);

  // Create stars on mount
  useEffect(() => {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Create stars
    const stars = [];
    for (let i = 0; i < 800; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        opacity: Math.random()
      });
    }
    
    // Draw stars
    function drawStars() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
        
        // Add subtle glow for bigger stars
        if (star.radius > 1) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 2);
          gradient.addColorStop(0, `rgba(147, 197, 253, ${star.opacity * 0.3})`);
          gradient.addColorStop(1, 'rgba(147, 197, 253, 0)');
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });
    }
    
    // Animate twinkling
    function animate() {
      stars.forEach(star => {
        star.opacity += (Math.random() - 0.5) * 0.01;
        star.opacity = Math.max(0.1, Math.min(1, star.opacity));
      });
      drawStars();
      requestAnimationFrame(animate);
    }
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch research data
  const handleResearch = async () => {
    if (!topic.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      
      const data = await response.json();
      if (data.success) {
        setResearchData(data.data);
        setTimeout(() => renderMindMap(data.data.mindMap), 100);
      }
    } catch (error) {
      console.error('Error fetching research:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render D3 Mind Map
  const renderMindMap = (data) => {
    if (!mindMapRef.current || !data) return;
    
    d3.select(mindMapRef.current).selectAll("*").remove();
    
    const width = 800;
    const height = 600;
    
    const svg = d3.select(mindMapRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${width/2},${height/2})`);
    
    const tree = d3.tree()
      .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);
    
    const root = d3.hierarchy(data);
    tree(root);
    
    g.selectAll('.link')
      .data(root.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y))
      .style('fill', 'none')
      .style('stroke', 'rgba(255, 255, 255, 0.2)')
      .style('stroke-opacity', 0.4)
      .style('stroke-width', 1.5);
    
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
      `);
    
    node.append('circle')
      .attr('r', 4)
      .style('fill', '#ffffff')
      .style('stroke', 'rgba(255, 255, 255, 0.5)')
      .style('stroke-width', 2);
    
    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
      .style('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .text(d => d.data.name)
      .style('font-size', '11px')
      .style('fill', 'rgba(255, 255, 255, 0.9)')
      .style('font-weight', '300');
  };

  // Handle chat
  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !researchData?.sessionId) return;
    
    const newMessage = { role: 'user', content: chatMessage };
    setChatHistory(prev => [...prev, newMessage]);
    setChatMessage('');
    
    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: researchData.sessionId,
          message: chatMessage
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.answer }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  // Letter animation data
  const titleText = "THINKORBIT";
  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dark Blue Galaxy Background */}
      <div className="fixed inset-0 z-0">
        {/* Base gradient - dark blue night sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e27] via-[#0f172a] to-[#020617]"></div>
        
        {/* Nebula effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full filter blur-[120px] opacity-30"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 rounded-full filter blur-[150px] opacity-20"></div>
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full filter blur-[100px] opacity-40"></div>
        
        {/* Milky way effect */}
        <div className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(105deg, transparent 40%, rgba(147, 197, 253, 0.1) 50%, transparent 60%)`,
            transform: 'rotate(-45deg) scale(2)'
          }}
        ></div>
        
        {/* Stars canvas */}
        <canvas id="stars-canvas" className="absolute inset-0"></canvas>
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 w-full bg-[#0a0e27]/50 backdrop-blur-md z-50 border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <motion.h1 
              className="text-xl font-light tracking-widest text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              ThinkOrbit
            </motion.h1>
          </div>
          <div className="flex space-x-12">
            <a href="#features" className="text-white/80 hover:text-white transition-colors duration-300 text-sm tracking-wide">Features</a>
            <a href="#methodology" className="text-white/80 hover:text-white transition-colors duration-300 text-sm tracking-wide">Methodology</a>
            <a href="#vision" className="text-white/80 hover:text-white transition-colors duration-300 text-sm tracking-wide">Vision</a>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <Hero
        titleText={titleText}
        letterVariants={letterVariants}
        topic={topic}
        setTopic={setTopic}
        handleResearch={handleResearch}
        loading={loading}
      />

      {/* Research Results */}
      <AnimatePresence>
        {researchData && (
          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="relative z-10 py-20 px-6"
          >
            <div className="max-w-7xl mx-auto">
              {/* Tabs */}
              <div className="flex justify-center space-x-8 mb-12">
                {[
                  { id: 'report', label: 'Research Synthesis' },
                  { id: 'mindmap', label: 'Knowledge Map' },
                  { id: 'papers', label: 'Source Papers' }
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-8 py-3 rounded-full font-light tracking-wide transition-all duration-300 ${
                      activeTab === tab.id 
                        ? 'bg-white/20 text-white border border-white/30' 
                        : 'bg-transparent text-white/70 hover:text-white border border-transparent hover:border-white/20'
                    }`}
                  >
                    {tab.label}
                  </motion.button>
                ))}
              </div>

              {/* Tab Content */}
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0f172a]/40 backdrop-blur-md rounded-2xl p-10 border border-white/10"
              >
                {activeTab === 'report' && (
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-white/90 leading-relaxed font-light">
                      {researchData.report}
                    </div>
                  </div>
                )}
                
                {activeTab === 'mindmap' && (
                  <div className="flex justify-center">
                    <div ref={mindMapRef} className="w-full h-[600px]"></div>
                  </div>
                )}
                
                {activeTab === 'papers' && (
                  <div className="space-y-6">
                    {researchData.papers.map((paper, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white/5 rounded-xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300"
                      >
                        <h3 className="text-xl font-light text-white mb-3">{paper.title}</h3>
                        <p className="text-sm text-white/60 mb-4 font-light">
                          {paper.authors.join(', ')}
                        </p>
                        <p className="text-white/80 mb-4 font-light leading-relaxed">{paper.summary}</p>
                        <a 
                          href={paper.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-white/70 hover:text-white transition-colors duration-300 text-sm tracking-wide"
                        >
                          View Paper →
                        </a>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Features Section */}
      <Features />

      {/* Methodology Section */}
      <section id="methodology" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl font-light tracking-[0.2em] text-center mb-20 text-white"
          >
            METHODOLOGY
          </motion.h2>
          
          <div className="max-w-3xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-white/80 font-light leading-relaxed text-center mb-8"
            >
              ThinkOrbit leverages state-of-the-art artificial intelligence to transform how researchers interact with academic literature. Our platform seamlessly integrates with leading research databases, employing sophisticated natural language processing to deliver comprehensive, accurate, and actionable research insights.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl font-light tracking-[0.2em] text-center mb-20 text-white"
          >
            VISION
          </motion.h2>
          
          <div className="max-w-3xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-white/80 font-light leading-relaxed text-center"
            >
              We envision a future where research barriers dissolve, where every scholar has access to comprehensive knowledge synthesis at their fingertips. ThinkOrbit is pioneering this transformation, making advanced research capabilities accessible to institutions and individuals worldwide.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/50 font-light text-sm tracking-wide">
            © 2024 ThinkOrbit. Advancing Research Intelligence.
          </p>
        </div>
      </footer>

      {/* Chatbot */}
      {researchData && (
        <>
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setChatOpen(!chatOpen)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all duration-300 z-50"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </motion.button>

          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="fixed bottom-28 right-8 w-96 h-[500px] bg-[#0a0e27]/90 backdrop-blur-xl rounded-2xl shadow-2xl z-50 flex flex-col border border-white/20"
              >
                <div className="bg-white/10 p-5 rounded-t-2xl border-b border-white/10">
                  <h3 className="font-light text-white tracking-wide">Research Assistant</h3>
                  <p className="text-sm text-white/60 font-light mt-1">Intelligent insights at your service</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {chatHistory.length === 0 && (
                    <div className="text-center text-white/50 mt-8">
                      <p className="font-light">Welcome to your research assistant.</p>
                      <p className="text-sm mt-2 font-light">How may I assist with your research today?</p>
                    </div>
                  )}
                  
                  {chatHistory.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-xl ${
                        msg.role === 'user' 
                          ? 'bg-white/20 text-white' 
                          : 'bg-white/10 text-white/90'
                      }`}>
                        <p className="font-light text-sm">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="p-5 border-t border-white/10">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type your question..."
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-white/30 font-light text-sm"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="px-6 py-2 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-all duration-300 text-white font-light text-sm"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default App;