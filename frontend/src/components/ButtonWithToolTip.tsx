import { IconButton, Tip } from '@neo4j-ndl/react';

const ButtonWithToolTip = ({
  text,
  children,
  onClick,
  size = 'medium',
  clean,
  grouped,
}: {
  text: string;
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  clean?: boolean;
  grouped?: boolean;
}) => {
  return (
    <Tip allowedPlacements={['left']}>
      <Tip.Trigger>
        <IconButton aria-label={text} size={size} clean={clean} grouped={grouped} onClick={onClick}>
          {children}
        </IconButton>
      </Tip.Trigger>
      <Tip.Content isPortaled={false} style={{ whiteSpace: 'nowrap' }}>
        {text}
      </Tip.Content>
    </Tip>
  );
};

export default ButtonWithToolTip;
