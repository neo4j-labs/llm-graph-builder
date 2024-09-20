import { Menu } from '@neo4j-ndl/react';
import { Menuitems, Origin } from '../../types';
export default function CustomMenu({
  open,
  closeHandler,
  items,
  MenuAnchor,
  anchorOrigin,
  transformOrigin,
}: {
  open: boolean;
  closeHandler: () => void;
  items: Menuitems[];
  MenuAnchor: HTMLElement | null;
  anchorOrigin?: Origin;
  transformOrigin?: Origin;
}) {
  return (
    <Menu
      open={open}
      onClose={() => {
        closeHandler();
      }}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      anchorPortal={true}
      anchorEl={MenuAnchor}
      disableBackdrop={disableBackdrop}
      className='custom-menu'
    >
      {items?.map((i, idx) => (
        <Menu.Item
          key={`${idx}${i.title}`}
          title={i.title}
          onClick={() => {
            i.onClick();
            closeHandler();
          }}
          disabled={i.disabledCondition}
          className={i.isSelected ? i.selectedClassName : ''}
          description={i.description}
        />
      ))}
    </Menu>
  );
}
