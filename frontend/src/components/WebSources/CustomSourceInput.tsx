import { Banner, Box, Button, Flex, TextInput } from '@neo4j-ndl/react';
import { CustomInput } from '../../types';

export default function CustomSourceInput({
  value,
  label,
  placeHolder,
  onChangeHandler,
  submitHandler,
  disabledCheck,
  onCloseHandler,
  id,
  onBlurHandler,
  status,
  setStatus,
  statusMessage,
  isValid,
  isFocused,
  onPasteHandler,
}: CustomInput) {
  return (
    <Flex gap='6'>
      {status !== 'unknown' && (
        <Box>
          <Banner
            isCloseable
            description={statusMessage}
            onClose={() => setStatus('unknown')}
            type={status}
            name='Custom Banner'
            className='text-lg font-semibold'
            usage='inline'
          />
        </Box>
      )}
      <Box>
        <div className='w-full inline-block'>
          <TextInput
            value={value}
            isDisabled={false}
            label={label}
            isFluid
            onChange={onChangeHandler}
            errorText={!isValid && isFocused && 'Please Fill The Valid URL'}
            htmlAttributes={{
              id: id,
              'aria-label': label,
              placeholder: placeHolder,
              onBlur: onBlurHandler,
              autoFocus: true,
              required: true,
              onPaste: onPasteHandler,
              onKeyDown: (e) => {
                if (e.code === 'Enter') {
                  submitHandler(value);
                }
              },
            }}
          />
        </div>
      </Box>
      <Flex flexDirection='row' justifyContent='flex-end'>
        <div>
          <Button
            isDisabled={value.trim() === ''}
            color='neutral'
            fill='outlined'
            onClick={onCloseHandler}
            size='medium'
            className='mr-4'
          >
            Reset
          </Button>
          <Button onClick={() => submitHandler(value)} size='medium' isDisabled={disabledCheck}>
            Submit
          </Button>
        </div>
      </Flex>
    </Flex>
  );
}
