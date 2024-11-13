import { IconButton, Tooltip } from '@neo4j-ndl/react';
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
      <Tooltip.Trigger>
        <IconButton
          ariaLabel={label}
          size={size}
          isClean={clean}
          isGrouped={grouped}
          onClick={onClick}
          isDisabled={disabled}
          htmlAttributes={{ onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false) }}
        >
          {children}
        </IconButton>
      </Tooltip.Trigger>
      {isHovered && <Tooltip.Content style={{ whiteSpace: 'nowrap' }}>{text}</Tooltip.Content>}
    </Tooltip>
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
