import { Menu } from '@neo4j-ndl/react';
import { Menuitems } from '../../types';
import { Key } from 'react';
export default function CustomMenu({
  open,
  closeHandler,
  items,
  anchorOrigin,
  isRoot = false,
  Key
}: {
  open: boolean;
  closeHandler: () => void;
  items: Menuitems[] | undefined;
  anchorOrigin: React.RefObject<HTMLElement | null>;
  isRoot?: boolean;
  Key?:Key
}) {
  return (
    <Menu
      key={Key}
      isOpen={open}
      onClose={(e) => {
        if(e!==undefined&&e.isTrusted){
          // closeHandler();
        }
      }}
      anchorRef={anchorOrigin}
      className='custom-menu'
      isRoot={isRoot}
    >
      {items?.map((i, idx) => (
        <Menu.Item
          key={`${idx}${i.title}`}
          title={i.title}
          onClick={i.onClick}
          isDisabled={i.disabledCondition}
          className={i.isSelected ? i.selectedClassName : ''}
          description={i.description}
        />
      ))}
    </Menu>
  );
}
