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
      onClose={closeHandler}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      anchorPortal={true}
      anchorEl={MenuAnchor}
    >
      {items.map((i, idx) => {
        return (
          <Menu.Item
            description={i.description}
            key={`${idx}${i.title}`}
            title={i.title}
            onClick={i.onClick}
            disabled={i.disabledCondition}
          />
        );
      })}
    </Menu>
  );
}
