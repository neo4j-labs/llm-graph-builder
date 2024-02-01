import { Drawer } from '@neo4j-ndl/react';
import DropZone from '../DropZone';

export default function DrawerDropzone() {
  return (
    <div
      style={{
        height: 'calc(100vh - 68px)',
        minHeight: '700px',
        display: 'flex',
        width: '350px'
      }}
    >
      <>
        <Drawer closeable
          expanded
          isResizeable
          onExpandedChange={function Ha() { }}
          position="left"
          type="overlay"
        /><Drawer.Body><DropZone /></Drawer.Body>
        
      </>
    </div>
  );
}