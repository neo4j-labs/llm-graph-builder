import { SideNavigation } from '@neo4j-ndl/react';
import { useState } from 'react';
import { ArrowUpTrayIconOutline } from '@neo4j-ndl/react/icons';
import { SideNavProps } from '../../types';

const SideNav: React.FC<SideNavProps> = ({ openDrawer, closeDrawer, isExpanded }) => {
  const [expanded, setOnExpanded] = useState(false);

  const handleClick = () => {
    openDrawer();
    console.log('hello', expanded)
    if (isExpanded) {
      closeDrawer();
    }
  };
 
  return (
    <div
      style={{
        height: 'calc(100vh - 68px)',
        minHeight: '200px',
        display: 'flex',
      }}
    >
      <SideNavigation iconMenu={true} expanded={false} onExpandedChange={setOnExpanded}>
        <SideNavigation.List>
          <SideNavigation.Item
            onClick={() => { handleClick() }}
            icon={<ArrowUpTrayIconOutline className="n-w-6 n-h-6" />}
          >
          </SideNavigation.Item>
        </SideNavigation.List>
      </SideNavigation>
    </div>
  );
}

export default SideNav;