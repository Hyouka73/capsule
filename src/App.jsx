import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StarryBackground from './components/Teaser/StarryBackground';
import IntroSequence from './components/Teaser/IntroSequence';
import LetterReveal from './components/Teaser/LetterReveal';
import Countdown from './components/Teaser/Countdown';
import './App.css';

function App() {
  const [phase, setPhase] = useState('intro'); // 'intro' | 'main'

  const handleIntroComplete = useCallback(() => {
    setPhase('main');
  }, []);

  return (
    <div className="teaser-app">
      <StarryBackground />

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroSequence key="intro" onComplete={handleIntroComplete} />
        )}

        {phase === 'main' && (
          <motion.div
            key="main"
            className="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            <div className="main-scroll">
              <LetterReveal visible={true} />
              <Countdown visible={true} />

              <motion.div
                className="teaser-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1 }}
              >
                <p className="footer-text">
                  Hecho con todo mi amor 💜
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
