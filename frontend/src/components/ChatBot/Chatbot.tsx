import React, { FC, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Widget, Typography, Avatar, TextInput, IconButton, Modal, useCopyToClipboard } from '@neo4j-ndl/react';
import {
  XMarkIconOutline,
  ClipboardDocumentIconOutline,
  SpeakerWaveIconOutline,
  SpeakerXMarkIconOutline,
} from '@neo4j-ndl/react/icons';
import ChatBotAvatar from '../../assets/images/chatbot-ai.png';
import { ChatbotProps, CustomFile, Messages, ResponseMode, UserCredentials, nodeDetailsProps } from '../../types';
import { useCredentials } from '../../context/UserCredentials';
import { chatBotAPI } from '../../services/QnaAPI';
import { v4 as uuidv4 } from 'uuid';
import { useFileContext } from '../../context/UsersFiles';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import { IconButtonWithToolTip } from '../UI/IconButtonToolTip';
import { buttonCaptions, chatModeLables, tooltips } from '../../utils/Constants';
import useSpeechSynthesis from '../../hooks/useSpeech';
import ButtonWithToolTip from '../UI/ButtonWithToolTip';
import FallBackDialog from '../UI/FallBackDialog';
import { capitalizeWithPlus } from '../../utils/Utils';
import { capitalize } from '@mui/material';
const InfoModal = lazy(() => import('./ChatInfoModal'));

