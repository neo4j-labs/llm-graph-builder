import { Drawer } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import chatbotmessages from '../assets/ChatbotMessages.json';
interface RightSideBarProps{
showChatBot:boolean;
}
const RightSideBar:React.FC<RightSideBarProps> = ({showChatBot}) => {
  return (
    <Drawer
      expanded={showChatBot}
      isResizeable={false}
      type='overlay'
      closeable={false}
      position='right'
      onExpandedChange={function Ha() {
      }}
      key={'rightdrawer'}
      className='h-full'
    >
      <Drawer.Body>
        <Chatbot messages={chatbotmessages.listMessages}></Chatbot>
      </Drawer.Body>
    </Drawer>
  );
};
export default RightSideBar;
