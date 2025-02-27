import React, { FC, lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  Widget,
  Typography,
  Avatar,
  TextInput,
  IconButton,
  Modal,
  useCopyToClipboard,
  Flex,
  Box,
  TextLink,
} from '@neo4j-ndl/react';
import { ArrowDownTrayIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import ChatBotAvatar from '../../assets/images/chatbot-ai.png';
import {
  ChatbotProps,
  Chunk,
  Community,
  CustomFile,
  Entity,
  ExtendedNode,
  ExtendedRelationship,
  Messages,
  ResponseMode,
  metricstate,
  multimodelmetric,
  nodeDetailsProps,
} from '../../types';
import { chatBotAPI } from '../../services/QnaAPI';
import { v4 as uuidv4 } from 'uuid';
import { useFileContext } from '../../context/UsersFiles';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import { buttonCaptions, chatModeLables } from '../../utils/Constants';
import useSpeechSynthesis from '../../hooks/useSpeech';
import ButtonWithToolTip from '../UI/ButtonWithToolTip';
import FallBackDialog from '../UI/FallBackDialog';
import { downloadClickHandler, getDateTime } from '../../utils/Utils';
import ChatModesSwitch from './ChatModesSwitch';
import CommonActions from './CommonChatActions';
import Loader from '../../utils/Loader';
const InfoModal = lazy(() => import('./ChatInfoModal'));
if (typeof window !== 'undefined') {
  if (!sessionStorage.getItem('session_id')) {
    const id = uuidv4();
    sessionStorage.setItem('session_id', id);
  }
}
const sessionId = sessionStorage.getItem('session_id') ?? '';

const Chatbot: FC<ChatbotProps> = (props) => {
  const {
    messages: listMessages,
    setMessages: setListMessages,
    isLoading,
    isFullScreen,
    connectionStatus,
    isChatOnly,
    isDeleteChatLoading,
  } = props;
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState<boolean>(isLoading);
  const { model, chatModes, selectedRows, filesData } = useFileContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [sourcesModal, setSourcesModal] = useState<string[]>([]);
  const [modelModal, setModelModal] = useState<string>('');
  const [responseTime, setResponseTime] = useState<number>(0);
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const [cypherQuery, setcypherQuery] = useState<string>('');
  const [chatsMode, setChatsMode] = useState<string>(chatModeLables['graph+vector+fulltext']);
  const [graphEntitites, setgraphEntitites] = useState<[]>([]);
  const [messageError, setmessageError] = useState<string>('');
  const [entitiesModal, setEntitiesModal] = useState<string[]>([]);
  const [nodeDetailsModal, setNodeDetailsModal] = useState<nodeDetailsProps>({});
  const [metricQuestion, setMetricQuestion] = useState<string>('');
  const [metricAnswer, setMetricAnswer] = useState<string>('');
  const [metricContext, setMetricContext] = useState<string>('');
  const [nodes, setNodes] = useState<ExtendedNode[]>([]);
  const [relationships, setRelationships] = useState<ExtendedRelationship[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [metricDetails, setMetricDetails] = useState<metricstate | null>(null);
  const [infoEntities, setInfoEntities] = useState<Entity[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [infoLoading, toggleInfoLoading] = useReducer((s) => !s, false);
  const [metricsLoading, toggleMetricsLoading] = useReducer((s) => !s, false);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  const [activeChat, setActiveChat] = useState<Messages | null>(null);
  const [multiModelMetrics, setMultiModelMetrics] = useState<multimodelmetric[]>([]);

  const [_, copy] = useCopyToClipboard();
  const { speak, cancel, speaking } = useSpeechSynthesis({
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

  const saveInfoEntitites = (entities: Entity[]) => {
    setInfoEntities(entities);
  };

  const saveNodes = (chatNodes: ExtendedNode[]) => {
    setNodes(chatNodes);
  };

  const saveChatRelationships = (chatRels: ExtendedRelationship[]) => {
    setRelationships(chatRels);
  };

  const saveChunks = (chatChunks: Chunk[]) => {
    setChunks(chatChunks);
  };
  const saveMultimodemetrics = (metrics: multimodelmetric[]) => {
    setMultiModelMetrics(metrics);
  };
  const saveMetrics = (metricInfo: metricstate) => {
    setMetricDetails(metricInfo);
  };
  const saveCommunities = (chatCommunities: Community[]) => {
    setCommunities(chatCommunities);
  };

  const simulateTypingEffect = (messageId: number, response: ResponseMode, mode: string, message: string) => {
    let index = 0;
    let lastTimestamp: number | null = null;
    const TYPING_INTERVAL = 20;
    const animate = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const elapsed = timestamp - lastTimestamp;
      if (elapsed >= TYPING_INTERVAL) {
        if (index < message.length) {
          const nextIndex = index + 1;
          const currentTypedText = message.substring(0, nextIndex);
          setListMessages((msgs) =>
            msgs.map((msg) => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  modes: {
                    ...msg.modes,
                    [mode]: {
                      ...response,
                      message: currentTypedText,
                    },
                  },
                  isTyping: true,
                  speaking: false,
                  copying: false,
                };
              }
              return msg;
            })
          );
          index = nextIndex;
          lastTimestamp = timestamp;
        } else {
          setListMessages((msgs) => {
            const activeMessage = msgs.find((message) => message.id === messageId);
            let sortedModes: Record<string, ResponseMode>;
            if (activeMessage) {
              sortedModes = Object.fromEntries(
                chatModes.filter((m) => m in activeMessage.modes).map((key) => [key, activeMessage?.modes[key]])
              );
            }
            return msgs.map((msg) => (msg.id === messageId ? { ...msg, isTyping: false, modes: sortedModes } : msg));
          });
          return;
        }
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!inputMessage.trim()) {
      return;
    }
    const datetime = getDateTime();
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
          if (result.value.response.data.status === 'Success') {
            const response = result.value.response.data.data;
            const responseMode: ResponseMode = {
              message: response.message,
              sources: response.info.sources,
              model: response.info.model,
              total_tokens: response.info.total_tokens,
              response_time: response.info.response_time,
              cypher_query: response.info.cypher_query,
              graphonly_entities: response.info.context ?? [],
              entities: response.info.entities ?? [],
              nodeDetails: response.info.nodedetails,
              error: response.info.error,
              metric_question: response.info?.metric_details?.question ?? '',
              metric_answer: response.info?.metric_details?.answer ?? '',
              metric_contexts: response.info?.metric_details?.contexts ?? '',
            };
            if (index === 0) {
              simulateTypingEffect(chatbotMessageId, responseMode, mode, responseMode.message);
            } else {
              setListMessages((prev) =>
                prev.map((msg) =>
                  (msg.id === chatbotMessageId ? { ...msg, modes: { ...msg.modes, [mode]: responseMode } } : msg)
                )
              );
            }
          } else {
            const response = result.value.response.data;
            const responseMode: ResponseMode = {
              message: response.message,
              error: response.error,
            };
            if (index === 0) {
              simulateTypingEffect(chatbotMessageId, responseMode, response.data, responseMode.message);
            } else {
              setListMessages((prev) =>
                prev.map((msg) =>
                  (msg.id === chatbotMessageId ? { ...msg, modes: { ...msg.modes, [mode]: responseMode } } : msg)
                )
              );
            }
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
                    [chatModes[0]]: {
                      message: 'An error occurred while processing your request.',
                      error: error.message,
                    },
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
    setLoading(() => listMessages.some((msg) => msg.isLoading || msg.isTyping));
  }, [listMessages]);

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
    setTimeout(() => {
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

  const handleSpeak = (chatMessage: string, id: number) => {
    speak({ text: chatMessage }, typeof window !== 'undefined' && window.speechSynthesis != undefined);
    setListMessages((msgs) => {
      const messageWithSpeaking = msgs.find((msg) => msg.speaking);
      return msgs.map((msg) => (msg.id === id && !messageWithSpeaking ? { ...msg, speaking: true } : msg));
    });
  };

  const handleSwitchMode = (messageId: number, newMode: string) => {
    const activespeechId = listMessages.find((msg) => msg.speaking)?.id;
    if (speaking && messageId === activespeechId) {
      cancel();
      setListMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, currentMode: newMode, speaking: false } : msg))
      );
    } else {
      setListMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, currentMode: newMode } : msg)));
    }
  };

  const detailsHandler = useCallback((chat: Messages, previousActiveChat: Messages | null) => {
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
    setMetricQuestion(currentMode.metric_question ?? '');
    setMetricContext(currentMode.metric_contexts ?? '');
    setMetricAnswer(currentMode.metric_answer ?? '');
    setActiveChat(chat);
    if (
      (previousActiveChat != null && chat.id != previousActiveChat?.id) ||
      (previousActiveChat != null && chat.currentMode != previousActiveChat.currentMode)
    ) {
      setNodes([]);
      setChunks([]);
      setInfoEntities([]);
      setMetricDetails(null);
    }
    if (previousActiveChat != null && chat.id != previousActiveChat?.id) {
      setMultiModelMetrics([]);
    }
  }, []);

  const speechHandler = useCallback((chat: Messages) => {
    if (chat.speaking) {
      handleCancel(chat.id);
    } else {
      handleSpeak(chat.modes[chat.currentMode]?.message, chat.id);
    }
  }, []);

  return (
    <div className='n-bg-palette-neutral-bg-weak flex! flex-col justify-between min-h-full max-h-full overflow-hidden relative'>
      {isDeleteChatLoading && (
        <div className='chatbot-deleteLoader'>
          <Loader title='Deleting...'></Loader>
        </div>
      )}
      <div
        className={`flex! overflow-y-auto pb-12 min-w-full pl-5 pr-5 chatBotContainer ${
          isChatOnly ? 'min-h-[calc(100dvh-114px)] max-h-[calc(100dvh-114px)]' : ''
        } `}
      >
        <Widget className='n-bg-palette-neutral-bg-weak w-full' header='' isElevated={false}>
          <div className='flex! flex-col gap-4 gap-y-4'>
            {listMessages.map((chat, index) => {
              const messagechatModes = Object.keys(chat.modes);
              return (
                <div
                  ref={messagesEndRef}
                  key={chat.id}
                  className={clsx(`flex! gap-2.5`, {
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
                        size='large'
                        source={ChatBotAvatar}
                        status={connectionStatus ? 'online' : 'offline'}
                        shape='square'
                        type='image'
                      />
                    ) : (
                      <Avatar
                        className=''
                        hasStatus
                        name='KM'
                        size='large'
                        status={connectionStatus ? 'online' : 'offline'}
                        shape='square'
                        type='image'
                      />
                    )}
                  </div>
                  <Widget
                    header=''
                    isElevated={true}
                    className={`p-3! self-start ${isFullScreen ? 'max-w-[55%]' : ''} ${
                      chat.user === 'chatbot' ? 'n-bg-palette-neutral-bg-strong' : 'n-bg-palette-primary-bg-weak'
                    }`}
                  >
                    <div
                      className={`${
                        chat.isLoading && index === listMessages.length - 1 && chat.user === 'chatbot' ? 'loader' : ''
                      }`}
                    >
                      <ReactMarkdown className={!isFullScreen ? 'max-w-[250px]' : ''}>
                        {chat.modes[chat.currentMode]?.message || ''}
                      </ReactMarkdown>
                    </div>
                    <div>
                      <div>
                        <Typography variant='body-small' className='pt-2 font-bold'>
                          {chat.datetime}
                        </Typography>
                      </div>
                      {chat.user === 'chatbot' &&
                        chat.id !== 2 &&
                        !chat.isLoading &&
                        !chat.isTyping &&
                        (!isFullScreen ? (
                          <Flex
                            flexDirection='row'
                            justifyContent={messagechatModes.length > 1 ? 'space-between' : 'unset'}
                            alignItems='center'
                          >
                            <CommonActions
                              chat={chat}
                              copyHandler={handleCopy}
                              detailsHandler={detailsHandler}
                              listMessages={listMessages}
                              speechHandler={speechHandler}
                              activeChat={activeChat}
                            ></CommonActions>
                            {messagechatModes.length > 1 && (
                              <ChatModesSwitch
                                currentMode={chat.currentMode}
                                switchToOtherMode={(index: number) => {
                                  const modes = Object.keys(chat.modes);
                                  const modeswtich = modes[index];
                                  handleSwitchMode(chat.id, modeswtich);
                                }}
                                isFullScreen={false}
                                currentModeIndex={messagechatModes.indexOf(chat.currentMode)}
                                modescount={messagechatModes.length}
                              />
                            )}
                          </Flex>
                        ) : (
                          <Flex flexDirection='row' justifyContent='space-between' alignItems='center'>
                            <Flex flexDirection='row' justifyContent='space-between' alignItems='center'>
                              <CommonActions
                                chat={chat}
                                copyHandler={handleCopy}
                                detailsHandler={detailsHandler}
                                listMessages={listMessages}
                                speechHandler={speechHandler}
                                activeChat={activeChat}
                              ></CommonActions>
                            </Flex>
                            <Box>
                              {messagechatModes.length > 1 && (
                                <ChatModesSwitch
                                  currentMode={chat.currentMode}
                                  switchToOtherMode={(index: number) => {
                                    const modes = Object.keys(chat.modes);
                                    const modeswtich = modes[index];
                                    handleSwitchMode(chat.id, modeswtich);
                                  }}
                                  isFullScreen={isFullScreen}
                                  currentModeIndex={messagechatModes.indexOf(chat.currentMode)}
                                  modescount={messagechatModes.length}
                                />
                              )}
                            </Box>
                          </Flex>
                        ))}
                    </div>
                  </Widget>
                </div>
              );
            })}
          </div>
        </Widget>
      </div>
      <div className='n-bg-palette-neutral-bg-weak flex! gap-2.5 bottom-0 p-2.5 w-full'>
        <form onSubmit={handleSubmit} className={`flex! gap-2.5 w-full ${!isFullScreen ? 'justify-between' : ''}`}>
          <TextInput
            className={`n-bg-palette-neutral-bg-default flex-grow-7 ${
              isFullScreen ? 'w-[calc(100%-105px)]' : 'w-[70%]'
            }`}
            value={inputMessage}
            isFluid
            onChange={handleInputChange}
            htmlAttributes={{
              type: 'text',
              'aria-label': 'chatbot-input',
              name: 'chatbot-input',
            }}
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
          isOpen={showInfoModal}
          size={'large'}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <IconButton
              size='large'
              htmlAttributes={{
                title: 'download chat info',
              }}
              isClean
              ariaLabel='download chat info'
              isDisabled={metricsLoading || infoLoading}
              onClick={() => {
                downloadClickHandler(
                  {
                    chatResponse: activeChat,
                    chunks,
                    metricDetails,
                    communities,
                    responseTime,
                    entities: infoEntities,
                    nodes,
                    tokensUsed,
                    model,
                    multiModelMetrics,
                  },
                  downloadLinkRef,
                  'graph-builder-chat-details.json'
                );
              }}
            >
              <ArrowDownTrayIconOutline className='n-size-token-7' />
              <TextLink ref={downloadLinkRef} className='hidden!'>
                ""
              </TextLink>
            </IconButton>
            <IconButton
              size='large'
              htmlAttributes={{
                title: 'close pop up',
              }}
              ariaLabel='close pop up'
              isClean
              onClick={() => setShowInfoModal(false)}
            >
              <XMarkIconOutline className='n-size-token-7' />
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
            metricanswer={metricAnswer}
            metriccontexts={metricContext}
            metricquestion={metricQuestion}
            metricmodel={model}
            nodes={nodes}
            infoEntities={infoEntities}
            relationships={relationships}
            chunks={chunks}
            metricDetails={activeChat != undefined && metricDetails != null ? metricDetails : undefined}
            metricError={activeChat != undefined && metricDetails != null ? (metricDetails.error as string) : ''}
            communities={communities}
            infoLoading={infoLoading}
            metricsLoading={metricsLoading}
            saveInfoEntitites={saveInfoEntitites}
            saveChatRelationships={saveChatRelationships}
            saveChunks={saveChunks}
            saveCommunities={saveCommunities}
            saveMetrics={saveMetrics}
            saveNodes={saveNodes}
            toggleInfoLoading={toggleInfoLoading}
            toggleMetricsLoading={toggleMetricsLoading}
            saveMultimodemetrics={saveMultimodemetrics}
            activeChatmodes={activeChat?.modes}
            multiModelMetrics={multiModelMetrics}
          />
        </Modal>
      </Suspense>
    </div>
  );
};

export default Chatbot;
