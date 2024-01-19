import Neo4jLogoBW from '../../logo.svg';
import Neo4jLogoColor from '../../logo-color.svg';
import User from './User';
import { MoonIconOutline, SunIconOutline, Cog8ToothIconOutline } from '@neo4j-ndl/react/icons';
import { Typography, IconButton } from '@neo4j-ndl/react';

export default function Header({ themeMode, toggleTheme }: { themeMode: string; toggleTheme: () => void }) {
  return (
    <div
      className='n-bg-palette-neutral-bg-weak'
      style={{ padding: '4px', borderBottom: '2px solid rgb(var(--theme-palette-neutral-border-weak))' }}
    >
      <nav
        className='flex items-center justify-between'
        role='navigation'
        data-testid='navigation'
        id='navigation'
        aria-label='main navigation'
        style={{ display: 'flex', flexDirection: 'row' }}
      >
        <section
          className='flex w-1/3 shrink-0 grow-0'
          style={{ display: 'flex', minWidth: `200px`, flexGrow: 1, alignItems: 'center' }}
        >
          <Typography variant='h6' component='a' href='#app-bar-with-responsive-menu' sx={{}}>
            <img
              src={themeMode === 'dark' ? Neo4jLogoBW : Neo4jLogoColor }
              style={{ height: '32px', minHeight: '32px', minWidth: '32px' }}
              alt='Neo4j Logo'
            />
          </Typography>
        </section>
        <section className='items-center justify-end hidden w-1/3 grow-0 flex' style={{ flexGrow: 0 }}>
          <div>
            <div
              className='inline-flex gap-x-1'
              style={{ display: 'flex', flexGrow: 0, alignItems: 'center', gap: '4px' }}
            >
              <IconButton aria-label='Toggle Dark mode' clean size='large' onClick={toggleTheme}>
                {themeMode === 'dark' ? (
                  <span role='img' aria-label='sun'>
                    <SunIconOutline />
                  </span>
                ) : (
                  <span role='img' aria-label='moon'>
                    <MoonIconOutline />
                  </span>
                )}
              </IconButton>
              <IconButton aria-label='Toggle settings' size='large' clean>
                <Cog8ToothIconOutline />
              </IconButton>

              <Typography
                variant='subheading-large'
                style={{
                  ml: 'var(--space-8)',
                  mr: 'var(--space-8)',
                  width: '1px',
                  height: 'var(--space-16)',
                  backgroundColor: 'white',
                }}
              ></Typography>

              <User />
            </div>
          </div>
        </section>
      </nav>
    </div>
  );
}
