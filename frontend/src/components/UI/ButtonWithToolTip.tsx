import { Button, Tooltip } from '@neo4j-ndl/react';
import React, { MouseEventHandler, useState } from 'react';

const ButtonWithToolTip = ({
  text,
  children,
  onClick,
  size = 'medium',
  placement = 'bottom',
  disabled = false,
  className = '',
  label,
  loading,
  fill = 'filled',
  type = 'button',
  color,
}: {
  text: string | React.ReactNode;
  children: React.ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement> | (() => void);
  size?: 'small' | 'medium' | 'large';
  clean?: boolean;
  grouped?: boolean;
  placement?: 'bottom' | 'top' | 'right' | 'left';
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  label: string;
  fill?: 'filled' | 'outlined' | 'text';
  type?: 'submit' | 'button' | 'reset';
  color?: 'primary' | 'danger' | undefined;
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  return (
    <Tooltip placement={placement} type='simple'>
      <Tooltip.Trigger hasButtonWrapper>
        <Button
          size={size}
          onClick={onClick}
          isDisabled={disabled}
          className={className}
          isLoading={loading}
          fill={fill}
          type={type}
          color={color}
          htmlAttributes={{
            'aria-label': label,
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
          }}
        >
          {children}
        </Button>
      </Tooltip.Trigger>
      {isHovered && <Tooltip.Content style={{ whiteSpace: 'nowrap' }}>{text}</Tooltip.Content>}
    </Tooltip>
  );
};

export default ButtonWithToolTip;
