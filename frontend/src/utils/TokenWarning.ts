import { getTokenLimits } from '../services/TokenLimits';
import { UserCredentials } from '../types';

const TOKEN_WARNING_THRESHOLD = 10000;

export interface TokenWarningResult {
  shouldWarn: boolean;
  message: string;
}

export const checkTokenLimits = async (userCredentials: UserCredentials): Promise<TokenWarningResult> => {
  try {
    const limits = await getTokenLimits(userCredentials);

    if (!limits) {
      return {
        shouldWarn: false,
        message: '',
      };
    }

    const { daily_remaining, monthly_remaining } = limits;

    if (daily_remaining < TOKEN_WARNING_THRESHOLD || monthly_remaining < TOKEN_WARNING_THRESHOLD) {
      const criticalLimit = Math.min(daily_remaining, monthly_remaining);
      const limitType = daily_remaining < monthly_remaining ? 'daily' : 'monthly';

      return {
        shouldWarn: true,
        message: `Warning: Your ${limitType} token limit is running low (${criticalLimit.toLocaleString()} remaining). This operation may consume additional tokens. Please monitor your usage.`,
      };
    }

    return {
      shouldWarn: false,
      message: '',
    };
  } catch (error) {
    return {
      shouldWarn: false,
      message: '',
    };
  }
};
