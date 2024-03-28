import { Button, IconButton, Tip } from '@neo4j-ndl/react';

const ButtonWithToolTip = ({
  text,
  children,
  onClick,
  ishrefButton,
  href,
  target,
}: {
  text: string;
  children: React.ReactNode;
  onClick?: () => void;
  ishrefButton?: boolean;
  href?: string;
  target?: string;
}) => {
  return (
    <Tip allowedPlacements={['left']}>
      <Tip.Trigger>
        {ishrefButton ? (
          <Button fill='outlined' href={href} target={target}>
            {children}
          </Button>
        ) : (
          <IconButton aria-label={text} size='medium' clean grouped onClick={onClick}>
            {children}
          </IconButton>
        )}
      </Tip.Trigger>
      <Tip.Content isPortaled={false} style={{ whiteSpace: 'nowrap' }}>
        {text}
      </Tip.Content>
    </Tip>
  );
};

export default ButtonWithToolTip;
