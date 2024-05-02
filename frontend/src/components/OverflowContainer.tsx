import { useRef, useEffect, useState, ReactNode, FC } from 'react';
interface props {
  children: ReactNode;
  className?: string;
}
const OverflowContainer: FC<props> = ({ children, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      if (container.scrollHeight > container.clientHeight) {
        setOverflowing(true);
      } else {
        setOverflowing(false);
      }
    }
  }, [children]);
  return (
    <div
      ref={containerRef}
      style={{
        maxHeight: overflowing ? '100%' : 'max-content',
        overflowY: overflowing ? 'auto' : 'hidden',
      }}
      className={className}
    >
      {children}
    </div>
  );
};
export default OverflowContainer;
