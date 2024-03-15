import { SideNavigation } from '@neo4j-ndl/react';
import { ArrowRightIconOutline, ArrowLeftIconOutline } from '@neo4j-ndl/react/icons';
import { SideNavProps } from '../../types';

const SideNav: React.FC<SideNavProps> = ({ openDrawer, closeDrawer, isExpanded }) => {
  const handleClick = () => {
    if (isExpanded) {
      closeDrawer();
    }else{
      openDrawer()
    }
  };

  return (
    <div
      style={{
        height: 'calc(100vh - 60px)',
        minHeight: '200px',
        display: 'flex',
      }}
    >
      <SideNavigation iconMenu={true} expanded={false}>
        <SideNavigation.List>
          <SideNavigation.Item
            onClick={() => {
              handleClick();
            }}
            icon={
              isExpanded ? (
                <ArrowLeftIconOutline className='n-w-6 n-h-6' />
              ) : (
                <ArrowRightIconOutline className='n-w-6 n-h-6' />
              )
            }
          ></SideNavigation.Item>
        </SideNavigation.List>
      </SideNavigation>
    </div>
  );
};

export default SideNav;
