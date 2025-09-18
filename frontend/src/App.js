import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function App() {
  const canvasRef = useRef(null);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your AI Research Co-Pilot. Drop in a topic and I'll find papers for you 🚀" }
  ]);
  const [input, setInput] = useState("");

  // --- Starry Background Animation ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let stars = [];
    const numStars = 200;

    const initStars = () => {
      stars = Array.from({ length: numStars }).map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5,
        opacity: Math.random()
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
        star.opacity += (Math.random() - 0.5) * 0.05;
        star.opacity = Math.max(0, Math.min(1, star.opacity));
      });
      requestAnimationFrame(animate);
    };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
    animate();

    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    });
  }, []);

  // --- Mindmap (D3) ---
  useEffect(() => {
    const svg = d3.select("#mindmap");
    svg.selectAll("*").remove();

    const width = 600, height = 400;
    const nodes = [
      { id: "AI" },
      { id: "NLP" },
      { id: "RAG" },
      { id: "Vector DBs" },
      { id: "LangChain" }
    ];
    const links = [
      { source: "AI", target: "NLP" },
      { source: "AI", target: "RAG" },
      { source: "AI", target: "Vector DBs" },
      { source: "AI", target: "LangChain" }
    ];

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 2);

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 20)
      .attr("fill", "#3b82f6");

    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text(d => d.id)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .attr("dy", 4);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
  }, []);

  // --- Chat handling ---
  const sendMessage = () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");

    // fake AI reply for now
    setTimeout(() => {
      setMessages([...newMessages, { role: "assistant", content: `Researching "${input}"... (this is a mock reply)` }]);
    }, 1000);
  };

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0"></canvas>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black z-10"></div>

      <div className="relative z-20 flex flex-col items-center h-full p-6">
        <h1 className="text-4xl font-bold text-blue-400 drop-shadow-lg mb-4">
          🔬 AI Research Co-Pilot
        </h1>
        <p className="text-gray-300 mb-6">
          Drop a topic → Get papers, summaries, mindmaps, and Q&A 🚀
        </p>

        {/* Mindmap */}
        <svg id="mindmap" width="600" height="400" className="mb-8 border border-blue-500 rounded-lg shadow-lg"></svg>

        {/* Chat */}
        <div className="w-full max-w-2xl bg-gray-900/80 rounded-lg p-4 flex flex-col h-[300px] overflow-y-auto mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
            >
              <div
                className={`px-3 py-2 rounded-lg max-w-[70%] ${msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'}`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex w-full max-w-2xl">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter a research topic..."
            className="flex-1 px-4 py-2 rounded-l-lg bg-gray-800 text-white focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 rounded-r-lg hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
