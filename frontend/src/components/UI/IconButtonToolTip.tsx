import { IconButton, Tip } from '@neo4j-ndl/react';
import { useState } from 'react';

export const IconButtonWithToolTip = ({
  text,
  children,
  onClick,
  size = 'medium',
  clean,
  grouped,
  placement = 'bottom',
  disabled = false,
  label,
}: {
  label: string;
  text: string | React.ReactNode;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
  size?: 'small' | 'medium' | 'large';
  clean?: boolean;
  grouped?: boolean;
  placement?: 'bottom' | 'top' | 'right' | 'left';
  disabled?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  return (
    <Tip allowedPlacements={[placement]}>
      <Tip.Trigger>
        <IconButton
          aria-label={label}
          size={size}
          clean={clean}
          grouped={grouped}
          onClick={onClick}
          disabled={disabled}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {children}
        </IconButton>
      </Tip.Trigger>
      {isHovered && (
        <Tip.Content isPortaled={false} style={{ whiteSpace: 'nowrap' }}>
          {text}
        </Tip.Content>
      )}
    </Tip>
  );
};

export const IconWithToolTip = ({
  text,
  children,
  placement = 'bottom',
}: {
  label: string;
  text: string | React.ReactNode;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
  size?: 'small' | 'medium' | 'large';
  clean?: boolean;
  grouped?: boolean;
  placement?: 'bottom' | 'top' | 'right' | 'left';
  disabled?: boolean;
}) => {
  return (
    <Tip allowedPlacements={[placement]}>
      <Tip.Trigger>{children}</Tip.Trigger>
      <Tip.Content isPortaled={false} style={{ whiteSpace: 'nowrap' }}>
        {text}
      </Tip.Content>
    </Tip>
  );
};
