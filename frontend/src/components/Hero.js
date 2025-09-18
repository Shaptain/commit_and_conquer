import React from 'react';
import { motion } from 'framer-motion';

const Hero = ({ titleText, letterVariants, topic, setTopic, handleResearch, loading }) => {
  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-5xl">
        <motion.div className="mb-8">
          <div className="flex justify-center space-x-2 text-6xl md:text-7xl font-light tracking-[0.3em] text-white mb-6">
            {titleText.split('').map((letter, i) => (
              <motion.span
                key={i}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={letterVariants}
                style={{ display: 'inline-block' }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="text-base md:text-lg text-white/70 mb-16 tracking-[0.4em] font-light"
        >
          INTELLIGENT RESEARCH SYNTHESIS
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <div className="relative">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleResearch()}
              placeholder="Enter research topic"
              className="w-full px-8 py-4 bg-white/5 backdrop-blur-md border border-white/20 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all duration-300 text-center font-light tracking-wide"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleResearch}
            disabled={loading}
            className="mt-8 px-12 py-4 bg-transparent border border-white/30 rounded-full font-light tracking-widest text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing</span>
              </div>
            ) : (
              'Explore'
            )}
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;