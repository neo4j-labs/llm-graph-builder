import { useRef, useState } from 'react';
import { Menu, Typography, IconButton, Avatar } from '@neo4j-ndl/react';
import { ChevronDownIconOutline } from '@neo4j-ndl/react/icons';

const settings = ['Profile', 'Logout'];

export default function Profile() {
  const [showMenu, setShowOpen] = useState<boolean>(false);
  const iconbtnRef = useRef<HTMLButtonElement | null>(null);
  const handleClick = () => {
    setShowOpen(true);
  };
  const handleClose = () => {
    setShowOpen(false);
  };

  const menuSelect = (e: string) => {
    window.alert(e);
    handleClose();
  };

  return (
    <div
      className='hidden 
      md:flex md:p-1.5 md:gap-2 md:h-12 md:items-center md:inline-block 
      md:border md:border-[rgb(var(--theme-palette-neutral-border-strong))] md:rounded-xl'
    >
      <Avatar className='md:flex hidden' name='JD' shape='square' size='large' type='letters' />

      <div className='flex flex-col'>
        <Typography variant='body-medium' className='p-0.5'>
          John Doe
        </Typography>

        <Typography variant='body-small' className='p-0.5'>
          john.doe@neo4j.com
        </Typography>

        <Menu className='mt-1.5 ml-4' anchorRef={iconbtnRef} isOpen={showMenu} onClose={handleClose}>
          <Menu.Items>
            {settings.map((setting) => (
              <Menu.Item key={setting} onClick={() => menuSelect(setting)} title={setting} />
            ))}
          </Menu.Items>
        </Menu>
      </div>
      <IconButton ref={iconbtnRef} ariaLabel='settings' isClean onClick={handleClick}>
        <ChevronDownIconOutline />
      </IconButton>
    </div>
  );
}
