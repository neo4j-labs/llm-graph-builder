import { Button, Tip } from '@neo4j-ndl/react';
import React, { MouseEventHandler } from 'react';

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
  color?: 'primary' | 'danger' | 'warning' | 'success' | 'neutral' | undefined;
}) => {
  return (
    <Tip allowedPlacements={[placement]}>
      <Tip.Trigger>
        <Button
          aria-label={label}
          size={size}
          onClick={onClick}
          disabled={disabled}
          className={className}
          loading={loading}
          fill={fill}
          type={type}
          color={color}
        >
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
