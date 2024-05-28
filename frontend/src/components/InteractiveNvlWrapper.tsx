import { useCallback, useMemo, useRef } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import NVL, { NvlOptions } from '@neo4j-nvl/base';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { IconButtonArray } from '@neo4j-ndl/react';
import {
    FitToScreenIcon,
    MagnifyingGlassMinusIconOutline,
    MagnifyingGlassPlusIconOutline,
} from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from './ButtonWithToolTip';

interface InteractiveNvlWrapperComponentProps {
    nodes: Node[];
    relationships: Relationship[];
    handleZoomToFit: () => void;
}
const InteractiveNvlWrapperComponent: React.FunctionComponent<InteractiveNvlWrapperComponentProps> = ({
    nodes,
    relationships,
    handleZoomToFit,
}) => {
    const nvlRef = useRef<NVL>(null);
    const mouseEventCallbacks = useMemo(
        () => ({
            onPan: true,
            onZoom: true,
            onDrag: true,
        }),
        []
    );
    const nvlOptions: NvlOptions = useMemo(
        () => ({
            allowDynamicMinZoom: true,
            disableWebGL: true,
            maxZoom: 3,
            minZoom: 0.05,
            relationshipThreshold: 0.55,
            useWebGL: false,
            instanceId: 'graph-preview',
            initialZoom: 0.2,
        }),
        []
    );
    const nvlCallbacks = useMemo(
        () => ({
            onLayoutComputing(isComputing: boolean) {
                if (!isComputing) {
                    handleZoomToFit();
                }
            },
        }),
        [handleZoomToFit]
    );
    const handleZoomIn = useCallback(() => {
        nvlRef.current?.setZoom(nvlRef.current.getScale() * 1.3);
    }, []);
    const handleZoomOut = useCallback(() => {
        nvlRef.current?.setZoom(nvlRef.current.getScale() * 0.7);
    }, []);
    return (
        <>
            <InteractiveNvlWrapper
                nodes={nodes}
                rels={relationships}
                nvlOptions={nvlOptions}
                ref={nvlRef}
                mouseEventCallbacks={{ ...mouseEventCallbacks }}
                interactionOptions={{
                    selectOnClick: true,
                }}
                nvlCallbacks={nvlCallbacks}
                
            />
            <IconButtonArray orientation='vertical' floating className='absolute bottom-4 right-4'>
                <ButtonWithToolTip text='Zoom in' onClick={handleZoomIn} placement='left'>
                    <MagnifyingGlassPlusIconOutline />
                </ButtonWithToolTip>
                <ButtonWithToolTip text='Zoom out' onClick={handleZoomOut} placement='left'>
                    <MagnifyingGlassMinusIconOutline />
                </ButtonWithToolTip>
                <ButtonWithToolTip text='Zoom to fit' onClick={handleZoomToFit} placement='left'>
                    <FitToScreenIcon />
                </ButtonWithToolTip>
            </IconButtonArray>
        </>
    );
};
export default InteractiveNvlWrapperComponent;
