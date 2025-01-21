import { VisibilityProps } from '../types';

export function withVisibility<P>(WrappedComponent: React.ComponentType<P>) {
  const VisibilityControlled = (props: P & VisibilityProps) => {
    if (props.isVisible === false) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  return VisibilityControlled;
}
