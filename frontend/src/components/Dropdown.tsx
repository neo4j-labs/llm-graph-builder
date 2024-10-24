import { Dropdown, Tip } from '@neo4j-ndl/react';
import { OptionType, ReusableDropdownProps } from '../types';
import { memo, useMemo, useReducer } from 'react';
import { capitalize, capitalizeWithUnderscore } from '../utils/Utils';
// import { LLMDropdownLabel } from '../utils/Constants';
const DropdownComponent: React.FC<ReusableDropdownProps> = ({
  options,
  placeholder,
  defaultValue,
  onSelect,
  children,
  view,
  isDisabled,
  value,
}) => {
  const [disableTooltip, toggleDisableState] = useReducer((state) => !state, false);
  const isProdEnv = process.env.VITE_ENV === 'PROD';
  const supportedModels = process.env.VITE_LLM_MODELS_PROD;
  const handleChange = (selectedOption: OptionType | null | void) => {
    onSelect(selectedOption);
  };
  const allOptions = useMemo(() => options, [options]);
  return (
    <>
      <div className={view === 'ContentView' ? 'w-[150px]' : ''}>
        <Tip allowedPlacements={['top']} isDisabled={disableTooltip}>
          <Tip.Trigger>
            <Dropdown
              type='select'
              aria-label='A selection dropdown'
              label='LLM Models'
              selectProps={{
                onChange: handleChange,
                options: allOptions?.map((option) => {
                  const label =
                    typeof option === 'string' ? capitalizeWithUnderscore(option) : capitalize(option.label);
                  const value = typeof option === 'string' ? option : option.value;
                  const isModelSupported = !isProdEnv || supportedModels?.includes(value);
                  return {
                    label,
                    value,
                    isDisabled: !isModelSupported,
                  };
                }),
                placeholder: placeholder || 'Select an option',
                defaultValue: defaultValue
                  ? { label: capitalizeWithUnderscore(defaultValue), value: defaultValue }
                  : undefined,
                menuPlacement: 'auto',
                isDisabled: isDisabled,
                value: value,
                onMenuOpen: () => {
                  toggleDisableState();
                },
                onMenuClose: () => {
                  toggleDisableState();
                },
              }}
              size='medium'
              fluid
            />
          </Tip.Trigger>
          <Tip.Content>LLM Model used for Extraction & Chat</Tip.Content>
        </Tip>
        {children}
      </div>
      {/* {isProdEnv && (<Typography className={'pt-4 absolute top-14 self-start'} variant='body-small'>
        {LLMDropdownLabel.disabledModels}
        <a href="https://dev-frontend-dcavk67s4a-uc.a.run.app/" target="_blank" style={{ textDecoration: 'underline' }}>
          {LLMDropdownLabel.devEnv}
        </a>
        {'.'}
      </Typography>)} */}
    </>
  );
};
export default memo(DropdownComponent);
