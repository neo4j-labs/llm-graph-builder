import { SideNavigation } from '@neo4j-ndl/react';
import { useState } from 'react';
// import { MagnifyingGlassIconOutline, DbmsIcon, BellAlertIconOutline, EyeIconOutline, EyeSlashIconOutline } from '@neo4j-ndl/react/icons';
// import { useBrowseCardVisibility } from '../../context/BrowseToggle';
// import GraphTable from '../GraphTable';
// import { EyeIconOutline  } from '@neo4j-ndl/react/icons';



// <EyeSlashIconOutline className="n-w-6 n-h-6" />

// <EyeIconOutline className="n-w-6 n-h-6" />
export default function SideNav() {
  const [expanded, setOnExpanded] = useState(true);
  // const [selected, setSelected] = useState('instances');
  // const handleClick = (item: string) => (e: any) => {
  //   e.preventDefault();
  //   // toggleBrowseCardVisibility()
  //   setSelected(item);
  // };
  const fullSizeClasses = 'n-w-full n-h-full';
  // const { toggleBrowseCardVisibility, showBrowseCard } = useBrowseCardVisibility()
  return (
    <div
      style={{
        height: 'calc(100vh - 68px)',
        minHeight: '700px',
        display: 'flex',
      }}
    >
      <SideNavigation iconMenu={true} expanded={expanded} onExpandedChange={setOnExpanded}>
        <SideNavigation.List>
          {/* <SideNavigation.Item
            href='#'
            selected={selected === 'search'}
            onClick={handleClick('search')}
            icon={<MagnifyingGlassIconOutline className={fullSizeClasses} />}
          >
            Search
          </SideNavigation.Item> */}
          {/* <SideNavigation.Item
            href='#'
            selected={selected === 'instances'}
            onClick={handleClick('instances')}
            icon={<DbmsIcon className={fullSizeClasses} />}
          >
            Instances
          </SideNavigation.Item> */}
          {/* <SideNavigation.Item href="#" selected={selected == "browse"} onClick={handleClick("browse")} icon={showBrowseCard ? <EyeSlashIconOutline></EyeSlashIconOutline> : <EyeIconOutline className="n-w-6 n-h-6" />}
          >
            Browse
          </SideNavigation.Item> */}
          {/* <SideNavigation.GroupHeader>Example</SideNavigation.GroupHeader> */}
          {/* <SideNavigation.Item
            href='#'
            selected={selected === 'notifications'}
            onClick={handleClick('notifications')}
            icon={<BellAlertIconOutline className={fullSizeClasses} />}
          >
            Notifications
          </SideNavigation.Item> */}
        </SideNavigation.List>
      </SideNavigation>
    </div>
  );
}
