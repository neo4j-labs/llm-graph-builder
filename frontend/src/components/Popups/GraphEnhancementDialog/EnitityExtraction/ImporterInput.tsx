import { useState, useCallback, KeyboardEvent, ChangeEvent, FocusEvent } from 'react';
import { Box, TextInput, Button } from '@neo4j-ndl/react';
import { importerValidation } from '../../../../utils/Utils';

const ImporterInput = () => {
  const [value, setValue] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setIsValid(importerValidation(newValue));
  };
  const handleBlur = () => {
    setIsFocused(false);
    setIsValid(importerValidation(value));
  };
  const handleFocus = () => {
    setIsFocused(true);
  };
  const handleSubmit = useCallback(() => {
    if (importerValidation(value)) {
      window.open(value, '_blank');
    }
  }, [value]);
  const handleCancel = () => {
    setValue('');
    setIsValid(false);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.code === 'Enter' && isValid) {
      handleSubmit();
    }
  };
  const isEmpty = value.trim() === '';
  return (
    <Box>
      <div className='w-full inline-block mb-2'>
        <TextInput
          htmlAttributes={{
            onBlur: handleBlur,
            onFocus: handleFocus,
            onKeyDown: handleKeyDown,
            placeholder: 'Enter URL to import...',
            'aria-label': 'Importer URL Input',
          }}
          value={value}
          label='Import Link'
          isFluid
          isRequired
          onChange={handleChange}
          errorText={value && !isValid && isFocused ? 'Please enter a valid URL' : ''}
        />
      </div>
      <div className='w-full flex justify-end gap-2'>
        <Button onClick={handleCancel} isDisabled={isEmpty} size='medium'>
          Cancel
        </Button>
        <Button onClick={handleSubmit} isDisabled={!isValid} size='medium'>
          Apply
        </Button>
      </div>
    </Box>
  );
};

export default ImporterInput;
