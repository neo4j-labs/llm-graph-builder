import { Menu } from '@neo4j-ndl/react';
import { Menuitems, Origin } from '../../types';

export default function CustomMenu({
  open,
  closeHandler,
  items,
  MenuAnchor,
  anchorOrigin,
  transformOrigin,
  anchorPortal = true,
  disableBackdrop = false,
}: {
  open: boolean;
  closeHandler: () => void;
  items: Menuitems[] | undefined;
  MenuAnchor: HTMLElement | null;
  anchorOrigin?: Origin;
  transformOrigin?: Origin;
  anchorPortal?: boolean;
  disableBackdrop?: boolean;
}) {
  return (
    <Menu
      open={open}
      onClose={closeHandler}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      anchorPortal={anchorPortal}
      anchorEl={MenuAnchor}
      disableBackdrop={disableBackdrop}
    >
      {items?.map((i, idx) => {
        return (
          <Menu.Item
            key={`${idx}${i.title}`}
            title={i.title}
            onClick={i.onClick}
            disabled={i.disabledCondition}
            className={i.isSelected ? i.selectedClassName : ''}
            description={i.description}
          />
        );
      })}
    </Menu>
  );
}
