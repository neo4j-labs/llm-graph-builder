import { Menu } from '@neo4j-ndl/react';
interface Menuitems {
  title: string;
  onClick: () => void;
  disabledCondition: boolean;
}
export default function CustomMenu({
  open,
  closeHandler,
  items,
  MenuAnchor,
}: {
  open: boolean;
  closeHandler: () => void;
  items: Menuitems[];
  MenuAnchor: HTMLElement | null;
}) {
  return (
    <Menu
      open={open}
      onClose={closeHandler}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorPortal={true}
      anchorEl={MenuAnchor}
    >
      {items.map((i, idx) => {
        return (
          <Menu.Item key={`${idx}${i.title}`} title={i.title} onClick={i.onClick} disabled={i.disabledCondition} />
        );
      })}
    </Menu>
  );
}
