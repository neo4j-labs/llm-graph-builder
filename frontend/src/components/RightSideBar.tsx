import { Drawer } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import chatbotmessages from '../assets/ChatbotMessages.json';
interface RightSideBarProps {
  showChatBot: boolean;
  closeChatBot: () => void;
}
const RightSideBar: React.FC<RightSideBarProps> = ({ showChatBot, closeChatBot }) => {
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
      <Drawer.Body>
        <Chatbot messages={chatbotmessages.listMessages}></Chatbot>
      </Drawer.Body>
    </Drawer>
  );
};
export default RightSideBar;
