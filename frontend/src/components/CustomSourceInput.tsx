import { Banner, Box, Button, Flex, TextInput } from '@neo4j-ndl/react';
import { CustomInput } from '../types';

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
}: CustomInput) {
  return (
    <Flex gap='6'>
      {status !== 'unknown' && (
        <Box>
          <Banner
            closeable
            description={statusMessage}
            onClose={() => setStatus('unknown')}
            type={status}
            name='Custom Banner'
          />
        </Box>
      )}
      <Box>
        <div className='w-full inline-block'>
          <TextInput
            id={id}
            value={value}
            disabled={false}
            label={label}
            aria-label={label}
            placeholder={placeHolder}
            onBlur={onBlurHandler}
            autoFocus
            fluid
            required
            onChange={onChangeHandler}
            errorText={!isValid && isFocused && 'Please Fill The Valid URL'}
          />
        </div>
      </Box>
      <Box>
        <Button color='neutral' fill='outlined' onClick={onCloseHandler} size='medium' className='mr-4'>
          Cancel
        </Button>
        <Button onClick={() => submitHandler(value)} size='medium' disabled={disabledCheck}>
          Sumbit
        </Button>
      </Box>
    </Flex>
  );
}
