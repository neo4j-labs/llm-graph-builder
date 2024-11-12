import { MessageContextWrapper, useMessageContext } from '../../context/UserMessages';
import UserCredentialsWrapper, { useCredentials } from '../../context/UserCredentials';
import Chatbot from './Chatbot';
import { getIsLoading } from '../../utils/Utils';
import { FileContextProvider } from '../../context/UsersFiles';
import { useEffect } from 'react';
import ExpandedChatButtonContainer from './ExpandedChatButtonContainer';
const ChatOnlyComponent: React.FC = () => (
    <UserCredentialsWrapper>
        <FileContextProvider>
            <MessageContextWrapper>
                <ChatContent />
            </MessageContextWrapper>
        </FileContextProvider>
    </UserCredentialsWrapper>
);
const ChatContent: React.FC = () => {
    const { clearHistoryData, messages, setMessages } = useMessageContext();
    const { connectionStatus, setUserCredentials, setConnectionStatus } = useCredentials();
    useEffect(() => {
        const initialise = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const uri = urlParams.get('uri');
            const user = urlParams.get('user');
            const encodedPassword = urlParams.get('password');
            const database = urlParams.get('database');
            const port = urlParams.get('port');
            const userDbVectorIndex = urlParams.get('userDbVectorIndex');
            const setCredentials = (credentials: {
                uri: string;
                userName: string;
                password: string;
                database: string;
                port: string;
                userDbVectorIndex?: string;
            }) => {
                setUserCredentials(credentials);
                setConnectionStatus(true);
                window.history.replaceState({}, document.title, window.location.pathname);
                localStorage.setItem('neo4j.connection', JSON.stringify(credentials));
            };
            if (uri && user && encodedPassword && database && port && userDbVectorIndex) {
                const password = atob(encodedPassword);
                setCredentials({ uri, userName: user, password: btoa(password), database, port, userDbVectorIndex });
            } else {
                const session = localStorage.getItem('neo4j.connection');
                if (session) {
                    const { uri, user, password, database, port, userDbVectorIndex } = JSON.parse(session);
                    setCredentials({ uri, userName: user, password, database, port, userDbVectorIndex });
                } else {
                    setConnectionStatus(false);
                }
            }
        };
        initialise();
    }, [setUserCredentials, setConnectionStatus]);
    return (
        <>
            <ExpandedChatButtonContainer
                deleteOnClick={()=>console.log('hello')}
                messages={messages ?? []} />
            <Chatbot
                isFullScreen
                isReadOnly
                messages={messages}
                setMessages={setMessages}
                clear={clearHistoryData}
                isLoading={getIsLoading(messages)}
                connectionStatus={connectionStatus}
            />
        </>
    );
};
export default ChatOnlyComponent;