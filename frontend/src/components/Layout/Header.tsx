import Neo4jLogoBW from '../../logo.svg';
import Neo4jLogoColor from '../../logo-color.svg';
import {
  MoonIconOutline,
  SunIconOutline,
  CodeBracketSquareIconOutline,
  Cog8ToothIconOutline,
  InformationCircleIconOutline,
} from '@neo4j-ndl/react/icons';
import { StatusIndicator, Typography } from '@neo4j-ndl/react';
import { useCallback } from 'react';
import IconButtonWithToolTip from '../IconButtonToolTip';
import { tooltips } from '../../utils/Constants';

export default function Header({
  themeMode,
  toggleTheme,
  openSettingsModal,
}: {
  themeMode: string;
  toggleTheme: () => void;
  openSettingsModal: () => void;
}) {
  const handleURLClick = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  const isSchema = localStorage.getItem('isSchema');

  return (
    <div
      className='n-bg-palette-neutral-bg-weak p-1'
      style={{ borderBottom: '2px solid rgb(var(--theme-palette-neutral-border-weak))' }}
    >
      <nav
        className='flex items-center justify-between flex-row'
        role='navigation'
        data-testid='navigation'
        id='navigation'
        aria-label='main navigation'
      >
        <section className='flex w-1/3 shrink-0 grow-0 items-center grow min-w-[200px]'>
          <Typography variant='h6' component='a' href='#app-bar-with-responsive-menu' sx={{}}>
            <img
              src={themeMode === 'dark' ? Neo4jLogoBW : Neo4jLogoColor}
              className='h-8 min-h-8 min-w-8'
              alt='Neo4j Logo'
            />
          </Typography>
        </section>
        <section className='items-center justify-end w-1/3 grow-0 flex'>
          <div>
            <div
              className='inline-flex gap-x-1'
              style={{ display: 'flex', flexGrow: 0, alignItems: 'center', gap: '4px' }}
            >
              <IconButtonWithToolTip
                text={tooltips.documentation}
                onClick={() => handleURLClick('https://neo4j.com/labs/genai-ecosystem/llm-graph-builder')}
                size='large'
                clean
                placement='left'
                label={tooltips.documentation}
              >
                <InformationCircleIconOutline className='n-size-token-7' />
              </IconButtonWithToolTip>

              <IconButtonWithToolTip
                label={tooltips.github}
                onClick={() => handleURLClick('https://github.com/neo4j-labs/llm-graph-builder/issues')}
                text={tooltips.github}
                size='large'
                clean
              >
                <CodeBracketSquareIconOutline />
              </IconButtonWithToolTip>
              <IconButtonWithToolTip
                label={tooltips.theme}
                text={tooltips.theme}
                clean
                size='large'
                onClick={toggleTheme}
              >
                {themeMode === 'dark' ? (
                  <span role='img' aria-label='sun'>
                    <SunIconOutline />
                  </span>
                ) : (
                  <span role='img' aria-label='moon'>
                    <MoonIconOutline />
                  </span>
                )}
              </IconButtonWithToolTip>
              <div className='flex items-center'>

                <IconButtonWithToolTip
                  label={tooltips.settings}
                  text={tooltips.settings}
                  size='large'
                  clean
                  onClick={openSettingsModal}
                  placement='left'
                >
                  <Cog8ToothIconOutline />
                </IconButtonWithToolTip>
                <StatusIndicator style={{ marginLeft: '-8px' }} type={isSchema ? 'success' : 'danger'} />
              </div>
              {/* <Avatar
                hasStatus
                size='large'
                source={Setting}
                status={isSchema ? 'online' : 'offline'}
                type='image'
                onClick={openSettingsModal}
                label={tooltips.settings}
              /> */}
            </div>
          </div>
        </section>
      </nav>
    </div>
  );
}