const Chatbot: FC<ChatbotProps> = (props) => {
  const {
    messages: listMessages,
    setMessages: setListMessages,
    isLoading,
    isFullScreen,
    clear,
    connectionStatus,
  } = props;
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState<boolean>(isLoading);
  const { userCredentials } = useCredentials();
  const { model, chatModes, selectedRows, filesData } = useFileContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>(sessionStorage.getItem('session_id') ?? '');
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [sourcesModal, setSourcesModal] = useState<string[]>([]);
  const [modelModal, setModelModal] = useState<string>('');
  const [responseTime, setResponseTime] = useState<number>(0);
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const [cypherQuery, setcypherQuery] = useState<string>('');
  const [copyMessageId, setCopyMessageId] = useState<number | null>(null);
  const [chatsMode, setChatsMode] = useState<string>(chatModeLables.graph_vector_fulltext);
  const [graphEntitites, setgraphEntitites] = useState<[]>([]);
  const [messageError, setmessageError] = useState<string>('');
  const [entitiesModal, setEntitiesModal] = useState<string[]>([]);
  const [nodeDetailsModal, setNodeDetailsModal] = useState<nodeDetailsProps>({});

  const [value, copy] = useCopyToClipboard();
  const { speak, cancel } = useSpeechSynthesis({
    onEnd: () => {
      setListMessages((msgs) => msgs.map((msg) => ({ ...msg, speaking: false })));
    },
  });

  let selectedFileNames: CustomFile[] = filesData.filter(
    (f) => selectedRows.includes(f.id) && ['Completed'].includes(f.status)
  );

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

  const simulateTypingEffect = (messageId: number, response: ResponseMode, mode: string, index = 0) => {
    if (index < response.message.length) {
      const nextIndex = index + 1;
      const currentTypedText = response.message.substring(0, nextIndex);
      setListMessages((msgs) =>
        msgs.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              modes: {
                ...msg.modes,
                [mode]: {
                  ...msg.modes[mode],
                  message: currentTypedText,
                },
              },
              isTyping: true,
            };
          }
          return msg;
        })
      );
      setTimeout(() => simulateTypingEffect(messageId, response, mode, nextIndex), 20);
    } else {
      setListMessages((msgs) => msgs.map((msg) => (msg.id === messageId ? { ...msg, isTyping: false } : msg)));
    }
  };
  let date = new Date();

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!inputMessage.trim()) {
      return;
    }
    const datetime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    const userMessage: Messages = {
      id: Date.now(),
      user: 'user',
      datetime: datetime,
      currentMode: chatModes[0],
      modes: {},
    };
    userMessage.modes[chatModes[0]] = { message: inputMessage };
    setListMessages([...listMessages, userMessage]);
    const chatbotMessageId = Date.now() + 1;
    const chatbotMessage: Messages = {
      id: chatbotMessageId,
      user: 'chatbot',
      datetime: new Date().toLocaleString(),
      isTyping: true,
      isLoading: true,
      modes: {},
      currentMode: chatModes[0],
    };
    setListMessages((prev) => [...prev, chatbotMessage]);
    try {
      const apiCalls = chatModes.map((mode) =>
        chatBotAPI(
          userCredentials as UserCredentials,
          inputMessage,
          sessionId,
          model,
          mode,
          selectedFileNames?.map((f) => f.name)
        )
      );
      setInputMessage('');
      const results = await Promise.allSettled(apiCalls);
      results.forEach((result, index) => {
        const mode = chatModes[index];
        if (result.status === 'fulfilled') {
          // @ts-ignore
          const response = result.value.response.data.data;
          const responseMode: ResponseMode = {
            message: response.message,
            sources: response.info.sources,
            model: response.info.model,
            total_tokens: response.info.total_tokens,
            response_time: response.info.response_time,
            cypher_query: response.info.cypher_query,
            graphonly_entities: response.info.context,
            entities: response.info.entities,
            nodeDetails: response.info.nodedetails,
            error: response.info.error,
          };
          if (index === 0) {
            simulateTypingEffect(chatbotMessageId, responseMode, mode);
          } else {
            setListMessages((prev) =>
              prev.map((msg) =>
                (msg.id === chatbotMessageId ? { ...msg, modes: { ...msg.modes, [mode]: responseMode } } : msg)
              )
            );
          }
        } else {
          console.error(`API call failed for mode ${mode}:`, result.reason);
          setListMessages((prev) =>
            prev.map((msg) =>
              (msg.id === chatbotMessageId
                ? {
                    ...msg,
                    modes: {
                      ...msg.modes,
                      [mode]: { message: 'Failed to fetch response for this mode.', error: result.reason },
                    },
                  }
                : msg)
            )
          );
        }
      });
      setListMessages((prev) =>
        prev.map((msg) => (msg.id === chatbotMessageId ? { ...msg, isLoading: false, isTyping: false } : msg))
      );
    } catch (error) {
      console.error('Error in handling chat:', error);
      if (error instanceof Error) {
        setListMessages((prev) =>
          prev.map((msg) =>
            (msg.id === chatbotMessageId
              ? {
                  ...msg,
                  isLoading: false,
                  isTyping: false,
                  modes: {
                    default: { message: 'An error occurred while processing your request.', error: error.message },
                  },
                }
              : msg)
          )
        );
      }
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

  useEffect(() => {
    if (clear) {
      cancel();
      setListMessages((msgs) => msgs.map((msg) => ({ ...msg, speaking: false })));
    }
  }, [clear]);

  const handleCopy = (message: string, id: number) => {
    copy(message);
    setListMessages((msgs) =>
      msgs.map((msg) => {
        if (msg.id === id) {
          msg.copying = true;
        }
        return msg;
      })
    );
    setCopyMessageId(id);
    setTimeout(() => {
      setCopyMessageId(null);
      setListMessages((msgs) =>
        msgs.map((msg) => {
          if (msg.id === id) {
            msg.copying = false;
          }
          return msg;
        })
      );
    }, 2000);
  };

  const handleCancel = (id: number) => {
    cancel();
    setListMessages((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, speaking: false } : msg)));
  };

  const handleSpeak = (chatMessage: any, id: number) => {
    speak({ text: chatMessage });
    setListMessages((msgs) => {
      const messageWithSpeaking = msgs.find((msg) => msg.speaking);
      return msgs.map((msg) => (msg.id === id && !messageWithSpeaking ? { ...msg, speaking: true } : msg));
    });
  };

  const handleSwitchMode = (messageId: number, newMode: string) => {
    setListMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, currentMode: newMode } : msg)));
  };
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
                      status={connectionStatus ? 'online' : 'offline'}
                      type='image'
                    />
                  ) : (
                    <Avatar
                      className=''
                      hasStatus
                      name='KM'
                      shape='square'
                      size='x-large'
                      status={connectionStatus ? 'online' : 'offline'}
                      type='image'
                    />
                  )}
                </div>
                <Widget
                  header=''
                  isElevated={true}
                  className={`p-4 self-start ${isFullScreen ? 'max-w-[55%]' : ''} ${
                    chat.user === 'chatbot' ? 'n-bg-palette-neutral-bg-strong' : 'n-bg-palette-primary-bg-weak'
                  }`}
                  subheader={
                    chat.user !== 'chatbot' && chat.currentMode ? (
                      <Typography variant='subheading-small'>
                        Chat Mode:{' '}
                        {chat.currentMode.includes('+')
                          ? capitalizeWithPlus(chat.currentMode)
                          : capitalize(chat.currentMode)}
                      </Typography>
                    ) : (
                      ''
                    )
                  }
                >
                  <div
                    className={`${
                      chat.isLoading && index === listMessages.length - 1 && chat.user === 'chatbot' ? 'loader' : ''
                    }`}
                  >
                    <ReactMarkdown>{chat.modes[chat.currentMode]?.message || ''}</ReactMarkdown>
                  </div>
                  <div>
                    <div>
                      <Typography variant='body-small' className='pt-2 font-bold'>
                        {chat.datetime}
                      </Typography>
                    </div>
                    {chat.user === 'chatbot' && chat.id !== 2 && !chat.isLoading && !chat.isTyping && (
                      <div className='flex inline-block'>
                        <ButtonWithToolTip
                          className='w-4 h-4 inline-block p-6 mt-1.5'
                          fill='text'
                          placement='top'
                          clean
                          text='Retrieval Information'
                          label='Retrieval Information'
                          disabled={chat.isTyping || chat.isLoading}
                          onClick={() => {
                            const currentMode = chat.modes[chat.currentMode];
                            setModelModal(currentMode.model ?? '');
                            setSourcesModal(currentMode.sources ?? []);
                            setResponseTime(currentMode.response_time ?? 0);
                            setTokensUsed(currentMode.total_tokens ?? 0);
                            setcypherQuery(currentMode.cypher_query ?? '');
                            setShowInfoModal(true);
                            setChatsMode(chat.currentMode ?? '');
                            setgraphEntitites(currentMode.graphonly_entities ?? []);
                            setEntitiesModal(currentMode.entities ?? []);
                            setmessageError(currentMode.error ?? '');
                            setNodeDetailsModal(currentMode.nodeDetails ?? {});
                          }}
                        >
                          {buttonCaptions.details}
                        </ButtonWithToolTip>
                        <IconButtonWithToolTip
                          label='copy text'
                          placement='top'
                          clean
                          text={chat.copying ? tooltips.copied : tooltips.copy}
                          onClick={() => handleCopy(chat.modes[chat.currentMode]?.message, chat.id)}
                          disabled={chat.isTyping || chat.isLoading}
                        >
                          <ClipboardDocumentIconOutline className='w-4 h-4 inline-block' />
                        </IconButtonWithToolTip>
                        {chat.copying && <span className='pt-4 text-xs'>Copied!</span>}
                        <IconButtonWithToolTip
                          placement='top'
                          clean
                          onClick={() => {
                            if (chat.speaking) {
                              handleCancel(chat.id);
                            } else {
                              handleSpeak(chat.modes[chat.currentMode]?.message, chat.id);
                            }
                          }}
                          text={chat.speaking ? tooltips.stopSpeaking : tooltips.textTospeech}
                          disabled={listMessages.some((msg) => msg.speaking && msg.id !== chat.id)}
                          label={chat.speaking ? 'stop speaking' : 'text to speech'}
                        >
                          {chat.speaking ? (
                            <SpeakerXMarkIconOutline className='w-4 h-4 inline-block' />
                          ) : (
                            <SpeakerWaveIconOutline className='w-4 h-4 inline-block' />
                          )}
                        </IconButtonWithToolTip>
                      </div>
                    )}
                    {Object.keys(chat.modes).length > 1 && (
                      <div className='mt-2'>
                        {Object.keys(chat.modes).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => handleSwitchMode(chat.id, mode)}
                            className={`mr-2 px-2 py-1 rounded ${
                              chat.currentMode === mode ? 'bg-blue-500 text-white' : 'bg-gray-200'
                            }`}
                          >
                            {capitalize(mode)}
                          </button>
                        ))}
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
        <form onSubmit={handleSubmit} className={`flex gap-2.5 w-full ${!isFullScreen ? 'justify-between' : ''}`}>
          <TextInput
            className={`n-bg-palette-neutral-bg-default flex-grow-7 ${
              isFullScreen ? 'w-[calc(100%-105px)]' : 'w-[70%]'
            }`}
            aria-label='chatbot-input'
            type='text'
            value={inputMessage}
            fluid
            onChange={handleInputChange}
            name='chatbot-input'
          />
          <ButtonWithToolTip
            label='Q&A Button'
            placement='top'
            text={`Ask a question.`}
            type='submit'
            disabled={loading || !connectionStatus}
            size='medium'
          >
            {buttonCaptions.ask}{' '}
            {selectedFileNames != undefined && selectedFileNames.length > 0 && `(${selectedFileNames.length})`}
          </ButtonWithToolTip>
        </form>
      </div>
      <Suspense fallback={<FallBackDialog />}>
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
            entities_ids={entitiesModal}
            response_time={responseTime}
            total_tokens={tokensUsed}
            mode={chatsMode}
            cypher_query={cypherQuery}
            graphonly_entities={graphEntitites}
            error={messageError}
            nodeDetails={nodeDetailsModal}
          />
        </Modal>
      </Suspense>
    </div>
  );
};

export default Chatbot;
