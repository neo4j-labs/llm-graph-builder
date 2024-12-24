import { createContext, useState, useContext, FunctionComponent, ReactNode } from 'react';
import { GraphContextProps } from '../types';
type Props = {
    children: ReactNode;
};

export const GraphConnection = createContext<GraphContextProps>({
    graphLoading: false,
    setGraphLoading: () => { },
});

export const useGraphConnection = () => useContext(GraphConnection);

const GraphWrapper: FunctionComponent<Props> = ({ children }) => {
    const [graphLoading, setGraphLoading] = useState<boolean>(false);
    const contextValue = {
        graphLoading,
        setGraphLoading,
    };
    return (
        <GraphConnection.Provider value={contextValue}>
            {children}
        </GraphConnection.Provider>
    );
};
export default GraphWrapper;