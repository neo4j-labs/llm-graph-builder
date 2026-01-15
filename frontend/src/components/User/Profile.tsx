import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Menu, Typography, IconButton, Avatar } from '@neo4j-ndl/react';
import { ChevronDownIconOutline } from '@neo4j-ndl/react/icons';
import { useAuth0 } from '@auth0/auth0-react';
import { getTokenLimits, TokenLimitsResponse } from '../../services/TokenLimits';
import { useCredentials } from '../../context/UserCredentials';
import { isNeo4jUser } from '../../utils/Utils';

export default function Profile() {
  const [showMenu, setShowOpen] = useState<boolean>(false);
  const [tokenLimits, setTokenLimits] = useState<TokenLimitsResponse | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const iconbtnRef = useRef<HTMLButtonElement | null>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth0();
  const { userCredentials, connectionStatus } = useCredentials();

  const fetchTokenLimits = useCallback(async () => {
    if (!userCredentials?.uri && !userCredentials?.email) {
      setTokenError('User credentials not available');
      return;
    }
    setIsLoadingTokens(true);
    setTokenError(null);
    try {
      const limits = await getTokenLimits(userCredentials);
      if (limits) {
        setTokenLimits(limits);
        setTokenError(null);
      } else {
        setTokenError('Failed to fetch token limits');
        setTokenLimits(null);
      }
    } catch (error) {
      setTokenError('Error loading token limits');
      setTokenLimits(null);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [userCredentials]);

  useEffect(() => {
    if (isAuthenticated && connectionStatus) {
      fetchTokenLimits();
    }
  }, [isAuthenticated, connectionStatus, fetchTokenLimits]);

  const settings = useMemo(() => {
    const isNeo4j = isNeo4jUser(user?.email);

    const getDailyTokensTitle = () => {
      if (isLoadingTokens) {
        return 'Daily Tokens Used: Loading...';
      }
      if (!connectionStatus) {
        return 'Daily Tokens Used: No DB connection';
      }
      if (tokenError) {
        return 'Daily Tokens Used: N/A';
      }
      const used = tokenLimits?.daily_used.toLocaleString() ?? 'N/A';
      if (isNeo4j) {
        return `Daily Tokens Used: ${used}`;
      }
      const limit = tokenLimits?.daily_limit.toLocaleString() ?? 'N/A';
      return `Daily Tokens Used: ${used} / ${limit}`;
    };

    const getMonthlyTokensTitle = () => {
      if (isLoadingTokens) {
        return 'Monthly Tokens: Loading...';
      }
      if (!connectionStatus) {
        return 'Monthly Tokens Used: No DB connection';
      }
      if (tokenError) {
        return 'Monthly Tokens Used: N/A';
      }
      const used = tokenLimits?.monthly_used.toLocaleString() ?? 'N/A';
      if (isNeo4j) {
        return `Monthly Tokens Used: ${used}`;
      }
      const limit = tokenLimits?.monthly_limit.toLocaleString() ?? 'N/A';
      return `Monthly Tokens Used: ${used} / ${limit}`;
    };

    const tokenItems = [
      {
        title: getDailyTokensTitle(),
        onClick: () => {},
        disabled: true,
      },
      {
        title: getMonthlyTokensTitle(),
        onClick: () => {},
        disabled: true,
      },
      {
        title: 'Get Latest Usage',
        onClick: () => {
          fetchTokenLimits();
        },
        disabled: isLoadingTokens,
      },
    ];

    return [
      ...tokenItems,
      {
        title: 'Logout',
        onClick: () => {
          logout({ logoutParams: { returnTo: `${window.location.origin}/readonly` } });
        },
      },
    ];
  }, [tokenLimits, isLoadingTokens, tokenError, fetchTokenLimits, logout, user?.email]);

  const handleClick = () => {
    setShowOpen(true);
  };
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
            size='large'
            type='letters'
            shape='square'
          />
          <div className='flex flex-col'>
            <Typography variant='body-medium' className='p-0.5'>
              {user?.name?.split('@')[0] ?? 'Jhon doe'}
            </Typography>

            <Typography variant='body-small' className='p-0.5'>
              {user?.email ?? 'john.doe@neo4j.com'}
            </Typography>
          </div>
          <IconButton ref={iconbtnRef} ariaLabel='settings' isClean onClick={handleClick}>
            <ChevronDownIconOutline />
          </IconButton>
          <Menu anchorRef={iconbtnRef} isOpen={showMenu} onClose={handleClose}>
            <Menu.Items>
              {settings.map((setting, index) => (
                <Menu.Item
                  key={`${setting.title}-${index}`}
                  onClick={() => !('disabled' in setting && setting.disabled) && setting.onClick()}
                  title={setting.title}
                  isDisabled={'disabled' in setting ? setting.disabled : false}
                />
              ))}
            </Menu.Items>
          </Menu>
        </>
      </div>
    );
  }
  return null;
}
