import { Menu } from '@neo4j-ndl/react';
import { Menuitems } from '../../types';
export default function CustomMenu({
  open,
  closeHandler,
  items,
  anchorOrigin,
  isRoot=false
}: {
  open: boolean;
  closeHandler: () => void;
  items: Menuitems[] | undefined;
  anchorOrigin: React.RefObject<HTMLElement | null>;
  isRoot?:boolean
}) {
  return (
    <Menu
      isOpen={open}
      onClose={() => {
        closeHandler();
      }}
      anchorRef={anchorOrigin}
      className='custom-menu'
      isRoot={isRoot}
    >
      {items?.map((i, idx) => (
        <Menu.Item
          key={`${idx}${i.title}`}
          title={i.title}
          onClick={() => {
            i.onClick();
            closeHandler();
          }}
          isDisabled={i.disabledCondition}
          className={i.isSelected ? i.selectedClassName : ''}
          description={i.description}
          
        />
      ))}
    </Menu>
  );
}
