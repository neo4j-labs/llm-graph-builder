import { Drawer } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import chatbotmessages from '../assets/ChatbotMessages.json';
import { useState } from 'react';
import { UserCredentials, messages } from '../types';
import { ArchiveBoxXMarkIconOutline } from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from './ButtonWithToolTip';
import { clearChatAPI } from '../services/QnaAPI';
import { useCredentials } from '../context/UserCredentials';

interface RightSideBarProps {
  showChatBot: boolean;
  closeChatBot: () => void;
}

const RightSideBar: React.FC<RightSideBarProps> = ({ showChatBot, closeChatBot }) => {
  const date = new Date();
  const [messages, setMessages] = useState<messages[]>([
    { ...chatbotmessages.listMessages[1], datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` },
  ]);
  const [clearHistoryData, setClearHistoryData] = useState<boolean>(false);
  const { userCredentials } = useCredentials();

  const deleteOnClick = async () => {
    try {
      const response = await clearChatAPI(userCredentials as UserCredentials, sessionStorage.getItem('session_id') ?? '')
      console.log('res', response);
      if(response.data.status === 'Success'){
        setClearHistoryData(true);
      }
    }
    catch (error) {
      console.log(error);
      setClearHistoryData(false);
    }
  }

  return (
    <Drawer
      expanded={showChatBot}
      isResizeable={false}
      type='push'
      closeable={true}
      position='right'
      onExpandedChange={function Ha(expanded) {
        if (!expanded) {
          closeChatBot();
        }
      }}
      key={'rightdrawer'}
    >
      <ButtonWithToolTip
        text='Clear Chat history'
        onClick={deleteOnClick}
        size='medium'
        clean
        placement='right'
      >
        <ArchiveBoxXMarkIconOutline className="n-size-token-7"  style={{padding: '2px'}}/>
      </ButtonWithToolTip>
      <Drawer.Body className='!overflow-y-hidden'>
        <Chatbot messages={messages} setMessages={setMessages} clear={clearHistoryData}></Chatbot>
      </Drawer.Body>
    </Drawer>
  );
};
export default RightSideBar;
