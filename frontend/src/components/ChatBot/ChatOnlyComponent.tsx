import { MessageContextWrapper, useMessageContext } from '../../context/UserMessages';
import UserCredentialsWrapper, { useCredentials } from '../../context/UserCredentials';
import Chatbot from './Chatbot';
import { getIsLoading } from '../../utils/Utils';
import { FileContextProvider } from '../../context/UsersFiles';
import { useEffect, useState, useCallback } from 'react';
import ExpandedChatButtonContainer from './ExpandedChatButtonContainer';
import ConnectionModal from '../Popups/ConnectionModal/ConnectionModal';
import { clearChatAPI } from '../../services/QnaAPI';
import { connectionState, UserCredentials } from '../../types';

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
    const date = new Date();
    const { clearHistoryData, messages, setMessages, setClearHistoryData } = useMessageContext();
    const { setUserCredentials, setConnectionStatus, connectionStatus } = useCredentials();
    const [openConnection, setOpenConnection] = useState<connectionState>({
        openPopUp: false,
        chunksExists: false,
        vectorIndexMisMatch: false,
        chunksExistsWithDifferentDimension: false,
    });

    const initialiseConnection = useCallback(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const uri = urlParams.get('uri');
        const user = urlParams.get('user');
        const encodedPassword = urlParams.get('password');
        const database = urlParams.get('database');
        const port = urlParams.get('port');
        const openModel = urlParams.get('open') === 'true';
        if (openModel || !(uri && user && encodedPassword && database && port)) {
            setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
        } else {
            const credentialsForAPI = { uri, userName: user, password: atob(atob(encodedPassword)), database, port };
            setUserCredentials({ ...credentialsForAPI });
            setConnectionStatus(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [connectionStatus, setUserCredentials]);
    
    useEffect(() => {
        initialiseConnection();
    }, [connectionStatus]);

    const handleConnectionSuccess = () => {
        setConnectionStatus(true);
        setOpenConnection((prev) => ({ ...prev, openPopUp: false }));
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('openModal');
        window.history.replaceState({}, document.title, window.location.pathname + '?' + urlParams.toString());
    };
    const deleteOnClick = async () => {
        try {
            setClearHistoryData(true);
            const response = await clearChatAPI(
                JSON.parse(localStorage.getItem('neo4j.connection') || '{}') as UserCredentials,
                sessionStorage.getItem('session_id') ?? ''
            );
            if (response.data.status !== 'Success') {
                setClearHistoryData(false);
            }
        } catch (error) {
            console.log(error);
            setClearHistoryData(false);
        }
    };
    useEffect(() => {
        if (clearHistoryData) {
            setMessages([
                {
                    datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
                    id: 2,
                    modes: {
                        'graph+vector+fulltext': {
                            message: 'Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
                        },
                    },
                    user: 'chatbot',
                    currentMode: 'graph+vector+fulltext',
                },
            ]);
            setClearHistoryData(false);
        }
    }, [clearHistoryData]);
    return (
        <>
            <ConnectionModal
                open={openConnection.openPopUp && !connectionStatus}
                setOpenConnection={setOpenConnection}
                setConnectionStatus={setConnectionStatus}
                isVectorIndexMatch={false}
                chunksExistsWithoutEmbedding={false}
                chunksExistsWithDifferentEmbedding={false}
                onSuccess={handleConnectionSuccess}
            />
            {connectionStatus && (
                <>
                    <ExpandedChatButtonContainer
                        isReadOnly
                        deleteOnClick={deleteOnClick}
                        messages={messages ?? []}
                    />
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
            )}
        </>
    );
};
export default ChatOnlyComponent;