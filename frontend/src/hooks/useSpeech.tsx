import { useEffect, useState } from 'react';
import { SpeechSynthesisProps, SpeechArgs } from '../types';

const useSpeechSynthesis = (props: SpeechSynthesisProps = {}) => {
  const { onEnd = () => {} } = props;
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const handleEnd = () => {
    setSpeaking(false);
    onEnd();
  };
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setSupported(true);
    }
  }, []);
  const speak = (args: SpeechArgs = {}) => {
    const { text = '', rate = 1, pitch = 1, volume = 1 } = args;
    if (!supported) {
      return;
    }
    setSpeaking(true);
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text;
    utterance.onend = handleEnd;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    window.speechSynthesis.speak(utterance);
  };
  const cancel = () => {
    if (!supported) {
      return;
    }
    setSpeaking(false);
    window.speechSynthesis.cancel();
  };
  return {
    supported,
    speak,
    speaking,
    cancel,
  };
};
export default useSpeechSynthesis;
