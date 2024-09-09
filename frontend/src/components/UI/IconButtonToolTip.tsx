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
    <Tooltip type='simple' placement={placement}>
      <Tooltip.Trigger hasButtonWrapper>
        <IconButton
          ariaLabel={label}
          size={size}
          isClean={clean}
          isGrouped={grouped}
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
    <Tooltip type={'simple'} placement={placement}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content style={{ whiteSpace: 'nowrap' }}>{text}</Tooltip.Content>
    </Tooltip>
  );
};
