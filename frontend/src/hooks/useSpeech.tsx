import { useState } from 'react';
import { SpeechSynthesisProps, SpeechArgs } from '../types';

const useSpeechSynthesis = (props: SpeechSynthesisProps = {}) => {
  const { onEnd = () => {} } = props;
  const [speaking, setSpeaking] = useState(false);
  const handleEnd = () => {
    setSpeaking(false);
    onEnd();
  };

  const speak = (args: SpeechArgs = {}, isSupported: boolean) => {
    const { text = '', rate = 1, pitch = 1, volume = 1 } = args;
    if (!isSupported) {
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
    setSpeaking(false);
    window.speechSynthesis.cancel();
  };
  return {
    speak,
    speaking,
    cancel,
  };
};
export default useSpeechSynthesis;
