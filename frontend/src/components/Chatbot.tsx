/* eslint-disable no-confusing-arrow */
import {useEffect, useRef, useState } from 'react';
import { Button, Widget, Typography, Avatar, TextInput, TextLink } from '@neo4j-ndl/react';
import ChatBotUserAvatar from '../assets/images/chatbot-user.png';
import ChatBotAvatar from '../assets/images/chatbot-ai.png';
import { ChatbotProps, UserCredentials } from '../types';
import { useCredentials } from '../context/UserCredentials';
import { chatBotAPI } from '../services/QnaAPI';
import { v4 as uuidv4 } from 'uuid';
import { useFileContext } from '../context/UsersFiles';
import { extractPdfFileName } from '../utils/Utils';

export default function Chatbot(props: ChatbotProps) {
  const { messages: listMessages, setMessages: setListMessages, isLoading } = props;
  const [inputMessage, setInputMessage] = useState('');
  const formattedTextStyle = { color: 'rgb(var(--theme-palette-discovery-bg-strong))' };
  const [loading, setLoading] = useState<boolean>(isLoading);
  const { userCredentials } = useCredentials();
  const { model } = useFileContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>(sessionStorage.getItem('session_id') ?? '');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  useEffect(() => {
    if (!sessionStorage.getItem('session_id')) {
      const id = uuidv4();
      setSessionId(id);
      console.log('id', id);
      sessionStorage.setItem('session_id', id);
    }
  }, []);

  const simulateTypingEffect = (
    response: { reply: string; entities?: [string]; model?: string; sources?: [string] },
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
              sources: response?.sources,
              entities: response?.entities,
              model: response?.model,
              isLoading: true,
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
            lastmsg.sources = response?.sources;
            lastmsg.entities = response?.entities;
            lastmsg.model = response?.model;
            lastmsg.isLoading = false;
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
    let chatEntities;
    const datetime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    const userMessage = { id: Date.now(), user: 'user', message: inputMessage, datetime: datetime };
    setListMessages([...listMessages, userMessage]);
    try {
      setInputMessage('');
      simulateTypingEffect({ reply: ' ' });
      const chatresponse = await chatBotAPI(userCredentials as UserCredentials, inputMessage, sessionId, model);
      chatbotReply = chatresponse?.data?.data?.message;
      chatSources = chatresponse?.data?.data?.info.sources;
      chatModel = chatresponse?.data?.data?.info.model;
      chatEntities = chatresponse?.data?.data?.info.entities;
      simulateTypingEffect({ reply: chatbotReply, entities: chatEntities, model: chatModel, sources: chatSources });
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

  return (
    <div className='n-bg-palette-neutral-bg-weak flex flex-col justify-between min-h-full max-h-full overflow-hidden'>
      <div className='flex overflow-y-auto pb-12 min-w-full chatBotContainer pl-3'>
        <Widget className='n-bg-palette-neutral-bg-weak' header='' isElevated={false}>
          <div className='flex flex-col gap-4 gap-y-4'>
            {listMessages.map((chat, index) => (
              <div
                ref={messagesEndRef}
                key={chat.id}
                className={`flex gap-2.5 ${chat.user === 'chatbot' ? 'flex-row' : 'flex-row-reverse'} `}
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
                      source={ChatBotUserAvatar}
                      status='online'
                      type='image'
                    />
                  )}
                </div>
                <Widget
                  header=''
                  isElevated={true}
                  className={`p-4 self-start ${
                    chat.user === 'chatbot'
                      ? 'n-bg-palette-neutral-bg-strong max-w-[315px]'
                      : 'n-bg-palette-primary-bg-weak max-w-[305px]'
                  }`}
                >
                  <div
                    className={`${
                      listMessages[index].isLoading && index === listMessages.length - 1 && chat.user == 'chatbot'
                        ? 'loader'
                        : ''
                    }`}
                  >
                    {chat.message.split(/`(.+?)`/).map((part, index) =>
                      index % 2 === 1 ? (
                        <span key={index} style={formattedTextStyle}>
                          {part}
                        </span>
                      ) : (
                        part
                      )
                    )}
                  </div>
                  <div>
                    <div>
                      <Typography variant='body-small' className='pt-2 font-bold'>
                        {chat.datetime}
                      </Typography>
                    </div>
                    {chat?.sources?.length ? (
                      <div className={`flex ${chat.sources?.length > 1 ? 'flex-col' : 'flex-row justify-end'} gap-1`}>
                        {chat.sources.map((link, index) => {
                          return (
                            <div className='text-right' key={index}>
                              {link.includes('storage.googleapis.com') ? (
                                <Typography variant='body-small'>GCS : {extractPdfFileName(link)}</Typography>
                              ) : link.startsWith('http') || link.startsWith('https') ? (
                                <TextLink href={link} externalLink={true}>
                                  Source
                                </TextLink>
                              ) : link.startsWith('s3') ? (
                                <Typography variant='body-small'>S3 File: {link.split('/').at(-1)}</Typography>
                              ) : (
                                <Typography variant='body-small'>{link}</Typography>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
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
    </div>
  );
}
