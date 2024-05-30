import React from 'react';
import { SideNavigation } from '@neo4j-ndl/react';
import { ArrowRightIconOutline, ArrowLeftIconOutline, TrashIconOutline } from '@neo4j-ndl/react/icons';
import { SideNavProps } from '../../types';

const SideNav: React.FC<SideNavProps> = ({ position, toggleDrawer, isExpanded, deleteOnClick }) => {
  const handleClick = () => {
    toggleDrawer();
  };
  return (
    <div style={{ height: 'calc(100vh - 58px)', minHeight: '200px', display: 'flex' }}>
      <SideNavigation iconMenu={true} expanded={false} position={position}>
        <SideNavigation.List>
          <SideNavigation.Item
            onClick={handleClick}
            icon={
              isExpanded ? (
                position === 'left' ? (
                  <ArrowLeftIconOutline className='n-w-6 n-h-6' />
                ) : (
                  <ArrowRightIconOutline className='n-w-6 n-h-6' />
                )
              ) : position === 'left' ? (
                <ArrowRightIconOutline className='n-w-6 n-h-6' />
              ) : (
                <ArrowLeftIconOutline className='n-w-6 n-h-6' />
              )
            }
          />
          {position === 'right' && (
            <>
              <SideNavigation.Item icon={<TrashIconOutline />} onClick={deleteOnClick} />
            </>
          )}
        </SideNavigation.List>
      </SideNavigation>
    </div>
  );
};
export default SideNav;
