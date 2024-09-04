import { toast } from '@neo4j-ndl/react';

export const showErrorToast = (message: string, shouldAutoClose: boolean = true) => {
  return toast.danger(message, {
    isCloseable: true,
    shouldAutoClose: shouldAutoClose,
  });
};

export const showSuccessToast = (message: string) => {
  return toast.success(message, {
    isCloseable: true,
    shouldAutoClose: true,
  });
};

export const showNormalToast = (message: string) => {
  return toast.neutral(message, {
    isCloseable: true,
    shouldAutoClose: true,
  });
};
