import { webLinkValidation } from '../../../utils/Utils';
import useSourceInput from '../../../hooks/useSourceInput';
import CustomSourceInput from '../CustomSourceInput';

export default function WebInput({
  setIsLoading,
  loading,
}: {
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
}) {
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
    onPasteHandler,
  } = useSourceInput(webLinkValidation, setIsLoading, 'web-url', false, false, true);
  return (
    <CustomSourceInput
      onCloseHandler={onClose}
      isFocused={isFocused}
      isValid={isValid}
      disabledCheck={Boolean(loading)}
      label='Website Link'
      placeHolder='https://neo4j.com/'
      value={inputVal}
      onChangeHandler={onChangeHandler}
      onBlurHandler={onBlurHandler}
      submitHandler={submitHandler}
      setStatus={setStatus}
      status={status}
      statusMessage={statusMessage}
      id='Website link'
      onPasteHandler={onPasteHandler}
    />
  );
}
