import React, { useEffect, useRef, useState } from 'react';
import { Button, Widget, Typography, Avatar, TextInput, IconButton, Modal } from '@neo4j-ndl/react';
import {
  InformationCircleIconOutline,
  XMarkIconOutline,
  // ClipboardDocumentIconOutline,
  // SpeakerWaveIconOutline,
  // SpeakerXMarkIconOutline,
} from '@neo4j-ndl/react/icons';
import ChatBotAvatar from '../assets/images/chatbot-ai.png';
import { ChatbotProps, Source, UserCredentials } from '../types';
import { useCredentials } from '../context/UserCredentials';
import { chatBotAPI } from '../services/QnaAPI';
import { v4 as uuidv4 } from 'uuid';
import { useFileContext } from '../context/UsersFiles';
import InfoModal from './InfoModal';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import IconButtonWithToolTip from './IconButtonToolTip';
// import { tooltips } from '../utils/Constants';
const Chatbot: React.FC<ChatbotProps> = (props) => {
  const { messages: listMessages, setMessages: setListMessages, isLoading, isFullScreen } = props;
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState<boolean>(isLoading);
  const { userCredentials } = useCredentials();
  const { model } = useFileContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>(sessionStorage.getItem('session_id') ?? '');
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [sourcesModal, setSourcesModal] = useState<Source[]>([]);
  const [modelModal, setModelModal] = useState<string>('');
  const [responseTime, setResponseTime] = useState<number>(0);
  const [chunkModal, setChunkModal] = useState<string[]>([]);
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  // const [copyMessage, setCopyMessage] = useState<string>('');
  // const [speaking, setSpeaking] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };
  useEffect(() => {
    if (!sessionStorage.getItem('session_id')) {
      const id = uuidv4();
      setSessionId(id);
      sessionStorage.setItem('session_id', id);
    }
  }, []);
  const simulateTypingEffect = (
    response: {
      reply: string;
      sources?: Source[];
      model?: string;
      chunk_ids?: string[];
      total_tokens?: number;
      response_time?: number;
    },
    index = 0
  ) => {
    if (index < response.reply.length) {
      const nextIndex = index + 1;
      const currentTypedText = response.reply.substring(0, nextIndex);
      if (index === 0) {
        const date = new Date();
        const datetime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        if (response.reply.length <= 1) {
          setListMessages((msgs) => [
            ...msgs,
            {
              id: Date.now(),
              user: 'chatbot',
              message: currentTypedText,
              datetime: datetime,
              isTyping: false,
              isLoading: true,
              sources: response?.sources,
              model: response?.model,
              chunks: response?.chunk_ids,
              total_tokens: response.total_tokens,
              response_time: response?.response_time,
            },
          ]);
        } else {
          setListMessages((msgs) => {
            const lastmsg = { ...msgs[msgs.length - 1] };
            lastmsg.id = Date.now();
            lastmsg.user = 'chatbot';
            lastmsg.message = currentTypedText;
            lastmsg.datetime = datetime;
            lastmsg.isTyping = true;
            lastmsg.isLoading = false;
            lastmsg.sources = response?.sources;
            lastmsg.model = response?.model;
            lastmsg.chunk_ids = response?.chunk_ids;
            lastmsg.total_tokens = response?.total_tokens;
            lastmsg.response_time = response?.response_time;
            return msgs.map((msg, index) => {
              if (index === msgs.length - 1) {
                return lastmsg;
              }
              return msg;
            });
          });
        }
      } else {
        setListMessages((msgs) => msgs.map((msg) => (msg.isTyping ? { ...msg, message: currentTypedText } : msg)));
      }
      setTimeout(() => simulateTypingEffect(response, nextIndex), 20);
    } else {
      setListMessages((msgs) => msgs.map((msg) => (msg.isTyping ? { ...msg, isTyping: false } : msg)));
    }
  };
  let date = new Date();
  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!inputMessage.trim()) {
      return;
    }
    let chatbotReply;
    let chatSources;
    let chatModel;
    let chatChunks;
    let chatTimeTaken;
    let chatTokensUsed;
    const datetime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    const userMessage = { id: Date.now(), user: 'user', message: inputMessage, datetime: datetime };
    setListMessages([...listMessages, userMessage]);
    try {
      setInputMessage('');
      simulateTypingEffect({ reply: ' ' });
      const chatbotAPI = await chatBotAPI(userCredentials as UserCredentials, inputMessage, sessionId, model);
      const chatresponse = chatbotAPI?.response;
      chatbotReply = chatresponse?.data?.data?.message;
      chatSources = chatresponse?.data?.data?.info.sources;
      chatModel = chatresponse?.data?.data?.info.model;
      chatChunks = chatresponse?.data?.data?.info.chunkids;
      chatTokensUsed = chatresponse?.data?.data?.info.total_tokens;
      chatTimeTaken = chatresponse?.data?.data?.info.response_time;
      simulateTypingEffect({
        reply: chatbotReply,
        sources: chatSources,
        model: chatModel,
        chunk_ids: chatChunks,
        total_tokens: chatTokensUsed,
        response_time: chatTimeTaken,
      });
    } catch (error) {
      chatbotReply = "Oops! It seems we couldn't retrieve the answer. Please try again later";
      setInputMessage('');
      simulateTypingEffect({ reply: chatbotReply });
    }
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [listMessages]);
  useEffect(() => {
    setLoading(() => listMessages.some((msg) => msg.isLoading || msg.isTyping));
  }, [listMessages]);

  // const handleCopy = async (text: string) => {
  //   try {
  //     await navigator.clipboard.writeText(text);
  //     setCopyMessage('copied!');
  //     setTimeout(() => setCopyMessage(''), 2000);
  //   } catch (error) {
  //     console.error('Failed to copy text: ', error);
  //   }
  // };

  // const handleSpeak = (text: string) => {
  //   if (speaking) {
  //     window.speechSynthesis.cancel();
  //     setSpeaking(false);
  //   } else {
  //     const utterance = new SpeechSynthesisUtterance(text);
  //     utterance.onend = () => {
  //       setSpeaking(false);
  //     };
  //     window.speechSynthesis.speak(utterance);
  //     setSpeaking(true);
  //   }
  // };

  return (
    <div className='n-bg-palette-neutral-bg-weak flex flex-col justify-between min-h-full max-h-full overflow-hidden'>
      <div className='flex overflow-y-auto pb-12 min-w-full chatBotContainer pl-3 pr-3'>
        <Widget className='n-bg-palette-neutral-bg-weak w-full' header='' isElevated={false}>
          <div className='flex flex-col gap-4 gap-y-4'>
            {listMessages.map((chat, index) => (
              <div
                ref={messagesEndRef}
                key={chat.id}
                className={clsx(`flex gap-2.5`, {
                  'flex-row': chat.user === 'chatbot',
                  'flex-row-reverse': chat.user !== 'chatbot',
                })}
              >
                <div className='w-8 h-8'>
                  {chat.user === 'chatbot' ? (
                    <Avatar
                      className='-ml-4'
                      hasStatus
                      name='KM'
                      shape='square'
                      size='x-large'
                      source={ChatBotAvatar}
                      status='online'
                      type='image'
                    />
                  ) : (
                    <Avatar
                      className=''
                      hasStatus
                      name='KM'
                      shape='square'
                      size='x-large'
                      status='online'
                      type='image'
                    />
                  )}
                </div>
                <Widget
                  header=''
                  isElevated={true}
                  className={`p-4 self-start ${isFullScreen ? 'max-w-[55%]' : ''} ${
                    chat.user === 'chatbot' ? 'n-bg-palette-neutral-bg-strong' : 'n-bg-palette-primary-bg-weak'
                  } `}
                >
                  <div
                    className={`${
                      listMessages[index].isLoading && index === listMessages.length - 1 && chat.user == 'chatbot'
                        ? 'loader'
                        : ''
                    }`}
                  >
                    <ReactMarkdown>{chat.message}</ReactMarkdown>
                  </div>
                  <div>
                    <div>
                      <Typography variant='body-small' className='pt-2 font-bold'>
                        {chat.datetime}
                      </Typography>
                    </div>
                    {((chat.user === 'chatbot' && chat.id !== 2 && chat.sources?.length !== 0) || chat.isLoading) && (
                      <div className='flex'>
                        <IconButtonWithToolTip
                          placement='top'
                          clean
                          text='Retrieval Information'
                          label='Retrieval Information'
                          disabled={chat.isTyping || chat.isLoading}
                          onClick={() => {
                            setModelModal(chat.model ?? '');
                            setSourcesModal(chat.sources ?? []);
                            setResponseTime(chat.response_time ?? 0);
                            setChunkModal(chat.chunk_ids ?? []);
                            setTokensUsed(chat.total_tokens ?? 0);
                            setShowInfoModal(true);
                          }}
                        >
                          <InformationCircleIconOutline className='w-4 h-4 inline-block' />
                        </IconButtonWithToolTip>
                        {/* <IconButtonWithToolTip
                          label='copy text'
                          placement='top'
                          clean
                          text={copyMessage ? tooltips.copied : tooltips.copy}
                          onClick={() => handleCopy(chat.message)}
                          disabled={chat.isTyping || chat.isLoading}
                        >
                          <ClipboardDocumentIconOutline className='w-4 h-4 inline-block' />
                        </IconButtonWithToolTip>
                        {copyMessage && <span className='pt-4 text-xs'>{copyMessage}</span>}
                        <IconButtonWithToolTip
                          placement='top'
                          label='text to speak'
                          clean
                          text={speaking ? tooltips.stopSpeaking : tooltips.textTospeech}
                          onClick={() => handleSpeak(chat.message)}
                          disabled={chat.isTyping || chat.isLoading}
                        >
                          {speaking ? (
                            <SpeakerXMarkIconOutline className='w-4 h-4 inline-block' />
                          ) : (
                            <SpeakerWaveIconOutline className='w-4 h-4 inline-block' />
                          )}
                        </IconButtonWithToolTip> */}
                      </div>
                    )}
                  </div>
                </Widget>
              </div>
            ))}
          </div>
        </Widget>
      </div>
      <div className='n-bg-palette-neutral-bg-weak flex gap-2.5 bottom-0 p-2.5 w-full'>
        <form onSubmit={handleSubmit} className='flex gap-2.5 w-full'>
          <TextInput
            className='n-bg-palette-neutral-bg-default flex-grow-7 w-full'
            aria-label='chatbot-input'
            type='text'
            value={inputMessage}
            fluid
            onChange={handleInputChange}
          />
          <Button type='submit' disabled={loading}>
            Submit
          </Button>
        </form>
      </div>
      <Modal
        modalProps={{
          id: 'retrieval-information',
          className: 'n-p-token-4 n-bg-palette-neutral-bg-weak n-rounded-lg',
        }}
        onClose={() => setShowInfoModal(false)}
        open={showInfoModal}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton
            size='large'
            title='close pop up'
            aria-label='close pop up'
            clean
            onClick={() => setShowInfoModal(false)}
          >
            <XMarkIconOutline />
          </IconButton>
        </div>
        <InfoModal
          sources={sourcesModal}
          model={modelModal}
          chunk_ids={chunkModal}
          response_time={responseTime}
          total_tokens={tokensUsed}
        />
      </Modal>
    </div>
  );
};

export default Chatbot;
