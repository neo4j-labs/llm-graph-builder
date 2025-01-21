import { Flex, TextArea, Typography, useMediaQuery } from '@neo4j-ndl/react';
import { buttonCaptions } from '../../../../utils/Constants';
import { tokens } from '@neo4j-ndl/base';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { useCallback } from 'react';
import { useFileContext } from '../../../../context/UsersFiles';
import { showNormalToast } from '../../../../utils/toasts';

export default function AdditionalInstructionsText({
  closeEnhanceGraphSchemaDialog,
}: {
  closeEnhanceGraphSchemaDialog: () => void;
}) {
  const { breakpoints } = tokens;
  const tablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const { additionalInstructions, setAdditionalInstructions } = useFileContext();

  const clickAnalyzeInstructHandler = useCallback(async () => {
    localStorage.setItem('instructions', additionalInstructions);
    closeEnhanceGraphSchemaDialog();
    showNormalToast(`Successfully Applied the Instructions`);
  }, [additionalInstructions]);
  return (
    <Flex gap={tablet ? '6' : '8'}>
      <div>
        <Flex flexDirection='column'>
          <Flex justifyContent='space-between' flexDirection='row'>
            <Typography variant={tablet ? 'subheading-medium' : 'subheading-large'}>
              {buttonCaptions.provideAdditionalInstructions}
            </Typography>
          </Flex>
          <Flex justifyContent='space-between' flexDirection='column' gap='6'>
            <TextArea
              helpText={buttonCaptions.helpInstructions}
              label='Additional Instructions'
              style={{
                resize: 'vertical',
              }}
              isFluid={true}
              value={additionalInstructions}
              htmlAttributes={{
                onChange: (e) => setAdditionalInstructions(e.target.value),
              }}
              size='large'
            />
            <Flex className='!mt-4 mb-2 flex items-center' flexDirection='row' justifyContent='flex-end'>
              <Flex flexDirection='row' gap='4'>
                <ButtonWithToolTip
                  placement='top'
                  label='Analyze button'
                  text={'Analyze instructions for schema'}
                  disabled={additionalInstructions.trim() === ''}
                  onClick={clickAnalyzeInstructHandler}
                >
                  {buttonCaptions.analyzeInstructions}
                </ButtonWithToolTip>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </div>
    </Flex>
  );
}
