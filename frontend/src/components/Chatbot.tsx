/* eslint-disable no-confusing-arrow */
import { useEffect, useRef, useState } from 'react';
import { Button, Widget, Typography, Avatar, TextInput } from '@neo4j-ndl/react';
import ChatBotUserAvatar from '../assets/images/chatbot-user.png';
import ChatBotAvatar from '../assets/images/chatbot-ai.png';
import { ChatbotProps, UserCredentials } from '../types';
import { useCredentials } from '../context/UserCredentials';
import chatBotAPI from '../services/QnaAPI';
import { v4 as uuidv4 } from 'uuid';
import { useFileContext } from '../context/UsersFiles';

export default function Chatbot(props: ChatbotProps) {
  const { messages: listMessages, setMessages: setListMessages } = props;
  const [inputMessage, setInputMessage] = useState('');
  const formattedTextStyle = { color: 'rgb(var(--theme-palette-discovery-bg-strong))' };
  const [loading, setLoading] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const {model}=useFileContext()
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>(sessionStorage.getItem('session_id') ?? '');

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

  const simulateTypingEffect = (responseText: string, index = 0) => {
    if (index < responseText.length) {
      const nextIndex = index + 1;
      const currentTypedText = responseText.substring(0, nextIndex);
      if (index === 0) {
        const date = new Date();
        const datetime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        if (responseText.length <= 1) {
          setListMessages((msgs) => [
            ...msgs,
            { id: Date.now(), user: 'chatbot', message: currentTypedText, datetime: datetime, isTyping: true },
          ]);
        } else {
          setListMessages((msgs) => {
            const lastmsg = { ...msgs[msgs.length - 1] };
            lastmsg.id = Date.now();
            lastmsg.user = 'chatbot';
            lastmsg.message = currentTypedText;
            lastmsg.datetime = datetime;
            lastmsg.isTyping = true;
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
      setTimeout(() => simulateTypingEffect(responseText, nextIndex), 20);
    } else {
      setListMessages((msgs) => msgs.map((msg) => (msg.isTyping ? { ...msg, isTyping: false } : msg)));
    }
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!inputMessage.trim()) {
      return;
    }
    const date = new Date();
    let chatbotReply;
    const datetime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    const userMessage = { id: Date.now(), user: 'user', message: inputMessage, datetime: datetime };
    setListMessages((listMessages) => [...listMessages, userMessage]);
    try {
      setLoading(true);
      setInputMessage('');
      simulateTypingEffect(' ');
      const chatresponse = await chatBotAPI(userCredentials as UserCredentials, inputMessage, sessionId,model);
      chatbotReply = chatresponse?.data?.message;
      simulateTypingEffect(chatbotReply);
      setLoading(false);
    } catch (error) {
      chatbotReply = "Oops! It seems we couldn't retrieve the answer. Please try again later";
      setInputMessage('');
      simulateTypingEffect(chatbotReply);
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [listMessages]);

  return (
    <div className='n-bg-palette-neutral-bg-weak flex flex-col justify-between min-h-full max-h-full overflow-hidden w-[312px]'>
      <div className='flex overflow-y-auto pb-12 min-w-full chatBotContainer'>
        <Widget className='n-bg-palette-neutral-bg-weak' header='' isElevated={false}>
          <div className='flex flex-col gap-4 gap-y-4'>
            {listMessages.map((chat, index) => (
              <div
                ref={messagesEndRef}
                key={chat.id}
                className={`flex gap-2.5 items-end ${chat.user === 'chatbot' ? 'flex-row' : 'flex-row-reverse'} `}
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
                    chat.user === 'chatbot' ? 'n-bg-palette-neutral-bg-strong' : 'n-bg-palette-primary-bg-weak'
                  }`}
                >
                  <div
                    className={`${
                      loading && index === listMessages.length - 1 && chat.user == 'chatbot' ? 'loader' : ''
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
                  <div className='text-right align-bottom pt-3'>
                    <Typography variant='body-small'>{chat.datetime}</Typography>
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
