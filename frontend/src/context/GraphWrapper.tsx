import { createContext, useState, useContext, ReactNode, FC } from 'react';
import { GraphContextProps, GraphType } from '../types';
type GraphProps = {
    children: ReactNode;
};

export const GraphConnection = createContext<GraphContextProps>({
    graphLoading: false,
    setGraphLoading: () => null,
    openGraphView: false,
    setGraphViewOpen: () => null,
    viewPoint: 'tableView',
    setViewPoint: () => null,
    graphType: [],
    setGraphType: () => null
});

export const useGraphConnection = () => useContext(GraphConnection);

const GraphWrapper: FC<GraphProps> = ({ children }) => {
    const [graphLoading, setGraphLoading] = useState<boolean>(false);
    const [openGraphView, setGraphViewOpen] = useState<boolean>(false);
    const [viewPoint, setViewPoint] = useState<'tableView' | 'showGraphView' | 'chatInfoView' | 'neighborView'|'Chunk'>('tableView');
    const [graphType, setGraphType] = useState<GraphType[]>([]);
    const graphContextValue = {
        graphLoading,
        setGraphLoading,
        openGraphView,
        setGraphViewOpen,
        viewPoint,
        setViewPoint,
        graphType,
        setGraphType
    };
    return (
        <GraphConnection.Provider value={graphContextValue}>
            {children}
        </GraphConnection.Provider>
    );
};
export default GraphWrapper;