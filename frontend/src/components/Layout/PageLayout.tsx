import DrawerDropzone from './DrawerDropzone';
import Content from '../Content';
import SideNav from './SideNav';
import { useState } from 'react';

export default function PageLayout() {
  const [isExpanded, setIsexpanded] = useState<boolean>(true);
  return (
    <div style={{ maxHeight: 'calc(100vh - 60px)', display: 'flex', overflow: 'hidden' }}>
      <SideNav
        isExpanded={isExpanded}
        openDrawer={() => {
          setIsexpanded(true);
        }}
        closeDrawer={() => {
          setIsexpanded(false);
        }}
      />
      <DrawerDropzone isExpanded={isExpanded} />
      <Content isExpanded={isExpanded} />
    </div>
  );
}
