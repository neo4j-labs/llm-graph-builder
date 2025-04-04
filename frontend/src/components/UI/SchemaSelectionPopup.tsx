import { Dialog } from '@neo4j-ndl/react';
import { buttonCaptions } from '../../utils/Constants';
import ButtonWithToolTip from '../UI/ButtonWithToolTip';
import PatternContainer from '../Popups/GraphEnhancementDialog/EnitityExtraction/PatternContainer';

interface SchemaSelectionProps {
    open: boolean,
    onClose: () => void;
    pattern: string[],
    handleRemove: (pattern: string) => void,
    handleSchemaView: (view?: string) => void,
    highlightPattern?: string
}

const SchemaSelectionDialog = ({ open, onClose, pattern, handleRemove, handleSchemaView, highlightPattern }: SchemaSelectionProps) => {
    return (
        <Dialog
            size='medium'
            isOpen={open}
            onClose={() => {
                onClose();
            }}
            htmlAttributes={{
                'aria-labelledby': 'form-dialog-title',
            }}
        >
            <Dialog.Header>{'Schema From Database'}</Dialog.Header>
            <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
                <PatternContainer
                    pattern={pattern}
                    handleRemove={handleRemove}
                    handleSchemaView={handleSchemaView}
                    highlightPattern={highlightPattern ?? ''}
                ></PatternContainer>
                <Dialog.Actions className='mt-4!'>
                    <ButtonWithToolTip
                        placement='top'
                        label='Apply'
                        text={'Apply'}
                        onClick={() => console.log('Helo')}
                    >
                        {buttonCaptions.applyGraphSchema}
                    </ButtonWithToolTip>
                </Dialog.Actions>
            </Dialog.Content>
        </Dialog>
    );
};
export default SchemaSelectionDialog;
