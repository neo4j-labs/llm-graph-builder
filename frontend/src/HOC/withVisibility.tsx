interface VisibilityProps {
  isVisible: boolean;
}
export function withVisibility<P>(WrappedComponent: React.ComponentType<P>) {
  const VisibityControlled = (props: P & VisibilityProps) => {
    if (props.isVisible === false) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  return VisibityControlled;
}
