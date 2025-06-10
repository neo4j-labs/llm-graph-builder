import { DragIcon } from '@neo4j-ndl/react/icons';
import type { ResizeCallback } from 're-resizable';
import { Resizable } from 're-resizable';

type ResizePanelProps = {
  children: React.ReactNode;
  open: boolean;
  onResizeStop?: ResizeCallback;
  defaultWidth?: number;
};

export const ResizePanelDetails = ({ children, open, onResizeStop }: ResizePanelProps) => {
  if (!open) {
    return null;
  }
  return (
    <Resizable
      defaultSize={{
        width: 400,
        height: '100%',
      }}
      minWidth={230}
      maxWidth='72%'
      enable={{
        top: false,
        right: false,
        bottom: false,
        left: true,
        topRight: false,
        bottomRight: false,
        bottomLeft: false,
        topLeft: false,
      }}
      handleComponent={{ left: <DragIcon className='absolute top-1/2 h-6 w-6' /> }}
      handleClasses={{ left: 'ml-1' }}
      onResizeStop={onResizeStop}
    >
      <div className='legend_div'>{children}</div>
    </Resizable>
  );
};
const Title = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='ml-4 flex! items-center' style={{ gridArea: 'title' }}>
      {children}
    </div>
  );
};
ResizePanelDetails.Title = Title;

const Content = ({ children }: { children: React.ReactNode }) => {
  return <section style={{ gridArea: 'content' }}>{children}</section>;
};
ResizePanelDetails.Content = Content;
