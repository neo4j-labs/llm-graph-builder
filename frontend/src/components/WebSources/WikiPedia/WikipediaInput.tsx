import { wikiValidation } from '../../../utils/Utils';
import useSourceInput from '../../../hooks/useSourceInput';
import CustomSourceInput from '../CustomSourceInput';

export default function WikipediaInput({
  loading,
  setIsLoading,
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
  } = useSourceInput(wikiValidation, setIsLoading, 'Wikipedia', true, false, false);
  return (
    <CustomSourceInput
      onCloseHandler={onClose}
      isFocused={isFocused}
      isValid={isValid}
      disabledCheck={Boolean(loading)}
      label='Wikipedia Link'
      placeHolder='https://en.wikipedia.org/wiki/Albert_Einstein'
      value={inputVal}
      onChangeHandler={onChangeHandler}
      onBlurHandler={onBlurHandler}
      submitHandler={submitHandler}
      setStatus={setStatus}
      status={status}
      statusMessage={statusMessage}
      id='Wikipedia link'
      onPasteHandler={onPasteHandler}
    />
  );
}
