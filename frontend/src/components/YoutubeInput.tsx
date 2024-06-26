import CustomSourceInput from './CustomSourceInput';
import useSourceInput from '../hooks/useSourceInput';
import { youtubeLinkValidation } from '../utils/Utils';

export default function YoutubeInput() {
  const {
    inputVal,
    onChangeHandler,
    onBlurHandler,
    submitHandler,
    status,
    setStatus,
    statusMessage,
    isFocused,
    isValid,
    onClose,
  } = useSourceInput(youtubeLinkValidation, 'youtube', false, true, false);
  return (
    <CustomSourceInput
      onCloseHandler={onClose}
      isFocused={isFocused}
      isValid={isValid}
      disabledCheck={false}
      label='Youtube Link'
      placeHolder='https://www.youtube.com/watch?v=2W9HM1xBibo'
      value={inputVal}
      onChangeHandler={onChangeHandler}
      onBlurHandler={onBlurHandler}
      submitHandler={submitHandler}
      setStatus={setStatus}
      status={status}
      statusMessage={statusMessage}
      id='youtube link'
    />
  );
}
