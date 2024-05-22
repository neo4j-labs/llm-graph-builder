import { Drawer, LoadingSpinner } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import { useState, useEffect, useRef } from 'react';
import { UserCredentials, Messages } from '../types';
import { clearChatAPI } from '../services/QnaAPI';
import { useCredentials } from '../context/UserCredentials';
import IconsPlacement from './Layout/Icons';
import { useMessageContext } from '../context/UserMessages';
import { getDateTime, postMessageToFullscreen, saveStateToStorage } from '../utils/Utils';

interface RightSideBarProps {
  showChatBot: boolean;
  closeChatBot: () => void;
  openChatBot: () => void;
}
const RightSideBar: React.FC<RightSideBarProps> = ({ showChatBot, closeChatBot }) => {
  const { messages, setMessages, clearData, setClearData } = useMessageContext();
  const { userCredentials } = useCredentials();
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const rightSidebarWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    const storedState = sessionStorage.getItem('rightSidebarState');
    if (storedState) {
      const parsedState = JSON.parse(storedState);
      setMessages(parsedState.messages);
      setClearData(parsedState.clearHistoryData);
      setIsFullScreen(parsedState.isFullScreen);
    }
  }, []);

  // const saveStateToStorage = (newMessages: Messages[]) => {
  //   const stateToStore = {
  //     messages: newMessages,
  //     clearHistoryData,
  //     isFullScreen,
  //   };
  //   sessionStorage.setItem('rightSidebarState', JSON.stringify(stateToStore));
  // };

  // const postMessageToFullscreen = (newMessages: Messages[]) => {
  //   if (fullscreenWindowRef.current) {
  //     // const state = JSON.parse(sessionStorage.getItem('rightSidebarState') || '{}');
  //     const stateToStore = {
  //       messages: newMessages,
  //       clearHistoryData,
  //       isFullScreen,
  //     };
  //     fullscreenWindowRef.current.postMessage({ type: 'updateState', data: stateToStore }, window.location.origin);
  //   }
  // };
  const getIsLoading = (messages: Messages[]) => {
    return messages.some((msg) => msg.isTyping || msg.isLoading);
  };
  console.log('messages in right panel', messages);

  const deleteOnClick = async () => {
    try {
      setClearData(true);
      const response = await clearChatAPI(userCredentials as UserCredentials, sessionStorage.getItem('session_id') ?? '');
      if (response.data.status === 'Success') {
        const newMessages = [
          {
            datetime: getDateTime(),
            id: 2,
            message: 'Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
            sources: ['https://neo4j.com/'],
            user: 'chatbot',
          },
        ];
        setMessages(newMessages);
        saveStateToStorage(newMessages, clearData);
        postMessageToFullscreen(newMessages, clearData, rightSidebarWindowRef);
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
    } finally {
      setClearData(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullScreen(!isFullScreen);
    saveStateToStorage(messages, clearData);
    const newWindow = window.open('/chat-widget-preview', '_blank');
    if (newWindow) {
      rightSidebarWindowRef.current = newWindow;
      newWindow.onload = () => {
        postMessageToFullscreen(messages, clearData, rightSidebarWindowRef);
      };
    }
    else {
      console.error('failed');
    };
  }


  return (
    <>
      <Drawer
        expanded={showChatBot}
        isResizeable={false}
        type="push"
        position="right"
        key="rightdrawer"
        className="grow"
        closeable={false}
      >
        <IconsPlacement
          closeChatBot={closeChatBot}
          deleteOnClick={deleteOnClick}
          messages={messages}
          isFullscreen={isFullScreen}
          toggleToFullScreen={toggleFullscreen}
        />
        <Drawer.Body className="!overflow-y-hidden !px-0">
          {clearData ? (
            <LoadingSpinner size="large" className="top-72 left-52" />
          ) : (
            <Chatbot
              messages={messages}
              setMessages={setMessages}
              broadcastMessages={(newMessages: Messages[]) => {
                saveStateToStorage(newMessages, clearData)
                postMessageToFullscreen(newMessages, clearData, rightSidebarWindowRef);
              }}
              clear={clearData}
              isLoading={getIsLoading(messages)}
              fullScreen={isFullScreen}
            />
          )}
        </Drawer.Body>
      </Drawer>
    </>
  );
};
export default RightSideBar;