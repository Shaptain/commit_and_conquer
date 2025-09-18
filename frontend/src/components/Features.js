import React from 'react';
import { motion } from 'framer-motion';

const Features = () => {
  const features = [
    {
      title: 'Advanced Synthesis',
      desc: 'Our proprietary algorithms analyze and synthesize multiple research papers simultaneously, extracting key insights with precision.'
    },
    {
      title: 'Visual Intelligence',
      desc: 'Transform complex research relationships into intuitive visual representations that reveal hidden connections and patterns.'
    },
    {
      title: 'Academic Assistant',
      desc: 'Engage with an intelligent research companion that provides contextual answers and deep insights into your research domain.'
    }
  ];

  return (
    <section id="features" className="relative z-10 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-4xl font-light tracking-[0.2em] text-center mb-20 text-white"
        >
          CUTTING-EDGE FEATURES
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.2 }}
              className="bg-transparent rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300"
            >
              <h3 className="text-xl font-light mb-4 text-white tracking-wider">{feature.title}</h3>
              <p className="text-white/70 font-light leading-relaxed text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;