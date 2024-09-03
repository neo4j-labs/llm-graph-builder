import { Button, Tip } from '@neo4j-ndl/react';
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
  color?: 'primary' | 'danger' | 'warning' | 'success' | 'neutral' | undefined;
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };
  return (
    <Tip
      allowedPlacements={[placement]}
      type="tooltip"
      open={isOpen}
      onOpenChange={(open, event) => handleOpenChange(open, event)}
    >
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
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {children}
        </Button>
      </Tip.Trigger>
      {isOpen && (
        <Tip.Content isPortaled={false} style={{ whiteSpace: 'nowrap' }}>
          {text}
        </Tip.Content>
      )}
    </Tip>
  );
};
export default ButtonWithToolTip;