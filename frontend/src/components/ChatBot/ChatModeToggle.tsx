import { useFileContext } from '../../context/UsersFiles';
import CustomMenu from '../UI/Menu';

export default function ChatModeToggle({
  menuAnchor,
  closeHandler = () => {},
  open,
}: {
  menuAnchor: HTMLElement | null;
  closeHandler?: () => void;
  open: boolean;
}) {
  const { setchatMode, chatMode } = useFileContext();

  return (
    <CustomMenu
      closeHandler={closeHandler}
      open={open}
      MenuAnchor={menuAnchor}
      items={[
        {
          title: 'Vector',
          onClick: () => {
            setchatMode('vector');
          },
          disabledCondition: false,
          description: `${chatMode === 'vector' ? 'selected' : ''}`,
        },
        {
          title: 'Vector + Graph',
          onClick: () => {
            setchatMode('graph+vector');
          },
          disabledCondition: false,
          description: `${chatMode === 'graph+vector' ? 'selected' : ''}`,
        },
      ]}
    ></CustomMenu>
  );
}
