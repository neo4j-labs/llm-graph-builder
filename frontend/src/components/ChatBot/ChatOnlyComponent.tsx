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
            if (uri && user && encodedPassword && database && port) {
                const password = atob(encodedPassword);
                console.log('password', password);
                const credentials = { uri, userName: user, password, database, port };
                localStorage.setItem('neo4j.connection.popout', JSON.stringify(credentials));
                const credentialsForApi = { uri, userName: user, password: atob(password), database, port };
                setUserCredentials(credentialsForApi);
                setConnectionStatus(true);
                // Clean up the URL by removing query parameters
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                console.warn('Incomplete URL parameters for credentials.');
                setConnectionStatus(false);
            }
        };
        initialise();
    }, [setUserCredentials, setConnectionStatus]);
    return (
        <>
            <ExpandedChatButtonContainer
                deleteOnClick={() => console.log('hello')}
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