import { Button, Tip } from '@neo4j-ndl/react';
import React from 'react';

const ButtonWithToolTip = ({
  text,
  children,
  onClick,
  size = 'medium',
  placement = 'bottom',
  disabled = false,
  className = '',
  label,
}: {
  text: string | React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  clean?: boolean;
  grouped?: boolean;
  placement?: 'bottom' | 'top' | 'right' | 'left';
  disabled?: boolean;
  className?: string;
  label: string;
}) => {
  return (
    <Tip allowedPlacements={[placement]}>
      <Tip.Trigger>
        <Button aria-label={label} size={size} onClick={onClick} disabled={disabled} className={className}>
          {children}
        </Button>
      </Tip.Trigger>
      <Tip.Content isPortaled={false} style={{ whiteSpace: 'nowrap' }}>
        {text}
      </Tip.Content>
    </Tip>
  );
};

export default ButtonWithToolTip;
