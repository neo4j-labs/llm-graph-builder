import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Menu, Typography, IconButton, Avatar } from '@neo4j-ndl/react';
import { ChevronDownIconOutline } from '@neo4j-ndl/react/icons';
import { useAuth0 } from '@auth0/auth0-react';
import userDetails from '../../services/UserDetails';
import { useCredentials } from '../../context/UserCredentials';

export default function Profile() {
  const [showMenu, setShowOpen] = useState<boolean>(false);
  const iconbtnRef = useRef<HTMLButtonElement | null>(null);
  const { setNeo4jUser, setIsReadOnlyUser, userCredentials } = useCredentials();
  const { user, isAuthenticated, isLoading, logout } = useAuth0();
  const settings = useMemo(
    () => [
      {
        title: 'Logout',
        onClick: () => {
          logout({ logoutParams: { returnTo: `${window.location.origin}/readonly` } });
        },
      },
    ],
    []
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated && userCredentials !== null) {
      (async () => {
        try {
          const userdetails = await userDetails();
          if (userdetails.status === 'Failed') {
            throw new Error(userdetails.error);
          }
          setNeo4jUser(userdetails.data.is_neo4j_user);
          setIsReadOnlyUser(!userdetails.data.write_access);
        } catch (error) {
          console.log(`error in userDetails api, ${error}`);
        }
      })();
    }
  }, [isLoading, isAuthenticated, userCredentials]);
  const handleClick = useCallback(() => {
    setShowOpen(true);
  }, []);
  const handleClose = useCallback(() => {
    setShowOpen(false);
  }, []);

  if (isLoading) {
    return <Avatar></Avatar>;
  }
  if (isAuthenticated) {
    return (
      <div className=' p-1.5 h-12 profile-container'>
        <>
          <Avatar
            className='md:flex hidden'
            name={user?.name?.charAt(0).toLocaleUpperCase()}
            shape='square'
            size='large'
            type='letters'
          />
          <div className='flex flex-col'>
            <Typography variant='body-medium' className='p-0.5'>
              {user?.name?.split('@')[0] ?? 'Jhon doe'}
            </Typography>

            <Typography variant='body-small' className='p-0.5'>
              {user?.email ?? 'john.doe@neo4j.com'}
            </Typography>

            <Menu className='mt-1.5 ml-4' anchorRef={iconbtnRef} isOpen={showMenu} onClose={handleClose}>
              <Menu.Items>
                {settings.map((setting) => (
                  <Menu.Item key={setting.title} onClick={() => setting.onClick()} title={setting.title} />
                ))}
              </Menu.Items>
            </Menu>
          </div>
          <IconButton ref={iconbtnRef} ariaLabel='settings' isClean onClick={handleClick}>
            <ChevronDownIconOutline />
          </IconButton>
        </>
      </div>
    );
  }
  return null;
}
